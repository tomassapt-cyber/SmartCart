#!/usr/bin/env node
/**
 * SmartCart — Audit + cleanup de produtos duplicados no seed
 * ============================================================
 *
 * Lê data/seed-bundle.json, agrupa produtos por fingerprint canónico
 * (brand_normalized + name_canonical, sem volume), e:
 *
 *   - `--audit` (default): lista grupos com >1 produto (potenciais duplicados)
 *   - `--apply`: faz merge dos grupos confirmados em-place:
 *     · mantém o produto de menor EAN (geralmente o seed real, não wells-*)
 *     · move TODAS as store_products items de duplicados para o canonical
 *     · remove os duplicados de products[]
 *
 * Idempotente: correr 2× não muda nada após o 1º.
 *
 * Uso:
 *   node scripts/dedup-audit.js                 # só audit, mostra os grupos
 *   node scripts/dedup-audit.js --apply         # aplica merge
 *   node scripts/dedup-audit.js --apply --dry-run  # mostra o que faria
 *   node scripts/dedup-audit.js --min-group=2      # só grupos de N+ produtos
 */

const fs = require('fs');
const path = require('path');
const { productFingerprint } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const DRY_RUN = !!args['dry-run'];
const MIN_GROUP = args['min-group'] ? parseInt(args['min-group'], 10) : 2;

if (!fs.existsSync(SEED_BUNDLE)) {
  console.error('✗ Não existe', SEED_BUNDLE);
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

// 1) Agrupar products por fingerprint
const groups = {};
for (const p of seed.products) {
  const fp = productFingerprint(p);
  if (!fp) continue;
  (groups[fp] ||= []).push(p);
}

const dupGroups = Object.entries(groups).filter(([_, arr]) => arr.length >= MIN_GROUP);
dupGroups.sort((a, b) => b[1].length - a[1].length); // maior primeiro

console.log(`📊 Audit: ${seed.products.length} products, ${Object.keys(groups).length} fingerprints únicos`);
console.log(`   ${dupGroups.length} grupos com ≥${MIN_GROUP} produtos (potenciais duplicados)\n`);

if (dupGroups.length === 0) {
  console.log('✅ Nenhum duplicado detectado. Catálogo limpo.');
  process.exit(0);
}

// 2) Para cada grupo, decidir produto canónico:
//    preferir EAN real (numérico, 8+ dígitos) > wells-* > primeiro alfabeticamente
function isRealEan(ean) {
  return /^\d{8,14}$/.test(ean || '');
}
function pickCanonical(group) {
  // Preferência: EAN real > seed (não wells-) > wells-
  const realEan = group.find(p => isRealEan(p.ean));
  if (realEan) return realEan;
  const seedNonWells = group.find(p => !p.ean?.startsWith('wells-'));
  if (seedNonWells) return seedNonWells;
  return group[0];
}

// 3) Listar grupos
console.log('═══════ Grupos de duplicados ═══════\n');
let totalDupsToRemove = 0;
for (const [fp, group] of dupGroups.slice(0, 30)) {
  const canonical = pickCanonical(group);
  console.log(`▸ ${fp}  (${group.length} entries)`);
  group.forEach(p => {
    const marker = p === canonical ? '🟢 keep' : '🔴 merge into canonical';
    console.log(`  ${marker}  ${p.ean.padEnd(15)} | ${(p.name||'').slice(0, 60)}`);
  });
  totalDupsToRemove += group.length - 1;
  console.log('');
}
if (dupGroups.length > 30) console.log(`  ... +${dupGroups.length - 30} grupos não mostrados\n`);

console.log(`Total produtos a remover (se aplicar): ${totalDupsToRemove}`);
console.log(`Catálogo após merge: ${seed.products.length} - ${totalDupsToRemove} = ${seed.products.length - totalDupsToRemove} produtos\n`);

if (!APPLY) {
  console.log('💡 Para aplicar: node scripts/dedup-audit.js --apply');
  process.exit(0);
}

// 4) APPLY: fazer merge
console.log(APPLY && DRY_RUN ? '🔍 DRY-RUN: a calcular changes mas NÃO escrever' : '⚙ A aplicar merge...');

const eanRemap = {}; // ean duplicado → ean canónico
const productsToKeep = new Set();
for (const [fp, group] of dupGroups) {
  const canonical = pickCanonical(group);
  productsToKeep.add(canonical.ean);
  // Enriquecer canonical: se canonical não tem image, copiar de duplicate
  for (const p of group) {
    if (p === canonical) continue;
    eanRemap[p.ean] = canonical.ean;
    if (!canonical.image_url && p.image_url) canonical.image_url = p.image_url;
  }
}

// Re-mapear todos os store_products
let storeProductMerges = 0;
for (const sp of seed.store_products) {
  const seen = new Set();
  const newItems = [];
  for (const item of sp.items) {
    const remapped = eanRemap[item.ean] || item.ean;
    if (seen.has(remapped)) {
      // Já há item para este produto canónico nesta loja → manter o mais recente (verified_at)
      const idx = newItems.findIndex(it => it.ean === remapped);
      const existing = newItems[idx];
      const newer = (item.verified_at || '') > (existing.verified_at || '') ? item : existing;
      newItems[idx] = { ...newer, ean: remapped };
      storeProductMerges++;
      continue;
    }
    seen.add(remapped);
    newItems.push({ ...item, ean: remapped });
  }
  sp.items = newItems;
}

// Filtrar products: manter canonicals + produtos sem fingerprint duplicado
const dupEans = new Set(Object.keys(eanRemap));
const beforeCount = seed.products.length;
seed.products = seed.products.filter(p => !dupEans.has(p.ean));
const afterCount = seed.products.length;

console.log(`\n═══════ Resultado merge ═══════`);
console.log(`Products removidos: ${beforeCount - afterCount}`);
console.log(`Store_products merged: ${storeProductMerges}`);
console.log(`Catálogo final: ${afterCount} produtos`);

if (DRY_RUN) {
  console.log('\n[DRY-RUN] Não escrevi nada.');
  process.exit(0);
}

fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);
console.log(`\nPróximo: node scripts/inject-seed-into-demo.js  ← re-injecta no demo.html`);
