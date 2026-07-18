#!/usr/bin/env node
/**
 * CosMath — farmaciavidamais.pt catalog scrape (DynamoCMS/Selenia; SEM sitemap)
 * ============================================================
 * Descoberta: listagem completa em /pt/inicio/all-products?p=N (12 produtos/pág;
 * links pt/inicio/prod/<slug>, muitos SEM barra inicial). Ficha: "Ref: NNNNNNN"
 * em .product-reference E data-ref="NNNNNNN" — 7 díg = CNP; artigos de
 * puericultura usam EAN-13 como ref (validar checksum → ean). Imagem:
 * /files/products/prod-<ref>.png (padrão Dynamo, como a camelo).
 * Preço: € visível na ficha (sem JSON-LD).
 *
 * Uso: node scripts/scrape-vidamais-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'vidamais-full.json');
const BASE = 'https://www.farmaciavidamais.pt';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const MAX_PAGES = 400;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function gtinOk(d) {
  if (!/^\d{13}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+d[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10) === d[12];
}
function slugLooksCosmetic(slug) { return !!slug && !isNonCosmetic(slug.replace(/-/g, ' ')); }
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

function extractProductData(html, url) {
  // Ref: 7 díg = CNP · 13 díg c/ checksum = EAN (puericultura)
  const rm = html.match(/data-ref=["'](\d{6,14})["']/) || html.match(/product-reference[^>]*>\s*Ref:?\s*(\d{6,14})/i) || html.match(/Ref:?\s*(\d{7})\b/);
  const ref = rm ? rm[1] : null;
  if (!ref) return null;
  const cnp = /^\d{7}$/.test(ref) ? ref : null;
  const ean = gtinOk(ref) ? ref : null;
  if (!cnp && !ean) return null;
  let name = null;
  const ogt = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i);
  if (ogt) name = decodeEntities(ogt[1]).trim();
  if (!name) { const h1 = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i); if (h1) name = decodeEntities(h1[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); }
  if (!name) { const tm = html.match(/<title>([^<]+)<\/title>/i); if (tm) name = decodeEntities(tm[1]).replace(/\s*[|–-]\s*Farm[áa]cia Vida\s*\+?\s*Mais.*$/i, '').trim(); }
  if (!name || isNonCosmetic(name)) return null;
  // Preço: metas primeiro, senão o 1º € visível fora de <script>
  let price = null;
  const pm = html.match(/property=["'](?:og|product):price:amount["'][^>]*content=["']([\d.,]+)/i)
    || html.match(/itemprop=["']price["'][^>]*content=["']([\d.,]+)/i);
  if (pm) price = parseFloat(pm[1].replace(',', '.'));
  if (!(price > 0)) {
    const vis = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const pv = vis.match(/(\d{1,4}[.,]\d{2})\s*€/);
    if (pv) price = parseFloat(pv[1].replace(',', '.'));
  }
  if (price == null || !isFinite(price) || price <= 0) return null;
  const in_stock = !/esgotado|indispon[íi]vel|sem stock/i.test(html);
  const image_url = `${BASE}/files/products/prod-${ref}.png`;
  return { name, brand: null, ean, cnp, image_url, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
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
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmaciavidamais.pt (Dynamo/Selenia; all-products?p=N; data-ref=CNP/EAN)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A percorrer /pt/inicio/all-products (12/pág)…');
  const slugs = new Set();
  let vazias = 0;
  for (let p = 1; p <= MAX_PAGES; p++) {
    const html = await fetchText(`${BASE}/pt/inicio/all-products?p=${p}`);
    const antes = slugs.size;
    for (const m of html.matchAll(/href=["'][^"']*?pt\/inicio\/prod\/([a-z0-9-]+)/gi)) slugs.add(m[1]);
    const novos = slugs.size - antes;
    if (p % 20 === 0 || novos === 0) console.log(`  p=${p}: +${novos} (total ${slugs.size})`);
    if (novos === 0) { vazias++; if (vazias >= 2) break; } else vazias = 0;
    if (LIMIT !== Infinity && slugs.size >= LIMIT * 3) break;
    await new Promise(s => setTimeout(s, 350));
  }
  let urls = [...slugs].filter(slugLooksCosmetic).map(s => `${BASE}/pt/inicio/prod/${s}`);
  console.log(`  ${slugs.size} slugs → ${urls.length} após filtro de slug não-cosmético`);
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
  console.log(`\n══════ vidamais scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
