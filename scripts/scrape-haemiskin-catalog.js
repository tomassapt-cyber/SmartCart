#!/usr/bin/env node
/**
 * GirlMath — haemiskin.pt catalog scrape
 * ============================================================
 *
 * haemiskin.pt é Shopify (boutique K-beauty: COSRX, Anua, Heimish,
 * Beauty of Joseon, etc.). Cada PDP (/products/<handle>) expõe um
 * JSON-LD Product limpo com gtin13 (EAN real) + offers (price/availability).
 *
 * Sem Playwright/ScrapingBee — fetch HTTP simples basta. EAN global (GTIN-13)
 * → cross-store matching forte com o catálogo existente.
 *
 * Pipeline:
 *  1. /sitemap.xml → sitemap_products_*.xml → URLs /products/
 *  2. Para cada URL: JSON-LD (gtin13/nome/marca/preço/stock/img)
 *  3. Checkpoint a cada 50
 *
 * Uso:
 *   node scripts/scrape-haemiskin-catalog.js              # full (~110 produtos)
 *   node scripts/scrape-haemiskin-catalog.js --limit=20   # smoke test
 *   node scripts/scrape-haemiskin-catalog.js --resume
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'haemiskin-full.json');
const BASE = 'https://www.haemiskin.pt';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 400;
const CHECKPOINT_EVERY = 50;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) {
  return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&'));
}
function isProductUrl(u) { return /\/products\//.test(u); }
function slugFromUrl(u) { const m = u.match(/\/products\/([^\/?#]+)/); return m ? m[1] : null; }

function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

/** Normaliza offers (single | array | AggregateOffer) → { price, in_stock } */
function readOffers(offers) {
  if (!offers) return { price: null, in_stock: null };
  // AggregateOffer
  if (!Array.isArray(offers) && /AggregateOffer/i.test(offers['@type'] || '')) {
    const price = parseFloat(offers.lowPrice ?? offers.price);
    const list = Array.isArray(offers.offers) ? offers.offers : [];
    const in_stock = list.length ? list.some(o => /InStock/i.test(o.availability || '')) : /InStock/i.test(offers.availability || '');
    return { price: isFinite(price) ? price : null, in_stock };
  }
  const list = Array.isArray(offers) ? offers : [offers];
  let min = Infinity, anyStock = false, sawStock = false;
  for (const o of list) {
    const p = parseFloat(o.price);
    if (isFinite(p) && p > 0 && p < min) min = p;
    if (o.availability != null) { sawStock = true; if (/InStock/i.test(o.availability)) anyStock = true; }
  }
  return { price: isFinite(min) ? min : null, in_stock: sawStock ? anyStock : null };
}

/** JSON-LD Product → { ean, name, brand, price, in_stock, image_url } ou null */
function extractProductData(html, url) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1].replace(/[\x00-\x1f]+/g, ' ')); } catch { continue; }
    const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
    for (const o of arr) {
      const ty = o && o['@type'];
      if (ty !== 'Product' && !(Array.isArray(ty) && ty.includes('Product'))) continue;

      let ean = o.gtin13 || o.gtin || o.gtin12 || o.gtin14 || o.ean || null;
      ean = ean != null ? String(ean).trim() : null;
      if (!ean || !/^\d{12,14}$/.test(ean)) return null;
      if (/0{6,}/.test(ean)) return null;

      const { price, in_stock } = readOffers(o.offers);
      if (price == null || price <= 0) return null;

      const brand = typeof o.brand === 'string' ? o.brand : (o.brand && (o.brand.name || o.brand['@id'])) || null;
      const image_url = Array.isArray(o.image) ? o.image[0] : (typeof o.image === 'string' ? o.image : (o.image && o.image.url) || null);
      const name = (o.name || '').toString().trim() || null;
      if (!name) return null;

      return {
        name,
        brand: brand ? String(brand).trim() : null,
        ean,
        sku: o.sku ? String(o.sku) : null,
        image_url: image_url || null,
        price,
        previous_price: null,
        in_stock: in_stock == null ? true : in_stock,
        volume_ml: volumeFromName(name),
        category: null,
        variants: [],
      };
    }
  }
  return null;
}

async function fetchPage(url, attempt = 1) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'pt-PT,pt;q=0.9' },
      redirect: 'follow',
    });
    if (r.status === 404) return { status: 'not_found' };
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); }
      return { status: 'http_error', http: r.status };
    }
    return { status: 'ok', html: await r.text() };
  } catch (e) {
    if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); }
    return { status: 'fetch_error', error: e.message };
  }
}

async function discoverProductUrls() {
  const idx = await fetchPage(BASE + '/sitemap.xml');
  if (idx.status !== 'ok') return [];
  const subs = locs(idx.html).filter(u => /sitemap_products/i.test(u));
  const urls = new Set();
  for (const s of subs) {
    const r = await fetchPage(s);
    if (r.status === 'ok') for (const u of locs(r.html)) if (isProductUrl(u)) urls.add(u.split('?')[0]);
  }
  return [...urls];
}

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!Array.isArray(d.products)) return null;
    return { products: d.products, done: new Set(d.products.map(p => p.url)) };
  } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  if (LIMIT !== Infinity) return;  // smoke-test (--limit) NÃO sobrescreve o catálogo de produção
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    scraped_at: new Date().toISOString(),
    source: 'haemiskin.pt (Shopify, HTTP + JSON-LD gtin13)',
    in_progress: inProgress,
    products,
  }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  console.log('📋 A descobrir produtos haemiskin (Shopify sitemap)…');
  let urls = await discoverProductUrls();
  console.log(`  ${urls.length} URLs /products/`);
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);

  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now();
  let idx = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };

  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url);
      const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const data = extractProductData(r.html, url);
        if (data) { products.push({ url, status: 'ok', scraped_at, ...data }); stats.ok++; }
        else { stats.skipped++; }
      } else if (r.status === 'not_found') { stats.not_found++; }
      else { stats.error++; }

      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(products);
        const elapsed = (Date.now() - start) / 1000;
        console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${(total / elapsed).toFixed(1)}/s`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos (sitemap vazio/bloqueio de IP/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);

  const inStock = products.filter(p => p.in_stock).length;
  console.log(`\n══════ haemiskin scrape ══════`);
  console.log(`  Produtos guardados (com EAN): ${products.length}`);
  console.log(`  in_stock: ${inStock}`);
  console.log(`  skipped (sem-EAN): ${stats.skipped}`);
  console.log(`  404: ${stats.not_found} · erro: ${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, fetchPage, slugFromUrl, isProductUrl, discoverProductUrls };

if (require.main === module) {
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
