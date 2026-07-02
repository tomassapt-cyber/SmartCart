#!/usr/bin/env node
/**
 * CosMath — saudemayor.pt catalog scrape (dermocosmética PT, EAN+CNP)
 * ============================================================
 *
 * Saúde Mayor é uma farmácia/parafarmácia PT (preços EUR, envia PT). Cada
 * ficha expõe um bloco JSON-LD Product com `mpn` = EAN real (13 díg) E
 * `sku` = CNP (7 díg) — chave DUPLA, melhor que a maioria das lojas.
 *
 * ARMADILHA: o JSON-LD do site tem um bug de template (contexto Blade/PHP
 * mal resolvido) que injecta código-fonte cru com quebras de linha DENTRO da
 * string do "@context" — isto invalida o JSON (control character). JSON.parse
 * falha em TODAS as fichas. Em vez de JSON.parse, extraímos os campos por
 * regex directamente do blob do <script>.
 *
 * Sitemap: /sitemap.xml (urlset único, ~5.5k URLs incl. contas/carrinho/
 * marcas). Produto = termina em .html E não é página estática conhecida.
 *
 * Uso:
 *   node scripts/scrape-saudemayor-catalog.js
 *   node scripts/scrape-saudemayor-catalog.js --limit=200 --resume
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'saudemayor-full.json');
const BASE = 'https://www.saudemayor.pt';
const SITEMAP_URL = BASE + '/sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 250;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Páginas .html estáticas (não produto) vistas no sitemap.
const URL_EXCLUDE = /\/(quem-somos|perguntas-frequentes|definicoes-de-privacidade|condicoes-gerais|a-farmacia|encomendar|termos-e-condicoes|black-friday|datas-especiais)(\.html)?$/i;

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
function isProductUrl(u) { return u.endsWith('.html') && !URL_EXCLUDE.test(u); }

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&').replace(/&#x27;|&#39;|&#039;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

// Extracção por REGEX (não JSON.parse — o JSON-LD do site vem partido, ver
// nota no topo do ficheiro).
function extractProductData(html) {
  const block = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/);
  if (!block) return null;
  const blob = block[1];
  const nameM = blob.match(/"name":\s*"([^"]+)"/);
  if (!nameM) return null;
  const name = decodeEntities(nameM[1]).replace(/\s+/g, ' ').trim();
  if (!name) return null;

  const skuM = blob.match(/"sku":\s*"(\d+)"/);
  const mpnM = blob.match(/"mpn":\s*"(\d+)"/);
  const brandM = blob.match(/"brand":\s*\{[^}]*?"name":\s*"([^"]+)"/);
  const priceM = blob.match(/"price":\s*([\d.]+)/);
  const availM = blob.match(/"availability":\s*"?\s*([a-z:/.A-Z]+)/);
  const imgM = blob.match(/"image":\s*\[\s*"([^"]+)"/);

  const ean = mpnM && /^\d{12,14}$/.test(mpnM[1]) && !/0{6,}/.test(mpnM[1]) ? mpnM[1] : null;
  const cnp = skuM && /^\d{7}$/.test(skuM[1]) ? skuM[1] : null;
  if (!ean) return null;                 // sem EAN real → ignora (foco EAN forte)
  const price = priceM ? parseFloat(priceM[1]) : null;
  if (price == null || !isFinite(price) || price <= 0) return null;
  const in_stock = /InStock/i.test(availM ? availM[1] : '');

  return {
    name, brand: brandM ? decodeEntities(brandM[1]) : null,
    ean, cnp, sku: cnp,
    image_url: imgM ? imgM[1] : null,
    price, previous_price: null, in_stock,
    volume_ml: volumeFromName(name), category: null, variants: [],
  };
}

async function fetchText(url, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal }); return await r.text(); }
  finally { clearTimeout(t); }
}

async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'saudemayor.pt (HTML + regex sobre JSON-LD partido: mpn=EAN, sku=CNP)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap.xml saudemayor…');
  const smXml = await fetchText(SITEMAP_URL);
  let urls = [...new Set(locs(smXml).filter(isProductUrl))];
  console.log(`  ${urls.length} produtos no sitemap`);
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
  console.log(`\n══════ saudemayor scrape ══════`);
  console.log(`  Produtos com EAN: ${products.length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
