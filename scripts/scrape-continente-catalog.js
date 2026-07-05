#!/usr/bin/env node
/**
 * CosMath — continente.pt catalog scrape (retalho mass-market, MODO COMPARAÇÃO)
 * ============================================================
 *
 * DECISÃO (user 2026-07-03): o Continente NÃO cria produtos — só aumenta a
 * comparação dos que JÁ temos. O site não expõe gtin (JSON-LD só tem sku
 * interno de 7 díg + preço), por isso o match é por FINGERPRINT exato com
 * guarda de volume (padrão pharma2you), enrich-only no integrador.
 *
 * Catálogo ~100k dominado por mercearia → filtramos o sitemap por um
 * WHITELIST de marcas de beleza/higiene que vendemos (slug contém a marca).
 * ~2-5k páginas relevantes por run.
 *
 * Sitemaps: sitemap_index.xml → sitemap-custom_sitemap_N-product.xml (20k/cada).
 * PDP: JSON-LD Product {name, sku, offers.price} + imagem og:image.
 *
 * Uso:
 *   node scripts/scrape-continente-catalog.js
 *   node scripts/scrape-continente-catalog.js --limit=30    # smoke (não escreve)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'continente-full.json');
const BASE = 'https://www.continente.pt';
const SITEMAP_INDEX = BASE + '/sitemap_index.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 400;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Marcas beleza/higiene/dermo que JÁ vendemos noutras lojas — só estas
// interessam (comparação; o integrador nunca cria). Slug do produto contém
// a marca (ex.: .../gel-de-banho-creme-care-nivea-nivea-5292030.html).
const BRAND_SLUGS = [
  'nivea', 'loreal', 'l-oreal', 'elvive', 'garnier', 'fructis', 'tresemme',
  'pantene', 'dove', 'olay', 'neutrogena', 'vichy', 'la-roche-posay', 'cerave',
  'eucerin', 'mixa', 'schwarzkopf', 'gliss', 'syoss', 'herbal-essences',
  'aussie', 'head-shoulders', 'head-and-shoulders', 'klorane', 'ducray',
  'barral', 'mustela', 'bioderma', 'avene', 'isdin', 'uriage', 'weleda',
  'cetaphil', 'sebamed', 'diadermine', 'ponds', 'st-ives', 'babaria',
  'byphasse', 'maybelline', 'essence-', 'catrice', 'rimmel', 'revlon',
  'sanex', 'palmolive', 'lactovit', 'linic', 'wells-', 'vasenol', 'nuxe',
  'revuele', 'moist', 'deliplus', 'axe-', 'rexona', 'vaseline', 'johnson',
  'listerine', 'oral-b', 'colgate', 'elgydium', 'corega',
];
const BRAND_RE = new RegExp('-(' + BRAND_SLUGS.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i');

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /\/produto\/[^/]+\.html$/.test(u);

function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1].replace(/[ -]+/g, ' ')); } catch { continue; }
    const nodes = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name) return null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? offer.price : null;
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      // SEM gtin no Continente — ean fica null; o integrador casa por
      // fingerprint exato (enrich-only, nunca cria).
      return { name, brand, ean: null, sku: n.sku ? String(n.sku) : null, image_url, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

async function fetchText(url, attempt = 1) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); return await r.text(); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } throw e; }
}

async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 403) { await drop(); return { status: 'blocked' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 4000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!Array.isArray(d.products)) return null;
    const MAX_AGE_MS = (parseFloat(process.env.RESUME_MAX_AGE_HOURS) || 20) * 3600e3;
    const now = Date.now();
    const fresh = d.products.filter(p => p.scraped_at && (now - new Date(p.scraped_at)) < MAX_AGE_MS);
    return { products: fresh, done: new Set(fresh.map(p => p.url)) };
  } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  if (LIMIT !== Infinity) return;  // smoke-test (--limit) NÃO sobrescreve o catálogo de produção
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'continente.pt (JSON-LD sem gtin; MODO COMPARAÇÃO por fingerprint — nunca cria)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap índice continente…');
  const idxXml = await fetchText(SITEMAP_INDEX);
  const subs = locs(idxXml).filter(u => /-product\.xml$/i.test(u));
  console.log(`  ${subs.length} sub-sitemaps de produto`);
  let urls = [];
  for (const sm of subs) {
    try { urls.push(...locs(await fetchText(sm)).filter(isProductUrl)); } catch { /* sub falhou */ }
  }
  urls = [...new Set(urls)];
  console.log(`  ${urls.length} produtos no sitemap (todo o hipermercado)`);
  const b = urls.length;
  urls = urls.filter(u => BRAND_RE.test(u));
  console.log(`  🧴 whitelist de marcas beleza: ${urls.length} de ${b}`);
  // MODO KNOWN-ONLY (default nos crons diários): loja de COMPARAÇÃO — só
  // enriquece produtos que já temos. Scrapar as ~104k páginas do hipermercado
  // 3×/dia para refrescar dezenas de ofertas rebentava o timeout. Por omissão
  // refrescamos SÓ os URLs das ofertas que já existem no seed (rápido); a
  // descoberta de novos matches faz-se com --full (cron semanal / run manual).
  if (!args.full) {
    try {
      const seedNow = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
      const sp = (seedNow.store_products || []).find(g => g.store_slug === 'continente');
      const known = [...new Set((sp?.items || []).map(it => it.url).filter(u => u && isProductUrl(u)))];
      if (known.length >= 5) { urls = known; console.log(`  ♻ known-only: ${urls.length} URLs de ofertas existentes (usa --full p/ descobrir novos)`); }
      else console.log(`  (poucas ofertas conhecidas — scan completo)`);
    } catch { /* sem seed → scan completo */ }
  }
  if (urls.length === 0) { console.error('✗ 0 URLs (sitemap vazio/bloqueio?) — abortar.'); process.exit(1); }
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} frescos mantidos`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms — GENTIL, site grande)…\n`);

  const start = Date.now(); let idx = 0; let blockedStreak = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0, blocked: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { blockedStreak = 0; const d = extractProductData(r.html); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++;
      else if (r.status === 'blocked') { stats.blocked++; blockedStreak++; if (blockedStreak >= 20) { console.error('✗ 20 × 403 seguidos — WAF ativou; parar com o que temos.'); idx = queue.length; } await new Promise(s => setTimeout(s, 5000)); }
      else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error + stats.blocked;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} 403:${stats.blocked} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos (bloqueio/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ continente scrape ══════`);
  console.log(`  Produtos (nome+preço): ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/403/erro: ${stats.skipped}/${stats.not_found}/${stats.blocked}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
