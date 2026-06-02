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

// ───────────────────────────────────────────────────────────────────────
// 0) PRE-PASS: colapsar registos que partilham EAN idêntico.
//    Dois produtos com o mesmo EAN são, por definição, o mesmo produto (o
//    EAN é a chave primária). Isto apanha duplicados cross-língua — ex.:
//    SweetCare com nome EN antigo + nome PT actual no mesmo `sweetcare-<slug>`
//    — que o agrupamento por fingerprint NÃO vê, porque os nomes (e logo os
//    fingerprints) diferem. Mantém o registo com nome PT (preferência) e faz
//    backfill de marca/imagem/categoria a partir dos descartados. Idempotente.
function collapseByEan(seed) {
  const EN = /\b(mask|soap|deodorant|anti-?perspirant|treatment|leave-in|free|for|cream|with|hair|skin|cleansing|roll-on|protection|bar|lotion|body|perfumed)\b/i;
  const PT = /\b(m[aá]scara|sabonete|desodorizante|antitranspirante|tratamento|creme|cabelo|pele|sem|para|com|[aá]gua|tecido|protetor|hidratante|esfoliante|leite|corporal|perfumado)\b/i;
  const ACC = /[ãõçáéíóúâêô]/i;
  const ptScore = (n) => { n = n || ''; let s = 0; if (PT.test(n)) s += 2; if (ACC.test(n)) s += 1; if (EN.test(n)) s -= 2; return s; };
  const pickCanonical = (g) => g.slice().sort((a, b) => {
    const ps = ptScore(b.name) - ptScore(a.name); if (ps) return ps;     // nome PT primeiro
    const br = (b.brand ? 1 : 0) - (a.brand ? 1 : 0); if (br) return br;  // depois marca não-nula
    return (a.name || '').length - (b.name || '').length;                // tiebreak: nome mais curto
  })[0];

  const byEan = {};
  for (const p of seed.products) (byEan[p.ean] ||= []).push(p);
  const drop = new Set();
  let collapsed = 0;
  for (const g of Object.values(byEan)) {
    if (g.length < 2) continue;
    const canonical = pickCanonical(g);
    for (const p of g) {
      if (p === canonical) continue;
      if (!canonical.brand && p.brand) canonical.brand = p.brand;
      if (!canonical.image_url && p.image_url) canonical.image_url = p.image_url;
      if (!canonical.category && p.category) canonical.category = p.category;
      drop.add(p);
      collapsed++;
    }
  }
  if (collapsed) {
    seed.products = seed.products.filter(p => !drop.has(p));
    // store_products: itens partilham o mesmo EAN → dedup por EAN, mantendo
    // o verified_at mais recente (não há remap: o EAN não muda).
    for (const sp of seed.store_products) {
      const byItemEan = {};
      for (const item of sp.items) {
        const ex = byItemEan[item.ean];
        if (!ex) { byItemEan[item.ean] = item; continue; }
        byItemEan[item.ean] = (item.verified_at || '') > (ex.verified_at || '') ? item : ex;
      }
      sp.items = Object.values(byItemEan);
    }
  }
  return collapsed;
}
const eanCollapsed = collapseByEan(seed);
if (eanCollapsed) console.log(`🧹 EAN-collapse: ${eanCollapsed} registos com EAN duplicado fundidos (mesmo EAN = mesmo produto)\n`);

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
  console.log('✅ Nenhum duplicado por fingerprint.');
  // Mesmo sem dups de fingerprint, se o EAN-collapse fundiu registos e
  // estamos em --apply, é preciso persistir o resultado.
  if (APPLY && !DRY_RUN && eanCollapsed) {
    fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
    console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} (apenas EAN-collapse: ${eanCollapsed} registos).`);
  }
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
