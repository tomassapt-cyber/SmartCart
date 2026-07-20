#!/usr/bin/env node
/**
 * CosMath — pharmavida.pt catalog scrape (PrestaShop, parafarmácia Bragança)
 * ============================================================
 *
 * Pharmavida (Av. das Forças Armadas 44, Bragança) — parafarmácia PT (~800
 * produtos cosmética no KK). PrestaShop SEM sitemap XML: a descoberta é por
 * CRAWL das categorias (página controller=sitemap lista TODAS as categorias
 * `/<id>-<slug>`; cada categoria pagina com ?page=N, 24 produtos/página).
 * URLs de produto: /<cat>/<id>-<slug>-<EAN13>.html (o EAN vem no slug!).
 *
 * Ficha: 4 blocos JSON-LD; o Product (4º) tem gtin13=EAN-13 REAL +
 * sku=mpn=CNP(7 díg) + offers.price/availability — CHAVE DUPLA.
 *
 * Uso:
 *   node scripts/scrape-pharmavida-catalog.js
 *   node scripts/scrape-pharmavida-catalog.js --limit=200 --resume
 */

const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');
const { fetchTextResilient } = require('./lib/resilient-fetch');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'pharmavida-full.json');
const BASE = 'https://pharmavida.pt';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const MAX_PAGES_PER_CAT = 30;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// slug da ficha inclui o nome → corta medicamentos/suplementos/puericultura
// ANTES de gastar o pedido (o nome do JSON-LD volta a filtrar depois).
function slugLooksCosmetic(u) {
  const slug = (u.split('/').pop() || '').replace(/\.html$/, '').replace(/-/g, ' ');
  return !isNonCosmetic(slug);
}

function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x1F]+', 'g');
function stripJsonControlChars(s) { return s.replace(CONTROL_CHARS_RE, ' '); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function extractProductData(html, url) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1]); }
    catch { try { j = JSON.parse(stripJsonControlChars(b[1])); } catch { continue; } }
    const nodes = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name || isNonCosmetic(name)) return null;
      const gtin = [n.gtin13, n.gtin, n.gtin14].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{12,14}$/.test(x) && !/0{6,}/.test(x)) || null;
      // fallback: o EAN-13 vem embebido no fim do slug do URL
      const urlEan = ((url || '').match(/-(\d{13})\.html$/) || [])[1] || null;
      const ean = gtin || urlEan;
      const skuRaw = [n.sku, n.mpn].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{7}$/.test(x)) || null;
      if (!ean && !skuRaw) return null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? (offer.price || offer.lowPrice) : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean, cnp: skuRaw, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
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
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

const PROD_URL_RE = /https:\/\/pharmavida\.pt\/[a-z0-9-]+\/\d+-[a-z0-9-]+\.html/g;

async function discoverProductUrls() {
  console.log('📋 A ler o mapa de categorias (controller=sitemap)…');
  // Este download é o único ponto de entrada de todo o scrape: se falhar, não há
  // categorias, não há URLs, e o resto do programa corre a vazio. Antes usava-se
  // `return await r.text()` sem olhar ao status — quando o WAF respondia, o HTML de
  // erro era parseado na mesma e o log dizia só "0 categorias". Perdemos horas a
  // perceber que o site nos tinha bloqueado. Agora o helper valida status + forma do
  // corpo e ATIRA um erro que diz exatamente o que veio do servidor.
  // Nota: nesta loja o mapa é uma página HTML (controller=sitemap), não um XML.
  const mapHtml = await fetchTextResilient(BASE + '/index.php?controller=sitemap', {
    expect: 'html',
    minBytes: 2000, // o mapa lista todas as categorias; abaixo disto é página de erro/truncada
  });
  const cats = [...new Set((mapHtml.match(/href="https:\/\/pharmavida\.pt\/(\d+-[a-z0-9-]+)"/g) || [])
    .map(m => m.match(/pharmavida\.pt\/(\d+-[a-z0-9-]+)/)[1]))];
  // Chegar aqui com 0 categorias já NÃO pode ser bloqueio (o helper teria atirado):
  // sobra a hipótese de a loja ter mudado de estrutura. Abortamos em vez de seguir
  // para o crawl e acabar com o "0 produtos" ambíguo lá ao fundo.
  if (cats.length === 0) {
    throw new Error(
      'Mapa de categorias descarregado com sucesso mas sem nenhuma categoria reconhecida.\n' +
      '   Não é bloqueio (o fetch resiliente validou a resposta) — a estrutura do site mudou.\n' +
      `   Rever o padrão de href "/<id>-<slug>" em ${BASE}/index.php?controller=sitemap (${mapHtml.length} bytes recebidos).`
    );
  }
  console.log(`  ${cats.length} categorias`);
  const urls = new Set();
  let catIdx = 0;
  for (const cat of cats) {
    catIdx++;
    for (let page = 1; page <= MAX_PAGES_PER_CAT; page++) {
      const u = `${BASE}/${cat}${page > 1 ? '?page=' + page : ''}`;
      let html;
      try { html = await fetchText(u); } catch { break; }
      const found = html.match(PROD_URL_RE) || [];
      const before = urls.size;
      found.forEach(x => urls.add(x));
      const hasNext = html.includes(`?page=${page + 1}`);
      await new Promise(s => setTimeout(s, DELAY_MS));
      if (!hasNext || urls.size === before) break; // sem página seguinte ou nada novo
    }
    if (catIdx % 20 === 0) console.log(`  [${catIdx}/${cats.length}] categorias · ${urls.size} URLs de produto`);
  }
  return [...urls];
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test NÃO escreve produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'pharmavida.pt (PrestaShop; JSON-LD gtin13+sku=CNP; EAN no slug)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  let urls = await discoverProductUrls();
  const total0 = urls.length;
  urls = urls.filter(slugLooksCosmetic);
  console.log(`  ${total0} URLs → ${urls.length} após filtro de slug não-cosmético`);
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} fichas (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { const d = extractProductData(r.html, url); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // Guard de segurança do catálogo: nunca sobrescrever com vazio. A mensagem já não
  // pode dizer "bloqueio?" — o mapa inicial passou pelo fetch resiliente, portanto o
  // site respondeu-nos. Se mesmo assim não saiu um único produto, o problema é de
  // extração (JSON-LD/estrutura das fichas), e é aí que se deve procurar.
  if (products.length === 0) { console.error(`✗ 0 produtos de ${queue.length} fichas (ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error}) — o mapa de categorias foi lido, logo a estrutura das fichas mudou. NÃO sobrescrevo o catálogo existente.`); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ pharmavida scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
