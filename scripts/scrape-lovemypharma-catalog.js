#!/usr/bin/env node
/**
 * CosMath — lovemypharma.com catalog scrape (Shopify — Farmácia da Penha, Faro)
 * ============================================================
 * ⚠️ Os sitemaps de produto dão 503 intermitente (proteção Shopify) — aqui o
 * caminho é OUTRO: /products.json paginado (250/pág) dá handle, título, vendor,
 * variants[].sku=CNP(7), price, available — MAS omite barcode. O EAN vem de
 * /products/<handle>.js (JSON leve por ficha, variants[].barcode=EAN-13).
 * Ritmo brando (conc 3, delay 400) para não acordar o throttle Shopify.
 *
 * Uso: node scripts/scrape-lovemypharma-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'lovemypharma-full.json');
const BASE = 'https://lovemypharma.com';   // sem www

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 400;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

async function fetchJson(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': 'localization=PT', 'Accept': 'application/json' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 4) { await new Promise(s => setTimeout(s, 2500 * attempt)); return fetchJson(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  if (r.status === 404 || r.status === 410) { try { if (r.body) await r.body.cancel().catch(() => {}); } catch {} return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) {
    try { if (r.body) await r.body.cancel().catch(() => {}); } catch {}
    if (attempt < 4) { await new Promise(s => setTimeout(s, 4000 * attempt)); return fetchJson(url, attempt + 1); }
    return { status: 'http_error', http: r.status };
  }
  try { return { status: 'ok', json: JSON.parse(await r.text()) }; }
  catch (e) { if (attempt < 4) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchJson(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

// Constrói itens a partir do products.json (1 item por variante com sku CNP)
function itemsFromProduct(p) {
  const out = [];
  const title = String(p.title || '').replace(/\s+/g, ' ').trim();
  if (!title || isNonCosmetic(title) || isNonCosmetic(String(p.handle || '').replace(/-/g, ' '))) return out;
  const img = Array.isArray(p.images) && p.images[0] ? (p.images[0].src || null) : null;
  for (const v of (p.variants || [])) {
    const name = v.title && v.title !== 'Default Title' ? (title + ' ' + String(v.title).trim()) : title;
    const cnp = /^\d{7}$/.test(String(v.sku || '').trim()) ? String(v.sku).trim() : null;
    const bc = String(v.barcode || '').trim();
    const ean = /^\d{12,14}$/.test(bc) && !/0{6,}/.test(bc) ? bc : null;
    if (!cnp && !ean) continue;
    const price = v.price != null ? parseFloat(v.price) : null;
    if (price == null || !isFinite(price) || price <= 0) continue;
    let prev = v.compare_at_price != null ? parseFloat(v.compare_at_price) : null;
    if (!(prev != null && isFinite(prev) && prev > price)) prev = null;
    out.push({
      url: BASE + '/products/' + p.handle, status: 'ok', scraped_at: new Date().toISOString(),
      name, brand: p.vendor ? String(p.vendor) : null, ean, cnp,
      image_url: img, price, previous_price: prev,
      in_stock: v.available !== false, volume_ml: volumeFromName(name), category: null,
      variants: [], _handle: p.handle, _vid: v.id,
    });
  }
  return out;
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'lovemypharma.com (Shopify; products.json sku=CNP + <handle>.js barcode=EAN)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A paginar products.json lovemypharma…');
  let products = [];
  for (let page = 1; page <= 60; page++) {
    const r = await fetchJson(BASE + '/products.json?limit=250&page=' + page);
    if (r.status !== 'ok') { console.error('  ✗ products.json pág ' + page + ': ' + r.status + (r.http ? ' ' + r.http : '')); if (page === 1) process.exit(1); break; }
    const lote = r.json.products || [];
    if (!lote.length) break;
    for (const p of lote) products.push(...itemsFromProduct(p));
    console.log(`  pág ${page}: +${lote.length} produtos (itens acumulados: ${products.length})`);
    await new Promise(s => setTimeout(s, 600));
  }
  const t0 = products.length;
  if (LIMIT !== Infinity) products = products.slice(0, LIMIT);
  console.log(`  ${t0} itens com CNP/EAN → a enriquecer EAN via /products/<handle>.js`);

  // 2ª fase: EAN por handle (barcode) — 1 pedido cobre todas as variantes do produto
  const cp = loadCheckpoint();
  const knownEan = new Map();
  if (cp) for (const p of cp.products) if (p._handle && p.ean && p._vid) knownEan.set(p._handle + '#' + p._vid, p.ean);
  const handles = [...new Set(products.filter(p => !p.ean).map(p => p._handle))];
  const byHandle = new Map();
  console.log(`\n🚀 ${handles.length} handles a buscar (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);
  const start = Date.now(); let i = 0;
  const stats = { ok: 0, not_found: 0, error: 0 };
  async function worker() {
    while (i < handles.length) {
      const h = handles[i++];
      const r = await fetchJson(BASE + '/products/' + h + '.js');
      if (r.status === 'ok') { byHandle.set(h, r.json); stats.ok++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${handles.length}] ok:${stats.ok} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((handles.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  let enriched = 0;
  for (const p of products) {
    if (p.ean) continue;
    const cached = knownEan.get(p._handle + '#' + p._vid);
    if (cached) { p.ean = cached; enriched++; continue; }
    const j = byHandle.get(p._handle);
    if (!j || !Array.isArray(j.variants)) continue;
    const v = j.variants.find(x => x.id === p._vid) || j.variants[0];
    const bc = v && String(v.barcode || '').trim();
    if (bc && /^\d{12,14}$/.test(bc) && !/0{6,}/.test(bc)) { p.ean = bc; enriched++; }
  }
  for (const p of products) { delete p._handle; delete p._vid; }
  console.log(`  EAN enriquecido em ${enriched} itens.`);
  if (products.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ lovemypharma scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  handles ok/404/erro: ${stats.ok}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { itemsFromProduct };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
