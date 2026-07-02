#!/usr/bin/env node
/**
 * SmartCart — Audit de OUTLIERS de preço cross-store ao volume de referência
 * ============================================================
 *
 * Problema real (2026-07): lojas publicam o MESMO EAN para produtos
 * DIFERENTES (ex.: EAN do creme 55ml colado numa sheet mask de 1.45€;
 * EAN do shampoo grande colado no travel-size 50ml). O card compara
 * então preços de produtos distintos e mostra "poupanças" absurdas.
 *
 * Este audit replica EXACTAMENTE a comparação do demo.html
 * (refVolumeFor + offerPriceAtVol): para cada produto com ≥2 ofertas
 * com preço ao volume de referência, calcula a razão max/min. Razão
 * > 4× é quase sempre EAN errado de uma das lojas — reporta o caso
 * com os URLs das lojas e um score de coerência nome-do-produto vs
 * slug-do-URL para ajudar a identificar a oferta intrusa.
 *
 * A oferta intrusa NUNCA é adivinhada automaticamente: a decisão é
 * humana e fica registada em data/offer-ean-blocklist.json
 * ({ store_slug, ean, reason }). Com --apply, as ofertas da blocklist
 * são REMOVIDAS do seed-bundle.json; scripts/lib/store-item-merge.js
 * consulta a mesma blocklist para que os integradores diários NÃO as
 * re-adicionem no próximo scrape (a loja continua a publicar o EAN
 * errado — sem isto o fix duraria 1 dia).
 *
 * Uso:
 *   node scripts/audit-price-outliers.js               # report (razão >4×)
 *   node scripts/audit-price-outliers.js --ratio=3     # threshold custom
 *   node scripts/audit-price-outliers.js --apply       # remove ofertas da blocklist do seed
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const BLOCKLIST = path.join(ROOT, 'data', 'offer-ean-blocklist.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const RATIO = args.ratio ? parseFloat(args.ratio) : 4;

// ── Réplica fiel de demo.html (comparação ao MESMO volume) ──────────────

function _volFromName(name) {
  if (!name) return null;
  const m = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return (u === 'l') ? n * 1000 : (u === 'kg' ? n * 1000 : n);
}

function refVolumeFor(ean, productByEan, offersByEan) {
  const p = productByEan[ean];
  const fromName = _volFromName(p && p.name);
  if (fromName) return fromName;
  const offers = offersByEan[ean] || [];
  const vc = {};
  for (const o of offers) if (o.in_stock) for (const v of (o.variants || []))
    if (v.price > 0 && v.volume_ml) vc[v.volume_ml] = (vc[v.volume_ml] || 0) + 1;
  const top = Object.entries(vc).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return top ? Number(top[0]) : null;
}

function offerPriceAtVol(o, refVol) {
  if (!refVol || !o.variants || !o.variants.length) return o.price;
  const ex = o.variants.find(v => v.volume_ml === refVol && v.price > 0);
  return ex ? ex.price : null;
}

// ── Score de coerência: tokens do nome do produto presentes no URL ───────
// Ajuda a apontar a oferta intrusa: a loja cujo URL não menciona o produto
// (ou menciona outro volume/formato) é a candidata a EAN errado.

const STOP = new Set(['de', 'da', 'do', 'e', 'com', 'para', 'the', 'and', 'for', 'ml', 'gr']);
function tokens(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().split(/[^a-z0-9+]+/).filter(t => t.length >= 3 && !STOP.has(t));
}
function urlNameScore(url, product) {
  const urlToks = new Set(tokens(decodeURIComponent(url || '').split('?')[0]));
  const nameToks = tokens(`${product.brand || ''} ${product.name || ''}`);
  if (!nameToks.length || !urlToks.size) return null;
  const hit = nameToks.filter(t => urlToks.has(t)).length;
  return hit / nameToks.length;
}
function volFromUrl(url) {
  const m = decodeURIComponent(url || '').toLowerCase()
    .match(/(\d+(?:[.,]\d+)?)\s*-?(ml|gr|kg)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return m[2] === 'kg' ? n * 1000 : n;
}

// ── Main ────────────────────────────────────────────────────────────────

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
const productByEan = {};
for (const p of seed.products) productByEan[p.ean] = p;
const offersByEan = {};
for (const sp of seed.store_products)
  for (const it of sp.items)
    (offersByEan[it.ean] ||= []).push(Object.assign({ store_slug: sp.store_slug }, it));

if (APPLY) {
  const bl = fs.existsSync(BLOCKLIST)
    ? JSON.parse(fs.readFileSync(BLOCKLIST, 'utf8')).blocked || []
    : [];
  if (!bl.length) { console.log('Blocklist vazia — nada a aplicar.'); process.exit(0); }
  const key = (s, e) => `${s}|${e}`;
  const blocked = new Set(bl.map(b => key(b.store_slug, b.ean)));
  let removed = 0;
  for (const sp of seed.store_products) {
    const before = sp.items.length;
    sp.items = sp.items.filter(it => !blocked.has(key(sp.store_slug, it.ean)));
    if (sp.items.length < before) {
      console.log(`  − ${sp.store_slug}: ${before - sp.items.length} oferta(s) removida(s)`);
      removed += before - sp.items.length;
    }
  }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`✓ ${removed} ofertas intrusas removidas do seed (blocklist: ${bl.length} entradas).`);
  console.log('  Lembra-te: node scripts/inject-seed-into-demo.js para actualizar o HTML.');
  process.exit(0);
}

// Report: razão max/min ao volume de referência (réplica do productCard)
let comparable = 0;
const outliers = [];
for (const p of seed.products) {
  const offers = (offersByEan[p.ean] || []).filter(o => o.in_stock && !o.promo_pack);
  if (offers.length < 2) continue;
  const refVol = refVolumeFor(p.ean, productByEan, offersByEan);
  let priced = offers.map(o => [o, offerPriceAtVol(o, refVol)]).filter(t => t[1] != null && t[1] > 0);
  if (priced.length === 0) priced = offers.filter(o => o.price > 0).map(o => [o, o.price]);
  if (priced.length < 2) continue;
  comparable++;
  const prices = priced.map(t => t[1]);
  const min = Math.min(...prices), max = Math.max(...prices);
  if (min > 0 && max / min > RATIO) {
    outliers.push({ p, refVol, priced: priced.sort((a, b) => a[1] - b[1]), ratio: max / min });
  }
}

outliers.sort((a, b) => b.ratio - a.ratio);
console.log(`🔍 Produtos comparáveis (≥2 ofertas com preço ao volume de referência): ${comparable}`);
console.log(`⚠  Outliers com razão max/min > ${RATIO}×: ${outliers.length}\n`);

for (const { p, refVol, priced, ratio } of outliers) {
  console.log(`━━ ${p.ean} · ${p.brand || '?'} — ${p.name}`);
  console.log(`   refVol=${refVol ?? '—'}ml · razão ×${ratio.toFixed(1)} · categoria=${p.category || '?'}`);
  for (const [o, pr] of priced) {
    const score = urlNameScore(o.url, p);
    const uVol = volFromUrl(o.url);
    const flags = [
      score != null ? `url~nome ${(score * 100).toFixed(0)}%` : 'sem-url',
      uVol ? `url-vol ${uVol}ml${refVol && uVol !== refVol ? ' ≠REF' : ''}` : null,
    ].filter(Boolean).join(' · ');
    console.log(`   ${String(pr.toFixed(2)).padStart(8)}€  ${o.store_slug.padEnd(22)} ${flags}`);
    console.log(`             ${o.url || '(sem URL)'}`);
  }
  console.log('');
}
console.log('Decisão humana: adiciona as ofertas INTRUSAS a data/offer-ean-blocklist.json');
console.log('({"blocked":[{"store_slug","ean","reason"}]}) e corre com --apply.');
