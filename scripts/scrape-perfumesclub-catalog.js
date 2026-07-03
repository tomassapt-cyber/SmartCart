#!/usr/bin/env node
/**
 * CosMath — perfumesclub.pt catalog scrape (perfumaria/cosmética ES, storefront PT)
 * ============================================================
 *
 * Perfume's Club é uma grande perfumaria ES com STOREFRONT PT
 * (perfumesclub.pt): preços EUR, envia PT. Cada ficha tem JSON-LD Product com
 * **gtin13 REAL** + preço + sku — match forte por EAN (perfil cocooncenter).
 *
 * Sitemap índice /sitemap.xml → sub-sitemaps (G/M/F/FM/…) com URLs de produto
 * /pt/<marca>/<slug>/p_NNNNNN/. Catálogo dominado por perfumaria; o --dermo
 * filtra pelo SEGMENTO DE MARCA do URL (lista de marcas dermo/skincare/hair).
 *
 * Uso:
 *   node scripts/scrape-perfumesclub-catalog.js --dermo
 *   node scripts/scrape-perfumesclub-catalog.js --limit=30       # smoke (não escreve)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'perfumesclub-full.json');
const BASE = 'https://www.perfumesclub.pt';
const SITEMAP_INDEX = BASE + '/sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 250;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /\/p_\d+\/?$/.test(u);

// --dermo: filtra pelo segmento de MARCA do URL (/pt/<marca>/…). Marcas
// dermo/skincare/hair/solar conhecidas — perfumaria pura fica de fora.
const DERMO_BRANDS = new Set([
  'avene', 'la-roche-posay', 'vichy', 'bioderma', 'isdin', 'eucerin', 'cerave',
  'ducray', 'klorane', 'nuxe', 'caudalie', 'uriage', 'svr', 'a-derma', 'aderma',
  'rene-furterer', 'mustela', 'filorga', 'sesderma', 'martiderm', 'endocare',
  'cetaphil', 'sebamed', 'weleda', 'heliocare', 'cantabria-labs', 'noreva',
  'lierac', 'phyto', 'biotherm', 'apivita', 'korres', 'nivea', 'garnier',
  'loreal-paris', 'l-oreal-paris', 'loreal', 'elvive', 'fructis', 'olay',
  'neutrogena', 'dove', 'revlon', 'schwarzkopf', 'tresemme', 'pantene',
  'kerastase', 'redken', 'olaplex', 'moroccanoil', 'tigi', 'wella',
  'babaria', 'byphasse', 'ecran', 'delial', 'hawaiian-tropic', 'piz-buin',
  'australian-gold', 'the-ordinary', 'revolution-skincare', 'clinique',
  'shiseido', 'clarins', 'lancaster', 'roc', 'skinceuticals', 'esthederm',
  'institut-esthederm', 'darphin', 'galenic', 'embryolisse', 'topicrem',
  'mixa', 'diadermine', 'pond-s', 'ponds', 'st-ives', 'q10', 'astera',
]);
function brandSlugOf(u) { const m = u.match(/\/pt\/([^/]+)\//); return m ? m[1].toLowerCase() : ''; }

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
      let ean = null;
      for (const c of [n.gtin13, n.gtin, n.gtin14, n.mpn]) {
        const s = String(c || '').trim();
        if (/^\d{12,14}$/.test(s) && !/0{6,}/.test(s)) { ean = s; break; }
      }
      if (!ean) return null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? offer.price : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean, sku: n.sku ? String(n.sku) : null, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
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
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
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
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'perfumesclub.pt (storefront PT; JSON-LD gtin13)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap índice perfumesclub…');
  const idxXml = await fetchText(SITEMAP_INDEX);
  const subs = locs(idxXml).filter(u => /sitemap-[A-Z]+\.xml$/i.test(u) && !/Landings/i.test(u));
  console.log(`  ${subs.length} sub-sitemaps`);
  let urls = [];
  for (const sm of subs) {
    try { urls.push(...locs(await fetchText(sm)).filter(isProductUrl)); } catch { /* sub falhou, segue */ }
  }
  urls = [...new Set(urls)];
  console.log(`  ${urls.length} produtos no sitemap`);
  if (args.dermo) { const b = urls.length; urls = urls.filter(u => DERMO_BRANDS.has(brandSlugOf(u))); console.log(`  🧴 --dermo (marca): ${urls.length} de ${b}`); }
  // Ofertas EXISTENTES nunca ficam presas ao filtro --dermo (auditoria
  // 2026-07-03): URLs com oferta no seed re-entram SEMPRE na fila — sem isto
  // o preço delas apodrecia (a loja raspa todos os dias mas nunca as visita).
  try {
    const seedNow = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
    const spSeed = (seedNow.store_products || []).find(g => g.store_slug === 'perfumesclub');
    const known = (spSeed?.items || []).map(it => it.url).filter(u => u && isProductUrl(u));
    const b2 = urls.length;
    urls = [...new Set([...urls, ...known])];
    if (urls.length > b2) console.log(`  ↻ +${urls.length - b2} URLs de ofertas existentes (fora do filtro dermo)`);
  } catch { /* sem seed local (CI antes do checkout completo?) — segue */ }
  if (urls.length === 0) { console.error('✗ Sitemap vazio (bloqueio de IP?) — abortar sem tocar no catálogo.'); process.exit(1); }
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} frescos mantidos`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { const d = extractProductData(r.html); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos (bloqueio/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ perfumesclub scrape ══════`);
  console.log(`  Produtos com EAN: ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
