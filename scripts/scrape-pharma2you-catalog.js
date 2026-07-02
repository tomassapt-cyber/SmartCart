#!/usr/bin/env node
/**
 * CosMath — pharma2you.pt catalog scrape (via Google Merchant feed)
 * =================================================================
 *
 * Pharma2you (farmácia PT, Magento) NÃO expõe gtin13/JSON-LD nas páginas, mas
 * publica um FEED Google Merchant completo:
 *   https://pharma2you.pt/feeds/google_export.xml   (~2.6k produtos)
 *
 * O feed traz: <title>, <link>, <g:image_link>, <g:price> ("46.00 EUR"),
 * <g:sale_price>, <g:availability>, <g:product_type> (categoria; 672 do tipo
 * "Marcas > X > <Marca>") e <g:mpn> (SKU interno).
 *
 * LIMITAÇÃO IMPORTANTE: o feed NÃO tem EAN (g:gtin vazio) nem g:brand. Por isso
 * esta loja entra só como FONTE DE PREÇO sobre produtos que JÁ temos, casados
 * por FINGERPRINT (marca+nome+volume) — ver integrate-pharma2you-catalog.js.
 * A marca é extraída do product_type "Marcas > X > <Marca>" quando existe; o
 * resto fica null e o integrador tenta casar a marca pelo prefixo do título
 * contra as marcas conhecidas do seed.
 *
 * Feed-based ⇒ 1 download, sem raspar página a página (rápido, leve).
 *
 * Uso:
 *   node scripts/scrape-pharma2you-catalog.js
 *   node scripts/scrape-pharma2you-catalog.js --limit=200
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'pharma2you-full.json');
const FEED_URL = 'https://pharma2you.pt/feeds/google_export.xml';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

function decodeEntities(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}
function priceNum(s) {
  if (!s) return null;
  const m = String(s).match(/([\d.,]+)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isFinite(v) && v > 0 ? v : null;
}
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
// Categoria dermo grosseira a partir do product_type (hint; o integrador usa
// classifyDermo(name) como autoridade — esta loja só enriquece, não cria).
function categoryFromType(pt) {
  if (!pt) return null;
  const root = pt.split('>')[0].trim().toLowerCase();
  if (/rosto|facial/.test(root)) return 'skincare';
  if (/cabelo/.test(root)) return 'hair';
  if (/corpo|higiene[^a-z]?íntima|solar/.test(root)) return 'body';
  return null;
}
// Marca a partir de "Marcas > X > <Marca>" (último segmento) quando aplicável.
function brandFromType(pt) {
  if (!pt || !/^marcas\s*>/i.test(pt)) return null;
  const segs = pt.split('>').map(s => s.trim()).filter(Boolean);
  const last = segs[segs.length - 1];
  // ignora segmentos de 1 letra ("F") que são índice alfabético
  return last && last.length > 1 ? last : null;
}

function parseItem(block) {
  const name = tag(block, 'title');
  if (!name) return null;
  const link = tag(block, 'link');
  if (!link) return null;
  const image_url = tag(block, 'g:image_link');
  // 1º <g:price> do item (o 2º está dentro de <g:shipping>); cortamos no shipping.
  const beforeShip = block.split(/<g:shipping>/i)[0];
  const price = priceNum(tag(beforeShip, 'g:price'));
  if (price == null) return null;
  const sale = priceNum(tag(beforeShip, 'g:sale_price'));
  // sale_price (quando existe) é o preço atual; g:price passa a previous.
  const finalPrice = sale != null ? sale : price;
  const previous_price = sale != null ? price : null;
  const avail = (tag(block, 'g:availability') || '').toLowerCase();
  const in_stock = /in stock/.test(avail);
  const pt = tag(block, 'g:product_type');
  const sku = tag(block, 'g:mpn') || tag(block, 'g:id');
  return {
    url: link, status: 'ok', scraped_at: new Date().toISOString(),
    name: name.replace(/\s+/g, ' ').trim(),
    brand: brandFromType(pt),
    ean: null,                       // feed não traz EAN — match por fingerprint
    sku: sku ? String(sku) : null,
    image_url: image_url || null,
    price: finalPrice, previous_price,
    in_stock,
    volume_ml: volumeFromName(name),
    category: categoryFromType(pt),
    product_type: pt || null,
    variants: [],
  };
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 A descarregar feed Google Merchant pharma2you…');
  const r = await fetch(FEED_URL, { headers: { 'User-Agent': UA, 'Accept': 'application/xml' } });
  if (!r.ok) { console.error('✗ Feed HTTP', r.status); process.exit(1); }
  const xml = await r.text();
  let blocks = xml.split(/<item>/i).slice(1).map(b => b.split(/<\/item>/i)[0]);
  console.log(`  ${blocks.length} <item> no feed`);
  if (LIMIT !== Infinity) blocks = blocks.slice(0, LIMIT);

  const products = [];
  const stats = { ok: 0, skipped: 0, withBrand: 0, inStock: 0 };
  for (const b of blocks) {
    const p = parseItem(b);
    if (!p) { stats.skipped++; continue; }
    products.push(p);
    stats.ok++;
    if (p.brand) stats.withBrand++;
    if (p.in_stock) stats.inStock++;
  }

  if (products.length === 0) { console.error('✗ 0 produtos (feed vazio/bloqueio?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  if (LIMIT !== Infinity) { console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`); process.exit(0); }
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    scraped_at: new Date().toISOString(),
    source: 'pharma2you.pt (Google Merchant feed; SEM EAN — match por fingerprint)',
    in_progress: false,
    products,
  }), 'utf8');

  console.log(`\n══════ pharma2you scrape ══════`);
  console.log(`  Produtos: ${stats.ok} (in_stock: ${stats.inStock}) · skipped: ${stats.skipped}`);
  console.log(`  Com marca via "Marcas > X": ${stats.withBrand} (resto = prefixo do título no integrador)`);
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { parseItem, brandFromType, priceNum };
if (require.main === module) { main().catch(e => { console.error('FATAL', e); process.exit(1); }); }
