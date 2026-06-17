#!/usr/bin/env node
/**
 * Medição (READ-ONLY) do ganho potencial de matching por CNP.
 * ============================================================
 * Não escreve nada. Estima quantos produtos canónicos ganhariam loja(s)
 * extra se ligássemos ofertas pelo CNP (Código Nacional do Produto, 7 díg)
 * a par do EAN/fingerprint.
 *
 * Método: para as lojas cujo catálogo já tem `sku`=CNP, faz join por URL
 * com seed.store_products[store].items para obter (cnp → ean canónico).
 * Depois agrupa por CNP: se um mesmo CNP aparece sob ≥2 EANs canónicos
 * distintos, esses produtos estão hoje SEPARADOS e o CNP fundi-los-ia.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seed-bundle.json'), 'utf8'));

const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
const isRealEan = s => /^\d{12,14}$/.test(String(s || '').trim());

// Lojas cujo catálogo guarda sku=CNP (descoberto na sondagem)
const CNP_STORES = [
  ['loja-farmacia', 'lojafarmacia-full.json'],
  ['asuafarmaciaonline', 'asuafarmaciaonline-full.json'],
  ['aminhafarmaciaonline', 'aminhafarmaciaonline-full.json'],
];

// ean → nº de lojas que o oferecem (para saber o que é single-store hoje)
const storesPerEan = {};
for (const g of seed.store_products) {
  for (const it of g.items) {
    if (!it.ean) continue;
    (storesPerEan[it.ean] = storesPerEan[it.ean] || new Set()).add(g.store_slug);
  }
}

// (cnp → Set de eans canónicos) juntando todas as lojas com CNP
const eansByCnp = {};
let joined = 0, missCnp = 0, missJoin = 0;

for (const [slug, file] of CNP_STORES) {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog', file), 'utf8'));
  const cnpByUrl = {};
  for (const p of cat.products || []) {
    if (p && p.url && isCnp(p.sku)) cnpByUrl[p.url] = String(p.sku).trim();
  }
  const g = seed.store_products.find(x => x.store_slug === slug);
  if (!g) continue;
  for (const it of g.items) {
    const cnp = cnpByUrl[it.url];
    if (!cnp) { if (cnpByUrl[it.url] === undefined) missJoin++; continue; }
    if (!it.ean) continue;
    (eansByCnp[cnp] = eansByCnp[cnp] || new Set()).add(it.ean);
    joined++;
  }
}

// Análise — separar ganho SEGURO de CONFLITO (≥2 EANs reais distintos)
let cnpMultiEan = 0;
let safeCnp = 0, conflictCnp = 0;
let safeSynthMerged = new Set();   // produtos sintéticos que ganhariam irmão (seguro)
const safeSamples = [], conflictSamples = [];
for (const [cnp, set] of Object.entries(eansByCnp)) {
  if (set.size < 2) continue;
  cnpMultiEan++;
  const eans = [...set];
  const realEans = eans.filter(isRealEan);
  if (realEans.length >= 2) {
    // CONFLITO: dois+ GTINs reais distintos → NÃO fundir (EAN manda)
    conflictCnp++;
    if (conflictSamples.length < 10) conflictSamples.push([cnp, eans]);
  } else {
    // SEGURO: ≤1 EAN real → CNP colapsa os sintéticos no real (ou entre si)
    safeCnp++;
    for (const e of eans) if (!isRealEan(e)) safeSynthMerged.add(e);
    if (safeSamples.length < 12) safeSamples.push([cnp, eans]);
  }
}

const label = e => {
  const p = seed.products.find(x => x.ean === e);
  return `${e}[${isRealEan(e) ? 'REAL' : 'synth'}] "${(p && p.name || '?').slice(0, 30)}"`;
};

console.log('══════ Medição do ganho por CNP (3 lojas com CNP) ══════');
console.log(`  Ofertas com CNP juntas ao seed:   ${joined}`);
console.log(`  CNPs distintos:                   ${Object.keys(eansByCnp).length}`);
console.log(`  CNPs que ligam ≥2 EANs:           ${cnpMultiEan}`);
console.log(`    ├─ SEGUROS (≤1 EAN real):       ${safeCnp}  ← merges a fazer`);
console.log(`    └─ CONFLITO (≥2 EANs reais):    ${conflictCnp}  ← RECUSAR (EAN manda)`);
console.log(`  Produtos sintéticos resgatados:   ${safeSynthMerged.size}  (ganham irmão via CNP, seguro)`);
console.log('');
console.log('  ── Amostra SEGURA (cnp → fundir):');
for (const [cnp, eans] of safeSamples) console.log(`    ${cnp} → ${eans.map(label).join('  |  ')}`);
console.log('\n  ── Amostra CONFLITO (cnp → NÃO fundir, produtos distintos):');
for (const [cnp, eans] of conflictSamples) console.log(`    ${cnp} → ${eans.map(label).join('  |  ')}`);
