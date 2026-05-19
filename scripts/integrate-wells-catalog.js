#!/usr/bin/env node
/**
 * SmartCart — Integrate Wells full catalog into demo seed
 * ============================================================
 *
 * Lê `data/catalog/wells-full.json` (output do scrape-wells-catalog.js)
 * e integra-o no `data/seed-bundle.json` para que o demo.html mostre
 * os ~2000+ produtos Wells além dos 23 produtos seed originais.
 *
 * Pipeline:
 *   1. Lê wells-full.json (catálogo Wells scraped)
 *   2. Lê seed-bundle.json (estado actual: 23 produtos + 46 lojas)
 *   3. Filtra Wells products por categoria útil (skincare, hair, body, makeup, perfume)
 *   4. Para cada Wells product:
 *      - Se EAN/productId já existe no seed → MERGE (actualiza com dados frescos)
 *      - Se não → APPEND ao products[] + cria store_product entry para Wells
 *   5. Escreve seed-bundle.json estendido
 *   6. Re-inject no demo.html
 *
 * Uso:
 *   node scripts/integrate-wells-catalog.js
 *   node scripts/integrate-wells-catalog.js --dry-run    # mostra changes, não escreve
 *   node scripts/integrate-wells-catalog.js --max=500    # limita a N produtos (teste)
 *   node scripts/integrate-wells-catalog.js --categories=skincare,hair  # só algumas
 *
 * Importante: Wells aparece como SOMENTE 1 loja para os produtos novos.
 * Quando integrarmos Druni/Sweetcare/etc., cada produto poderá ter
 * múltiplas lojas a competir pelo melhor preço.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const WELLS_FULL = path.join(ROOT, 'data', 'catalog', 'wells-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

// CLI
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
  : ['skincare', 'haircare', 'body', 'makeup', 'fragrance'];

// Map Wells category → demo category
const CATEGORY_MAP = {
  skincare: 'skincare',
  haircare: 'hair',
  body: 'body',
  makeup: 'makeup',
  fragrance: 'perfume',
  supplements: null, // skip (demo não tem)
  baby: null,
  medical: null,
  oral: null,
  lentes: null,
  feminine: null,
  other: null,
};

// Heurística simples de "trending" — produtos com mais variantes ou
// nome que contém marcas conhecidas vão para mais alto na lista
const POPULAR_BRANDS = [
  'la roche-posay', 'la roche posay', 'lrp',
  'vichy', 'eucerin', 'avene', 'avène',
  'caudalie', 'nuxe', 'bioderma',
  'cerave', 'cetaphil', 'roc',
  'isdin', 'heliocare',
  'yves saint laurent', 'ysl', 'lancôme', 'lancome',
  'dior', 'chanel', 'armani', 'versace',
  'estée lauder', 'estee lauder',
];

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

(function main() {
  // 1) Validar inputs
  if (!fs.existsSync(WELLS_FULL)) {
    console.error('✗ Não existe data/catalog/wells-full.json.');
    console.error('  Corre primeiro: node scripts/scrape-wells-catalog.js');
    process.exit(1);
  }
  if (!fs.existsSync(SEED_BUNDLE)) {
    console.error('✗ Não existe data/seed-bundle.json.');
    console.error('  Corre primeiro: node scripts/build-catalog.js');
    process.exit(1);
  }

  const wellsData = loadJSON(WELLS_FULL);
  const seed = loadJSON(SEED_BUNDLE);

  if (!wellsData?.products || !seed?.products || !seed?.store_products) {
    console.error('✗ Ficheiros com estrutura inválida.');
    process.exit(1);
  }

  console.log(`📦 Wells full catalog: ${wellsData.products.length} produtos`);
  console.log(`📦 Seed actual: ${seed.products.length} produtos, ${seed.stores.length} lojas`);
  console.log('');

  // 2) Filtrar Wells products: status ok + categoria mapeada + tem name + preço
  const wellsOk = wellsData.products.filter(p =>
    p.status === 'ok' &&
    p.name &&
    p.price != null &&
    CATEGORIES_FILTER.includes(p.category) &&
    CATEGORY_MAP[p.category] != null
  );
  console.log(`✓ Wells produtos válidos (status=ok + categoria útil): ${wellsOk.length}`);

  // 3) Ordenar: popular brands primeiro, depois por categoria
  wellsOk.sort((a, b) => {
    const aPop = POPULAR_BRANDS.includes((a.brand || '').toLowerCase()) ? 0 : 1;
    const bPop = POPULAR_BRANDS.includes((b.brand || '').toLowerCase()) ? 0 : 1;
    if (aPop !== bPop) return aPop - bPop;
    return (a.category || '').localeCompare(b.category || '');
  });

  // 4) Truncar se houver --max
  const wellsToIntegrate = wellsOk.slice(0, MAX_PRODUCTS);
  if (MAX_PRODUCTS !== Infinity && wellsToIntegrate.length < wellsOk.length) {
    console.log(`📋 --max=${MAX_PRODUCTS} aplicado: ${wellsToIntegrate.length} produtos retidos`);
  }

  // 5) Construir índice fingerprint → seed product
  //    Garantia chave: 1 produto físico = 1 entrada no seed,
  //    independentemente de quantas lojas o vendem.
  const wellsStoreSlug = 'wells';
  const fpIndex = {};
  const eanIndex = {};
  for (const p of seed.products) {
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
    if (p.ean) eanIndex[p.ean] = p;
  }

  const productsBefore = seed.products.length;

  // 6) Garantir store_products para Wells
  let wellsSp = seed.store_products.find(sp => sp.store_slug === wellsStoreSlug);
  if (!wellsSp) {
    wellsSp = { store_slug: wellsStoreSlug, items: [] };
    seed.store_products.push(wellsSp);
  }
  // Map ean → existing wells store_product item (para update in-place)
  const wellsItemByEan = {};
  for (const item of wellsSp.items) wellsItemByEan[item.ean] = item;

  let mergedExisting = 0;        // matched seed product by fingerprint
  let createdNew = 0;            // no match → criou produto novo
  let storeProductsAdded = 0;
  let storeProductsUpdated = 0;

  for (const wp of wellsToIntegrate) {
    // Determinar produto destino: prefer match fingerprint > EAN > criar novo
    const fp = productFingerprint(wp);
    let targetProduct = (fp && fpIndex[fp]) ||
                        (wp.ean && eanIndex[wp.ean]) ||
                        null;

    if (!targetProduct) {
      // Criar novo product no seed
      const productId = wp.ean || `wells-${wp.productId}`;
      if (eanIndex[productId]) {
        // já existe com este pseudoEAN (improvável mas defensivo)
        targetProduct = eanIndex[productId];
      } else {
        targetProduct = {
          ean: productId,
          name: wp.name,
          brand: displayBrand(wp.brand) || wp.brand,
          category: CATEGORY_MAP[wp.category],
          image_url: wp.image_url || null,
          _source: 'wells-catalog',
          _wells_product_id: wp.productId,
        };
        seed.products.push(targetProduct);
        if (fp) fpIndex[fp] = targetProduct;
        eanIndex[targetProduct.ean] = targetProduct;
        createdNew++;
      }
    } else {
      mergedExisting++;
      // Enriquecer existing com data Wells (image se em falta)
      if (!targetProduct.image_url && wp.image_url) targetProduct.image_url = wp.image_url;
    }

    // Construir store_product item usando o EAN do targetProduct
    const targetEan = targetProduct.ean;
    const variants = (wp.variants || [])
      .filter(v => v.volume_ml > 0 && v.price > 0)
      .map(v => ({
        volume_ml: v.volume_ml,
        unit: v.unit || 'ml',
        price: Number(v.price.toFixed(2)),
        in_stock: v.in_stock !== false,
        url: v.url || null,
      }));

    const item = {
      ean: targetEan,
      price: Number(wp.price.toFixed(2)),
      previous_price: null,
      discount_pct: null,
      in_stock: wp.in_stock !== false,
      url: wp.url,
      verified: true,
      verified_url: true,
      verified_at: wp.scraped_at || wellsData.scraped_at,
      source: 'scraped',
      variants: variants.length > 0 ? variants : undefined,
    };

    if (wellsItemByEan[targetEan]) {
      const idx = wellsSp.items.findIndex(it => it.ean === targetEan);
      wellsSp.items[idx] = item;
      storeProductsUpdated++;
    } else {
      wellsSp.items.push(item);
      wellsItemByEan[targetEan] = item;
      storeProductsAdded++;
    }
  }

  console.log(`✓ Wells products matched existing (via fingerprint): ${mergedExisting}`);
  console.log(`✓ Wells products novos criados: ${createdNew}`);
  console.log(`✓ Wells store_products: ${storeProductsAdded} added, ${storeProductsUpdated} updated`);

  // 9) Stats by category
  const byCat = {};
  for (const p of seed.products) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log('\n══════ Catálogo final por categoria ══════');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(` ${cat.padEnd(15)} ${n}`);
  });
  console.log(` ${'TOTAL'.padEnd(15)} ${seed.products.length}`);

  // 10) Escrever (se não dry-run)
  if (DRY_RUN) {
    console.log(`\n[DRY-RUN] Não escrevi nada. Removerá --dry-run para aplicar.`);
    return;
  }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} (${(fs.statSync(SEED_BUNDLE).size / 1024).toFixed(0)} KB)`);

  // 11) Re-inject no demo.html
  console.log('\n▶ A re-injectar no demo.html...');
  const injectResult = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  if (injectResult.status === 0) {
    console.log('\n✅ Integração completa. Abre demo.html e faz hard refresh (Ctrl+Shift+R).');
    console.log(`   Produtos antes: ${productsBefore}`);
    console.log(`   Produtos agora: ${seed.products.length}`);
    console.log(`   Δ: +${seed.products.length - productsBefore}`);
  } else {
    console.error('\n⚠ inject-seed-into-demo.js falhou. Corre manualmente:');
    console.error('  node scripts/inject-seed-into-demo.js');
  }
})();
