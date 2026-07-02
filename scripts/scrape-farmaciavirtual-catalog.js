#!/usr/bin/env node
/**
 * CosMath — farmaciavirtual.pt catalog scrape (farmácia online PT)
 * ================================================================
 *
 * Farmácia Virtual (WooCommerce, ~6k produtos). NÃO expõe EAN/gtin13, mas o
 * `sku` do JSON-LD é o CNP (Código Nacional do Produto, 7 díg) → matching por
 * CNP (como Farmácias Portuguesas) + fingerprint.
 *
 * Preço: vem numa priceSpecification (UnitPriceSpecification) dentro de offers,
 * não em offers.price directo. availability distingue InStock/OutOfStock —
 * saltamos esgotados (sem preço comparável).
 *
 * Sitemaps: /wp-sitemap.xml → wp-sitemap-posts-product-N.xml.
 * HTTP simples (node fetch) — sem Cloudflare, corre na nuvem.
 *
 * Uso:
 *   node scripts/scrape-farmaciavirtual-catalog.js
 *   node scripts/scrape-farmaciavirtual-catalog.js --limit=300 --resume
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmaciavirtual-full.json');
const BASE = 'https://farmaciavirtual.pt';
const SITEMAP_INDEX = BASE + '/wp-sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 200;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
function decodeUnicode(s) {
  return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
const offPrice = (offer) => {
  if (!offer) return null;
  let p = offer.price;
  if (p == null && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) p = ps.price; }
  p = p != null ? parseFloat(String(p).replace(',', '.')) : null;
  return isFinite(p) && p > 0 ? p : null;
};

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1]); } catch { continue; }
    const nodes = j['@graph'] ? j['@graph'] : [j];
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name) return null;
      const cnp = isCnp(n.sku) ? String(n.sku).trim() : null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : false;
      const price = offPrice(offer);
      if (!in_stock) return { status: 'oos', name, cnp };   // esgotado → sem preço comparável
      if (price == null) return null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return {
        status: 'ok', name, brand: null, ean: null, cnp, sku: cnp,
        image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null,
        price, previous_price: null, in_stock: true, volume_ml: volumeFromName(name), category: null, variants: [],
      };
    }
  }
  return null;
}

async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error' }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error' }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error' }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmaciavirtual.pt (WooCommerce; SEM EAN, sku=CNP)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descobrir sitemaps de produtos farmaciavirtual…');
  const idx = await (await fetch(SITEMAP_INDEX, { headers: { 'User-Agent': UA } })).text();
  const productSitemaps = locs(idx).filter(u => /wp-sitemap-posts-product-\d+\.xml/.test(u));
  let urls = [];
  for (const sm of productSitemaps) {
    try { const xml = await (await fetch(sm, { headers: { 'User-Agent': UA } })).text(); urls.push(...locs(xml)); } catch (e) { /* skip */ }
  }
  urls = [...new Set(urls.filter(u => /\/produto\//.test(u)))];
  console.log(`  ${productSitemaps.length} sitemaps · ${urls.length} produtos`);
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx2 = 0;
  const stats = { ok: 0, oos: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (idx2 < queue.length) {
      const url = queue[idx2++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const d = extractProductData(r.html);
        if (d && d.status === 'ok') { products.push(JSON.parse(JSON.stringify({ url, scraped_at, ...d }))); stats.ok++; }
        else if (d && d.status === 'oos') stats.oos++;
        else stats.skipped++;
      } else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.oos + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} esgotado:${stats.oos} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos (sitemap vazio/bloqueio de IP/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  console.log(`\n══════ farmaciavirtual scrape ══════`);
  console.log(`  Produtos em stock c/ preço: ${products.length} · esgotados: ${stats.oos}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection:', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
