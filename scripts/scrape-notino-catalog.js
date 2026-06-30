#!/usr/bin/env node
/**
 * CosMath — notino.pt catalog scrape (skincare/corpo/cabelo)
 * ==========================================================
 *
 * Notino PT — o maior marketplace de beleza online em PT. Storefront PT (EUR,
 * envia PT). Cada ficha tem JSON-LD com gtin13 REAL → match forte por EAN
 * (como pharma-gdd / cocooncenter). A língua é irrelevante (casamos por EAN).
 *
 * Sitemaps por CATEGORIA (já separam o dermo do perfume/maquilhagem!):
 *   • plet  (rosto/skincare)   ~12k
 *   • telo  (corpo)            ~9k
 *   • vlasy (cabelo)           ~9k
 * Saltamos de propósito parfemy (perfume) e kosmetika (maquilhagem) — fora do
 * foco dermo do site. Total dermo ~30k → usar --limit (o catálogo completo
 * leva horas; o workflow cresce a cobertura com --resume).
 *
 * NOTA Cloudflare: a Notino está atrás de Cloudflare mas serve HTML a curl/
 * fetch com UA de browser. Concurrency baixo p/ não disparar rate-limit.
 *
 * Uso:
 *   node scripts/scrape-notino-catalog.js --limit=3000
 *   node scripts/scrape-notino-catalog.js --resume --concurrency=3
 *   node scripts/scrape-notino-catalog.js --cats=plet,telo --limit=2000
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { stripAccents } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'notino-full.json');
const BASE = 'https://www.notino.pt';
const SITEMAP = c => `${BASE}/export/sitemap/sitemap_detail_${c}_pt.xml`;
const DEFAULT_CATS = ['plet', 'telo', 'vlasy'];   // rosto, corpo, cabelo

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CATS = args.cats ? String(args.cats).split(',') : DEFAULT_CATS;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(5, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 250;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
function decodeUnicode(s) {
  return (s || '')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1]); } catch { continue; }
    const nodes = j['@graph'] ? j['@graph'] : [j];
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name) return null;
      let ean = n.gtin13 || n.gtin || n.gtin12 || n.gtin14 || null;
      ean = ean != null ? String(ean).trim() : null;
      if (!ean || !/^\d{12,14}$/.test(ean) || /0{6,}/.test(ean)) return null;   // exige GTIN real
      // offers pode ser Offer, AggregateOffer, ou array
      let offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      if (offer && offer['@type'] === 'AggregateOffer' && offer.offers) offer = Array.isArray(offer.offers) ? offer.offers[0] : offer.offers;
      let price = offer ? (offer.price ?? offer.lowPrice) : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock|LimitedAvailability/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean, sku: n.sku ? String(n.sku) : null, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

// IMPORTANTE: a Notino (Cloudflare) bloqueia o fetch do Node (TLS fingerprint
// do undici → 403), mas deixa passar o curl (fingerprint tipo-browser). Por
// isso buscamos via curl (child_process). `-w %{http_code}` anexa o código no
// fim do stdout.
function curlGet(url) {
  return new Promise(resolve => {
    const cp = spawn('curl', ['-s', '-L', '-A', UA, '-H', 'Accept-Language: pt-PT,pt;q=0.9', '--max-time', '25', '-w', '%{http_code}', url]);
    const chunks = [];
    cp.stdout.on('data', d => chunks.push(d));
    cp.on('close', () => { const s = Buffer.concat(chunks).toString('utf8'); const code = parseInt(s.slice(-3), 10) || 0; resolve({ code, html: s.slice(0, -3) }); });
    cp.on('error', () => resolve({ code: 0, html: '' }));
  });
}

async function fetchPage(url, attempt = 1) {
  const { code, html } = await curlGet(url);
  if (code === 404 || code === 410) return { status: 'not_found' };
  // 403/429/5xx ou falha de curl (0) = Cloudflare/rate-limit → recuar e repetir.
  if (code === 403 || code === 429 || code >= 500 || code === 0) {
    if (attempt < 4) { await new Promise(s => setTimeout(s, 3000 * attempt)); return fetchPage(url, attempt + 1); }
    return { status: 'http_error', http: code };
  }
  return { status: 'ok', html };
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'notino.pt (skincare/corpo/cabelo; JSON-LD gtin13)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log(`📋 A descarregar sitemaps Notino [${CATS.join(', ')}]…`);
  let urls = [];
  for (const c of CATS) {
    try { const { html } = await curlGet(SITEMAP(c)); const u = locs(html); urls.push(...u); console.log(`  ${c}: ${u.length}`); }
    catch (e) { console.warn(`  ⚠ ${c}: ${e.message}`); }
  }
  urls = [...new Set(urls)];
  console.log(`  total dermo: ${urls.length} produtos`);

  // --match-seed: PRIORIDADE a comparação com o que já temos. Filtra os URLs
  // às marcas que existem no nosso seed e ordena-os pelo nº de produtos NOSSOS
  // dessa marca (desc) → as marcas dermo core (La Roche-Posay, Vichy, Avène…)
  // são raspadas primeiro, maximizando matches por EAN por hora.
  if (args['match-seed']) {
    const slug = s => stripAccents(String(s || '').toLowerCase()).replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const brandCount = {};
    try {
      const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
      for (const p of seed.products) if (p.brand) { const b = slug(p.brand); brandCount[b] = (brandCount[b] || 0) + 1; }
    } catch (e) { console.warn('  ⚠ seed-bundle.json não lido p/ marcas:', e.message); }
    const brandOf = u => { const m = u.match(/notino\.pt\/([^/]+)\//); return m ? m[1] : ''; };
    const before = urls.length;
    urls = urls.filter(u => brandCount[brandOf(u)])
               .sort((a, b) => (brandCount[brandOf(b)] || 0) - (brandCount[brandOf(a)] || 0));
    console.log(`  🎯 --match-seed: ${urls.length} de ${before} (só marcas que já temos, prioridade às de maior sobreposição)`);
  }

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
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.4));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCheckpoint(products, false);
  console.log(`\n══════ notino scrape ══════`);
  console.log(`  Produtos com EAN: ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
