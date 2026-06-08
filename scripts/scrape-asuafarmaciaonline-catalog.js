#!/usr/bin/env node
/**
 * GirlMath — asuafarmaciaonline.pt catalog scrape
 * ============================================================
 *
 * asuafarmaciaonline.pt usa a MESMA plataforma da afarmaciaonline.pt, MAS:
 *   • o data-layer tem "ean":"" (VAZIO) → não serve.
 *   • o JSON-LD Product tem o GTIN-13 no campo "mpn" (~29% dos produtos;
 *     marcas tipo Avène/SVR/Sesderma preenchem, outras não).
 *   • o JSON-LD vem com um artefacto PHP no @context (template não renderizado)
 *     → JSON.parse falha; extraímos por regex tolerante.
 *
 * Guardamos nome+marca+preço+stock+imagem SEMPRE, e ean (do mpn) QUANDO existe.
 * O integrate decide: match por EAN (mpn) quando há, senão fingerprint de nome.
 *
 * Uso:
 *   node scripts/scrape-asuafarmaciaonline-catalog.js [--limit=N] [--resume]
 *   node scripts/scrape-asuafarmaciaonline-catalog.js --chunk=1/4
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'asuafarmaciaonline-full.json');
const BASE = 'https://www.asuafarmaciaonline.pt';
const SITEMAP_URL = BASE + '/sitemap.xml';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 400;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const URL_EXCLUDE = /\/(login|logout|register|retrive-password|alterar-password|password|a-minha-conta|cart|checkout|spin|dismiss-language-popup|newsletter|blog|calendario|lojas|marcas|reminders)\b/i;

function isProductUrl(u) {
  if (!u.endsWith('.html')) return false;
  if (URL_EXCLUDE.test(u)) return false;
  return true;
}
function decodeUnicode(s) {
  return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

/**
 * Extrai do bloco JSON-LD Product por regex (parse falha por causa do PHP
 * leak no @context). Devolve { name, brand, ean|null, price, in_stock,
 * image_url, sku, volume_ml, ... } ou null.
 */
function extractProductData(html, url) {
  const m = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  const ld = m[1];
  // só nos interessa se for um Product
  if (!/"@type"\s*:\s*"Product"/.test(ld)) return null;

  // nome do produto = primeiro "name" (vem antes de "brand")
  const nameM = ld.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!nameM) return null;
  const name = decodeUnicode(nameM[1]).replace(/\s+/g, ' ').trim();
  if (!name) return null;

  const priceM = ld.match(/"price"\s*:\s*"?([\d]+(?:\.\d+)?)"?/);
  const price = priceM ? parseFloat(priceM[1]) : null;
  if (price == null || !isFinite(price) || price <= 0) return null;

  const brandM = ld.match(/"brand"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]*)"/);
  const brand = brandM ? decodeUnicode(brandM[1]).trim() : null;

  // EAN: campo mpn (GTIN-13) quando presente e válido
  const mpnM = ld.match(/"mpn"\s*:\s*"(\d{8,14})"/);
  let ean = mpnM ? mpnM[1] : null;
  if (ean && (!/^\d{12,14}$/.test(ean) || /0{6,}/.test(ean))) ean = null;

  const availM = ld.match(/"availability"\s*:\s*"([^"]*)"/);
  const in_stock = availM ? /InStock/i.test(availM[1]) : true;

  const imgM = ld.match(/"image"\s*:\s*\[\s*"([^"]*)"/) || ld.match(/"image"\s*:\s*"([^"]*)"/);
  const image_url = imgM ? imgM[1].replace(/\\\//g, '/') : null;

  const skuM = ld.match(/"sku"\s*:\s*"([^"]*)"/);

  return {
    name,
    brand,
    ean,                       // pode ser null (sem mpn)
    sku: skuM ? skuM[1] : null,
    image_url,
    price,
    previous_price: null,
    in_stock,
    volume_ml: volumeFromName(name),
    category: null,
    variants: [],
  };
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

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!Array.isArray(d.products)) return null;
    return { products: d.products, done: new Set(d.products.map(p => p.url)) };
  } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    scraped_at: new Date().toISOString(),
    source: 'asuafarmaciaonline.pt (HTTP + JSON-LD; EAN do mpn quando presente)',
    in_progress: inProgress,
    products,
  }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  console.log('📋 A descarregar sitemap asuafarmaciaonline…');
  const smXml = await (await fetch(SITEMAP_URL, { headers: { 'User-Agent': UA } })).text();
  const allUrls = (smXml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
  let urls = [...new Set(allUrls.filter(isProductUrl))];
  console.log(`  ${allUrls.length} URLs no sitemap · ${urls.length} candidatos a produto (.html)`);

  if (CHUNK) {
    const [n, mm] = CHUNK.split('/').map(Number);
    const sorted = [...urls].sort();
    const size = Math.ceil(sorted.length / mm);
    urls = sorted.slice((n - 1) * size, n * size);
    console.log(`  Chunk ${CHUNK}: ${urls.length} URLs`);
  }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);

  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now();
  let idx = 0;
  const stats = { ok: 0, ok_ean: 0, skipped: 0, not_found: 0, error: 0 };

  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url);
      const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const data = extractProductData(r.html, url);
        if (data) { products.push({ url, status: 'ok', scraped_at, ...data }); stats.ok++; if (data.ean) stats.ok_ean++; }
        else { stats.skipped++; }
      } else if (r.status === 'not_found') { stats.not_found++; }
      else { stats.error++; }

      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(products);
        const elapsed = (Date.now() - start) / 1000;
        const rate = total / elapsed;
        console.log(`  [${total}/${queue.length}] ok:${stats.ok} (c/ean:${stats.ok_ean}) skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCheckpoint(products, false);

  console.log(`\n══════ asuafarmaciaonline scrape ══════`);
  console.log(`  Produtos guardados:       ${products.length}`);
  console.log(`    com EAN (mpn):          ${products.filter(p => p.ean).length}`);
  console.log(`    in_stock:               ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped (sem nome/preço): ${stats.skipped}`);
  console.log(`  404: ${stats.not_found} · erro: ${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, fetchPage, isProductUrl };

if (require.main === module) {
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
