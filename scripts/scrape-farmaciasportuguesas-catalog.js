#!/usr/bin/env node
/**
 * CosMath — farmaciasportuguesas.pt catalog scrape (rede Farmácias Portuguesas)
 * ============================================================================
 *
 * A maior rede de farmácias PT. Plataforma Magento + Smile ElasticSuite.
 * Particularidades descobertas (2026-06-25):
 *   • Sitemap (/sitemap.xml) inclui ~4.7k URLs de PRODUTO: terminam em
 *     "-NNNNNNN.html" onde NNNNNNN = CNP (Código Nacional do Produto, 7 díg).
 *   • NÃO expõe EAN/gtin13. O `sku` do produto É o CNP → matching forte por
 *     CNP (o nosso apply-cnp-merge já liga CNP↔EAN via outras farmácias).
 *   • PREÇOS são por-farmácia e só aparecem com o cookie `pharmacy_code=XXXXX`.
 *     Sem cookie, todo o HTML traz price=0. Usamos uma farmácia de referência
 *     (09881 — a farmácia online principal p/ onde farmaciaonline.pt redirige).
 *     O preço vem embebido no JSON `pricingData` (componente Farmacias_Pricing),
 *     campos price_value / special_price_value — SEM precisar de Playwright.
 *
 * Uso:
 *   node scripts/scrape-farmaciasportuguesas-catalog.js
 *   node scripts/scrape-farmaciasportuguesas-catalog.js --limit=200 --resume
 *   node scripts/scrape-farmaciasportuguesas-catalog.js --pharmacy=09881 --concurrency=5
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmaciasportuguesas-full.json');
const BASE = 'https://www.farmaciasportuguesas.pt';
const SITEMAP_URL = BASE + '/sitemap.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const PHARMACY = args.pharmacy ? String(args.pharmacy) : '09881';
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 220;
const CHECKPOINT_EVERY = 100;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const COOKIE = `pharmacy_code=${PHARMACY}`;

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /-\d{7}\.html$/.test(u);
const cnpFromUrl = u => { const m = u.match(/-(\d{7})\.html$/); return m ? m[1] : null; };
// Filtro opcional --dermo: só produtos de venda-livre dermo/beleza (salta a
// maioria dos MEDICAMENTOS, que dão 500). Marcas + termos dermo no slug.
const DERMO_RE = /\/(vichy|avene|la-roche|roche-posay|bioderma|isdin|eucerin|cerave|ducray|klorane|nuxe|caudalie|uriage|svr|a-derma|aderma|rene-furterer|furterer|mustela|filorga|noreva|lierac|sesderma|martiderm|endocare|cetaphil|bepanthol|bepanthene|halibut|barral|sebamed|weleda|elgydium|sensodyne|nivea|garnier|loreal|l-oreal|phyto|rilastil|ureadin|topicrem|biorga|iraltone|pilexil|trofolastin|atashi|cicaplast|cicalfate|effaclar|anthelios|photoderm|cicabio|atoderm|sebium|hydrabio|nutritic|toleriane|lipikar|hyalu|liftactiv|mineral-89|exomega|trixera|dexyane|champo|shampoo|creme|serum|gel-|protetor|protector|solar|hidratante|esfoliante|micelar|tonico|mascara-de-rosto)/i;
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function decodeEntities(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ').trim();
}

function extractProductData(html, url) {
  const cnp = cnpFromUrl(url);
  if (!cnp) return null;

  // Nome: <title> sem o sufixo da loja.
  let name = null;
  const tm = html.match(/<title>([^<]+)<\/title>/i);
  if (tm) name = decodeEntities(tm[1]).replace(/\s*(\|\s*)?Farm[aá]cias Portuguesas.*$/i, '').trim();
  if (!name) return null;

  // Preço: do JSON pricingData embebido (com o cookie da farmácia).
  // "price_value":16.63 e "special_price_value":0 (special>0 = preço de saldo).
  const pv = html.match(/"price_value"\s*:\s*([\d.]+)/);
  const sv = html.match(/"special_price_value"\s*:\s*([\d.]+)/);
  const priceValue = pv ? parseFloat(pv[1]) : 0;
  const specialValue = sv ? parseFloat(sv[1]) : 0;
  let price, previous_price = null;
  if (specialValue > 0 && specialValue < priceValue) { price = specialValue; previous_price = priceValue; }
  else price = priceValue;
  // price<=0 → não disponível nesta farmácia (sem preço) → ignorar.
  if (!(price > 0)) return { url, status: 'no_price', cnp, name };

  const image_url = `${BASE}/media/catalog/product/${cnp[0]}/${cnp[1]}/${cnp}.png`;
  return {
    url, status: 'ok', name, brand: null,
    ean: null, cnp, sku: cnp,
    image_url, price: Number(price.toFixed(2)),
    previous_price: previous_price ? Number(previous_price.toFixed(2)) : null,
    in_stock: true, volume_ml: volumeFromName(name), category: null, variants: [],
  };
}

async function fetchPage(url, attempt = 1) {
  let r;
  try {
    // NB: NÃO enviar Accept:'text/html' — o Magento deste site devolve 500 com
    // esse valor exacto. Sem Accept (ou Accept de browser completo) → 200.
    r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': COOKIE }, redirect: 'follow' });
  } catch (e) {
    if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); }
    return { status: 'fetch_error', error: e.message };
  }
  // IMPORTANTE: consumir/cancelar SEMPRE o corpo das respostas que não lemos,
  // senão o socket pendente rebenta (ECONNRESET) e crasha o processo; também
  // liberta a conexão para reutilização (mais rápido).
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { /* noop */ } };
  if (r.status === 404) { await drop(); return { status: 'not_found' }; }
  // 500 = páginas de MEDICAMENTOS (não vendáveis online) — permanente, skip rápido.
  if (r.status >= 500) { await drop(); return { status: 'unavailable', http: r.status }; }
  if (r.status === 429) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */ fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: `farmaciasportuguesas.pt (Magento; SEM EAN, sku=CNP; preço da farmácia ${PHARMACY})`, pharmacy_code: PHARMACY, in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log(`📋 A descarregar sitemap farmaciasportuguesas (farmácia de referência: ${PHARMACY})…`);
  const smXml = await (await fetch(SITEMAP_URL, { headers: { 'User-Agent': UA } })).text();
  let urls = [...new Set(locs(smXml).filter(isProductUrl))];
  console.log(`  ${urls.length} produtos (URLs com CNP)`);
  if (args.dermo) { const before = urls.length; urls = urls.filter(u => DERMO_RE.test(u)); console.log(`  🧴 --dermo: ${urls.length} de ${before} (saltados ${before - urls.length} prováveis medicamentos)`); }
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now(); let idx = 0;
  const stats = { ok: 0, no_price: 0, skipped: 0, not_found: 0, unavailable: 0, error: 0 };
  async function worker() {
    while (idx < queue.length) {
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const d = extractProductData(r.html, url);
        if (d && d.status === 'ok') { products.push(JSON.parse(JSON.stringify({ ...d, scraped_at }))); stats.ok++; }
        else if (d && d.status === 'no_price') stats.no_price++;
        else stats.skipped++;
      } else if (r.status === 'not_found') stats.not_found++;
      else if (r.status === 'unavailable') stats.unavailable++;
      else stats.error++;
      const total = stats.ok + stats.no_price + stats.skipped + stats.not_found + stats.unavailable + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} sem-preço:${stats.no_price} medic(500):${stats.unavailable} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos (sitemap vazio/bloqueio de IP/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  console.log(`\n══════ farmaciasportuguesas scrape ══════`);
  console.log(`  Produtos com preço: ${products.length} · sem preço (indisp. nesta farmácia): ${stats.no_price}`);
  console.log(`  medicamentos(500): ${stats.unavailable} · skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, isProductUrl, cnpFromUrl };
if (require.main === module) {
  // Não deixar um erro de socket isolado (ECONNRESET) crashar todo o scrape.
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
