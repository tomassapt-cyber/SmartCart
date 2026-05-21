#!/usr/bin/env node
/**
 * merge-image-duplicates — funde produtos que partilham a mesma image_url.
 *
 * Estratégia (apenas image dups, sinal forte):
 *  - Agrupar produtos por image_url
 *  - Para cada grupo: escolher canonical (EAN real GTIN-13 > wells-* > primeiro)
 *  - Remapear todos os store_products items para o canonical EAN
 *  - Re-correr o variant merge para juntar volumes do mesmo produto
 *  - Remover entradas duplicadas em PRODUCTS
 *
 * Ignora o Druni placeholder image (não é duplicado, são produtos sem imagem).
 *
 * Uso:
 *   node scripts/merge-image-duplicates.js --dry-run   (mostra o que faria)
 *   node scripts/merge-image-duplicates.js             (aplica e escreve)
 */

const fs = require('fs');
const path = require('path');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const DRY_RUN = process.argv.includes('--dry-run');

const PLACEHOLDER_IMG = /placeholder/i;

function isRealEan(ean) { return /^\d{8,14}$/.test(ean || ''); }

function pickCanonical(group) {
  const real = group.find(p => isRealEan(p.ean));
  if (real) return real;
  const nonWells = group.find(p => !p.ean.startsWith('wells-') && !p.ean.startsWith('druni-'));
  if (nonWells) return nonWells;
  return group[0];
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const products = seed.products;
  console.log(`📦 ${products.length} produtos no seed`);

  // 1) Agrupar por image_url
  const byImage = {};
  for (const p of products) {
    if (!p.image_url || PLACEHOLDER_IMG.test(p.image_url)) continue;
    if (!byImage[p.image_url]) byImage[p.image_url] = [];
    byImage[p.image_url].push(p);
  }
  const dupGroups = Object.entries(byImage).filter(([, ps]) => ps.length > 1);
  console.log(`🖼  ${dupGroups.length} grupos com mesma imagem (não-placeholder)\n`);

  if (dupGroups.length === 0) {
    console.log('✓ Sem duplicados por imagem.');
    return;
  }

  // 2) Construir eanRemap
  const eanRemap = {};
  let mergedProducts = 0;
  for (const [img, group] of dupGroups) {
    const canonical = pickCanonical(group);
    for (const p of group) {
      if (p === canonical) continue;
      eanRemap[p.ean] = canonical.ean;
      mergedProducts++;
      console.log(`  ${p.ean.padEnd(20)} → ${canonical.ean.padEnd(15)} (${canonical.brand} ${canonical.name.slice(0, 40)})`);
    }
  }
  console.log(`\n  Total a fundir: ${mergedProducts} produtos em ${dupGroups.length} canonicals`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Não escrito.');
    return;
  }

  // 3) Remapear store_products: para cada item cujo ean está em eanRemap,
  //    re-upsertar no canonical EAN (que usa merge de variants).
  let storeProductsMerged = 0;
  let storeProductsKept = 0;
  for (const sp of seed.store_products) {
    const newItems = [];
    const itemByEan = {};
    for (const item of sp.items) {
      const targetEan = eanRemap[item.ean] || item.ean;
      // Re-criar o item como se fosse um "scraped product" para reutilizar upsertStoreItem
      const fakeSp = { name: '', price: item.price, in_stock: item.in_stock, url: item.url, variants: item.variants, scraped_at: item.verified_at };
      // Mas precisamos manter campos extra (verified, source, etc)
      if (itemByEan[targetEan]) {
        // MERGE: juntar variants no item existente
        const existing = itemByEan[targetEan];
        const incomingVariants = item.variants || [{ volume_ml: null, price: item.price, in_stock: item.in_stock, url: item.url, unit: 'ml' }];
        const merged = [...(existing.variants || [])];
        for (const v of incomingVariants) {
          if (v.volume_ml == null) continue;
          const dup = merged.find(ev => ev.volume_ml === v.volume_ml && ev.url === v.url);
          if (!dup) merged.push(v);
          else if (v.price < dup.price) dup.price = v.price;
        }
        merged.sort((a, b) => (a.volume_ml || 0) - (b.volume_ml || 0));
        existing.variants = merged.length ? merged : existing.variants;
        // Price = min between both
        if (item.price < existing.price) {
          existing.price = item.price;
          existing.url = item.url;
        }
        storeProductsMerged++;
      } else {
        item.ean = targetEan;
        newItems.push(item);
        itemByEan[targetEan] = item;
        storeProductsKept++;
      }
    }
    sp.items = newItems;
  }

  console.log(`\n  store_products: ${storeProductsKept} mantidos, ${storeProductsMerged} fundidos (variants juntos)`);

  // 4) Remover produtos duplicados
  const removed = new Set(Object.keys(eanRemap));
  const before = products.length;
  seed.products = products.filter(p => !removed.has(p.ean));
  const after = seed.products.length;
  console.log(`  Produtos removidos: ${before - after}`);
  console.log(`  Catálogo final: ${after} produtos`);

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED.replace(ROOT, '.')}`);
})();
