#!/usr/bin/env node
/**
 * CosMath — bemecare.com catalog scrape (Nuxt SSR, Trofa)
 * ============================================================
 * Bemecare: SEM JSON-LD Product. O estado vem em `window.__NUXT__=(function(a,b,…){…}(args))`
 * — payload POSICIONAL (valores como argumentos do IIFE), por isso regex não
 * serve: avaliamos o IIFE em sandbox (vm.runInNewContext) e navegamos o objeto.
 * Campos: product.sku=CNP(7) sempre; product.ean quase sempre vazio;
 * combinations[0].price = preço de venda; product.system_price_type[0].pivot.price
 * = PVP (previous_price quando > venda); combinations[0].quantity = stock;
 * brand.name.pt; media[0].url. Sitemap /feeds/sitemap.xml (~3.6k /pt/artigo/).
 *
 * Uso: node scripts/scrape-bemecare-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'bemecare-full.json');
const BASE = 'https://bemecare.com';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
function isProductUrl(u) { return /^https:\/\/(?:www\.)?bemecare\.com\/pt\/artigo\/[a-z0-9-]+$/.test(u); }
function slugLooksCosmetic(u) { const slug = (u.split('/').pop() || '').replace(/-/g, ' '); return !isNonCosmetic(slug); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function evalNuxt(html) {
  const m = html.match(/window\.__NUXT__=([\s\S]*?);?\s*<\/script>/);
  if (!m) return null;
  try { return vm.runInNewContext('(' + m[1].replace(/;\s*$/, '') + ')', {}, { timeout: 5000 }); }
  catch { return null; }
}

function pickText(v) { return v && typeof v === 'object' ? (v.pt || v.es || v.en || null) : (v || null); }

function extractProductData(html) {
  const nx = evalNuxt(html);
  if (!nx) return null;
  const cands = [];
  if (nx.data && Array.isArray(nx.data)) for (const d of nx.data) { if (d && d.product) cands.push(d.product); }
  if (nx.fetch && typeof nx.fetch === 'object') for (const f of Object.values(nx.fetch)) { if (f && f.product) cands.push(f.product); }
  const p = cands.find(c => c && c.sku && c.name);
  if (!p) return null;
  const name = String(pickText(p.name) || '').replace(/\s+/g, ' ').trim();
  if (!name || isNonCosmetic(name)) return null;
  const cnp = /^\d{7}$/.test(String(p.sku || '')) ? String(p.sku) : null;
  const eanRaw = String(p.ean || p.gtin || '').trim();
  const ean = /^\d{12,14}$/.test(eanRaw) && !/0{6,}/.test(eanRaw) ? eanRaw : null;
  if (!ean && !cnp) return null;
  const combo = (Array.isArray(p.combinations) && p.combinations[0]) || null;
  const price = combo && combo.price != null ? parseFloat(combo.price) : null;
  if (price == null || !isFinite(price) || price <= 0) return null;
  let prev = null;
  const sysT = combo && combo.product && Array.isArray(combo.product.system_price_type) && combo.product.system_price_type[0];
  if (sysT && sysT.pivot && sysT.pivot.price != null) { const pv = parseFloat(sysT.pivot.price); if (isFinite(pv) && pv > price) prev = pv; }
  const in_stock = combo && combo.quantity != null ? Number(combo.quantity) > 0 : (p.is_active !== false);
  const brand = p.brand ? pickText(p.brand.name) : null;
  const media = Array.isArray(p.media) && p.media[0] ? (p.media[0].url || p.media[0].original_url || null) : null;
  return { name, brand, ean, cnp, image_url: media, price, previous_price: prev, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
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
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'bemecare.com (Nuxt SSR; vm-eval __NUXT__: sku=CNP, combinations price/stock)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar /feeds/sitemap.xml bemecare…');
  const xml = await fetchText(BASE + '/feeds/sitemap.xml');
  let urls = [...new Set(locs(xml).filter(isProductUrl))];
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
  console.log(`\n══════ bemecare scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
