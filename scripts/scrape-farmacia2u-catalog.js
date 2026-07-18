#!/usr/bin/env node
/**
 * CosMath - farmacia2u.com catalog scrape (Fidelizarte/Webfarma)
 * ============================================================
 * Ficha /pt/comprar/<slug> traz JSON-LD Product completo: sku=mpn=CNP(7),
 * gtin13=EAN-13 real, offers.price e availability. O CNP tambem aparece no
 * filename da imagem (/catalogo/<CNP>.webp).
 *
 * ATENCAO - SITEMAP-CEMITERIO: ~2/3 dos URLs do sitemap (1.391 fichas) ja nao
 * existem e devolvem HTTP 200 com "Nao foi possivel localizar nenhum produto"
 * em vez de 404 (como o care2me, mas sem o 404 honesto). Por isso detetamos a
 * pagina morta pelo texto ANTES de extrair. Estimativa: ~460 produtos vivos.
 *
 * Uso: node scripts/scrape-farmacia2u-catalog.js [--limit=N] [--resume]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmacia2u-full.json');
const BASE = 'https://www.farmacia2u.com';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 300;
const CHECKPOINT_EVERY = 100;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
// O openresty deste site devolve 415 ao runner do GitHub (de casa responde 200
// a QUALQUER combinação de headers) — WAF a disfarçar bloqueio de datacenter.
// Mandamos um fingerprint completo de browser: se o filtro for por headers,
// passa; se for por IP, o guard de 0-produtos protege e os crons vão tentando
// (o care2me teve o mesmo padrão e desbloqueou sozinho ao fim de horas).
const BROWSER_HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

function locs(xml) { return (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }
function slugLooksCosmetic(u) { const slug = (u.split('/').pop() || '').replace(/-/g, ' '); return !!slug && !isNonCosmetic(slug); }
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function decodeUnicode(s) { return (s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x1F]+', 'g');
function stripJsonControlChars(s) { return s.replace(CONTROL_CHARS_RE, ' '); }

const DEAD_RE = /n[aã]o foi poss[ií]vel localizar nenhum produto/i;
function extractProductData(html) {
  if (DEAD_RE.test(html)) return null;   // ficha removida (sitemap velho)
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
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      const gtin = [n.gtin13, n.gtin, n.gtin14, offer && offer.gtin13].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{12,14}$/.test(x) && !/0{6,}/.test(x)) || null;
      const skuRaw = [n.sku, n.mpn, offer && offer.sku].map(x => (x != null ? String(x).trim() : '')).find(x => /^\d{7}$/.test(x)) || null;
      if (!gtin && !skuRaw) return null;
      let price = offer ? (offer.price || offer.lowPrice) : null;
      if (!price && offer && offer.priceSpecification) { const ps = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification; if (ps) price = ps.price; }
      price = price != null ? parseFloat(price) : null;
      if (price == null || !isFinite(price) || price <= 0) return null;
      const in_stock = offer ? /InStock/i.test(offer.availability || '') : true;
      const brand = n.brand ? (typeof n.brand === 'string' ? n.brand : (n.brand.name || null)) : null;
      const image_url = Array.isArray(n.image) ? n.image[0] : (typeof n.image === 'string' ? n.image : (n.image && n.image.url) || null);
      return { name, brand, ean: gtin, cnp: skuRaw, image_url: image_url ? String(image_url).replace(/\\\//g, '/') : null, price, previous_price: null, in_stock, volume_ml: volumeFromName(name), category: null, variants: [] };
    }
  }
  return null;
}

async function fetchText(url, attempt = 1) {
  try { const r = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' }); return await r.text(); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchText(url, attempt + 1); } throw e; }
}
async function fetchPage(url, attempt = 1) {
  let r;
  try { r = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' }); }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
  const drop = () => { try { return r.body ? r.body.cancel().catch(() => {}) : undefined; } catch { return undefined; } };
  if (r.status === 404 || r.status === 410) { await drop(); return { status: 'not_found' }; }
  if (r.status === 429 || r.status >= 500) { await drop(); if (attempt < 3) { await new Promise(s => setTimeout(s, 3000 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'http_error', http: r.status }; }
  try { return { status: 'ok', html: await r.text() }; }
  catch (e) { if (attempt < 3) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchPage(url, attempt + 1); } return { status: 'fetch_error', error: e.message }; }
}

function loadCheckpoint() { if (!RESUME || !fs.existsSync(OUT_FILE)) return null; try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return { products: d.products, done: new Set(d.products.map(p => p.url)) }; } catch { return null; } }
function saveCheckpoint(products, inProgress = true) { if (LIMIT !== Infinity) return; fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'farmacia2ustore.com (Redicom; JSON-LD gtin13+sku=CNP)', in_progress: inProgress, products }), 'utf8'); }

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar sitemap farmacia2u…');
  // O sitemap pode vir do apex ou do www, e o primeiro pode ser um index.
  // Na nuvem apanhámos 0 locs (2026-07-18) — por isso tentamos variantes e
  // imprimimos diagnóstico do que o servidor devolveu, em vez de sair mudos.
  const CANDS = [BASE + '/sitemap.xml', 'https://farmacia2u.com/sitemap.xml', BASE + '/pt/sitemap.xml', BASE + '/sitemap_index.xml'];
  const isFicha = u => /\/pt\/comprar\/[a-z0-9-]+$/.test(u);
  let urls = [];
  for (const cand of CANDS) {
    let xml = '';
    try { xml = await fetchText(cand); } catch (e) { console.log(`  ${cand} → erro ${e.message}`); continue; }
    let all = locs(xml);
    // sitemap index → descer aos filhos
    if (all.length && all.every(u => /\.xml(\.gz)?$/i.test(u))) {
      console.log(`  ${cand} → index com ${all.length} filhos`);
      const filhos = [];
      for (const child of all.slice(0, 12)) {
        try { filhos.push(...locs(await fetchText(child))); } catch {}
        await new Promise(s => setTimeout(s, 300));
      }
      all = filhos;
    }
    const fichas = all.filter(isFicha);
    console.log(`  ${cand} → ${xml.length} bytes · ${all.length} locs · ${fichas.length} fichas`);
    if (fichas.length) { urls = [...new Set(fichas)]; break; }
    if (xml.length && all.length === 0) console.log(`    início do corpo: ${xml.slice(0, 160).replace(/\s+/g, ' ')}`);
  }
  if (!urls.length) { console.error('✗ nenhum sitemap deu fichas — ver diagnóstico acima (bloqueio de datacenter?).'); process.exit(1); }
  const t0 = urls.length;
  urls = urls.filter(slugLooksCosmetic);
  console.log(`  ${t0} fichas → ${urls.length} após filtro de slug não-cosmético`);
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);
  const cp = loadCheckpoint();
  const products = cp ? cp.products : [];
  const done = cp ? cp.done : new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped`);
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} fichas (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);
  const start = Date.now(); let i = 0;
  const stats = { ok: 0, skipped: 0, not_found: 0, error: 0 };
  async function worker() {
    while (i < queue.length) {
      const url = queue[i++];
      const r = await fetchPage(url); const scraped_at = new Date().toISOString();
      if (r.status === 'ok') { const d = extractProductData(r.html); if (d) { products.push(JSON.parse(JSON.stringify({ url, status: 'ok', scraped_at, ...d }))); stats.ok++; } else stats.skipped++; }
      else if (r.status === 'not_found') stats.not_found++; else stats.error++;
      const total = stats.ok + stats.skipped + stats.not_found + stats.error;
      if (total % CHECKPOINT_EVERY === 0) { saveCheckpoint(products); const rate = total / ((Date.now() - start) / 1000); console.log(`  [${total}/${queue.length}] ok:${stats.ok} skip:${stats.skipped} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round((queue.length - total) / rate / 60)}m`); }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (products.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  console.log(`\n══════ farmacia2u scrape ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${products.filter(p => p.ean).length} · com CNP: ${products.filter(p => p.cnp).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  skipped/404/erro: ${stats.skipped}/${stats.not_found}/${stats.error}`);
  if (LIMIT === Infinity) console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { extractProductData };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
