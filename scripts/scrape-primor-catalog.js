#!/usr/bin/env node
/**
 * CosMath — pt.primor.eu catalog scrape (perfumaria/cosmética low-cost, PT)
 * ============================================================
 *
 * Primor é uma grande perfumaria ES com STOREFRONT PT (pt.primor.eu, Magento):
 * preços EUR, envia PT (portes ~2.95€). Cada ficha tem JSON-LD Product com
 * **mpn = EAN-13 REAL** (confirmado vs data-layer "ean"), preço, stock, marca,
 * imagem. Match forte por EAN — perfil Druni (mass-market barato: L'Oréal,
 * Nivea, Garnier + dermo ISDIN/LRP...).
 *
 * Sitemap PT de produtos: https://pt.primor.eu/pub/media/sitemap_pt_product_product.xml
 * (~37k URLs /pt_pt/<slug>-<id>.html; inclui MUITO não-cosmético: suplementos,
 * barras energéticas... o --dermo filtra por slug).
 *
 * PERFUMES (2026-11-06, decisão do Tomás): o --dermo deixava de fora a perfumaria
 * inteira (lidas 3 de 543 fichas da seleção). Os perfumes da seleção
 * (data/perfumes-selecao.json) entram agora também, reconhecidos pelo endereço.
 *
 * VÁRIOS TAMANHOS (2026-11-06): nas fichas com tamanhos (quase todos os perfumes)
 * o Product do schema.org não traz EAN e o leitor saltava a ficha inteira. O EAN
 * de cada tamanho vem noutro bloco, gs1:Product → gs1:hasVariant (gs1:gtin,
 * gs1:netContent, @id «…#variant-<SKU>»), e o preço/stock na oferta com o mesmo
 * sku. Sai um produto por tamanho, com o URL «…html#variant-<SKU>».
 *
 * Uso:
 *   node scripts/scrape-primor-catalog.js --dermo
 *   node scripts/scrape-primor-catalog.js --limit=30            # smoke (não escreve)
 *   node scripts/scrape-primor-catalog.js --dermo --resume --chunk=1/3
 */

const fs = require('fs');
const { imagemDoJsonLd } = require('./lib/imagem-valida');
const path = require('path');
const { UA_COSMATH, opcoes, prepararLeitura } = require('./lib/leitura-alargada');
const { linhaDoPerfume } = require('./lib/perfumes-selecao');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'primor-full.json');
const SITEMAP_URL = 'https://pt.primor.eu/pub/media/sitemap_pt_product_product.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CHUNK = args.chunk || null;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 5;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 200;
const CHECKPOINT_EVERY = 100;

// Identificação honesta desde 2026-11-16 (antes fingia ser um Chrome).
const UA = UA_COSMATH;
const ALARGADA = opcoes(args, { descobrir: 2000 });

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
const isProductUrl = u => /\/pt_pt\/[^/]+-\d+\.html$/.test(u);

// Filtro --dermo por slug: marcas/termos beleza (skincare/cabelo/corpo/solar).
// O catálogo Primor tem milhares de suplementos/comida-fitness/eletro — fora.
const DERMO_RE = /(vichy|roche-posay|bioderma|isdin|eucerin|cerave|ducray|klorane|nuxe|caudalie|uriage|svr|a-derma|rene-furterer|mustela|filorga|sesderma|martiderm|cetaphil|sebamed|weleda|nivea|garnier|loreal|l-oreal|elvive|fructis|phyto|biotherm|apivita|korres|revlon|schwarzkopf|tresemme|pantene|dove|olay|neutrogena|maybelline|essence|catrice|creme|crema|serum|champo|champu|shampoo|acondicionador|condicionador|mascarilla|mascara-capilar|gel-de-banho|gel-banho|desodorizante|desodorante|hidratante|corporal|facial|solar|protetor|protector|spf|anti-idade|antiarrugas|anti-rugas|micelar|esfoliante|exfoliante|tonico|locao|locion|aceite|oleo-corporal|contorno-de-olhos|labial)/i;

// perfume da seleção pelo endereço: «/pt_pt/dior-sauvage-eau-de-toilette-12345.html»
const perfumeDaSelecao = u => !!linhaDoPerfume({ name: decodeURIComponent(u.split('/').pop().replace(/-\d+\.html$/, '')).replace(/-/g, ' '), brand: '' });

function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function extractProductData(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1].replace(/[\x00-\x1f]+/g, ' ')); } catch { continue; }
    const nodes = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
    for (const n of nodes) {
      const t = n && n['@type'];
      if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
      const name = decodeUnicode((n.name || '').toString()).replace(/\s+/g, ' ').trim();
      if (!name) return null;
      // Primor: mpn = EAN-13 real (igual ao "ean" do data-layer GA4)
      let ean = null;
      for (const c of [n.mpn, n.gtin13, n.gtin, n.gtin14]) {
        const s = String(c || '').trim();
        if (/^\d{12,14}$/.test(s) && !/0{6,}/.test(s)) { ean = s; break; }
      }
      if (!ean) return null;
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      let price = offer ? offer.price : null;
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = imagemDoJsonLd(n.image);
      return { name, brand, ean, sku: n.sku ? String(n.sku) : null, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: (typeof n.category === 'string' ? n.category : null), variants: [] };
    }
  }
  return null;
}

// Uma entrada por tamanho, para fichas com tamanhos (ver o cabeçalho). [] se não houver.
function extractVariantes(html) {
  let prod = null, gs1 = null;
  for (const b of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let j; try { j = JSON.parse(b[1].replace(/[\x00-\x1f]+/g, ' ')); } catch { continue; }
    for (const n of (j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]))) {
      const t = n && n['@type'];
      if (t === 'gs1:Product') gs1 = n;
      else if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) prod = n;
    }
  }
  if (!prod || !gs1 || !Array.isArray(gs1['gs1:hasVariant'])) return [];
  const ofertas = Array.isArray(prod.offers) ? prod.offers : (prod.offers ? [prod.offers] : []);
  const brand = prod.brand ? (typeof prod.brand === 'string' ? prod.brand : (prod.brand.name || null)) : null;
  const imagem = imagemDoJsonLd(prod.image);
  const out = [];
  for (const v of gs1['gs1:hasVariant']) {
    const ean = String(v['gs1:gtin'] || '').trim();
    if (!/^\d{12,14}$/.test(ean) || /0{6,}/.test(ean)) continue;
    const sku = String(v['@id'] || '').split('#variant-')[1];
    const oferta = sku && ofertas.find(o => String(o.sku) === sku);
    const price = oferta && oferta.price != null ? parseFloat(oferta.price) : null;
    if (price == null || !isFinite(price) || price <= 0) continue;
    const nc = v['gs1:netContent'] || {};
    const qtd = Number(nc['gs1:value']);
    const volume_ml = qtd > 0 && /^(MLT|GRM)$/.test(nc['gs1:unitCode'] || '') ? qtd : (qtd > 0 && nc['gs1:unitCode'] === 'LTR' ? qtd * 1000 : null);
    const name = decodeUnicode(String(v['gs1:productName'] || prod.name || '')).replace(/\s+/g, ' ').trim();
    const img = (v['gs1:referencedFile'] || {})['gs1:referencedFileUri'] || imagem;
    out.push({ sufixo: '#variant-' + sku, name, brand, ean, sku, image_url: img ? String(img).replace(/\\\//g, '/') : null, price, previous_price: null,
      in_stock: /InStock/i.test(oferta.availability || ''), volume_ml: volume_ml || volumeFromName(name), category: (typeof prod.category === 'string' ? prod.category : null), variants: [] });
  }
  return out;
}

async function fetchText(url, attempt = 1) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); return await r.text(); }
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

function loadCheckpoint() {
  if (!RESUME || !fs.existsSync(OUT_FILE)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!Array.isArray(d.products)) return null;
    // Resume consciente da frescura (padrão afarmaciaonline): produtos com
    // >20h são re-raspados; evita staleness com catálogo committado.
    const MAX_AGE_MS = (parseFloat(process.env.RESUME_MAX_AGE_HOURS) || 20) * 3600e3;
    const now = Date.now();
    const fresh = d.products.filter(p => p.scraped_at && (now - new Date(p.scraped_at)) < MAX_AGE_MS);
    return { products: fresh, done: new Set(fresh.map(p => String(p.url).split('#')[0])) };
  } catch { return null; }
}
function saveCheckpoint(products, inProgress = true) {
  if (LIMIT !== Infinity) return;  // smoke-test (--limit) NÃO sobrescreve o catálogo de produção
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'pt.primor.eu (Magento PT; JSON-LD mpn=EAN real)', in_progress: inProgress, products }), 'utf8');
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap PT de produtos primor…');
  const smXml = await fetchText(SITEMAP_URL);
  let urls = [...new Set(locs(smXml).filter(isProductUrl))];
  console.log(`  ${urls.length} produtos no sitemap`);
  const todas = urls;
  if (args.dermo) { const b = urls.length; const perf = urls.filter(u => !DERMO_RE.test(u) && perfumeDaSelecao(u)).length; urls = urls.filter(u => DERMO_RE.test(u) || perfumeDaSelecao(u)); console.log(`  🧴 --dermo: ${urls.length} de ${b} (saltados ${b - urls.length} não-dermo; ${perf} perfumes da seleção)`); }
  // Leitura alargada (2026-11-16): ofertas existentes (antes um bloco só desta loja),
  // fichas já descobertas com EAN do catálogo e um lote de fichas novas (sem as de
  // maquilhagem pelo endereço). Ver scripts/lib/leitura-alargada.js.
  const leitura = await prepararLeitura({ loja: 'primor', base: 'https://pt.primor.eu', todas, filtradas: urls, maxNovas: LIMIT === Infinity && !CHUNK ? ALARGADA.maxNovas : 0, orcamentoMs: ALARGADA.orcamentoMs, concorrencia: CONCURRENCY, atrasoMs: DELAY_MS });
  urls = leitura.fila;
  if (urls.length === 0) { console.error('✗ Sitemap vazio (bloqueio de IP?) — abortar sem tocar no catálogo.'); process.exit(1); }
  if (CHUNK) { const [n, mm] = CHUNK.split('/').map(Number); const sorted = [...urls].sort(); const size = Math.ceil(sorted.length / mm); urls = sorted.slice((n - 1) * size, n * size); console.log(`  Chunk ${CHUNK}: ${urls.length}`); }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} frescos mantidos`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${leitura.concorrencia}, delay=${leitura.atrasoMs}ms)…\n`);

  const start = Date.now(); let idx = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (idx < queue.length) {
      if (leitura.fimDoTempo()) { stats.adiadas = queue.length - idx; idx = queue.length; break; }
      const url = queue[idx++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const d = extractProductData(r.html);
        const desc = leitura.eDescoberta(url) ? { descoberta: true } : {};
        if (d) { leitura.registar(url, d.ean); products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d, ...desc }))); stats.ok++; }
        else {
          const vs = extractVariantes(r.html);
          // na memória fica o EAN de um tamanho que o catálogo tenha (se houver)
          leitura.registar(url, (vs.find(v => v.ean && leitura.temEanNoCatalogo(v.ean)) || vs[0] || {}).ean || '');
          for (const { sufixo, ...v } of vs) products.push(JSON.parse(JSON.stringify({ url: url + sufixo, status: 'ok', scraped_at, ...v, ...desc })));
          if (vs.length) { stats.ok++; stats.tamanhos = (stats.tamanhos || 0) + vs.length; } else stats.skipped++;
        }
      }
      else if (r.status === 'not_found') { leitura.registar(url, ''); stats.not_found++; } else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await leitura.pausa();
    }
  }
  await Promise.all(Array.from({ length: leitura.concorrencia }, worker));
  if (LIMIT === Infinity) leitura.gravar();
  if (stats.adiadas) console.log(`  ⏱ orçamento de tempo esgotado: ${stats.adiadas} fichas ficam para a próxima corrida (as mais recentes)`);
  if (products.length === 0) { console.error('✗ 0 produtos (bloqueio/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ primor scrape ══════`);
  console.log(`  Produtos com EAN: ${products.length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (stats.tamanhos) console.log(`  fichas com vários tamanhos: ${stats.tamanhos} tamanhos lidos (gs1:hasVariant)`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData, extractVariantes, isProductUrl };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
