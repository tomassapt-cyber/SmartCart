#!/usr/bin/env node
/**
 * GirlMath — lojadafarmacia.com catalog scrape
 * ============================================================
 *
 * lojadafarmacia.com é Magento. Cada PDP (/pt/artigo/<slug>) expõe um
 * JSON-LD Product COMPLETO e limpo:
 *   { "@type":"Product", name, brand, gtin13:"<EAN>",
 *     offers:{ price, priceCurrency, availability } , image }
 *
 * Ou seja, o GTIN-13 (EAN real) vem DIRECTO do gtin13 do JSON-LD — mais
 * limpo que a afarmaciaonline (que precisava do data-layer duplo-escapado).
 * Sem Playwright/ScrapingBee — fetch HTTP simples basta.
 *
 * Medicamentos sem código de barras / produtos indisponíveis NÃO trazem
 * gtin13 → extração devolve null e o produto é ignorado (filtro natural).
 *
 * Pipeline:
 *  1. Descarregar feeds/sitemap.xml (~11.6k locs; ~11k /artigo/ de produto)
 *  2. Para cada URL: fetch + extrair JSON-LD (EAN/nome/marca/preço/stock/img)
 *  3. Checkpoint a cada 100 (resume seguro)
 *
 * Uso:
 *   node scripts/scrape-lojafarmacia-catalog.js              # full
 *   node scripts/scrape-lojafarmacia-catalog.js --limit=100  # smoke test
 *   node scripts/scrape-lojafarmacia-catalog.js --chunk=1/4  # 1ª fatia
 *   node scripts/scrape-lojafarmacia-catalog.js --resume     # retoma
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'lojafarmacia-full.json');
const BASE = 'https://www.lojadafarmacia.com';
const SITEMAP_URL = BASE + '/feeds/sitemap.xml';

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
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 500;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function isProductUrl(u) {
  return /\/artigo\//.test(u);
}

function slugFromUrl(u) {
  const m = u.match(/\/artigo\/([^\/?#]+)/);
  return m ? m[1] : null;
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

      // EAN: gtin13 (preferido) → gtin/gtin12/gtin14 → ean
      let ean = o.gtin13 || o.gtin || o.gtin12 || o.gtin14 || o.ean || null;
      ean = ean != null ? String(ean).trim() : null;
      if (!ean || !/^\d{12,14}$/.test(ean)) return null;   // exige GTIN real
      if (/0{6,}/.test(ean)) return null;                  // rejeita placeholder

      const offer = Array.isArray(o.offers) ? o.offers[0] : o.offers;
      if (!offer) return null;
      const price = typeof offer.price === 'number' ? offer.price : parseFloat(offer.price);
      if (!isFinite(price) || price <= 0) return null;     // sem preço não serve
      const in_stock = /InStock/i.test(offer.availability || '');

      const brand = typeof o.brand === 'string' ? o.brand
        : (o.brand && (o.brand.name || o.brand['@id'])) || null;
      const image_url = Array.isArray(o.image) ? o.image[0]
        : (typeof o.image === 'string' ? o.image : (o.image && o.image.url) || null);
      const name = (o.name || '').toString().trim() || null;
      if (!name) return null;

      const prevRaw = offer.priceSpecification && offer.priceSpecification.price;
      const previous_price = prevRaw && parseFloat(prevRaw) > price ? parseFloat(prevRaw) : null;

      return {
        name,
        brand: brand ? String(brand).trim() : null,
        ean,
        sku: o.sku ? String(o.sku) : null,
        image_url: image_url || null,
        price,
        previous_price,
        in_stock,
        volume_ml: volumeFromName(name),
        category: null,
        variants: [],
      };
    }
  }
  return null;
}

function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
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
    source: 'lojadafarmacia.com (HTTP + JSON-LD gtin13)',
    in_progress: inProgress,
    products,
  }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  console.log('📋 A descarregar sitemap lojadafarmacia…');
  const smRes = await fetch(SITEMAP_URL, { headers: { 'User-Agent': UA } });
  const smXml = await smRes.text();
  const allUrls = (smXml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
  let urls = [...new Set(allUrls.filter(isProductUrl))];
  console.log(`  ${allUrls.length} URLs no sitemap · ${urls.length} candidatos a produto (/artigo/)`);

  if (CHUNK) {
    const [n, m] = CHUNK.split('/').map(Number);
    const sorted = [...urls].sort();
    const size = Math.ceil(sorted.length / m);
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
        const rate = total / elapsed;
        const eta = (queue.length - total) / rate;
        console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round(eta / 60)}m`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCheckpoint(products, false);

  const inStock = products.filter(p => p.in_stock).length;
  console.log(`\n══════ lojadafarmacia scrape ══════`);
  console.log(`  Produtos guardados (com EAN): ${products.length}`);
  console.log(`  in_stock: ${inStock}`);
  console.log(`  skipped (med/sem-EAN): ${stats.skipped}`);
  console.log(`  404: ${stats.not_found} · erro: ${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, fetchPage, slugFromUrl, isProductUrl };

if (require.main === module) {
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
