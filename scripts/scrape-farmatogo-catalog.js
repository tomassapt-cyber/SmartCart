#!/usr/bin/env node
/**
 * CosMath — farmatogo.com catalog scrape (Shopify, Amarante; forte em K-Beauty)
 * ============================================================
 * ⚠️ O products.json é INÚTIL aqui (barcode=null, sku inconsistente) — a chave
 * vive no JSON-LD da FICHA: gtin13=EAN-13 real + sku=CNP(7). Por isso é
 * ficha-a-ficha. Sitemap index /sitemap.xml → sitemap_products_N.xml (com
 * QUERY STRINGS ?from=&to= — preservar!). ~4.9k URLs; filtro slug corta
 * suplementos/puericultura.
 *
 * Uso: node scripts/scrape-farmatogo-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmatogo-full.json');
const BASE = 'https://www.farmatogo.com';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
function slugLooksCosmetic(u) { const slug = ((u.split('/products/')[1] || '').split('?')[0] || '').replace(/-/g, ' '); return slug && !isNonCosmetic(slug); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x1F]+', 'g');
function stripJsonControlChars(s) { return s.replace(CONTROL_CHARS_RE, ' '); }

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1]); }
    catch { try { j = JSON.parse(stripJsonControlChars(b[1])); } catch { continue; } }
    const nodes = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name || isNonCosmetic(name)) return null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      const gtin = [n.gtin13, n.gtin, n.gtin14, offer && offer.gtin13].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{12,14}$/.test(x) && !/0{6,}/.test(x)) || null;
      const skuRaw = [n.sku, n.mpn, offer && offer.sku].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{7}$/.test(x)) || null;
      if (!gtin && !skuRaw) return null;
      let price = offer ? (offer.price || offer.lowPrice) : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean: gtin, cnp: skuRaw, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

async function fetchText(url, attempt = 1) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': 'localization=PT' }, redirect: 'follow' }); return await r.text(); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } throw e; }
}
async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': 'localization=PT' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 3000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmatogo.com (Shopify; JSON-LD gtin13+sku=CNP — products.json inútil)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap index farmatogo…');
  const idx = await fetchText(BASE + '/sitemap.xml');
  const productMaps = locs(idx).filter(u => /sitemap_products_\d+\.xml/.test(u));
  console.log(`  ${productMaps.length} sitemaps de produto`);
  let urls = [];
  for (const sm of productMaps) { const xml = await fetchText(sm); urls.push(...locs(xml).filter(u => u.includes('/products/'))); await new Promise(s => setTimeout(s, 500)); }
  // Shopify Markets: o sitemap traz o MESMO produto em /en/products/ e
  // /es/products/ com preços de mercado ≠ PT (±1-2%) — e 90% das ofertas
  // estavam a aterrar em URLs/preços não-PT (registo de correções #2,
  // 2026-07-17). Normalizamos TUDO para o URL canónico PT (sem prefixo),
  // o que também corta a fila para ~1/3.
  urls = [...new Set(urls.map(u => u.split('?')[0].replace(/farmatogo\.com\/(?:[a-z]{2}(?:-[a-z]{2})?)\/products\//i, 'farmatogo.com/products/')))];
  const t0 = urls.length;
  urls = urls.filter(slugLooksCosmetic);
  console.log(`  ${t0} fichas → ${urls.length} após filtro de slug não-cosmético`);
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);
  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} fichas (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);
  const start = Date.now(); let i = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (i < queue.length) {
      const url = queue[i++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { const d = extractProductData(r.html); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ farmatogo scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
