#!/usr/bin/env node
/**
 * CosMath — Integrate Manuela Serra catalog into seed
 * ============================================================
 *
 * Lê data/catalog/manuelaserra-full.json e funde no seed-bundle:
 *  0. Match por EAN real (GTIN-13 no sku Shopify — ~21% dos produtos).
 *  1. Match por fingerprint (brand+name canónico).
 *  2. Sem match → cria produto novo com EAN sintético (manuelaserra-<handle>).
 *
 * Fuzzy DESLIGADO (mesmo motivo da byFarma/atida: agrupa produtos da mesma
 * linha que não são o mesmo SKU). EAN estrito a 12-14 dígitos (evita o bug do
 * íman de EANs curtos de 8 dígitos — ver scripts/purge-corrupt-merges.js).
 *
 * Uso:
 *   node scripts/integrate-manuelaserra-catalog.js [--dry-run] [--max=N]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand, normalizeBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const FULL = path.join(ROOT, 'data', 'catalog', 'manuelaserra-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;
const NO_POST = !!args['no-post'];

const STORE_SLUG = 'manuelaserra';

function loadJSON(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
// EAN real = GTIN-12/13/14. NÃO aceitar 8 dígitos (evita íman de placeholders).
function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }
function syntheticEan(p) {
  const slug = (p.url || '').split('/').pop().split('?')[0].slice(0, 50).replace(/[^a-z0-9-]/g, '');
  return `manuelaserra-${slug}`;
}

(function main() {
  if (!fs.existsSync(FULL)) {
    console.error('✗ Não existe', FULL, '\n  Corre primeiro: node scripts/scrape-manuelaserra-catalog.js');
    process.exit(1);
  }
  const data = loadJSON(FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!data?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  console.log(`📦 Manuela Serra: ${data.products.length} produtos`);
  console.log(`📦 Seed actual:    ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const ALLOWED = new Set(['skincare', 'hair', 'haircare', 'body']);
  let toIntegrate = data.products.filter(p => ALLOWED.has(p.category) && p.price != null);
  console.log(`🎯 Categorias permitidas: ${data.products.length} → ${toIntegrate.length}`);
  toIntegrate = toIntegrate.slice(0, MAX_PRODUCTS);

  const eanIndex = {}, fpIndex = {};
  for (const p of seed.products) {
    eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
  }

  // Config da loja (idempotente). Portes: Continente 3,40€, grátis >50€
  // (política oficial). Ilhas não publicadas → placeholder, verificar (BACKLOG).
  if (!seed.stores.find(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG,
      name: 'Manuela Serra',
      base_url: 'https://www.manuelaserra.com',
      logo_url: null,
      free_shipping_threshold: 50,
      shipping_zones: { mainland: 3.40, madeira: 3.40, acores: 3.40 },
    });
    console.log('🏪 Loja "Manuela Serra" adicionada a seed.stores');
  }

  let sp = seed.store_products.find(x => x.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  const itemByEan = {};
  for (const it of sp.items) itemByEan[it.ean] = it;

  let matchedByEan = 0, matchedByFp = 0, createdNew = 0, upgraded = 0, added = 0, updated = 0;
  const productsBefore = seed.products.length;

  for (const ep of toIntegrate) {
    let target = null;
    // 0. EAN real
    if (isRealEan(ep.ean) && eanIndex[ep.ean]) { target = eanIndex[ep.ean]; matchedByEan++; }
    // 1. Fingerprint exacto
    if (!target) {
      const fp = productFingerprint(ep);
      if (fp && fpIndex[fp]) {
        target = fpIndex[fp]; matchedByFp++;
        // upgrade EAN sintético → real (padrão Druni/byFarma), só com GTIN real
        if (isRealEan(ep.ean) && !isRealEan(target.ean)) {
          const oldEan = target.ean;
          target.ean = ep.ean; eanIndex[ep.ean] = target; delete eanIndex[oldEan];
          for (const g of seed.store_products) for (const it of g.items) if (it.ean === oldEan) it.ean = ep.ean;
          upgraded++;
        }
      }
    }
    // 2. Criar novo
    if (!target) {
      const newEan = isRealEan(ep.ean) ? ep.ean : syntheticEan(ep);
      if (eanIndex[newEan]) target = eanIndex[newEan];
      else {
        target = {
          ean: newEan, name: ep.name, brand: displayBrand(ep.brand) || ep.brand,
          category: ep.category === 'haircare' ? 'hair' : ep.category,
          image_url: ep.image_url || null, _source: 'manuelaserra-catalog',
        };
        seed.products.push(target); eanIndex[newEan] = target;
        const fp = productFingerprint(ep); if (fp && !fpIndex[fp]) fpIndex[fp] = target;
        createdNew++;
      }
    } else if (!target.image_url && ep.image_url) target.image_url = ep.image_url;

    const a = { value: 0 }, u = { value: 0 };
    const res = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: a, updatedCounter: u },
      target.ean, ep, data.scraped_at
    );
    if (res.action === 'added') added++; else if (res.action === 'merged') updated++;
  }

  console.log('══════ Resumo ══════');
  console.log(`  Match por EAN:          ${matchedByEan}`);
  console.log(`  Match por fingerprint:  ${matchedByFp}  (upgrades p/ EAN real: ${upgraded})`);
  console.log(`  Produtos novos:         ${createdNew}`);
  console.log(`  Ofertas manuelaserra:  +${added} adicionadas, ${updated} actualizadas (total ${sp.items.length})`);
  console.log(`  Seed: ${productsBefore} → ${seed.products.length} (Δ +${seed.products.length - productsBefore})`);
  const withDisc = sp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`  Ofertas com desconto activo: ${withDisc}`);

  if (DRY_RUN) { console.log('\n[DRY-RUN] Nada escrito.'); return; }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);

  if (NO_POST) { console.log('(--no-post: sem pós-processo/inject)'); return; }

  for (const [label, script, extra] of [
    ['dedup-audit', 'dedup-audit.js', ['--apply']],
    ['normalize-brand-display', 'normalize-brand-display.js', ['--apply', '--no-inject']],
    // Resgate cross-store por CNP (synth→real, regra anti-over-merge)
    ['apply-cnp-merge', 'apply-cnp-merge.js', ['--apply']],
    ['inject', 'inject-seed-into-demo.js', []],
  ]) {
    console.log(`\n▶ ${label}…`);
    const r = spawnSync('node', [path.join(ROOT, 'scripts', script), ...extra], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) console.warn(`⚠ ${label} falhou — continuar.`);
  }
  console.log('\n✅ Integração Manuela Serra completa.');
})();
