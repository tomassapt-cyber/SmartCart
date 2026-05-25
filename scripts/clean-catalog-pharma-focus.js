#!/usr/bin/env node
/**
 * GirlMath — Limpeza do catálogo para foco "farmácia/dermocosmética"
 * ============================================================
 *
 * Operações:
 *  A) Remove produtos das categorias makeup e perfume (não-dermocosmética)
 *  B) Funde categoria 'haircare' em 'hair' (duplicada por bug de normalização)
 *  C) Remove marcas com ≤ MIN_BRAND_PRODUCTS produtos (long-tail noise)
 *  D) Remove ofertas órfãs (sem produto associado) + produtos sem ofertas
 *
 * Uso:
 *   node scripts/clean-catalog-pharma-focus.js              # dry-run (default)
 *   node scripts/clean-catalog-pharma-focus.js --apply      # aplicar
 *   node scripts/clean-catalog-pharma-focus.js --min-brand-products=3
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const MIN_BRAND_PRODUCTS = args['min-brand-products'] ? parseInt(args['min-brand-products'], 10) : 3;

// Categorias a REMOVER (não-dermocosmética)
const REMOVE_CATEGORIES = new Set(['makeup', 'perfume', 'fragrance']);
// Renaming (merge)
const CATEGORY_RENAME = { 'haircare': 'hair' };

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const before = {
    products: seed.products.length,
    offers: seed.store_products.reduce((a, sp) => a + sp.items.length, 0),
    stores: seed.stores.length,
  };

  console.log('📊 Estado actual:');
  console.log(`  Produtos: ${before.products}`);
  console.log(`  Ofertas:  ${before.offers}`);
  console.log(`  Lojas:    ${before.stores}\n`);

  // ── A) Identificar produtos por categoria ──
  const byCat = {};
  for (const p of seed.products) {
    const c = p.category || '?';
    byCat[c] = (byCat[c] || 0) + 1;
  }
  console.log('Categorias actuais:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c.padEnd(12)} ${n}`));
  console.log('');

  // ── B) Aplicar renames (haircare → hair) ──
  let renamed = 0;
  for (const p of seed.products) {
    if (CATEGORY_RENAME[p.category]) {
      p.category = CATEGORY_RENAME[p.category];
      renamed++;
    }
  }
  console.log(`✓ Renamed ${renamed} produtos: ${Object.entries(CATEGORY_RENAME).map(([f, t]) => `${f}→${t}`).join(', ')}\n`);

  // ── C) Identificar marcas long-tail ──
  const byBrand = {};
  for (const p of seed.products) byBrand[p.brand || '?'] = (byBrand[p.brand || '?'] || 0) + 1;
  const longTailBrands = new Set(
    Object.entries(byBrand).filter(([, n]) => n < MIN_BRAND_PRODUCTS).map(([b]) => b)
  );
  console.log(`Marcas com < ${MIN_BRAND_PRODUCTS} produtos (long tail): ${longTailBrands.size}`);

  // ── D) Filtrar produtos ──
  const beforeProducts = seed.products.length;
  const removed = { byCategory: 0, byLongTailBrand: 0 };
  seed.products = seed.products.filter(p => {
    if (REMOVE_CATEGORIES.has(p.category)) { removed.byCategory++; return false; }
    if (longTailBrands.has(p.brand)) { removed.byLongTailBrand++; return false; }
    return true;
  });
  console.log(`\nProdutos removidos:`);
  console.log(`  Por categoria (${[...REMOVE_CATEGORIES].join(', ')}): ${removed.byCategory}`);
  console.log(`  Por long-tail brand:                                  ${removed.byLongTailBrand}`);

  // ── E) Remover ofertas órfãs (cujo EAN já não existe em produtos) ──
  const eans = new Set(seed.products.map(p => p.ean));
  let removedOffers = 0;
  for (const sp of seed.store_products) {
    const before = sp.items.length;
    sp.items = sp.items.filter(it => eans.has(it.ean));
    removedOffers += before - sp.items.length;
  }
  console.log(`  Ofertas órfãs removidas:                              ${removedOffers}`);

  // ── F) Produtos órfãos (sem qualquer oferta restante) ──
  const eansWithOffer = new Set();
  for (const sp of seed.store_products) for (const it of sp.items) eansWithOffer.add(it.ean);
  const orphans = seed.products.filter(p => !eansWithOffer.has(p.ean));
  seed.products = seed.products.filter(p => eansWithOffer.has(p.ean));
  console.log(`  Produtos órfãos (sem ofertas restantes) removidos:    ${orphans.length}`);

  const after = {
    products: seed.products.length,
    offers: seed.store_products.reduce((a, sp) => a + sp.items.length, 0),
  };

  console.log(`\n══════ Sumário ══════`);
  console.log(`  Produtos: ${beforeProducts} → ${after.products} (−${beforeProducts - after.products})`);
  console.log(`  Ofertas:  ${before.offers} → ${after.offers} (−${before.offers - after.offers})`);

  const finalByCat = {};
  for (const p of seed.products) finalByCat[p.category || '?'] = (finalByCat[p.category || '?'] || 0) + 1;
  console.log('\nCategorias finais:');
  Object.entries(finalByCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c.padEnd(12)} ${n}`));

  const finalByBrand = {};
  for (const p of seed.products) finalByBrand[p.brand || '?'] = (finalByBrand[p.brand || '?'] || 0) + 1;
  console.log(`\nMarcas únicas: ${Object.keys(finalByBrand).length} (cada uma com ≥${MIN_BRAND_PRODUCTS} produtos)`);

  if (!APPLY) {
    console.log('\n[DRY-RUN] Re-corre com --apply para aplicar mudanças.');
    return;
  }

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED}`);

  console.log('\n▶ Re-injectando no demo.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Catálogo limpo com foco farmácia/dermocosmética.');
})();
