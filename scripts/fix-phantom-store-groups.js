#!/usr/bin/env node
/**
 * Funde grupos de store_products "fantasma" (slug errado, criado pelo bug do
 * create-comparable que usava o nome do ficheiro) no grupo real, e remove o
 * fantasma. Idempotente.
 *
 *   lojafarmacia → loja-farmacia
 *   pharmagdd    → pharma-gdd
 *
 * Uso: node scripts/fix-phantom-store-groups.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const SEED = path.join(__dirname, '..', 'data', 'seed-bundle.json');
const DRY = process.argv.includes('--dry-run');
const MERGES = { lojafarmacia: 'loja-farmacia', pharmagdd: 'pharma-gdd' };

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
let moved = 0, dropped = 0, removedGroups = 0;

for (const [phantom, real] of Object.entries(MERGES)) {
  const pg = seed.store_products.find(g => g.store_slug === phantom);
  if (!pg) { console.log(`• ${phantom}: sem grupo fantasma (ok)`); continue; }
  let rg = seed.store_products.find(g => g.store_slug === real);
  if (!rg) { rg = { store_slug: real, items: [] }; seed.store_products.push(rg); }
  const realEans = new Set(rg.items.map(i => i.ean));
  for (const it of pg.items) {
    if (realEans.has(it.ean)) { dropped++; continue; }  // real já tem (mais fidedigno) → descartar fantasma
    rg.items.push(it); realEans.add(it.ean); moved++;
  }
  // remover grupo fantasma
  seed.store_products = seed.store_products.filter(g => g.store_slug !== phantom);
  removedGroups++;
  console.log(`✓ ${phantom} → ${real}: ${pg.items.length} itens (${moved} movidos, ${dropped} já existiam)`);
  // também remover qualquer entrada de loja fantasma em seed.stores[]
  const before = seed.stores.length;
  seed.stores = seed.stores.filter(s => s.slug !== phantom);
  if (seed.stores.length < before) console.log(`  (removida entrada fantasma de seed.stores[${phantom}])`);
}

console.log(`\nResumo: ${moved} ofertas movidas, ${dropped} duplicadas descartadas, ${removedGroups} grupos fantasma removidos.`);
console.log(`Grupos store_products agora: ${seed.store_products.length} | lojas: ${seed.stores.length}`);
if (DRY) { console.log('🧪 --dry-run: nada gravado.'); process.exit(0); }
fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
console.log('✔ seed gravado. Corre inject-seed-into-demo.js');
