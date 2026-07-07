#!/usr/bin/env node
/**
 * CosMath — docmorris.pt catalog scrape (farmácia dermo EU, storefront PT, MODO COMPARAÇÃO)
 * ============================================================
 *
 * DocMorris (grupo DocMorris/Zur Rose, dono da Atida) tem storefront PT
 * (docmorris.pt): preços EUR, envia PT. É uma farmácia DERMO-COSMÉTICA — o
 * catálogo é o nosso core (Bioderma, Nuxe, La Roche-Posay, Uriage, Vichy,
 * Avène...). NÃO expõe gtin (JSON-LD só tem sku interno + preço), por isso é
 * ENRICH-ONLY por fingerprint+loose (padrão continente/pluri) — nunca cria.
 *
 * Foco (pedido do user): SKINCARE + CABELO. O sitemap índice tem 87 sub-
 * sitemaps por categoria; scrapamos só os relevantes (COSMETIC_CATEGORIES),
 * saltando bebés/ortopedia/ótica/dietética/medicamentos/suplementos.
 *
 * PDP: JSON-LD Product { name, sku, brand, offers.price/availability, image }.
 * URL: /pt/<slug>/p-<id>.
 *
 * Uso:
 *   node scripts/scrape-docmorris-catalog.js
 *   node scripts/scrape-docmorris-catalog.js --limit=30   # smoke (não escreve)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'docmorris-full.json');
const BASE = 'https://www.docmorris.pt';
const SITEMAP_INDEX = BASE + '/sitemaps/index.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Sub-sitemaps de SKINCARE + CABELO + corpo dermo (saltar bebés/ortopedia/
// ótica/dietética/medicamentos/suplementos/ervanária).
const COSMETIC_CATEGORIES = /cp-sitemap_product-(cosmetica[_-]|cosmetica_natural-|higiene-cabelo|higiene-corporal|higiene-maos_e_unhas|saude-cuidado_da_pele|saude-aromaterapia)/i;

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /\/pt\/[^/]+\/p-\d+$/.test(u);

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
      // SEM gtin no DocMorris — ean fica null; integrador casa por fingerprint.
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
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'docmorris.pt (farmácia dermo PT; JSON-LD sem gtin; MODO COMPARAÇÃO — nunca cria)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap índice docmorris…');
  const idxXml = await fetchText(SITEMAP_INDEX);
  const subs = locs(idxXml).filter(u => COSMETIC_CATEGORIES.test(u));
  console.log(`  ${subs.length} sub-sitemaps de skincare/cabelo/corpo (de 87)`);
  let urls = [];
  for (const sm of subs) {
    try { urls.push(...locs(await fetchText(sm)).filter(isProductUrl)); } catch { /* sub falhou */ }
  }
  urls = [...new Set(urls)];
  console.log(`  ${urls.length} produtos (skincare/cabelo/corpo)`);
  if (urls.length === 0) { console.error('✗ 0 URLs (sitemap vazio/bloqueio?) — abortar.'); process.exit(1); }
  // Diário = KNOWN-ONLY (só re-visita os URLs já casados — rápido); a descoberta
  // de novos matches faz-se com --full (cron semanal / run manual). 47k URLs são
  // lentos demais para 3×/dia.
  if (!args.full) {
    try {
      const seedNow = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
      const sp = (seedNow.store_products || []).find(g => g.store_slug === 'docmorris');
      const known = [...new Set((sp?.items || []).map(it => it.url).filter(u => u && isProductUrl(u)))];
      if (known.length >= 5) { urls = known; console.log(`  ♻ known-only: ${urls.length} URLs de ofertas existentes (usa --full p/ descobrir novos)`); }
    } catch { /* sem seed → mantém full */ }
  }
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} frescos mantidos`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx = 0; let blockedStreak = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0, blocked: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { blockedStreak = 0; const d = extractProductData(r.html); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++;
      else if (r.status === 'blocked') { stats.blocked++; blockedStreak++; if (blockedStreak >= 20) { console.error('✗ 20×403 seguidos — WAF ativou; parar com o que temos.'); idx = queue.length; } await new Promise(s => setTimeout(s, 5000)); }
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
  console.log(`\n══════ docmorris scrape ══════`);
  console.log(`  Produtos (nome+preço): ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/403/erro: ${stats.skipped}/${stats.not_found}/${stats.blocked}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
