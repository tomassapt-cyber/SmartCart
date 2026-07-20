#!/usr/bin/env node
/**
 * CosMath — cocooncenter.pt catalog scrape (parafarmácia FR, site PT)
 * ===================================================================
 *
 * Cocooncenter é uma grande parafarmácia francesa com STOREFRONT PORTUGUÊS
 * (cocooncenter.pt): preços em EUR, slugs PT, envia para Portugal. Cada ficha
 * tem JSON-LD limpo com gtin13 (EAN real), preço, marca, imagem, availability
 * — exactamente como a pharma-gdd. Match forte por EAN (língua irrelevante).
 *
 * Sitemap de produtos PT: /sitemap-pt-products.xml (urlset, ~dezenas de milhar;
 * URLs /<slug-pt>/<id>.html). O filtro --dermo reduz aos produtos de marca
 * dermo/beleza (o catálogo tem muito não-cosmético: escovas, pensos, etc.).
 *
 * Uso:
 *   node scripts/scrape-cocooncenter-catalog.js --dermo
 *   node scripts/scrape-cocooncenter-catalog.js --limit=200 --resume
 */

const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'cocooncenter-full.json');
const BASE = 'https://www.cocooncenter.pt';
const SITEMAP_URL = BASE + '/sitemap-pt-products.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 200;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /\/\d+\.html$/.test(u);
// Filtro --dermo: só marcas/termos dermo/beleza no slug (salta escovas, pensos,
// suplementos genéricos, veterinária, etc.).
const DERMO_RE = /\/(vichy|avene|la-roche|roche-posay|bioderma|isdin|eucerin|cerave|ducray|klorane|nuxe|caudalie|uriage|svr|a-derma|aderma|rene-furterer|furterer|mustela|filorga|noreva|lierac|sesderma|martiderm|endocare|cetaphil|bepanthol|bepanthene|halibut|barral|sebamed|weleda|elgydium|nivea|garnier|loreal|l-oreal|phyto|rilastil|topicrem|biorga|iraltone|pilexil|cicaplast|cicalfate|effaclar|anthelios|photoderm|cicabio|atoderm|sebium|hydrabio|nutritic|toleriane|lipikar|hyalu|liftactiv|mineral-89|exomega|trixera|dexyane|nuxe|embryolisse|melvita|sanoflore|apivita|korres|frezyderm|biotherm|vichy|creme|serum|champo|gel-|hidratante|protetor|protector|solar|micelar|esfoliante|contorno|olhos|antirrugas|anti-idade|mascara-de-rosto)/i;

function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
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
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? offer.price : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean, sku: n.sku ? String(n.sku) : null, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': 'shop=pt' }, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'cocooncenter.pt (parafarmácia FR, storefront PT; JSON-LD gtin13)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap-pt-products cocooncenter…');
  // Antes isto era um `fetch(...).text()` nu: sem retry e sem olhar ao status.
  // Quando o WAF respondia, o HTML de erro era parseado como XML, dava 0 <loc>,
  // e o log dizia apenas "0 produtos" — igualzinho a um sitemap genuinamente
  // vazio. Custou-nos horas a perceber que o site nos tinha bloqueado. Agora o
  // helper valida status/tipo/tamanho e ATIRA com o diagnóstico à frente.
  // Este sitemap é grande (dezenas de milhar de URLs), daí o timeout largo e o
  // minBytes: uma resposta curta é feed truncado, não catálogo real.
  const smXml = await fetchTextResilient(SITEMAP_URL, { expect: 'xml', minBytes: 10000, timeoutMs: 90000 });
  let urls = [...new Set(locs(smXml).filter(isProductUrl))];
  if (urls.length === 0) {
    // Chegámos aqui com XML válido e do tamanho esperado (o helper já teria
    // atirado em caso de bloqueio), logo o problema não é rede nem WAF: o
    // sitemap deixou de ter URLs de produto no formato /<slug>/<id>.html.
    throw new Error(
      `Sitemap descarregado com sucesso (${smXml.length} bytes) mas 0 URLs de produto — ` +
      `a estrutura do site mudou (padrão /<slug>/<id>.html deixou de bater certo?). ` +
      `Rever isProductUrl()/SITEMAP_URL em ${__filename}.`
    );
  }
  console.log(`  ${urls.length} produtos no sitemap`);
  if (args.dermo) { const b = urls.length; urls = urls.filter(u => DERMO_RE.test(u)); console.log(`  🧴 --dermo: ${urls.length} de ${b} (saltados ${b - urls.length} não-dermo)`); }
  // Ofertas EXISTENTES nunca ficam presas ao filtro --dermo (auditoria
  // 2026-07-03): URLs com oferta no seed re-entram SEMPRE na fila — sem isto
  // o preço delas apodrecia (a loja raspa todos os dias mas nunca as visita).
  try {
    const seedNow = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
    const spSeed = (seedNow.store_products || []).find(g => g.store_slug === 'cocooncenter');
    const known = (spSeed?.items || []).map(it => it.url).filter(u => u && isProductUrl(u));
    const b2 = urls.length;
    urls = [...new Set([...urls, ...known])];
    if (urls.length > b2) console.log(`  ↻ +${urls.length - b2} URLs de ofertas existentes (fora do filtro dermo)`);
  } catch { /* sem seed local (CI antes do checkout completo?) — segue */ }
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
  // Guard do catálogo: nunca sobrescrever com vazio. O sitemap já vinha bom
  // (senão tínhamos rebentado acima com o diagnóstico do helper), portanto 0
  // produtos aqui aponta para as FICHAS: bloqueio a meio do scrape ou JSON-LD
  // mudado. Dizemos qual, para não voltarmos a olhar para um log mudo.
  if (products.length === 0) {
    console.error(`✗ 0 produtos de ${queue.length} URLs do sitemap — NÃO sobrescrevo o catálogo existente.`);
    console.error(`  Contadores: ok:${stats.ok} sem-JSON-LD:${stats.skipped} 404:${stats.not_found} erro:${stats.error}`);
    console.error(stats.error > stats.skipped
      ? '  Predominam erros de rede/HTTP → provável bloqueio das fichas a meio do scrape.'
      : '  Predominam fichas sem JSON-LD utilizável → o site mudou o markup (rever extractProductData).');
    process.exit(1);
  }
  saveCheckpoint(products, false);
  console.log(`\n══════ cocooncenter scrape ══════`);
  console.log(`  Produtos com EAN: ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
