#!/usr/bin/env node
/**
 * SmartCart — Integrate Druni full catalog into demo seed
 * ============================================================
 *
 * Lê data/catalog/druni-full.json e integra no seed-bundle:
 *  1. Tenta MATCH com produto existente via EAN (Druni dá GTIN-13 real!)
 *  2. Senão, MATCH via fingerprint canónico (brand + name)
 *  3. Senão, ADICIONA como novo produto
 *
 * Em todos os casos, adiciona a oferta Druni como NOVO store_product
 * (não duplica nem sobrescreve outras lojas).
 *
 * Side-effect importante: produtos existentes com EAN "wells-XXX" que
 * fazem match por fingerprint com produtos Druni ficam UPGRADED para o
 * EAN real GTIN-13 do Druni. Tudo o resto (variantes Wells, etc.)
 * preserva-se.
 *
 * Uso:
 *   node scripts/integrate-druni-catalog.js
 *   node scripts/integrate-druni-catalog.js --dry-run
 *   node scripts/integrate-druni-catalog.js --max=500
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const DRUNI_FULL = path.join(ROOT, 'data', 'catalog', 'druni-full.json');
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
  : ['skincare', 'haircare', 'fragrance'];

const CATEGORY_MAP = {
  skincare: 'skincare',
  haircare: 'hair',
  fragrance: 'perfume',
  body: 'body',
  makeup: 'makeup',
  baby: null,
  other: null,
  'category-page': null,
};

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function isRealEan(ean) {
  return /^\d{8,14}$/.test(ean || '');
}

(function main() {
  if (!fs.existsSync(DRUNI_FULL)) {
    console.error('✗ Não existe', DRUNI_FULL);
    console.error('  Corre primeiro: node scripts/scrape-druni-catalog.js');
    process.exit(1);
  }
  if (!fs.existsSync(SEED_BUNDLE)) {
    console.error('✗ Não existe', SEED_BUNDLE);
    process.exit(1);
  }

  const druniData = loadJSON(DRUNI_FULL);
  const seed = loadJSON(SEED_BUNDLE);

  if (!druniData?.products || !seed?.products) {
    console.error('✗ Ficheiros com estrutura inválida.');
    process.exit(1);
  }

  console.log(`📦 Druni full catalog: ${druniData.products.length} produtos`);
  console.log(`📦 Seed actual: ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  // ── Filtrar Druni produtos válidos ──
  const druniOk = druniData.products.filter(p =>
    p.status === 'ok' &&
    p.name &&
    p.price != null &&
    CATEGORIES_FILTER.includes(p.category) &&
    CATEGORY_MAP[p.category] != null
  );
  console.log(`✓ Druni válidos: ${druniOk.length}`);

  const druniToIntegrate = druniOk.slice(0, MAX_PRODUCTS);
  if (MAX_PRODUCTS !== Infinity && druniToIntegrate.length < druniOk.length) {
    console.log(`📋 --max=${MAX_PRODUCTS}: ${druniToIntegrate.length} retidos`);
  }

  // ── Construir índices: EAN (real) + fingerprint ──
  const eanIndex = {};
  const fpIndex = {};
  for (const p of seed.products) {
    if (isRealEan(p.ean)) eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
  }

  const druniSlug = 'druni';
  let druniSp = seed.store_products.find(sp => sp.store_slug === druniSlug);
  if (!druniSp) {
    druniSp = { store_slug: druniSlug, items: [] };
    seed.store_products.push(druniSp);
  }
  const druniItemByEan = {};
  for (const item of druniSp.items) druniItemByEan[item.ean] = item;

  let matchedByEan = 0;
  let matchedByFp = 0;
  let createdNew = 0;
  let storeProductsAdded = 0;
  let storeProductsUpdated = 0;
  let upgradedFromWellsEan = 0;
  const productsBefore = seed.products.length;

  for (const dp of druniToIntegrate) {
    // 1) Match by real EAN (preferred)
    let targetProduct = null;
    let matchSource = 'new';

    if (isRealEan(dp.ean) && eanIndex[dp.ean]) {
      targetProduct = eanIndex[dp.ean];
      matchedByEan++;
      matchSource = 'ean';
    }

    // 2) Match by fingerprint
    if (!targetProduct) {
      const fp = productFingerprint(dp);
      if (fp && fpIndex[fp]) {
        targetProduct = fpIndex[fp];
        matchedByFp++;
        matchSource = 'fp';

        // Side-effect: se target tem EAN "wells-X" e Druni tem EAN real,
        // upgrade do produto para o EAN real (preserva tudo o resto)
        if (isRealEan(dp.ean) && !isRealEan(targetProduct.ean)) {
          const oldEan = targetProduct.ean;
          targetProduct.ean = dp.ean;
          eanIndex[dp.ean] = targetProduct;
          delete eanIndex[oldEan];
          // Re-key todas as offers existentes para este EAN
          for (const sp of seed.store_products) {
            for (const item of sp.items) {
              if (item.ean === oldEan) item.ean = dp.ean;
            }
          }
          upgradedFromWellsEan++;
        }
      }
    }

    // 3) Não existe → criar
    if (!targetProduct) {
      const newEan = isRealEan(dp.ean) ? dp.ean : `druni-${dp.url.split('/').pop().slice(0,40)}`;
      targetProduct = {
        ean: newEan,
        name: dp.name,
        brand: displayBrand(dp.brand) || dp.brand,
        category: CATEGORY_MAP[dp.category],
        image_url: dp.image_url || null,
        _source: 'druni-catalog',
      };
      seed.products.push(targetProduct);
      eanIndex[newEan] = targetProduct;
      const fp = productFingerprint(dp);
      if (fp) fpIndex[fp] = targetProduct;
      createdNew++;
    } else {
      // Enriquecer existing: APENAS preencher imagem se em falta.
      // Imagens já existentes (de Wells, ou previamente scraped Druni)
      // ficam sticky — não são sobrescritas em re-scrapes.
      // Decisão: estabilidade > frescura. Se uma URL de imagem ainda
      // funciona, mantemos para evitar churn no demo.
      if (!targetProduct.image_url && dp.image_url) targetProduct.image_url = dp.image_url;
    }

    // ── Upsert store_product item Druni (com merge de variants) ──
    // CRÍTICO: quando 2 produtos Druni mapeiam para o mesmo EAN canónico
    // (páginas separadas para 30ml e 50ml do mesmo produto), MERGEAR
    // como variants — distinção de volume vive DENTRO do item.
    const targetEan = targetProduct.ean;
    const added = { value: 0 }, updated = { value: 0 };
    const result = upsertStoreItem(
      { storeSp: druniSp, itemByEan: druniItemByEan, addedCounter: added, updatedCounter: updated },
      targetEan, dp, druniData.scraped_at
    );
    if (result.action === 'added') storeProductsAdded++;
    else storeProductsUpdated++;
  }

  console.log('\n══════ Resumo da integração ══════');
  console.log(`  Match por EAN real (cross-store):       ${matchedByEan}`);
  console.log(`  Match por fingerprint (brand+name):     ${matchedByFp}`);
  console.log(`  Produtos novos criados:                 ${createdNew}`);
  console.log(`  Wells EANs upgraded → real GTIN:        ${upgradedFromWellsEan}`);
  console.log(`  Druni store_products: ${storeProductsAdded} adicionados, ${storeProductsUpdated} actualizados`);
  console.log('');
  console.log(`  Produtos antes: ${productsBefore}`);
  console.log(`  Produtos agora: ${seed.products.length}`);
  console.log(`  Δ: +${seed.products.length - productsBefore}`);

  // Stats by category
  const byCat = {};
  for (const p of seed.products) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log('\n══════ Catálogo final por categoria ══════');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(` ${(cat||'?').padEnd(15)} ${n}`);
  });
  console.log(` ${'TOTAL'.padEnd(15)} ${seed.products.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Nada escrito.');
    return;
  }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} (${(fs.statSync(SEED_BUNDLE).size / 1024).toFixed(0)} KB)`);

  // Pós-processo: dedup-audit em modo --apply para limpar residuais que
  // o fingerprint não apanhou (e.g., normalização imperfeita entre Wells
  // e Druni). Garante zero duplicados no seed final.
  console.log('\n▶ A correr dedup-audit (catch-all residual duplicates)...');
  const dedup = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (dedup.status !== 0) {
    console.warn('⚠ dedup-audit falhou — continuar mesmo assim.');
  }

  console.log('\n▶ Re-injectando no demo.html + index.html...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (r.status === 0) {
    console.log('\n✅ Integração completa.');
  }
})();
