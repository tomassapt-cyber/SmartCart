#!/usr/bin/env node
/**
 * GirlMath — aminhafarmaciaonline.pt catalog scrape
 * ============================================================
 *
 * A Minha Farmácia Online é WooCommerce (tema WoodMart). Cada PDP
 * (/shop/<cat>/.../<slug>/) expõe JSON-LD VÁLIDO (parse limpo) com:
 *   • Product: name, gtin13 (EAN real — só numa PARTE dos produtos; o resto
 *     traz só um SKU/CNP de 7 dígitos que NÃO é EAN → ignorado),
 *     brand, offers.priceSpecification[].price, offers.availability, image.
 *   • BreadcrumbList: caminho de categoria fiável (Beleza › Dermocosmética › …).
 *
 * Sem Playwright/ScrapingBee. Por defeito scrapamos só /beleza/ (dermo-cosmética,
 * capilares, solares) — o nosso domínio; o resto (meds/puericultura) não casaria.
 *
 * O integrate usa matching híbrido seguro (EAN + nome+volume + fuzzy guardado),
 * tal como a asuafarmaciaonline.
 *
 * Uso:
 *   node scripts/scrape-aminhafarmaciaonline-catalog.js            # só /beleza/
 *   node scripts/scrape-aminhafarmaciaonline-catalog.js --all      # catálogo todo
 *   node scripts/scrape-aminhafarmaciaonline-catalog.js --limit=100
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'aminhafarmaciaonline-full.json');
const BASE = 'https://aminhafarmaciaonline.pt';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const ALL = !!args.all;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 350;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) {
  return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&'));
}
function isProductUrl(u) {
  if (!/\/shop\//.test(u) || /\.xml/.test(u)) return false;
  if (u.split('/').filter(Boolean).length <= 4) return false;     // /shop/ ou categoria rasa
  if (/\/product-category\//.test(u)) return false;
  return true;
}
function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

/** Parse @graph JSON-LD → Product + BreadcrumbList. Devolve produto ou null. */
function extractProductData(html, url) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let prod = null, crumbs = null;
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1]); } catch { continue; }
    const nodes = j['@graph'] ? j['@graph'] : [j];
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) prod = n;
      else if (t === 'BreadcrumbList' && Array.isArray(n.itemListElement)) crumbs = n.itemListElement;
    }
  }
  if (!prod) return null;

  const name = decodeUnicode((prod.name || '').toString()).replace(/\s+/g, ' ').trim();
  if (!name) return null;

  const offer = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
  let price = offer ? offer.price : null;
  if (!price && offer && offer.priceSpecification) {
    const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification;
    if (ps && ps.price) price = ps.price;
  }
  price = price != null ? parseFloat(price) : null;
  if (price == null || !isFinite(price) || price <= 0) return null;

  let ean = prod.gtin13 || prod.gtin || prod.gtin12 || prod.gtin14 || null;   // SÓ GTIN real (sku 7-díg ignorado)
  ean = ean != null ? String(ean).trim() : null;
  if (ean && (!/^\d{12,14}$/.test(ean) || /0{6,}/.test(ean))) ean = null;

  const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
  const brand = prod.brand ? (typeof prod.brand === 'string' ? prod.brand : (prod.brand.name || null)) : null;
  const image_url = Array.isArray(prod.image) ? prod.image[0] : (typeof prod.image === 'string' ? prod.image : (prod.image && prod.image.url) || null);

  // categoria do breadcrumb (sem "Início"/"Loja" e sem o último = nome do produto)
  let category = null;
  if (crumbs) {
    const parts = crumbs.map(e => e.item && e.item.name).filter(Boolean)
      .filter(n => !/^(in[íi]cio|loja|home)$/i.test(n));
    if (parts.length > 1) category = parts.slice(0, -1).join(' > ');
  }

  return {
    name, brand,
    ean,                       // pode ser null
    sku: prod.sku ? String(prod.sku) : null,
    image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null,
    price, previous_price: null, in_stock,
    volume_ml: volumeFromName(name),
    category, variants: [],
  };
}

async function fetchPage(url, attempt = 1) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow' });
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

async function discoverProductUrls() {
  const idx = await fetchPage(BASE + '/sitemap.xml');
  if (idx.status !== 'ok') return [];
  const subs = locs(idx.html).filter(u => /product-sitemap/i.test(u));
  const urls = new Set();
  for (const s of subs) {
    const r = await fetchPage(s);
    if (r.status === 'ok') for (const u of locs(r.html)) if (isProductUrl(u)) urls.add(u);
  }
  let arr = [...urls];
  if (!ALL) arr = arr.filter(u => /\/beleza\//.test(u));   // só cosmética por defeito
  return arr;
}

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'aminhafarmaciaonline.pt (WooCommerce, JSON-LD gtin13 + breadcrumb)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log(`📋 A descobrir produtos aminhafarmaciaonline (${ALL ? 'catálogo todo' : 'só /beleza/'})…`);
  let urls = await discoverProductUrls();
  console.log(`  ${urls.length} URLs de produto`);
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
        if (data) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...data }))); stats.ok++; if (data.ean) stats.ok_ean++; } // flat-copy: evita OOM por sliced-strings
        else { stats.skipped++; }
      } else if (r.status === 'not_found') { stats.not_found++; } else { stats.error++; }

      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(products);
        const rate = total / ((Date.now() - start) / 1000);
        console.log(`  [${total}/${queue.length}] ok:${stats.ok} (c/ean:${stats.ok_ean}) skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCheckpoint(products, false);

  console.log(`\n══════ aminhafarmaciaonline scrape ══════`);
  console.log(`  Produtos guardados:   ${products.length} (com EAN gtin13: ${products.filter(p => p.ean).length})`);
  console.log(`  in_stock:             ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro:     ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, fetchPage, isProductUrl, discoverProductUrls };
if (require.main === module) { main().catch(e => { console.error('FATAL', e); process.exit(1); }); }
