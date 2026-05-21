#!/usr/bin/env node
/**
 * SmartCart — Integrate Sweetcare catalog into seed
 * ============================================================
 *
 * Mesma lógica que integrate-druni-catalog:
 *  1. Match por EAN real (GTIN-13) cross-store
 *  2. Match por fingerprint canónico (brand + canonical name)
 *  3. Caso nenhum match: criar novo produto
 *
 * Em todos os casos: upsert store_product item Sweetcare (merge variants).
 *
 * Side-effect: produtos com EANs placeholder (wells-XXX, druni-XXX) que
 * façam fingerprint match com Sweetcare ficam UPGRADED para EAN real.
 *
 * Uso:
 *   node scripts/integrate-sweetcare-catalog.js
 *   node scripts/integrate-sweetcare-catalog.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const SWEETCARE_FULL = path.join(ROOT, 'data', 'catalog', 'sweetcare-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;
const CATEGORIES_FILTER = args.categories
  ? String(args.categories).split(',').map(s => s.trim())
  : ['skincare', 'haircare', 'fragrance', 'body', 'makeup'];

const CATEGORY_MAP = {
  skincare: 'skincare',
  haircare: 'hair',
  fragrance: 'perfume',
  body: 'body',
  makeup: 'makeup',
  baby: null,
  other: null,
};

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function isRealEan(ean) { return /^\d{8,14}$/.test(ean || ''); }

(function main() {
  if (!fs.existsSync(SWEETCARE_FULL)) {
    console.error('✗ Não existe', SWEETCARE_FULL);
    console.error('  Corre: node scripts/scrape-sweetcare-catalog.js');
    process.exit(1);
  }
  const swData = loadJSON(SWEETCARE_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!swData?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  console.log(`📦 Sweetcare full: ${swData.products.length} produtos`);
  console.log(`📦 Seed: ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const swOk = swData.products.filter(p =>
    p.status === 'ok' && p.name && p.price != null &&
    CATEGORIES_FILTER.includes(p.category) &&
    CATEGORY_MAP[p.category] != null
  );
  console.log(`✓ Sweetcare válidos: ${swOk.length}`);
  const toIntegrate = swOk.slice(0, MAX_PRODUCTS);
  if (MAX_PRODUCTS !== Infinity && toIntegrate.length < swOk.length) {
    console.log(`📋 --max=${MAX_PRODUCTS}: ${toIntegrate.length} retidos`);
  }

  // Índices
  const eanIndex = {};
  const fpIndex = {};
  for (const p of seed.products) {
    if (isRealEan(p.ean)) eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
  }

  const sweetcareSlug = 'sweetcare';
  let sweetcareSp = seed.store_products.find(sp => sp.store_slug === sweetcareSlug);
  if (!sweetcareSp) {
    sweetcareSp = { store_slug: sweetcareSlug, items: [] };
    seed.store_products.push(sweetcareSp);
  }
  const sweetcareItemByEan = {};
  for (const item of sweetcareSp.items) sweetcareItemByEan[item.ean] = item;

  let matchedByEan = 0, matchedByFp = 0, createdNew = 0;
  let storeProductsAdded = 0, storeProductsUpdated = 0;
  let upgradedEan = 0;
  const productsBefore = seed.products.length;

  for (const sp of toIntegrate) {
    let targetProduct = null;
    let matchSource = 'new';

    if (isRealEan(sp.ean) && eanIndex[sp.ean]) {
      targetProduct = eanIndex[sp.ean];
      matchedByEan++;
      matchSource = 'ean';
    }
    if (!targetProduct) {
      const fp = productFingerprint(sp);
      if (fp && fpIndex[fp]) {
        targetProduct = fpIndex[fp];
        matchedByFp++;
        matchSource = 'fp';
        // Upgrade EAN placeholder → real GTIN se aplicável
        if (isRealEan(sp.ean) && !isRealEan(targetProduct.ean)) {
          const oldEan = targetProduct.ean;
          targetProduct.ean = sp.ean;
          eanIndex[sp.ean] = targetProduct;
          delete eanIndex[oldEan];
          for (const storeSp of seed.store_products) {
            for (const item of storeSp.items) if (item.ean === oldEan) item.ean = sp.ean;
          }
          upgradedEan++;
        }
      }
    }
    if (!targetProduct) {
      const newEan = isRealEan(sp.ean) ? sp.ean : `sweetcare-${sp.url.split('/').pop().slice(0,40)}`;
      targetProduct = {
        ean: newEan,
        name: sp.name,
        brand: displayBrand(sp.brand) || sp.brand,
        category: CATEGORY_MAP[sp.category],
        image_url: sp.image_url || null,
        _source: 'sweetcare-catalog',
      };
      seed.products.push(targetProduct);
      eanIndex[newEan] = targetProduct;
      const fp = productFingerprint(sp);
      if (fp) fpIndex[fp] = targetProduct;
      createdNew++;
    } else {
      if (!targetProduct.image_url && sp.image_url) targetProduct.image_url = sp.image_url;
    }

    // Upsert store_product item (merge variants)
    const targetEan = targetProduct.ean;
    const added = { value: 0 }, updated = { value: 0 };
    const r = upsertStoreItem(
      { storeSp: sweetcareSp, itemByEan: sweetcareItemByEan, addedCounter: added, updatedCounter: updated },
      targetEan, sp, swData.scraped_at
    );
    if (r.action === 'added') storeProductsAdded++; else storeProductsUpdated++;
  }

  console.log('\n══════ Resumo ══════');
  console.log(`  Match por EAN real:                    ${matchedByEan}`);
  console.log(`  Match por fingerprint:                 ${matchedByFp}`);
  console.log(`  Produtos novos criados:                ${createdNew}`);
  console.log(`  EANs placeholder upgraded → GTIN:      ${upgradedEan}`);
  console.log(`  Sweetcare store_products: ${storeProductsAdded} adicionados, ${storeProductsUpdated} actualizados`);
  console.log('');
  console.log(`  Produtos antes: ${productsBefore}`);
  console.log(`  Produtos agora: ${seed.products.length}`);
  console.log(`  Δ: +${seed.products.length - productsBefore}`);

  if (DRY_RUN) { console.log('\n[DRY-RUN] Não escrito.'); return; }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ ${SEED_BUNDLE.replace(ROOT, '.')} (${(fs.statSync(SEED_BUNDLE).size / 1024).toFixed(0)} KB)`);

  console.log('\n▶ dedup-audit...');
  const d = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], { cwd: ROOT, stdio: 'inherit' });
  if (d.status !== 0) console.warn('⚠ dedup-audit falhou.');

  console.log('\n▶ inject-seed-into-demo...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração completa.');
})();
