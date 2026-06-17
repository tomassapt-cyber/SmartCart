#!/usr/bin/env node
/**
 * GirlMath — Integrate haemiskin.pt catalog into seed
 * ============================================================
 *
 * Lê data/catalog/haemiskin-full.json e funde no seed-bundle.
 * haemiskin.pt (Shopify K-beauty) expõe GTIN-13 REAL (gtin13 do JSON-LD).
 *
 * POLÍTICA v1 (conservadora): match por EAN real → enriquece; match por
 * fingerprint → idem (+ upgrade EAN sintético→real); SEM match → IGNORA
 * (não cria produtos novos). NUNCA altera nomes. Idempotente.
 *
 * Uso:
 *   node scripts/integrate-haemiskin-catalog.js [--dry-run] [--max=N]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, normalizeBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const HAEMI_FULL = path.join(ROOT, 'data', 'catalog', 'haemiskin-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;

const STORE_SLUG = 'haemiskin';

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }

(function main() {
  if (!fs.existsSync(HAEMI_FULL)) {
    console.error('✗ Não existe', HAEMI_FULL);
    console.error('  Corre primeiro: node scripts/scrape-haemiskin-catalog.js');
    process.exit(1);
  }
  const haemiData = loadJSON(HAEMI_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!haemiData?.products || !seed?.products) {
    console.error('✗ Ficheiros com estrutura inválida.');
    process.exit(1);
  }

  let haemi = haemiData.products.filter(p => p.status === 'ok' && isRealEan(p.ean) && p.price > 0);
  console.log(`📦 haemiskin catalog: ${haemiData.products.length} entradas · ${haemi.length} com EAN real + preço`);
  console.log(`📦 Seed actual:       ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  haemi = haemi.slice(0, MAX_PRODUCTS);

  const eanIndex = {};
  const fpIndex = {};
  for (const p of seed.products) {
    eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
  }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }

  // ── Auto-registo da loja em seed.stores[] (self-healing) ─────────────────
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    const FREE_SHIP_BY_TIER = { 1: 29, 2: 30, 3: 39, 4: 49, 5: 30, 6: 25, 7: 30 };
    let def = null;
    try {
      const storesDoc = loadJSON(path.join(ROOT, 'data', 'stores.json'));
      def = (storesDoc.stores || []).find(s => s.id === STORE_SLUG);
    } catch (e) { /* fallback abaixo */ }
    const storeEntry = {
      slug: STORE_SLUG,
      name: (def && def.nome) || 'HaemiSkin',
      base_url: (def && def.url) || 'https://www.haemiskin.pt',
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

  for (const ep of haemi) {
    let target = null;

    if (eanIndex[ep.ean]) { target = eanIndex[ep.ean]; matchedByEan++; }

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

    if (!target) { unmatched++; continue; }

    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;

    const r = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
      target.ean, ep, haemiData.scraped_at
    );
    if (r.action === 'added') added++;
    else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo da integração (haemiskin) ══════');
  console.log(`  Match por EAN real:        ${matchedByEan}`);
  console.log(`  Match por fingerprint:     ${matchedByFp} (upgrades EAN sintético→real: ${upgraded})`);
  console.log(`  Sem match (ignorados v1):  ${unmatched}`);
  console.log(`  Ofertas haemiskin:         +${added} adicionadas, ${updated} actualizadas`);
  console.log(`  Total ofertas haemiskin:   ${sp.items.length}`);

  if (DRY_RUN) {
    console.log('\n🧪 --dry-run: seed NÃO gravado.');
    return;
  }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  console.log('\n▶ A correr dedup-audit (catch-all)...');
  const dedup = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], { cwd: ROOT, stdio: 'inherit' });
  if (dedup.status !== 0) console.warn('⚠ dedup-audit falhou — continuar mesmo assim.');

  console.log('\n▶ dedup-store-url...');
  const du = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' });
  if (du.status !== 0) console.warn('⚠ dedup-store-url falhou — continuar.');

  console.log('\n▶ normalize-brand-display...');
  const nb = spawnSync('node', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' });
  if (nb.status !== 0) console.warn('⚠ normalize-brand-display falhou — continuar.');

  console.log('\n▶ backfill-descriptions...');
  const bf = spawnSync('node', [path.join(ROOT, 'scripts', 'backfill-descriptions.js')], { cwd: ROOT, stdio: 'inherit' });
  if (bf.status !== 0) console.warn('⚠ backfill-descriptions falhou — continuar.');

  // Pós-processo: resgate cross-store por CNP (synth→real, regra anti-over-merge)
  console.log('\n▶ apply-cnp-merge (resgate por CNP)...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'apply-cnp-merge.js'), '--apply'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) console.warn('⚠ apply-cnp-merge falhou — continuar.');

  console.log('\n▶ Re-injectando no demo.html + index.html...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração haemiskin completa.');
})();
