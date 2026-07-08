#!/usr/bin/env node
/**
 * CosMath — sobeauty.pt catalog scrape (WooCommerce/WordPress, farmácia dermo PT)
 * ============================================================
 *
 * SoBeauty é uma farmácia dermo PT (~990 produtos "Saúde e Beleza" no
 * KuantoKusta). WordPress/WooCommerce (All in One SEO), envia PT. Cada ficha tem
 * JSON-LD com `sku` = CNP (7 díg), marca, preço, imagem. SEM products.json →
 * scrape ficha-a-ficha.
 *
 * MODO COMPARAÇÃO (enrich-only): match por CNP/EAN contra produtos existentes.
 *
 * Sitemap: /sitemap_index.xml (índice) → product-sitemap*.xml. Os <loc> vêm em
 * CDATA (All in One SEO) → locs() trata disso. URLs de produto: /product/<slug>/.
 *
 * Uso:
 *   node scripts/scrape-sobeauty-catalog.js
 *   node scripts/scrape-sobeauty-catalog.js --limit=200 --resume
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'sobeauty-full.json');
const BASE = 'https://sobeauty.pt';
const SITEMAP_INDEX = BASE + '/sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
// ⚠ Esta plataforma (sobeauty/smartbeauty/beleza37 partilham-na) dá 429 com
// facilidade → defaults GENTIS + backoff longo no fetchPage.
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 2;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 900;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// locs CDATA-aware (All in One SEO envolve os <loc> em <![CDATA[...]]>).
function locs(xml) {
  return (xml.match(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g) || [])
    .map(m => m.replace(/<loc>\s*(?:<!\[CDATA\[)?/, '').replace(/(?:\]\]>)?\s*<\/loc>/, '').trim().replace(/&amp;/g, '&'))
    .filter(Boolean);
}
const isProductSitemap = u => /products.*.xml(.gz)?$/i.test(u);
// WooCommerce: fichas em /product/<slug>/ (ou /produto/<slug>/).
function isProductUrl(u) { return /\/(product|produto)\/[^/?]+\/?$/i.test(u); }
// Excluir claramente-não-cosmética pelo NOME da ficha (medicamentos/suplem/pet/bebé).
const EXCLUDE_NAME = { test: isNonCosmetic };  // filtro nao-cosmetica partilhado (lib)

function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x1F]+', 'g');
function stripJsonControlChars(s) { return s.replace(CONTROL_CHARS_RE, ' '); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1]); }
    catch { try { j = JSON.parse(stripJsonControlChars(b[1])); } catch { continue; } }
    const nodes = j['@graph'] ? j['@graph'] : [j];
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name || EXCLUDE_NAME.test(name)) return null;             // fora: não-cosmética
      // Chave: o `sku` do Jumpseller é CNP(7) na maioria, EAN-13 nalguns.
      // Também aceitamos gtin13/mpn se existir.
      const sku = n.sku != null ? String(n.sku).trim() : '';
      const gtin = [n.gtin13, n.gtin, n.gtin14, n.mpn].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{12,14}$/.test(x) && !/0{6,}/.test(x)) || null;
      let ean = gtin || (/^\d{12,14}$/.test(sku) && !/0{6,}/.test(sku) ? sku : null);
      let cnp = /^\d{7}$/.test(sku) ? sku : null;
      if (!ean && !cnp) return null;                                 // sem chave nacional/global → ignora
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? (offer.price || offer.lowPrice) : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean, cnp, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

// gunzip-aware (sub-sitemaps .xml.gz) + backoff longo no 429 do sitemap.
async function fetchText(url, attempt = 1) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) {
      try { r.body && r.body.cancel().catch(() => {}); } catch {}
      if (attempt <= 6) { const w = 10000 * attempt; console.log(`    ⏳ ${r.status} no sitemap — espera ${w / 1000}s`); await new Promise(s => setTimeout(s, w)); return fetchText(url, attempt + 1); }
      return '';
    }
    const b = Buffer.from(await r.arrayBuffer());
    try { return zlib.gunzipSync(b).toString('utf8'); } catch { return b.toString('utf8'); }
  }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } throw e; }
}

async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt <= 5) { await new Promise(s => setTimeout(s, 6000 * attempt + Math.random() * 2000)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'sobeauty.pt (WooCommerce PT; JSON-LD sku=CNP/EAN)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap_index.xml sobeauty…');
  const idxXml = await fetchText(SITEMAP_INDEX);
  const subs = locs(idxXml).filter(isProductSitemap);
  console.log(`  ${subs.length} product-sitemap(s): ${subs.map(u => u.split('/').pop()).join(', ') || '(nenhum)'}`);
  let urls = [];
  for (const sm of (subs.length ? subs : [SITEMAP_INDEX])) { const xml = await fetchText(sm); urls.push(...locs(xml).filter(isProductUrl)); }
  urls = [...new Set(urls)];
  console.log(`  ${urls.length} candidatos a produto no sitemap`);

  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
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
  if (products.length === 0) { console.error('✗ 0 produtos (feed vazio/bloqueio de IP?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ sobeauty scrape ══════`);
  console.log(`  Produtos: ${products.length} · com CNP: ${products.filter(p => p.cnp).length} · com EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
