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

function normalizeBrand(brand) {
  if (!brand) return null;
  const b = brand.trim();
  // Variantes conhecidas
  if (/yves saint laurent|^ysl$/i.test(b)) return 'Yves Saint Laurent';
  if (/^la roche[\s\-]?posay$/i.test(b)) return 'La Roche-Posay';
  if (/^estée\s*lauder|estee\s*lauder/i.test(b)) return 'Estée Lauder';
  if (/^l[''’]?or[ée]al/i.test(b)) {
    if (/professionnel|paris/i.test(b)) return b;
    return "L'Oréal Paris";
  }
  if (/^lanc[oô]me$/i.test(b)) return 'Lancôme';
  return b;
}

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

  // 5) Identificar Wells products já no seed (por EAN ou productId-as-EAN)
  const seedEans = new Set(seed.products.map(p => p.ean));
  const wellsStoreSlug = 'wells';

  // 6) Construir products[] estendido
  const productsBefore = seed.products.length;
  const newProducts = [];

  for (const wp of wellsToIntegrate) {
    // Se Wells deu EAN, usamos esse. Senão usamos prefixo "wells-<productId>"
    const productId = wp.ean || `wells-${wp.productId}`;

    if (seedEans.has(productId)) continue; // já existe, skip add (mas vamos juntar a oferta abaixo)

    newProducts.push({
      ean: productId,
      name: wp.name,
      brand: normalizeBrand(wp.brand),
      category: CATEGORY_MAP[wp.category],
      image_url: wp.image_url || null,
      _source: 'wells-catalog',
      _wells_product_id: wp.productId,
    });
    seedEans.add(productId);
  }

  console.log(`✓ Produtos novos a adicionar ao seed: ${newProducts.length}`);

  // 7) Construir store_products[] para Wells
  let wellsSp = seed.store_products.find(sp => sp.store_slug === wellsStoreSlug);
  if (!wellsSp) {
    wellsSp = { store_slug: wellsStoreSlug, items: [] };
    seed.store_products.push(wellsSp);
  }
  const wellsEansInExisting = new Set(wellsSp.items.map(it => it.ean));

  let added = 0;
  let updated = 0;
  for (const wp of wellsToIntegrate) {
    const productId = wp.ean || `wells-${wp.productId}`;
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
      ean: productId,
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

    if (wellsEansInExisting.has(productId)) {
      // Update in place
      const idx = wellsSp.items.findIndex(it => it.ean === productId);
      wellsSp.items[idx] = item;
      updated++;
    } else {
      wellsSp.items.push(item);
      added++;
    }
  }

  // 8) Merge no seed
  seed.products.push(...newProducts);

  console.log(`✓ Wells store_products: ${added} novos, ${updated} actualizados`);

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
