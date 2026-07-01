#!/usr/bin/env node
/**
 * GirlMath — afarmaciaonline.pt catalog scrape
 * ============================================================
 *
 * afarmaciaonline.pt é Magento. Cada PDP de produto de consumo expõe um
 * JSON-LD Product:
 *   name, brand, offers.price, offers.availability, image,
 *   mpn/gtin13 = GTIN-13 real, sku = CNP (Código Nacional do Produto, 7 díg).
 *
 * NOTA (2026-06): o site deixou de servir o data-layer com "ean" (o atributo
 * data-ean ficou vazio) — a extração passou a usar o JSON-LD. O scraper antigo
 * dependia do data-layer e parou de devolver produtos (catálogo vazio).
 *
 * Não precisamos Playwright/ScrapingBee — fetch HTTP simples basta.
 * O EAN (GTIN-13 real, via mpn) → cross-store matching forte; CNP é bónus.
 *
 * Medicamentos / suplementos sem EAN no JSON-LD são ignorados (foco dermo).
 *
 * Pipeline:
 *  1. Descarregar sitemap.xml (~9k URLs; filtramos os .html de produto)
 *  2. Para cada URL: fetch + extrair JSON-LD (mpn=EAN, sku=CNP, preço, stock,
 *     imagem). Manter só com EAN real.
 *  3. Checkpoint a cada 100 (resume seguro)
 *
 * Uso:
 *   node scripts/scrape-afarmaciaonline-catalog.js              # full
 *   node scripts/scrape-afarmaciaonline-catalog.js --limit=100  # smoke test
 *   node scripts/scrape-afarmaciaonline-catalog.js --chunk=1/4  # 1ª fatia
 *   node scripts/scrape-afarmaciaonline-catalog.js --resume     # retoma
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'afarmaciaonline-full.json');
const BASE = 'https://www.afarmaciaonline.pt';
const SITEMAP_URL = BASE + '/sitemap.xml';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null; // ex: "1/4"
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 500;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// URLs que claramente NÃO são produto (páginas de sistema/conteúdo).
const URL_EXCLUDE = /\/(login|logout|register|retrive-password|alterar-password|a-minha-conta|cart|checkout|password|spin|dismiss-language-popup|newsletter|blog|calendario|lojas|marcas|reminders)\b/i;

function isProductUrl(u) {
  if (!u.endsWith('.html')) return false;
  if (URL_EXCLUDE.test(u)) return false;
  return true;
}

/**
 * JSON-LD Product → { price, in_stock, image_url, name, brand, ean, cnp }
 * O site migrou (2026): o data-layer com "ean" deixou de existir; a identidade
 * vive agora no JSON-LD — `mpn`/`gtin13` = GTIN-13 real, `sku` = CNP (7 díg).
 */
function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1].replace(/[\u0000-\u001F]+/g, ' ')); } catch { continue; }
    const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
    for (const o of arr) {
      const ty = o && o['@type'];
      if (ty === 'Product' || (Array.isArray(ty) && ty.includes('Product'))) {
        const offer = Array.isArray(o.offers) ? o.offers[0] : o.offers;
        const price = offer ? (typeof offer.price === 'number' ? offer.price : parseFloat(offer.price)) : null;
        const in_stock = offer ? /InStock/i.test(offer.availability || '') : null;
        const image_url = Array.isArray(o.image) ? o.image[0] : (typeof o.image === 'string' ? o.image : (o.image && o.image.url) || null);
        // EAN real: mpn/gtin13/gtin se 12-14 díg (rejeita placeholders 0000…)
        let ean = null;
        for (const c of [o.mpn, o.gtin13, o.gtin]) {
          const s = String(c || '').trim();
          if (/^\d{12,14}$/.test(s) && !/0{6,}/.test(s)) { ean = s; break; }
        }
        // CNP: sku de 7 díg (Código Nacional do Produto, cross-store)
        const skuS = String(o.sku || '').trim();
        const cnp = /^\d{7}$/.test(skuS) ? skuS : null;
        const brand = (o.brand && (typeof o.brand === 'string' ? o.brand : o.brand.name)) || null;
        return { price: isFinite(price) ? price : null, in_stock, image_url, name: o.name || null, brand, ean, cnp };
      }
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

function extractProductData(html, url) {
  const ld = extractJsonLd(html);
  if (!ld) return null;                  // sem Product JSON-LD → ignora (med/supl/conteúdo)
  if (ld.price == null) return null;     // sem preço não serve
  // Fallback de IDENTIDADE (2026-07): o site voltou a expor o EAN/CNP em
  // data-attributes (data-ean/data-cnp) e tirou-os do JSON-LD (mpn/gtin13). Sem
  // este fallback o scraper saltava TODOS os produtos (catálogo vazio → stale).
  let ean = ld.ean, cnp = ld.cnp;
  if (!ean) { const m = html.match(/data-ean=["'](\d{12,14})["']/i); if (m && !/0{6,}/.test(m[1])) ean = m[1]; }
  if (!cnp) { const m = html.match(/data-cnp=["'](\d{6,8})["']/i); if (m) cnp = m[1]; }
  if (!ean) return null;                 // ainda sem EAN → med/supl, ignora
  return {
    name: ld.name || null,
    brand: ld.brand || null,
    ean: ean || null,
    cnp: cnp || null,
    image_url: ld.image_url || null,
    price: ld.price,
    previous_price: null,
    in_stock: ld.in_stock != null ? ld.in_stock : true,
    volume_ml: volumeFromName(ld.name),
    category: null,                      // sem fonte fiável de categoria; integrate filtra por EAN-match
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
    // Resume CONSCIENTE DA FRESCURA: só salta produtos raspados nas últimas
    // ~20h; os mais velhos são RE-RASPADOS. Sem isto, o catálogo committado +
    // --resume salta tudo e os preços congelam (staleness). Diário → tudo >20h
    // → re-scrape completo; resume no mesmo dia → salta os recentes.
    const MAX_AGE_MS = (parseFloat(process.env.RESUME_MAX_AGE_HOURS) || 20) * 3600e3;
    const now = Date.now();
    const fresh = d.products.filter(p => p.scraped_at && (now - new Date(p.scraped_at)) < MAX_AGE_MS);
    return { products: fresh, done: new Set(fresh.map(p => p.url)) };
  } catch { return null; }
}

function saveCheckpoint(products, inProgress = true) {
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    scraped_at: new Date().toISOString(),
    source: 'afarmaciaonline.pt (HTTP + JSON-LD: mpn=EAN, sku=CNP)',
    in_progress: inProgress,
    products,
  }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  console.log('📋 A descarregar sitemap afarmaciaonline…');
  const smRes = await fetch(SITEMAP_URL, { headers: { 'User-Agent': UA } });
  const smXml = await smRes.text();
  const allUrls = (smXml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
  let urls = allUrls.filter(isProductUrl);
  console.log(`  ${allUrls.length} URLs no sitemap · ${urls.length} candidatos a produto (.html)`);

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
        else { stats.skipped++; }      // sem data-layer/EAN/preço → não guardamos (lixo med/supl)
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
  console.log(`\n══════ afarmaciaonline scrape ══════`);
  console.log(`  Produtos guardados (com EAN): ${products.length}`);
  console.log(`  in_stock: ${inStock}`);
  console.log(`  skipped (med/supl/sem-EAN): ${stats.skipped}`);
  console.log(`  404: ${stats.not_found} · erro: ${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, extractJsonLd, fetchPage, isProductUrl };

if (require.main === module) {
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
