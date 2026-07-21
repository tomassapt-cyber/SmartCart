#!/usr/bin/env node
/**
 * CosMath — miin-cosmetics.pt catalog scrape (PrestaShop, K-beauty Lisboa)
 * ============================================================
 * MiiN Cosmetics: loja K-beauty PT (loja física em Lisboa, +80 marcas).
 * PrestaShop; sitemap ÚNICO /6_pt_0_sitemap.xml (CDATA, ~1086 fichas .html,
 * padrão /{id}-{slug}.html). SEM JSON-LD Product — a chave vive na MICRODATA
 * schema.org da ficha:
 *   • <meta itemprop="gtin13" content="EAN-13">  → chave (produtos coreanos,
 *     sem CNP; o EAN chega para casar).
 *   • preço: <meta property="product:price:amount"> = preço COM IVA (o
 *     itemprop="price" da microdata é SEM IVA, ~19% mais baixo — NÃO usar).
 *   • marca: <div itemprop="brand"><meta itemprop="name" content>.
 *
 * Uso: node scripts/scrape-miin-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'miin-full.json');
const BASE = 'https://miin-cosmetics.pt';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g) || []).map(m => m.replace(/<loc>\s*(?:<!\[CDATA\[)?/, '').replace(/(?:\]\]>)?\s*<\/loc>/, '').trim()); }
function isProductUrl(u) { return /\/\d+-[^/]+\.html$/.test(u); }
function slugLooksCosmetic(u) { const slug = (u.split('/').pop() || '').replace(/\.html$/, '').replace(/^\d+-/, '').replace(/-/g, ' '); return !!slug && !isNonCosmetic(slug); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function decodeEntities(s) {
  return (s || '').replace(/&ccedil;/g, 'ç').replace(/&atilde;/g, 'ã').replace(/&otilde;/g, 'õ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú')
    .replace(/&acirc;/g, 'â').replace(/&ecirc;/g, 'ê').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}

function extractProductData(html) {
  // EAN-13 real da microdata (única chave)
  const gm = html.match(/itemprop=["']gtin13["'][^>]*content=["'](\d{12,14})/i)
    || html.match(/content=["'](\d{12,14})["'][^>]*itemprop=["']gtin13["']/i);
  const ean = gm && /^\d{12,14}$/.test(gm[1]) && !/0{6,}/.test(gm[1]) ? gm[1] : null;
  if (!ean) return null;
  // nome: og:title
  let name = ((html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i) || [])[1] || '').trim();
  if (!name) { const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) name = h1[1].replace(/<[^>]+>/g, '').trim(); }
  name = decodeEntities(name).replace(/\s+/g, ' ').replace(/\s*[|–-]\s*MiiN.*$/i, '').trim();
  if (!name || isNonCosmetic(name)) return null;
  // preço COM IVA: meta product:price:amount (o itemprop=price é sem IVA)
  const pm = html.match(/property=["']product:price:amount["'][^>]*content=["']([\d.,]+)/i)
    || html.match(/content=["']([\d.,]+)["'][^>]*property=["']product:price:amount["']/i);
  const price = pm ? parseFloat(String(pm[1]).replace(',', '.')) : null;
  if (price == null || !isFinite(price) || price <= 0) return null;
  // marca da microdata
  const bm = html.match(/itemprop=["']brand["'][\s\S]{0,160}?itemprop=["']name["'][^>]*content=["']([^"']+)/i);
  const brand = bm ? decodeEntities(bm[1]).trim() : null;
  const og = (html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) || [])[1] || null;
  const in_stock = /itemprop=["']availability["'][^>]*content=["'][^"']*InStock/i.test(html) || /add-to-cart|Adicionar ao carrinho/i.test(html);
  return { name, brand, ean, cnp: null, image_url: og, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
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
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'miin-cosmetics.pt (PrestaShop; microdata gtin13 + meta product:price)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar 6_pt_0_sitemap.xml miin…');
  const xml = await fetchText(BASE + '/6_pt_0_sitemap.xml');
  let urls = [...new Set(locs(xml).filter(isProductUrl))];
  const t0 = urls.length;
  urls = urls.filter(slugLooksCosmetic);
  console.log(`  ${t0} fichas → ${urls.length} após filtro de slug não-cosmético`);
  if (!urls.length) { console.error('✗ sitemap sem fichas (mudou de estrutura?) — não sobrescrevo.'); process.exit(1); }
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
  console.log(`\n══════ miin scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
