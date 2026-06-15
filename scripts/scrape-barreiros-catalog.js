#!/usr/bin/env node
/**
 * GirlMath — Farmácia Barreiros (farmaciabarreiros.com) catalog scrape
 * ============================================================
 *
 * PrestaShop. O JSON-LD é só WebSite (sem Product), MAS a página traz no JS do
 * PrestaShop:
 *   • "ean13":"<GTIN-13>"   ← EAN real (marcas francesas — Vichy, Avène, Uriage,
 *     La Roche-Posay, Caudalie, Eucerin... = forte overlap com o nosso catálogo)
 *   • "price_amount":"<preço>"
 *   • availability InStock/OutOfStock
 *   • og:title (nome) + og:image
 *
 * URL traz a categoria (/beleza/<cat>/<sub>/<slug>) → por defeito scrapamos só
 * /beleza/ (~2.5k produtos dermo-cosmética). Sitemap usa CDATA nos <loc>.
 *
 * Sem Playwright/ScrapingBee. Matching dominante por EAN (GTIN-13 global).
 *
 * Uso:
 *   node scripts/scrape-barreiros-catalog.js              # só /beleza/
 *   node scripts/scrape-barreiros-catalog.js --all        # catálogo todo
 *   node scripts/scrape-barreiros-catalog.js --limit=100
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'barreiros-full.json');
const BASE = 'https://www.farmaciabarreiros.com';
const SITEMAP_INDEX = BASE + '/1_index_sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const ALL = !!args.all;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 250;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// <loc> com CDATA: <loc><![CDATA[url]]></loc>
function locs(xml) {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^\]<]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map(m => m[1].trim());
}
function isProductUrl(u) {
  if (/index\.php|\?|\/pesquisa/i.test(u)) return false;
  const segs = u.replace(/https?:\/\/[^\/]+/, '').split('/').filter(Boolean);
  return segs.length >= 3;   // categoria/sub/slug
}
function metaContent(html, prop) {
  const m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', 'i'))
    || html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i'));
  return m ? m[1] : null;
}
function decodeEntities(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&ordf;/g, 'ª').replace(/&ordm;/g, 'º');
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function categoryFromUrl(u) {
  const segs = u.replace(BASE, '').split('/').filter(Boolean);
  return segs.length > 1 ? segs.slice(0, -1).join(' > ') : null;
}

function extractProductData(html, url) {
  const eanM = html.match(/"ean13"\s*:\s*"(\d{12,14})"/);
  let ean = eanM ? eanM[1] : null;
  if (ean && /0{6,}/.test(ean)) ean = null;   // placeholder

  const paM = html.match(/"price_amount"\s*:\s*"?(\d+(?:\.\d+)?)/);
  let price = paM ? Math.round(parseFloat(paM[1]) * 100) / 100 : null;
  if (price == null) {
    const og = metaContent(html, 'product:price:amount') || metaContent(html, 'og:price:amount');
    if (og) price = Math.round(parseFloat(og) * 100) / 100;
  }
  if (price == null || !isFinite(price) || price <= 0) return null;

  // Preço original (promoção): PrestaShop expõe price_without_reduction no JS da
  // página quando há redução. Aditivo e seguro — só marca desconto quando o
  // original é claramente maior que o preço actual (sem falsos positivos).
  let previous_price = null;
  const wrM = html.match(/"price_without_reduction"\s*:\s*"?(\d+(?:\.\d+)?)/);
  if (wrM) { const wr = Math.round(parseFloat(wrM[1]) * 100) / 100; if (isFinite(wr) && wr > price + 0.01) previous_price = wr; }

  let name = decodeEntities(metaContent(html, 'og:title') || '');
  name = name.replace(/\s*[-–|]\s*Farm[áa]cia Barreiros.*$/i, '').replace(/\s+/g, ' ').trim();
  if (!name) { const t = html.match(/<title>([^<]+)<\/title>/i); if (t) name = decodeEntities(t[1]).replace(/\s*[-–|]\s*Farm[áa]cia Barreiros.*$/i, '').trim(); }
  if (!name) return null;

  const in_stock = /"availability"\s*:\s*"[^"]*InStock"/i.test(html) || (/InStock/.test(html) && !/"availability"\s*:\s*"[^"]*OutOfStock"/i.test(html));
  const image_url = metaContent(html, 'og:image') || null;

  return {
    name,
    brand: null,                 // derivado no fingerprint; matching é por EAN
    ean,                          // GTIN-13 real (pode faltar nalguns)
    sku: null,
    image_url,
    price,
    previous_price,
    in_stock,
    volume_ml: volumeFromName(name),
    category: categoryFromUrl(url),
    variants: [],
  };
}

async function fetchText(url, attempt = 1) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' });
    if (r.status === 404) return { status: 'not_found' };
    if (r.status === 429 || r.status >= 500) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
    return { status: 'ok', html: await r.text() };
  } catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

async function discoverProductUrls() {
  const idx = await fetchText(SITEMAP_INDEX);
  if (idx.status !== 'ok') return [];
  const subs = locs(idx.html).filter(u => /\.xml/i.test(u));
  const urls = new Set();
  for (const s of (subs.length ? subs : [])) {
    const r = await fetchText(s);
    if (r.status === 'ok') for (const u of locs(r.html)) if (isProductUrl(u)) urls.add(u);
  }
  let arr = [...urls];
  if (!ALL) arr = arr.filter(u => /\/beleza\//.test(u));
  return arr;
}

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmaciabarreiros.com (PrestaShop, ean13 + price_amount)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log(`📋 A descobrir produtos Barreiros (${ALL ? 'tudo' : 'só /beleza/'})…`);
  let urls = await discoverProductUrls();
  console.log(`  ${urls.length} URLs de produto`);
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx = 0;
  const stats = { ok: 0, ok_ean: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchText(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { const d = extractProductData(r.html, url); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; if (d.ean) stats.ok_ean++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} (c/ean:${stats.ok_ean}) skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCheckpoint(products, false);
  console.log(`\n══════ Barreiros scrape ══════`);
  console.log(`  Produtos: ${products.length} (com EAN: ${products.filter(p => p.ean).length}) · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, fetchText, isProductUrl, discoverProductUrls };
if (require.main === module) { main().catch(e => { console.error('FATAL', e); process.exit(1); }); }
