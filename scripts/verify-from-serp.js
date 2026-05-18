#!/usr/bin/env node
// FASE 1 do pipeline (alternativa ao verify-store.js): consome SERP results de Google em vez de fetch directo, produz inventory.
/**
 * SmartCartCosmetics — verify-from-serp.js
 *
 * Para ambientes onde fetch directo ao site da loja é bloqueado (WAF),
 * este script aceita resultados de Google site:search como entrada e
 * produz o mesmo formato de output que verify-store.js.
 *
 * Workflow:
 *   1. Para cada (loja × produto) elegível por tier, executa-se uma
 *      WebSearch com query site:loja.pt "marca" "produto" "tamanho"
 *   2. As respostas são guardadas em data/.serp-cache/{slug}-{ean}.json
 *      (estrutura simples: [{title, url}, ...])
 *   3. Este script parseia cada cache, faz matching por fuzzy, e
 *      produz data/inventory/{slug}-verified.json compatível com
 *      o esquema do verify-store.js
 *
 * Uso (depois de popular a cache):
 *   node scripts/verify-from-serp.js --store=sweetcare
 *
 * Helper paralelo (para popular a cache via shell loop):
 *   node scripts/verify-from-serp.js --emit-queries --store=sweetcare
 *   → imprime as queries que devem ser executadas via WebSearch
 */

const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const STORE = args.store;
if (!STORE) { console.error('uso: node scripts/verify-from-serp.js --store=<slug> [--emit-queries]'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const store = STORES.find(s => s.id === STORE);
if (!store) { console.error(`loja ${STORE} não encontrada`); process.exit(1); }

const { PRODUCTS, eligible } = require('./build-catalog.js');

const CACHE_DIR = path.join(ROOT, 'data', '.serp-cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const OUT_PATH = path.join(ROOT, 'data', 'inventory', `${STORE}-verified.json`);

// ============================================================
// Mode 1: emit queries — lista o que precisas de pesquisar
// ============================================================
if (args['emit-queries']) {
  console.log(`# WebSearch queries para ${STORE} (${store.nome}):`);
  console.log(`# Para cada query, guarda os resultados em ${CACHE_DIR}/${STORE}-{ean}.json`);
  console.log();
  for (const p of PRODUCTS) {
    if (!eligible(store, p)) continue;
    const shortName = p.name.replace(/^[^\s]+ /, '').replace(/\s*\d+\s*ml.*$/i, '').trim();
    const q = `site:${new URL(store.url).hostname} "${p.brand}" "${shortName}"`;
    console.log(`# ${p.ean} | ${p.brand} | ${p.name}`);
    console.log(`#   query: ${q}`);
  }
  process.exit(0);
}

// ============================================================
// Mode 2: process cached SERPs into inventory
// ============================================================
function levenshtein(a, b) {
  a = String(a||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  b = String(b||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!a.length) return b.length; if (!b.length) return a.length;
  const dp = Array.from({length:a.length+1}, (_,i)=>i);
  for (let j=1;j<=b.length;j++) {
    let prev=dp[0]; dp[0]=j;
    for (let i=1;i<=a.length;i++) { const t=dp[i]; dp[i]=a[i-1]===b[j-1]?prev:1+Math.min(prev,dp[i],dp[i-1]); prev=t; }
  }
  return dp[a.length];
}
const sim = (a,b) => { const m = Math.max(String(a).length, String(b).length); return m ? 1-levenshtein(a,b)/m : 1; };

function bestMatch(serpResults, product) {
  if (!serpResults || !serpResults.length) return null;
  const target = `${product.brand} ${product.name}`.toLowerCase();
  let best = null;
  for (const r of serpResults) {
    const title = (r.title || '').toLowerCase();
    // Heurística: rejeita listing/categoria/marca-page
    if (/categoria|category|marca|marcas|brands|listing|catalog/.test(r.url)) continue;
    // Rejeita estuche/cofre/pack
    if (/estuche|cofre|pack|gift|set|estojo|coffret/.test(title)) continue;
    const s = sim(target, title);
    if (!best || s > best.score) best = { ...r, score: s };
  }
  return best;
}

function extractVolumeFromText(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|cl|l|amp|un)\b/i);
  return m ? { value: parseFloat(m[1].replace(',','.')), unit: m[2].toLowerCase() } : null;
}

function extractPriceFromText(text) {
  if (!text) return null;
  // procura padrões como "12,99 €", "€ 12.50", "16.95€"
  const m = String(text).match(/(\d+)[,.](\d{2})\s*€|€\s*(\d+)[,.](\d{2})/);
  if (!m) return null;
  const int = m[1] || m[3];
  const dec = m[2] || m[4];
  return parseFloat(`${int}.${dec}`);
}

const items = [];
const elig = PRODUCTS.filter(p => eligible(store, p));
console.log(`▶ ${STORE} (${store.nome}): ${elig.length} produtos elegíveis a verificar`);

for (const p of elig) {
  const cacheFile = path.join(CACHE_DIR, `${STORE}-${p.ean}.json`);
  if (!fs.existsSync(cacheFile)) {
    items.push({
      ean: p.ean, name: p.name, brand: p.brand,
      expected_volume_ml: p.volume_ml,
      resolved_url: null, status: 'pending-search',
      notes: 'Cache SERP em falta: ' + path.basename(cacheFile),
      verified_at: new Date().toISOString(),
    });
    continue;
  }
  const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const results = cached.results || cached;          // aceita { results: [] } ou [] directo
  const best = bestMatch(results, p);

  if (!best) {
    items.push({
      ean: p.ean, name: p.name, brand: p.brand,
      expected_volume_ml: p.volume_ml,
      resolved_url: null, status: 'not-found',
      notes: results.length ? `${results.length} resultados mas nenhum match plausível` : 'sem resultados na SERP',
      verified_at: new Date().toISOString(),
    });
    continue;
  }

  // Análise do best match
  const obsVol = extractVolumeFromText(best.title);
  const obsPrice = extractPriceFromText(best.snippet || best.description || '');
  const brandInTitle = new RegExp(p.brand.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'), 'i').test(best.title);
  const volMatch = obsVol && obsVol.value === p.volume_ml;
  const titleScore = best.score;

  let status, confidence;
  if (titleScore >= 0.7 && volMatch) { status = 'verified'; confidence = 0.9; }
  else if (titleScore >= 0.6 && brandInTitle && !volMatch && obsVol) { status = 'variant'; confidence = 0.7; }
  else if (titleScore >= 0.5 && brandInTitle) { status = 'verified'; confidence = 0.65; }
  else if (titleScore >= 0.4) { status = 'low-confidence'; confidence = 0.45; }
  else { status = 'not-found'; confidence = 0.2; }

  items.push({
    ean: p.ean, name: p.name, brand: p.brand,
    expected_volume_ml: p.volume_ml,
    resolved_url: best.url,
    resolution_method: 'google-site-search',
    observed_name: best.title,
    observed_brand: brandInTitle ? p.brand : null,
    observed_volume_ml: obsVol?.value,
    observed_volume_unit: obsVol?.unit,
    observed_price: obsPrice,
    observed_currency: obsPrice ? 'EUR' : null,
    observed_in_stock: obsPrice != null ? true : null,
    brand_similarity: Number(titleScore.toFixed(3)),
    volume_match: !!volMatch,
    ean_match: false,                                  // SERP não dá EAN
    confidence,
    status,
    notes: status === 'variant' ? `Variante (vol ${obsVol?.value}${obsVol?.unit}, expected ${p.volume_ml}ml)` : undefined,
    verified_at: new Date().toISOString(),
  });
}

const stats = {
  total: items.length,
  verified: items.filter(i=>i.status==='verified').length,
  variant: items.filter(i=>i.status==='variant').length,
  low_confidence: items.filter(i=>i.status==='low-confidence').length,
  not_found: items.filter(i=>i.status==='not-found').length,
  pending: items.filter(i=>i.status==='pending-search').length,
};

fs.writeFileSync(OUT_PATH, JSON.stringify({
  version: '1.0',
  store_slug: STORE,
  store_name: store.nome,
  store_url: store.url,
  verified_at: new Date().toISOString(),
  method: 'WebSearch SERP via Google site: index (sem fetch directo)',
  stats,
  items,
}, null, 2));

console.log(`✔ ${OUT_PATH}`);
console.log(`  ${stats.verified} verified · ${stats.variant} variant · ${stats.low_confidence} low-conf · ${stats.not_found} not-found · ${stats.pending} pending`);
