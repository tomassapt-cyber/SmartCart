#!/usr/bin/env node
/**
 * GirlMath — Bairro da Saúde catalog scrape
 * ============================================================
 *
 * Bairro da Saúde é uma loja Shopify. Em vez de browser-automation,
 * usamos a API pública `/products.json?page=N` que devolve produtos
 * com vendor (marca), variantes (com price/compare_at_price/available),
 * imagens e tipo de produto — tudo JSON estruturado.
 *
 * Output: data/catalog/bairro-full.json
 * Formato compatível com `integrate-bairro-catalog.js`:
 *   {
 *     scraped_at, source, total_pages, products: [
 *       { status, handle, url, name, brand, category, image_url,
 *         price, previous_price, discount_pct, in_stock, volume_ml,
 *         variants: [{ volume_ml, price, previous_price, in_stock, sku }] }
 *     ]
 *   }
 *
 * Uso:
 *   node scripts/scrape-bairro-catalog.js              # tudo (~30s)
 *   node scripts/scrape-bairro-catalog.js --limit=50   # smoke test
 *   node scripts/scrape-bairro-catalog.js --raw        # guarda também o raw
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'bairro-saude-full.json');
const RAW_FILE = path.join(CATALOG_DIR, 'bairro-saude-raw.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const SAVE_RAW = !!args.raw;

const BASE = 'https://bairrodasaude.pt';

// ── Categorização ─────────────────────────────────────────────
// Mapeia o product_type da loja para a nossa taxonomy.
// product_type da Bairro da Saúde é específico (ex: "Hidratantes e Matificantes")
// → normalizamos com keyword matching, igual aos outros integrate scripts.
const CATEGORY_KEYWORDS = [
  { cat: 'skincare', rx: /\b(pele|rosto|hidrat|s[eé]rum|creme|protetor[ -]?solar|spf|fps|m[aá]scara|esfoliant|t[oó]nico|micel|limpez|hialur[oô]nico|antirrug|antiidad|anti[ -]?manchas|atopica|atópica|sens[ií]vel|dermatol|cosmét|peeling)\b/i },
  { cat: 'haircare', rx: /\b(cabelo|champ[oô]|shampoo|condicion|hair|capilar|anti[ -]?caspa|anti[ -]?queda|óleo capilar|máscara capilar)\b/i },
  { cat: 'body', rx: /\b(corpo|body|gel de banho|hidratante corporal|sabonete|loção|esmalte|unhas|m[aã]os)\b/i },
  { cat: 'perfume', rx: /\b(perfum|eau de parfum|eau de toilette|edt|edp|colônia|colónia|fragrânc|fragrancia)\b/i },
  { cat: 'makeup', rx: /\b(maquilh|maquiagem|batom|gloss|sombra|máscara de pelo|m[aá]scara de pestanas|eyeliner|base|foundation|blush|bronze|concealer|primer|fixador)\b/i },
];

// Tipos de produto a SEMPRE excluir (não-cosmética)
const EXCLUDE_TYPES = /\b(suplement|vitamin|magnés|magnes|colhagen|colag[eê]n|prote[ií]na|teste gravidez|teste ovula|preservativo|medicament|comprimid|c[áa]psula|p[íi]lula|seringa|fralda|chupeta|biber[oóã]o|leite (em p[oó]|infant|materno)|toalhi|cur(a|ado)|penso|term[oó]metro|gravidez|amament|bomba|pessári|gengiv|escova de dentes|dent[íi]frica|fio dent|colut[oó]rio|piolho|antimosqu|repelent|carraça|inalad|ferid|antig[eé]nio|antig[eé]nico|teste covid|covid|gripe)\b/i;

function normVolume(rawTitle) {
  if (!rawTitle) return null;
  // ex: "50 ml", "30ml", "200 g", "1,5L"
  const m = String(rawTitle).match(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|kg|l|L)\b/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  if (unit === 'l' && n < 10) n = n * 1000; // 1L → 1000ml (heurística)
  if (unit === 'kg') n = n * 1000;
  return n;
}

function categorize(p) {
  const haystack = [p.product_type, p.title, ...(p.tags || []), p.body_html || ''].join(' ');
  if (EXCLUDE_TYPES.test(haystack)) return null;
  for (const { cat, rx } of CATEGORY_KEYWORDS) {
    if (rx.test(haystack)) return cat;
  }
  return null; // não-classificado → fora
}

function bestImage(p) {
  if (!p.images || p.images.length === 0) return null;
  const img = p.images[0];
  // Shopify devolve URL com query string `?v=...` para cache-busting. Mantemos.
  // Forçar tamanho médio se houver _100x100 → _500x500 (Shopify CDN aceita).
  let src = img.src;
  src = src.replace(/_\d+x\d+(?=\.)/, '_500x500');
  return src;
}

function variantToOffer(v, defaultVolume) {
  const price = parseFloat(v.price);
  const prev = v.compare_at_price ? parseFloat(v.compare_at_price) : null;
  // Volume: option1/title pode ter "50 ml" se o produto tem múltiplos tamanhos.
  // Senão usamos o defaultVolume (extraído do título do produto).
  const volTitle = [v.title, v.option1, v.option2].filter(Boolean).join(' ');
  const fromVariant = normVolume(volTitle);
  const volume_ml = fromVariant || defaultVolume || null;
  const discount = prev && prev > price ? Math.round((1 - price / prev) * 100) : null;
  return {
    volume_ml,
    price,
    previous_price: prev && prev > price ? prev : null,
    discount_pct: discount,
    in_stock: !!v.available,
    sku: v.sku || null,
  };
}

function mapProduct(p, url) {
  const category = categorize(p);
  if (!category) return null;

  const defaultVolume = normVolume(p.title) || normVolume(p.body_html);
  const variants = (p.variants || []).map(v => variantToOffer(v, defaultVolume));
  // Filtrar variantes sem preço (raro)
  const okVariants = variants.filter(v => v.price > 0);
  if (okVariants.length === 0) return null;

  // Best (mais barata e em stock; senão a mais barata)
  const inStock = okVariants.filter(v => v.in_stock);
  const pool = inStock.length ? inStock : okVariants;
  const best = pool.reduce((a, b) => (b.price < a.price ? b : a), pool[0]);

  return {
    status: 'ok',
    handle: p.handle,
    url,
    name: p.title,
    brand: (p.vendor || '').trim() || null,
    category,
    image_url: bestImage(p),
    price: best.price,
    previous_price: best.previous_price,
    discount_pct: best.discount_pct,
    in_stock: best.in_stock,
    volume_ml: best.volume_ml,
    variants: okVariants,
  };
}

async function fetchPage(page) {
  const url = `${BASE}/products.json?limit=250&page=${page}`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; comparação de preços)',
      'Accept': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} na página ${page}`);
  return await r.json();
}

(async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  console.log('📦 A buscar catálogo Bairro da Saúde (Shopify /products.json)…\n');

  const all = [];
  let page = 1;
  while (true) {
    let j;
    try { j = await fetchPage(page); }
    catch (e) {
      console.error(`✗ Falha na página ${page}: ${e.message}`);
      break;
    }
    const arr = j.products || [];
    if (arr.length === 0) break;
    all.push(...arr);
    console.log(`  página ${String(page).padStart(2)} → +${arr.length} (total ${all.length})`);
    if (arr.length < 250) break;
    if (all.length >= LIMIT) break;
    page++;
    // delay leve
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✓ Raw fetched: ${all.length} produtos brutos`);

  if (SAVE_RAW) {
    fs.writeFileSync(RAW_FILE, JSON.stringify(all), 'utf8');
    console.log(`  raw guardado em ${RAW_FILE.replace(ROOT, '.')}`);
  }

  // ── Mapear + filtrar ──
  const products = [];
  let skipped = { uncategorized: 0, noprice: 0, excluded: 0 };
  for (const p of all.slice(0, LIMIT === Infinity ? all.length : LIMIT)) {
    const cat = categorize(p);
    if (!cat) {
      // distinguir excluído (suplementos/medicamentos) de não-classificado
      const hay = [p.product_type, p.title, ...(p.tags || [])].join(' ');
      if (EXCLUDE_TYPES.test(hay)) skipped.excluded++;
      else skipped.uncategorized++;
      continue;
    }
    const url = `${BASE}/products/${p.handle}`;
    const mapped = mapProduct(p, url);
    if (!mapped) { skipped.noprice++; continue; }
    products.push(mapped);
  }

  // Stats por categoria
  const byCat = {};
  for (const p of products) byCat[p.category] = (byCat[p.category] || 0) + 1;

  console.log(`\n══════ Bairro da Saúde scrape — resumo ══════`);
  console.log(`  Produtos brutos:           ${all.length}`);
  console.log(`  Excluídos (não cosmét.):   ${skipped.excluded}`);
  console.log(`  Sem categoria match:       ${skipped.uncategorized}`);
  console.log(`  Sem preço válido:          ${skipped.noprice}`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Beauty produtos finais:    ${products.length}`);
  console.log('');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`    ${cat.padEnd(12)} ${n}`);
  });

  // Stats marcas top
  const byBrand = {};
  for (const p of products) byBrand[p.brand || '?'] = (byBrand[p.brand || '?'] || 0) + 1;
  const topBrands = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\n  Top marcas:`);
  topBrands.forEach(([b, n]) => console.log(`    ${b.padEnd(28)} ${n}`));

  // Stats promoções
  const withDiscount = products.filter(p => p.discount_pct && p.discount_pct > 0).length;
  console.log(`\n  Com desconto activo:       ${withDiscount} (${Math.round(100*withDiscount/products.length)}%)`);

  const out = {
    scraped_at: new Date().toISOString(),
    source: 'bairro.pt (Shopify products.json)',
    total_raw: all.length,
    products,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out), 'utf8');
  console.log(`\n✓ Escrito ${OUT_FILE.replace(ROOT, '.')} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`);
})();
