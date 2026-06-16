#!/usr/bin/env node
/**
 * GirlMath/CosMath — Manuela Serra (manuelaserra.com) catalog scrape
 * ============================================================
 *
 * Loja Shopify (salão / cabelo profissional). Shopify expõe TODO o catálogo
 * em /products.json paginado → não é preciso scraping de HTML nem Playwright.
 *
 * Campos por produto: title, vendor (=marca), variants[{price, sku, available,
 * title (=volume), compare_at_price}], images, body_html, handle.
 *
 * EAN: o `barcode` não é exposto, mas o `sku` É o GTIN-13 em ~21% dos produtos
 * (Redken, Truss). Só aceitamos sku como EAN se for 12-14 dígitos; o resto
 * casa por fingerprint (vendor + nome), como a byFarma.
 *
 * Uso:
 *   node scripts/scrape-manuelaserra-catalog.js
 *   node scripts/scrape-manuelaserra-catalog.js --limit=50   # smoke test
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'manuelaserra-full.json');
const BASE = 'https://www.manuelaserra.com';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Categoria heurística pelo nome (loja é maioritariamente cabelo → default hair)
const CAT_PATTERNS = [
  { cat: 'skincare', rx: /(s[ée]rum|creme\s+(de\s+)?rosto|hidratante\s+facial|antirruga|olhos|contorno|micelar|esfoliante\s+facial|protetor\s+solar|spf|fps)/i },
  { cat: 'body', rx: /(corpo|body|gel\s+de\s+banho|gel\s+duche|sabonete|esfoliante\s+corporal|hidratante\s+corporal|m[aã]os|p[ée]s|desodoriz)/i },
  { cat: 'hair', rx: /(champ[ôou]|shampoo|condicionador|conditioner|m[aá]scara|óleo|oleo|finaliz|leave.?in|s[ée]rum\s+capilar|cabelo|hair|caspa|queda|frizz|caracol|curl|alisa|coloraç|tinta|spray|laca|gel\s+fixa|cera|p[oó])/i },
];
function classify(name) {
  for (const { cat, rx } of CAT_PATTERNS) if (rx.test(name || '')) return cat;
  return 'hair'; // loja de cabelo → default seguro
}

function volumeFromText(t) {
  const m = (t || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  if (!isFinite(v)) return null;
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
}
const num = (s) => { const n = parseFloat(s); return isFinite(n) ? Math.round(n * 100) / 100 : null; };
const isEan = (s) => /^\d{12,14}$/.test(String(s || '').trim());

function mapProduct(p) {
  const variants = (p.variants || []).map(v => {
    const price = num(v.price);
    const prev = num(v.compare_at_price);
    return {
      volume_ml: volumeFromText(v.title) || volumeFromText([v.option1, v.option2, v.option3].filter(Boolean).join(' ')) || volumeFromText(p.title),
      unit: 'ml',
      price,
      previous_price: (prev && price && prev > price + 0.01) ? prev : null,
      in_stock: !!v.available,
      sku: v.sku || null,
      url: `${BASE}/products/${p.handle}?variant=${v.id}`,
    };
  }).filter(v => v.price != null);

  // Variante "principal": a mais barata em stock (senão a 1ª)
  const inStockV = variants.filter(v => v.in_stock);
  const head = (inStockV.length ? inStockV : variants).sort((a, b) => a.price - b.price)[0] || null;
  // EAN: do sku da variante principal (ou de qualquer variante) se for GTIN
  const eanVar = variants.find(v => isEan(v.sku));
  const ean = eanVar ? String(eanVar.sku).trim() : null;

  const image_url = (p.images && p.images[0] && p.images[0].src) || null;

  return {
    url: `${BASE}/products/${p.handle}`,
    status: 'ok',
    scraped_at: new Date().toISOString(),
    name: (p.title || '').trim() || null,
    brand: (p.vendor || '').trim() || null,
    ean,
    description: stripHtml(p.body_html),
    image_url,
    price: head ? head.price : null,
    previous_price: head ? head.previous_price : null,
    in_stock: variants.some(v => v.in_stock),
    volume_ml: head ? head.volume_ml : volumeFromText(p.title),
    category: classify(p.title),
    // variantes só quando há >1 (senão é o próprio produto)
    variants: variants.length > 1 ? variants.map(({ sku, ...rest }) => rest) : [],
  };
}

async function fetchJson(url, attempt = 1) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'pt-PT,pt;q=0.9' } });
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 4) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchJson(url, attempt + 1); }
      throw new Error('HTTP ' + r.status);
    }
    return await r.json();
  } catch (e) {
    if (attempt < 4) { await new Promise(s => setTimeout(s, 1500 * attempt)); return fetchJson(url, attempt + 1); }
    throw e;
  }
}

(async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📋 Manuela Serra (Shopify products.json)…');
  const products = [];
  let page = 1;
  while (page <= 50) {
    const j = await fetchJson(`${BASE}/products.json?limit=250&page=${page}`);
    const ps = j.products || [];
    if (!ps.length) break;
    for (const p of ps) {
      const d = mapProduct(p);
      if (d.name && d.price != null) products.push(d);
      if (products.length >= LIMIT) break;
    }
    console.log(`  página ${page}: +${ps.length} (total ${products.length})`);
    if (products.length >= LIMIT || ps.length < 250) break;
    page++;
    await new Promise(s => setTimeout(s, 400));
  }

  const out = { scraped_at: new Date().toISOString(), source: 'manuelaserra.com (Shopify products.json)', in_progress: false, products };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out), 'utf8');

  const withEan = products.filter(p => p.ean).length;
  const byCat = {};
  products.forEach(p => byCat[p.category] = (byCat[p.category] || 0) + 1);
  console.log(`\n══════ Manuela Serra ══════`);
  console.log(`  Produtos: ${products.length} · com EAN: ${withEan} (${Math.round(100 * withEan / products.length)}%) · em stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  Por categoria: ${Object.entries(byCat).map(([c, n]) => `${c}:${n}`).join(' · ')}`);
  console.log(`✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
})();
