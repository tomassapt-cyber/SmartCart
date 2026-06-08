#!/usr/bin/env node
/**
 * GirlMath — Integrate afarmaciaonline.pt catalog into seed
 * ============================================================
 *
 * Lê data/catalog/afarmaciaonline-full.json e funde no seed-bundle.
 *
 * afarmaciaonline.pt expõe GTIN-13 REAL (do data-layer) → matching forte
 * por EAN, tal como Druni/byFarma/Farmácia.pt.
 *
 * POLÍTICA v1 (conservadora — "nunca pôr em risco o trabalho"):
 *   • Match por EAN real  → enriquece preço/oferta no produto existente.
 *   • Match por fingerprint → idem; se o produto-alvo tinha EAN sintético,
 *     faz UPGRADE para o GTIN-13 real (melhoria do catálogo).
 *   • SEM match → IGNORA (NÃO cria produto novo). O catálogo da
 *     afarmaciaonline não traz categoria fiável; criar produtos novos sem
 *     categoria poluiria os filtros. Por isso v1 só adiciona a
 *     afarmaciaonline como FONTE DE PREÇO sobre produtos que já temos.
 *     (Breadth de produtos novos fica para v2 com detecção de categoria.)
 *
 * NUNCA altera nomes de produtos (fingerprint do dedup). Idempotente.
 *
 * Uso:
 *   node scripts/integrate-afarmaciaonline-catalog.js
 *   node scripts/integrate-afarmaciaonline-catalog.js --dry-run
 *   node scripts/integrate-afarmaciaonline-catalog.js --max=200
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, normalizeBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const AFO_FULL = path.join(ROOT, 'data', 'catalog', 'afarmaciaonline-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;

const STORE_SLUG = 'afarmaciaonline';

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }

(function main() {
  if (!fs.existsSync(AFO_FULL)) {
    console.error('✗ Não existe', AFO_FULL);
    console.error('  Corre primeiro: node scripts/scrape-afarmaciaonline-catalog.js');
    process.exit(1);
  }
  const afoData = loadJSON(AFO_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!afoData?.products || !seed?.products) {
    console.error('✗ Ficheiros com estrutura inválida.');
    process.exit(1);
  }

  let afo = afoData.products.filter(p => p.status === 'ok' && isRealEan(p.ean) && p.price > 0);
  console.log(`📦 afarmaciaonline catalog: ${afoData.products.length} entradas · ${afo.length} com EAN real + preço`);
  console.log(`📦 Seed actual:            ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  afo = afo.slice(0, MAX_PRODUCTS);

  // Índices do seed
  const eanIndex = {};
  const fpIndex = {};
  for (const p of seed.products) {
    eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
  }

  // Grupo de store_products da afarmaciaonline
  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }

  // ── Auto-registo da loja em seed.stores[] (self-healing) ─────────────────
  // (mesmo padrão de integrate-farmaciapt — garante visibilidade no site mesmo
  // que build-demo-seed.js não corra). Metadados apenas; não toca em nomes.
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    const FREE_SHIP_BY_TIER = { 1: 29, 2: 30, 3: 39, 4: 49, 5: 30, 6: 25, 7: 30 };
    let def = null;
    try {
      const storesDoc = loadJSON(path.join(ROOT, 'data', 'stores.json'));
      def = (storesDoc.stores || []).find(s => s.id === STORE_SLUG);
    } catch (e) { /* fallback abaixo */ }
    const storeEntry = {
      slug: STORE_SLUG,
      name: (def && def.nome) || 'A Farmácia Online',
      base_url: (def && def.url) || 'https://www.afarmaciaonline.pt',
      logo_url: (def && def.logo_url) || null,
      free_shipping_threshold: (def && def.free_shipping_threshold) || (def && FREE_SHIP_BY_TIER[def.tier]) || 30,
      shipping_zones: (def && def.shipping_zones) || { mainland: 0, madeira: 1.5, acores: 1.5 },
    };
    seed.stores.push(storeEntry);
    console.log(`🏬 Loja "${storeEntry.name}" registada em seed.stores[] (estava em falta).`);
  }

  const itemByEan = {};
  for (const item of sp.items) itemByEan[item.ean] = item;

  let matchedByEan = 0, matchedByFp = 0, upgraded = 0, unmatched = 0;
  let added = 0, updated = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of afo) {
    let target = null;

    // 1. Match por EAN real
    if (eanIndex[ep.ean]) { target = eanIndex[ep.ean]; matchedByEan++; }

    // 2. Match por fingerprint exacto (+ upgrade de EAN sintético → real)
    if (!target) {
      const fp = productFingerprint(ep);
      if (fp && fpIndex[fp]) {
        target = fpIndex[fp];
        matchedByFp++;
        if (isRealEan(ep.ean) && !isRealEan(target.ean)) {
          const oldEan = target.ean;
          target.ean = ep.ean;
          eanIndex[ep.ean] = target;
          delete eanIndex[oldEan];
          for (const g of seed.store_products)
            for (const item of g.items) if (item.ean === oldEan) item.ean = ep.ean;
          upgraded++;
        }
      }
    }

    // 3. SEM match → ignora (v1 não cria produtos novos)
    if (!target) { unmatched++; continue; }

    // Enriquecer imagem em falta (sticky)
    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;

    const r = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
      target.ean, ep, afoData.scraped_at
    );
    if (r.action === 'added') added++;
    else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo da integração (afarmaciaonline) ══════');
  console.log(`  Match por EAN real:        ${matchedByEan}`);
  console.log(`  Match por fingerprint:     ${matchedByFp} (upgrades EAN sintético→real: ${upgraded})`);
  console.log(`  Sem match (ignorados v1):  ${unmatched}`);
  console.log(`  Ofertas afarmaciaonline:   +${added} adicionadas, ${updated} actualizadas`);
  console.log(`  Total ofertas afarmaciaonline: ${sp.items.length}`);
  const withDisc = sp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`    com desconto activo:     ${withDisc}`);

  if (DRY_RUN) {
    console.log('\n🧪 --dry-run: seed NÃO gravado.');
    return;
  }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  // ── Pós-processo (mesmo pipeline dos outros integrate, idempotente) ──────
  console.log('\n▶ A correr dedup-audit (catch-all)...');
  const dedup = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], { cwd: ROOT, stdio: 'inherit' });
  if (dedup.status !== 0) console.warn('⚠ dedup-audit falhou — continuar mesmo assim.');

  console.log('\n▶ dedup-store-url (dups cross-língua mesma URL de loja)...');
  const du = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' });
  if (du.status !== 0) console.warn('⚠ dedup-store-url falhou — continuar.');

  console.log('\n▶ normalize-brand-display (unificar capitalização de marcas)...');
  const nb = spawnSync('node', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' });
  if (nb.status !== 0) console.warn('⚠ normalize-brand-display falhou — continuar.');

  console.log('\n▶ backfill-descriptions (propagar descrições raw→seed)...');
  const bf = spawnSync('node', [path.join(ROOT, 'scripts', 'backfill-descriptions.js')], { cwd: ROOT, stdio: 'inherit' });
  if (bf.status !== 0) console.warn('⚠ backfill-descriptions falhou — continuar.');

  console.log('\n▶ Re-injectando no demo.html + index.html...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração afarmaciaonline completa.');
})();
