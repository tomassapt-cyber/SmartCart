#!/usr/bin/env node
/**
 * GirlMath — Remove ofertas placeholder de lojas não-scraped
 * ============================================================
 *
 * Mantém apenas lojas cuja integração foi feita via scrape real:
 *   wells, druni, sweetcare, easyfarma
 *
 * Tudo o resto (42 lojas seed iniciais com 14-18 ofertas hardcoded
 * do build-catalog.js) é considerado placeholder e removido para
 * não confundir o utilizador com preços inventados.
 *
 * Side-effects:
 *  - Remove items[] das lojas não-scraped
 *  - Opcionalmente remove a entrada da loja do array stores[]
 *  - Remove produtos órfãos (sem qualquer oferta restante)
 *
 * Uso:
 *   node scripts/purge-placeholder-offers.js              # dry-run
 *   node scripts/purge-placeholder-offers.js --apply      # aplicar
 *   node scripts/purge-placeholder-offers.js --apply --keep-store-entries
 *     (mantém entrada da loja em stores[] mas com items vazios — útil
 *      se quiseres preparar terreno para próximo scrape)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const KEEP_STORE_ENTRIES = !!args['keep-store-entries'];

// ── Lojas com scrape real ──
// Adicionar aqui quando uma nova loja entrar em produção (com scrape+integrate).
const SCRAPED_STORES = new Set([
  'wells',
  'druni',
  'sweetcare',
  'easyfarma',
  'bairro-saude',
  'atida',
  'byfarma',
]);

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

  console.log('📊 Estado actual do seed:');
  console.log(`  Produtos:        ${seed.products.length}`);
  console.log(`  Lojas:           ${seed.stores.length}`);
  console.log(`  Store_products:  ${seed.store_products.length}`);
  console.log('');

  // 1. Categorizar lojas
  const toRemove = [];
  const toKeep = [];
  let placeholderItemsTotal = 0;
  for (const sp of seed.store_products) {
    if (SCRAPED_STORES.has(sp.store_slug)) {
      toKeep.push(sp);
    } else {
      toRemove.push(sp);
      placeholderItemsTotal += sp.items.length;
    }
  }

  console.log(`🔍 Lojas SCRAPED (mantém):     ${toKeep.length}`);
  toKeep.forEach(sp => console.log(`    ${sp.store_slug.padEnd(15)} ${sp.items.length} ofertas`));
  console.log('');
  console.log(`🗑  Lojas PLACEHOLDER (remove): ${toRemove.length}`);
  toRemove.forEach(sp => console.log(`    ${sp.store_slug.padEnd(15)} ${sp.items.length} ofertas placeholder`));
  console.log('');
  console.log(`  Total ofertas placeholder a remover: ${placeholderItemsTotal}`);

  // 2. EANs que ficariam órfãos
  const eansWithScrapedOffers = new Set();
  for (const sp of toKeep) {
    for (const it of sp.items) eansWithScrapedOffers.add(it.ean);
  }
  const eansLosingAllOffers = new Set();
  for (const sp of toRemove) {
    for (const it of sp.items) {
      if (!eansWithScrapedOffers.has(it.ean)) eansLosingAllOffers.add(it.ean);
    }
  }
  const orphanProducts = seed.products.filter(p => eansLosingAllOffers.has(p.ean));
  console.log(`\n⚠  Produtos órfãos (sem qualquer oferta scraped): ${orphanProducts.length}`);
  if (orphanProducts.length > 0 && orphanProducts.length <= 20) {
    orphanProducts.forEach(p => console.log(`    ${p.ean.padEnd(35)} ${p.brand} — ${p.name}`));
  } else if (orphanProducts.length > 20) {
    orphanProducts.slice(0, 10).forEach(p => console.log(`    ${p.ean.padEnd(35)} ${p.brand} — ${p.name}`));
    console.log(`    … e mais ${orphanProducts.length - 10}`);
  }

  console.log('\n══════ Resumo previsto ══════');
  console.log(`  Produtos antes:   ${seed.products.length}`);
  console.log(`  Produtos depois:  ${seed.products.length - orphanProducts.length}`);
  console.log(`  Lojas antes:      ${seed.stores.length}`);
  console.log(`  Lojas depois:     ${KEEP_STORE_ENTRIES ? seed.stores.length : toKeep.length}`);
  console.log(`  Ofertas antes:    ${seed.store_products.reduce((s, sp) => s + sp.items.length, 0)}`);
  console.log(`  Ofertas depois:   ${toKeep.reduce((s, sp) => s + sp.items.length, 0)}`);

  if (!APPLY) {
    console.log('\n[DRY-RUN] Re-corre com --apply para aplicar.');
    return;
  }

  // 3. Aplicar
  console.log('\n⚙ A aplicar mudanças…');

  // Remover store_products placeholder
  seed.store_products = toKeep;

  // Remover entradas de stores se não --keep-store-entries
  if (!KEEP_STORE_ENTRIES) {
    seed.stores = seed.stores.filter(s => SCRAPED_STORES.has(s.slug));
  }

  // Remover produtos órfãos
  seed.products = seed.products.filter(p => !eansLosingAllOffers.has(p.ean));

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);

  // 4. Re-injectar
  console.log('\n▶ Re-injectando no demo.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (r.status === 0) console.log('\n✅ Purga completa.');
})();
