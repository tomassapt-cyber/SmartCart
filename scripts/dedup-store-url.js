#!/usr/bin/env node
/**
 * SmartCart — Dedup de produtos por URL de loja (código p-XXXX)
 * ============================================================
 *
 * Apanha duplicados que o fingerprint deixa escapar: o MESMO produto
 * scrapado com nomes em línguas diferentes (PT vs EN) gera dois produtos
 * canónicos distintos — um com GTIN real (entrada antiga) e outro com EAN
 * placeholder (scrape novo) — partilhando a MESMA URL de loja.
 *
 * Sinal de merge: o código de produto da URL da loja (ex: sweetcare p-010735gl,
 * ou a URL completa para lojas sem código). Uma página de loja = UM produto.
 *
 * SEGURANÇA: só agrupa quando TODOS os EANs envolvidos são únicos no seed
 * (eanCount === 1). Assim, colisões pré-existentes de EAN truncado (produtos
 * DIFERENTES que por bug partilham um EAN placeholder) ficam de FORA — nunca
 * fundimos produtos distintos.
 *
 * Canónico do grupo: preferir GTIN real > produto com mais campos > 1º.
 * A oferta de cada loja mantém-se a MAIS FRESCA (verified_at), por isso o
 * preço correto/recente do scrape novo passa a aparecer no produto canónico.
 *
 * Uso:
 *   node scripts/dedup-store-url.js              # audit (dry-run)
 *   node scripts/dedup-store-url.js --apply      # aplica + re-injecta no HTML
 *   node scripts/dedup-store-url.js --apply --no-inject
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
const NO_INJECT = !!args['no-inject'];

const isRealEan = e => /^\d{8,14}$/.test(e || '');

function offerKey(storeSlug, url) {
  if (!url) return null;
  const m = url.match(/p-([0-9a-z]+)\/?$/i);
  if (m && m[1].length >= 4) return storeSlug + ':' + m[1].toLowerCase();
  const norm = url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('?')[0].toLowerCase();
  return storeSlug + '::' + norm;
}

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

const eanCount = {};
for (const p of seed.products) eanCount[p.ean] = (eanCount[p.ean] || 0) + 1;
const productByEan = {};
for (const p of seed.products) if (eanCount[p.ean] === 1) productByEan[p.ean] = p;

// ── Union-Find sobre EANs (todos únicos nos grupos seguros) ──────────────────
const parent = {};
const find = x => { parent[x] ??= x; return parent[x] === x ? x : (parent[x] = find(parent[x])); };
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

const isRealGtin = e => /^\d{12,14}$/.test(String(e || '')) && !/0{6,}/.test(String(e));
let safeGroups = 0, skippedCollision = 0, conflictRealEans = 0;
for (const sp of seed.store_products) {
  const byCode = {};
  for (const it of sp.items) {
    const k = offerKey(sp.store_slug, it.url);
    if (k) (byCode[k] ||= []).push(it);
  }
  for (const items of Object.values(byCode)) {
    if (items.length < 2) continue;
    // SEGURANÇA 1: todos os EANs do grupo têm de ser únicos no seed
    if (!items.every(it => eanCount[it.ean] === 1)) { skippedCollision++; continue; }
    const eans = [...new Set(items.map(it => it.ean))];
    // SEGURANÇA 2 (2026-07-04): NÃO fundir ≥2 GTINs REAIS distintos. Um mesmo
    // URL de loja sob dois EANs reais é um CONFLITO (item stale de um scraper
    // antigo + item fresco), NÃO o mesmo produto. Fundi-los espalhava um ÍMAN
    // (Klorane/Uriage colados no Olaplex Nº5P, a regenerar todos os dias).
    // A união por URL só é segura quando ≤1 GTIN real (resto sintético).
    if (eans.filter(isRealGtin).length >= 2) { conflictRealEans++; continue; }
    safeGroups++;
    for (let i = 1; i < eans.length; i++) union(eans[0], eans[i]);
  }
}

// Clusters de EANs
const clusters = {};
for (const p of seed.products) {
  if (eanCount[p.ean] !== 1) continue;
  if (parent[p.ean] === undefined) continue;
  (clusters[find(p.ean)] ||= new Set()).add(p.ean);
}
const dupClusters = Object.values(clusters).map(s => [...s]).filter(a => a.length >= 2);

console.log(`📊 ${seed.products.length} produtos`);
console.log(`   grupos de URL seguros: ${safeGroups} | ignorados (colisão EAN): ${skippedCollision} | conflitos 2+ GTIN real (não fundidos): ${conflictRealEans}`);
console.log(`   clusters a fundir: ${dupClusters.length}\n`);

if (dupClusters.length === 0) { console.log('✅ Nada a fundir.'); process.exit(0); }

function score(ean) {
  const p = productByEan[ean]; if (!p) return -1;
  return (isRealEan(ean) ? 100 : 0) + (p.image_url ? 2 : 0) + (p.brand ? 1 : 0) + (p.category ? 1 : 0);
}
function pickCanonical(eans) {
  return eans.slice().sort((a, b) => score(b) - score(a) || String(a).localeCompare(String(b)))[0];
}

// eanRemap: dup → canónico
const eanRemap = {};
for (const eans of dupClusters) {
  const canon = pickCanonical(eans);
  for (const e of eans) if (e !== canon) eanRemap[e] = canon;
}

// Exemplos (incl. Guerlain/La Mer se aplicável)
console.log('═══ Exemplos de merge ═══');
dupClusters.slice(0, 8).forEach(eans => {
  const canon = pickCanonical(eans);
  console.log(`▸ keep ${canon}  «${(productByEan[canon]?.name || '').slice(0, 40)}»`);
  eans.filter(e => e !== canon).forEach(e => console.log(`    merge ${e}  «${(productByEan[e]?.name || '').slice(0, 40)}»`));
});

if (!APPLY) { console.log('\n💡 Aplicar: node scripts/dedup-store-url.js --apply'); process.exit(0); }

// ── APPLY ────────────────────────────────────────────────────────────────────
let storeMerges = 0;
for (const sp of seed.store_products) {
  const seen = new Map(); // ean → idx em newItems
  const newItems = [];
  for (const item of sp.items) {
    const remapped = eanRemap[item.ean] || item.ean;
    if (seen.has(remapped)) {
      const idx = seen.get(remapped);
      const existing = newItems[idx];
      const newer = (item.verified_at || '') > (existing.verified_at || '') ? item : existing;
      newItems[idx] = { ...newer, ean: remapped };
      storeMerges++;
      continue;
    }
    seen.set(remapped, newItems.length);
    newItems.push({ ...item, ean: remapped });
  }
  sp.items = newItems;
}

// Enriquecer canónicos (imagem) + remover produtos fundidos
for (const eans of dupClusters) {
  const canon = pickCanonical(eans);
  const cp = productByEan[canon];
  for (const e of eans) {
    if (e === canon || !cp) continue;
    const dp = productByEan[e];
    if (cp && !cp.image_url && dp?.image_url) cp.image_url = dp.image_url;
  }
}
const dupEans = new Set(Object.keys(eanRemap));
const before = seed.products.length;
seed.products = seed.products.filter(p => !dupEans.has(p.ean));
const after = seed.products.length;

console.log(`\n═══ Resultado ═══`);
console.log(`Produtos removidos: ${before - after}`);
console.log(`Ofertas de loja merged: ${storeMerges}`);
console.log(`Catálogo final: ${after} produtos`);

fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);

if (!NO_INJECT) {
  console.log('\n▶ inject-seed-into-demo...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) console.warn('⚠ inject falhou.');
}
