#!/usr/bin/env node
/**
 * SmartCart/CosMath — Merge cross-store por CNP (Código Nacional do Produto)
 * ============================================================
 * Resgata produtos de EAN SINTÉTICO ligando-os ao irmão que partilha o mesmo
 * CNP (7 díg) — código nacional partilhado entre farmácias PT. Pós-processo,
 * estilo `dedup-audit.js`: corre DEPOIS dos integradores.
 *
 * O CNP NÃO é 1:1 com o SKU (às vezes é código de LINHA — junta produtos
 * distintos da mesma gama). Por isso a REGRA SEGURA (anti over-merge):
 *   1. EAN real manda: se um grupo-CNP tem ≥2 EANs reais DISTINTOS → RECUSAR
 *      (confia nos GTINs, não fundir).
 *   2. CNP só resgata sintéticos: liga synth→real (ou synth→synth) do mesmo CNP.
 *   3. Guarda de marca: só funde EANs cuja marca canónica coincide.
 *
 * Fonte do CNP: catálogos em data/catalog/*.json com `cnp` ou `sku` de 7 díg,
 * juntos ao seed por URL (seed.store_products[store].items[].url).
 *
 * Uso:
 *   node scripts/apply-cnp-merge.js              # DRY-RUN (default) — não escreve
 *   node scripts/apply-cnp-merge.js --apply      # aplica no seed-bundle.json
 *   node scripts/apply-cnp-merge.js --apply --inject   # + re-injecta no demo
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalizeBrand } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const APPLY = !!args.apply;
const INJECT = !!args.inject;

const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
const isRealEan = s => /^\d{12,14}$/.test(String(s || '').trim());

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
const productByEan = {};
for (const p of seed.products) productByEan[p.ean] = p;

// ── 1) cnp → Set(ean canónico), via join catálogo↔seed por URL ──
// Auto-deteta qualquer catálogo cujo `cnp`/`sku` seja CNP de 7 díg.
const cnpByUrl = {};           // url da loja → cnp
let catalogsUsed = [];
for (const file of fs.readdirSync(CATALOG_DIR)) {
  if (!file.endsWith('-full.json')) continue;
  let cat; try { cat = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, file), 'utf8')); } catch { continue; }
  let n = 0;
  for (const p of cat.products || []) {
    if (!p || !p.url) continue;
    const cnp = isCnp(p.cnp) ? String(p.cnp).trim() : (isCnp(p.sku) ? String(p.sku).trim() : null);
    if (cnp) { cnpByUrl[p.url] = cnp; n++; }
  }
  if (n > 0) catalogsUsed.push(`${file.replace('-full.json', '')}(${n})`);
}

const eansByCnp = {};          // cnp → Set(ean)
for (const g of seed.store_products) {
  for (const it of g.items) {
    const cnp = cnpByUrl[it.url];
    if (!cnp || !it.ean) continue;
    (eansByCnp[cnp] = eansByCnp[cnp] || new Set()).add(it.ean);
  }
}

// ── 2) Decidir merges sob a regra segura ──
const eanRemap = {};           // synth ean → canonical ean
const refused = [];            // grupos-CNP recusados (conflito de EANs reais)
const skippedBrand = [];       // grupos saltados por marca divergente
const accepted = [];           // [cnp, canonicalEan, [mergedEans]]

for (const [cnp, set] of Object.entries(eansByCnp)) {
  if (set.size < 2) continue;
  const eans = [...set];
  const realEans = eans.filter(isRealEan);
  // Regra 1: ≥2 EANs reais distintos → RECUSAR
  if (realEans.length >= 2) { refused.push([cnp, eans]); continue; }

  // Regra 3: guarda de marca — todos os produtos têm de partilhar marca canónica
  const brands = new Set(eans.map(e => normalizeBrand((productByEan[e] || {}).brand)).filter(Boolean));
  if (brands.size > 1) { skippedBrand.push([cnp, eans]); continue; }

  // Canonical: o EAN real se existir; senão o produto presente em mais lojas.
  let canonical;
  if (realEans.length === 1) {
    canonical = realEans[0];
  } else {
    canonical = eans.slice().sort((a, b) => storesForEan(b) - storesForEan(a))[0];
  }
  const merged = [];
  for (const e of eans) {
    if (e === canonical) continue;
    if (isRealEan(e)) continue;             // nunca remapear um EAN real
    if (eanRemap[e]) continue;              // já remapeado por outro CNP
    eanRemap[e] = canonical;
    merged.push(e);
  }
  if (merged.length) accepted.push([cnp, canonical, merged]);
}

function storesForEan(ean) {
  let n = 0;
  for (const g of seed.store_products) if (g.items.some(it => it.ean === ean)) n++;
  return n;
}

// ── 3) Aplicar remap (igual ao dedup-audit) ──
function applyRemap() {
  let storeMerges = 0;
  for (const sp of seed.store_products) {
    const seen = new Set(); const out = [];
    for (const item of sp.items) {
      const r = eanRemap[item.ean] || item.ean;
      if (seen.has(r)) {
        const idx = out.findIndex(it => it.ean === r);
        const newer = (item.verified_at || '') > (out[idx].verified_at || '') ? item : out[idx];
        out[idx] = { ...newer, ean: r }; storeMerges++; continue;
      }
      seen.add(r); out.push({ ...item, ean: r });
    }
    sp.items = out;
  }
  // Enriquecer canonical com imagem do sintético se faltar; remover sintéticos
  for (const [synth, canon] of Object.entries(eanRemap)) {
    const c = productByEan[canon], s = productByEan[synth];
    if (c && s && !c.image_url && s.image_url) c.image_url = s.image_url;
  }
  const drop = new Set(Object.keys(eanRemap));
  const before = seed.products.length;
  seed.products = seed.products.filter(p => !drop.has(p.ean));
  return { storeMerges, removed: before - seed.products.length };
}

// ── 4) Relatório ──
console.log('══════ apply-cnp-merge ══════');
console.log(`  Catálogos com CNP: ${catalogsUsed.join(', ') || '(nenhum)'}`);
console.log(`  CNPs com ≥2 EANs:  ${Object.values(eansByCnp).filter(s => s.size >= 2).length}`);
console.log(`    ├─ aceites (resgate seguro):  ${accepted.length}  → ${Object.keys(eanRemap).length} sintéticos remapeados`);
console.log(`    ├─ recusados (≥2 EANs reais): ${refused.length}`);
console.log(`    └─ saltados (marca divergente): ${skippedBrand.length}`);
console.log('\n  Amostra de resgates aceites:');
for (const [cnp, canon, merged] of accepted.slice(0, 15)) {
  const cn = (productByEan[canon] || {}).name || '?';
  console.log(`    ${cnp}: ${canon} "${cn.slice(0, 34)}"  ⟵ ${merged.length} synth`);
}
if (skippedBrand.length) {
  console.log('\n  Amostra saltados por marca (verificar não serem perdas):');
  for (const [cnp, eans] of skippedBrand.slice(0, 6)) {
    console.log(`    ${cnp}: ${eans.map(e => `${normalizeBrand((productByEan[e]||{}).brand)||'?'}:${e}`).join(' | ')}`);
  }
}

const before = seed.products.length;
const res = applyRemap();
console.log(`\n  Produtos: ${before} → ${seed.products.length}  (−${res.removed})`);
console.log(`  Store_products fundidos: ${res.storeMerges}`);

if (!APPLY) {
  console.log('\n[DRY-RUN] Nada escrito. Para aplicar: node scripts/apply-cnp-merge.js --apply');
  process.exit(0);
}

fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);
if (INJECT) {
  console.log('\n▶ Re-injectando no demo.html + index.html...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ apply-cnp-merge completo.');
} else {
  console.log('\nPróximo: node scripts/inject-seed-into-demo.js');
}
