#!/usr/bin/env node
/**
 * CosMath — wowfarma.pt catalog scrape (Magento, feed KuantoKusta)
 * ============================================================
 *
 * WOWFARMA é uma farmácia dermo PT (~1488 produtos "Saúde e Beleza" no KK).
 * Publica um FEED KuantoKusta único em /kkfeedwowfarma.xml com TODO o sortido
 * KK: designation, brand, **reference=CNP** E **ean=EAN-13 real** (1519/1582
 * têm AMBAS as chaves!), price (vírgula decimal), stock, image, URL.
 * → 1 pedido por refresh, zero HTML (padrão pharma2you).
 *
 * MODO COMPARAÇÃO (enrich-only): match por EAN+CNP contra produtos existentes.
 *
 * Uso:
 *   node scripts/scrape-wowfarma-catalog.js
 *   node scripts/scrape-wowfarma-catalog.js --limit=100   # smoke (não escreve)
 */

const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'wowfarma-full.json');
const FEED_URL = 'https://www.wowfarma.pt/kkfeedwowfarma.xml';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const tag = (x, n) => { const m = x.match(new RegExp('<' + n + '>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + n + '>')); return m ? m[1].trim() : ''; };
function decodeEntities(s) {
  return s.replace(/&ccedil;/g, 'ç').replace(/&atilde;/g, 'ã').replace(/&otilde;/g, 'õ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú')
    .replace(/&acirc;/g, 'â').replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&agrave;/g, 'à')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

async function fetchFeed(attempt = 1) {
  try {
    const r = await fetch(FEED_URL, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } catch (e) {
    if (attempt <= 3) { await new Promise(s => setTimeout(s, 3000 * attempt)); return fetchFeed(attempt + 1); }
    throw e;
  }
}

(async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📦 WOWFARMA — a descarregar feed KK (1 pedido)…');
  const xml = await fetchFeed();
  const blocks = [...xml.matchAll(/<product>([\s\S]*?)<\/product>/g)].map(m => m[1]);
  console.log(`  ${blocks.length} produtos no feed (${(xml.length / 1024).toFixed(0)} KB)`);

  const products = [];
  let nonCosm = 0, noKey = 0, noPrice = 0;
  for (const b of blocks.slice(0, LIMIT === Infinity ? blocks.length : LIMIT)) {
    const name = decodeEntities(tag(b, 'designation')).replace(/\s+/g, ' ').trim();
    if (!name || isNonCosmetic(name)) { nonCosm++; continue; }
    const ref = tag(b, 'reference'), eanRaw = tag(b, 'ean');
    const cnp = /^\d{7}$/.test(ref) ? ref : null;
    const ean = /^\d{12,14}$/.test(eanRaw) && !/0{6,}/.test(eanRaw) ? eanRaw : null;
    if (!cnp && !ean) { noKey++; continue; }
    const base = parseFloat(tag(b, 'price').replace(/\./g, '').replace(',', '.'));   // "1.234,56" → 1234.56 (PT)
    // <promotional_price> (quando existe e < base) é o preço ATUAL da loja —
    // ignorá-lo mostrava o preço base durante promoções (erro reportado pelo
    // user 2026-07-17: Cicabio 40ml a 12,90€ no site com promo a 9,34€).
    const promoRaw = tag(b, 'promotional_price');
    const promo = promoRaw ? parseFloat(promoRaw.replace(/\./g, '').replace(',', '.')) : null;
    const emPromo = promo != null && promo > 0 && promo < base;
    const price = emPromo ? promo : base;
    if (!(price > 0)) { noPrice++; continue; }
    const stock = parseInt(tag(b, 'stock'), 10);
    products.push({
      status: 'ok',
      url: tag(b, 'product_url') || null,
      name,
      brand: decodeEntities(tag(b, 'brand')) || null,
      ean, cnp,
      category: decodeEntities(tag(b, 'category')) || null,
      image_url: tag(b, 'image_url') || null,
      price,
      previous_price: emPromo ? base : null,
      discount_pct: null,
      in_stock: !isFinite(stock) || stock > 0,
      volume_ml: volumeFromName(name),
      variants: [],
    });
  }

  console.log(`\n══════ wowfarma scrape ══════`);
  console.log(`  Produtos: ${products.length} · CNP: ${products.filter(p => p.cnp).length} · EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  filtrados: não-cosmética ${nonCosm} · sem chave ${noKey} · sem preço ${noPrice}`);

  if (products.length === 0) { console.error('\n✗ 0 produtos (feed vazio?). NÃO sobrescrevo o catálogo.'); process.exit(1); }
  if (LIMIT !== Infinity) { console.log(`\n[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`); return; }

  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'wowfarma.pt (feed KK; reference=CNP + ean)', products }), 'utf8');
  console.log(`\n✓ ${OUT_FILE.replace(ROOT, '.')} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`);
})();
