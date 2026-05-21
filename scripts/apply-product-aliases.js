#!/usr/bin/env node
/**
 * apply-product-aliases — funde produtos listados em data/product-aliases.json.
 *
 * Use para casos onde nenhum algoritmo automático apanha (e.g. rebrands
 * marketing, EANs diferentes mesmo produto, etc.).
 *
 * O ficheiro tem o formato:
 *   { canonical_ean: { aliases: [ean1, ean2], reason: "..." } }
 *
 * Uso:
 *   node scripts/apply-product-aliases.js --dry-run
 *   node scripts/apply-product-aliases.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const ALIASES_FILE = path.join(ROOT, 'data', 'product-aliases.json');
const DRY_RUN = process.argv.includes('--dry-run');

if (!fs.existsSync(ALIASES_FILE)) {
  console.log('ℹ Sem ficheiro data/product-aliases.json — nada a fazer.');
  process.exit(0);
}

const aliases = JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8'));
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

const eanRemap = {};
let groupCount = 0;
for (const [canonical, def] of Object.entries(aliases)) {
  if (canonical.startsWith('_')) continue; // skip comments
  if (!def.aliases?.length) continue;
  const canonicalProduct = seed.products.find(p => p.ean === canonical);
  if (!canonicalProduct) {
    console.warn(`⚠ canonical EAN ${canonical} não existe no seed — a saltar.`);
    continue;
  }
  console.log(`\n  ${canonical} (${canonicalProduct.brand} ${canonicalProduct.name.slice(0,50)})`);
  for (const alias of def.aliases) {
    const aliasProduct = seed.products.find(p => p.ean === alias);
    if (!aliasProduct) {
      console.warn(`    ⚠ alias ${alias} não existe — saltar`);
      continue;
    }
    console.log(`    ← ${alias} (${aliasProduct.name.slice(0,50)})`);
    eanRemap[alias] = canonical;
  }
  groupCount++;
}

console.log(`\n📋 ${Object.keys(eanRemap).length} aliases em ${groupCount} canonicals`);

if (Object.keys(eanRemap).length === 0) {
  console.log('Nada para fundir.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n[DRY-RUN] Não escrito.');
  process.exit(0);
}

// Remapear store_products items (merge variants)
let merged = 0;
for (const sp of seed.store_products) {
  const newItems = [];
  const itemByEan = {};
  for (const item of sp.items) {
    const targetEan = eanRemap[item.ean] || item.ean;
    if (itemByEan[targetEan]) {
      const existing = itemByEan[targetEan];
      const incomingVariants = item.variants || [];
      const allVariants = [...(existing.variants || [])];
      for (const v of incomingVariants) {
        if (!v.volume_ml) continue;
        const dup = allVariants.find(ev => ev.volume_ml === v.volume_ml && ev.url === v.url);
        if (!dup) allVariants.push(v);
        else if (v.price < dup.price) dup.price = v.price;
      }
      allVariants.sort((a, b) => (a.volume_ml || 0) - (b.volume_ml || 0));
      existing.variants = allVariants.length ? allVariants : existing.variants;
      if (item.price < existing.price) {
        existing.price = item.price;
        existing.url = item.url;
      }
      merged++;
    } else {
      item.ean = targetEan;
      newItems.push(item);
      itemByEan[targetEan] = item;
    }
  }
  sp.items = newItems;
}

const removed = new Set(Object.keys(eanRemap));
const before = seed.products.length;
seed.products = seed.products.filter(p => !removed.has(p.ean));
console.log(`\n✓ Aplicado: ${before - seed.products.length} produtos removidos; ${merged} store_products fundidos`);
console.log(`  Catálogo: ${seed.products.length} produtos`);

fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
console.log(`✓ Escrito ${SEED.replace(ROOT, '.')}`);
