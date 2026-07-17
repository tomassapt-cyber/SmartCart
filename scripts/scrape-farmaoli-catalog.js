#!/usr/bin/env node
/**
 * CosMath — farmaoli.pt catalog scrape (PrestaShop, Porto)
 * ============================================================
 * Farmaoli: PrestaShop com sitemap índice /1_index_sitemap.xml → children
 * *_sitemap.xml com <loc> em CDATA. Fichas /<id>-<slug>.html. O EAN-13 vem no
 * SLUG em ~81% (validar dígito de controlo!). Na ficha, o JSON de tracking
 * traz "ean" + "reference"(=CNP nalguns). ⚠️ itemprop sku/mpn é dummy ("1234")
 * — NUNCA usar. Preço: meta product:price:amount / itemprop=price content.
 *
 * Uso: node scripts/scrape-farmaoli-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmaoli-full.json');
const BASE = 'https://farmaoli.pt';   // sem www (robots aponta para o domínio nu)

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// locs CDATA-aware (mesmo padrão do shopcosmetics)
function locs(xml) {
  return (xml.match(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g) || [])
    .map(m => m.replace(/<loc>\s*(?:<!\[CDATA\[)?/, '').replace(/(?:\]\]>)?\s*<\/loc>/, '').trim().replace(/&amp;/g, '&'))
    .filter(Boolean);
}
function isProductUrl(u) { return /^https:\/\/(?:www\.)?farmaoli\.pt\/(?:[a-z0-9-]+\/)?\d+-[^/]+\.html$/i.test(u); }
function slugLooksCosmetic(u) { const slug = ((u.split('/').pop() || '').replace(/^\d+-/, '').replace(/\.html$/, '')).replace(/-/g, ' '); return !isNonCosmetic(slug); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function validEan13(s) {
  if (!/^\d{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+s[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === +s[12];
}
function eanFromSlug(url) {
  const slug = (url.split('/').pop() || '');
  const m = slug.match(/(\d{13})/g);
  if (!m) return null;
  const hit = m.find(validEan13);
  return hit || null;
}

function extractProductData(html, url) {
  // nome: og:title ou <h1>
  let name = ((html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i) || [])[1] || '').trim();
  if (!name) name = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  name = name.replace(/\s+/g, ' ').replace(/\s*[|–-]\s*Farmaoli.*$/i, '').trim();
  if (!name || isNonCosmetic(name)) return null;
  // EAN: JSON de tracking > slug validado
  let ean = null;
  const tr = html.match(/["']ean["']\s*[:=]\s*["']?(\d{12,14})/i);
  if (tr && /^\d{12,14}$/.test(tr[1]) && !/0{6,}/.test(tr[1])) ean = tr[1];
  if (!ean) ean = eanFromSlug(url);
  // CNP: "reference" com 7 dígitos (itemprop sku/mpn é dummy — ignorar)
  let cnp = null;
  const ref = html.match(/["']reference["']\s*[:=]\s*["']?(\d{6,8})["']?/i);
  if (ref && /^\d{7}$/.test(ref[1])) cnp = ref[1];
  if (!ean && !cnp) return null;
  // preço: meta product:price:amount > itemprop=price content > tracking "price"
  let price = null;
  const mp = html.match(/property=["']product:price:amount["'][^>]*content=["']([\d.]+)/i)
    || html.match(/content=["']([\d.]+)["'][^>]*property=["']product:price:amount["']/i)
    || html.match(/itemprop=["']price["'][^>]*content=["']([\d.]+)/i)
    || html.match(/content=["']([\d.]+)["'][^>]*itemprop=["']price["']/i)
    || html.match(/["']price_amount["']\s*:\s*([\d.]+)/i)
    || html.match(/["']price["']\s*:\s*["']?([\d.]+)["']?/i);
  if (mp) price = parseFloat(mp[1]);
  if (price == null || !isFinite(price) || price <= 0) return null;
  const in_stock = !/product-unavailable|out-of-stock|Indisponível|Esgotado/i.test(html) || /AddToCart|add-to-cart|InStock/i.test(html);
  const brand = ((html.match(/["']brand["']\s*:\s*["']([^"']{2,40})["']/i) || [])[1] || null);
  const og = ((html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) || [])[1]) || null;
  return { name, brand, ean, cnp, image_url: og, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
}

async function fetchText(url, attempt = 1) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); return await r.text(); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } throw e; }
}
async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 3000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmaoli.pt (PrestaShop; EAN no slug 81% validado por checksum + tracking ean/reference; itemprop dummy)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar 1_index_sitemap.xml farmaoli…');
  const idx = await fetchText(BASE + '/1_index_sitemap.xml');
  const children = locs(idx).filter(u => /_sitemap\.xml$/i.test(u));
  console.log(`  ${children.length} sub-sitemaps`);
  let urls = [];
  for (const sm of children) { const xml = await fetchText(sm); urls.push(...locs(xml).filter(isProductUrl)); await new Promise(s => setTimeout(s, 500)); }
  urls = [...new Set(urls)];
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
      if (r.status === 'ok') { const d = extractProductData(r.html, url); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
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
  console.log(`\n══════ farmaoli scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl, validEan13, eanFromSlug };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
