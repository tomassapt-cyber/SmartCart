#!/usr/bin/env node
/**
 * GirlMath — byFarma () catalog scrape
 * ============================================================
 *
 * byFarma é Magento mas expõe Product JSON-LD limpo em cada PDP. Não
 * precisamos Playwright — fetch HTTP simples + parse JSON-LD basta.
 * GTIN-13 real disponível → cross-store matching forte por EAN.
 *
 * Pipeline:
 *  1. Descarregar sitemap-products.xml (~32k URLs)
 *  2. Filtrar URLs por keywords pré-scrape (beauty/skincare/hair/body)
 *     para evitar gastar tempo em suplementos, fraldas, etc.
 *  3. Para cada URL, fetch + extract JSON-LD Product + previous_price
 *     do DOM (.old-price + .special-price Magento pattern)
 *  4. Checkpoint a cada 100 produtos (resume seguro)
 *
 * Uso:
 *   node scripts/scrape-byfarma-catalog.js              # full
 *   node scripts/scrape-byfarma-catalog.js --limit=100  # smoke test
 *   node scripts/scrape-byfarma-catalog.js --chunk=1/4  # 1ª fatia de 4
 *   node scripts/scrape-byfarma-catalog.js --resume     # retoma de checkpoint
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'byfarma-full.json');
const SITEMAP_URL = 'https://byfarma.pt/sitemap.xml';
const PRODUCT_URL_PREFIX = 'https://byfarma.pt/products/';

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
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 600;
const CHECKPOINT_EVERY = 100;

// Keywords no URL slug que indicam produto beauty/dermo (não-medicação, não-suplemento)
// Estes URLs são fortes candidatos a categorias relevantes
const URL_BEAUTY_HINTS = /(serum|sérum|creme|crema|cream|leite|loção|locao|lotion|hidratant|cleanser|micelar|micellar|tonico|tónico|toner|champô|champu|shampoo|condicionador|conditioner|mascara|máscara|esfoliante|antirruga|antirugas|solar|spf|fps|protetor|olho|olhos|eye|esmalte|lábio|labio|lip|hand-cream|creme.maos|body|corpo|hair|cabelo|gel-banho|sabonete|barba|beard|after-shave|baby-cream|atopia|atopic|hidrat)/i;

// Keywords no URL slug que indicam NÃO-beauty (excluir explicitamente)
const URL_EXCLUDE = /(comprimid|c[áa]psula|p[ií]lula|saqueta|sachet|gomas|jellies|suplement|vitamin-(?!c-creme)|tablete|tablet|tirinha|teste|test-(?!cream)|preservativ|fralda|chupeta|bib[eo]r[oã]o|leite-em-po|farinhas|papinha|cereal|formula-infant|toalhi|penso|gaze|c[uo]rativo|term[oóô]metro|inalador|m[aá]scara-cirurgica|m[aá]scara-ffp|seringa|gluc[oó]metro|tensiomet|piolho|antimosqu|antiparasit|carraça|repelent|spray-nasal|nicotina|niquitin|nicorette|laxante|diur[eé]tico|antial[eé]rgic|naprofeno|paracetamol|ibuprofen|aspirin|antibi[oó]tic)/i;

function isBeautyUrl(url) {
  if (URL_EXCLUDE.test(url)) return false;
  return URL_BEAUTY_HINTS.test(url);
}

// Categoria heurística pelo URL slug
const URL_CATEGORY_PATTERNS = [
  { cat: 'skincare', rx: /(serum|sérum|creme|crema|cream|leite-rosto|loção-rosto|hidratant|cleanser|micelar|micellar|tonico|tónico|toner|esfoliant|antirruga|antirugas|protetor.solar|spf|fps|olho|olhos|eye|atopia|atopic|antimanchas|peeling|sabonete)/i },
  { cat: 'hair',     rx: /(champ[oôu]|shampoo|condicionador|conditioner|m[aá]scara.cabelo|hair|cabelo|anti.queda|anticaspa|coloraç|coloration)/i },
  { cat: 'body',     rx: /(corpo|body|gel-banho|loção-corpo|locao-corpo|lotion-body|hidrat.corpor|creme.maos|hand.cream|sabonete-l[ií]quido|gel.duche|deo|desodoriz|desodorant)/i },
];

function urlCategory(url) {
  for (const { cat, rx } of URL_CATEGORY_PATTERNS) {
    if (rx.test(url)) return cat;
  }
  return null;
}

function loadCheckpoint() {
  if (!RESUME) return null;
  if (!fs.existsSync(OUT_FILE)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!Array.isArray(d.products)) return null;
    const done = new Set(d.products.map(p => p.url));
    return { products: d.products, done };
  } catch { return null; }
}

function saveCheckpoint(products, inProgress = true) {
  const out = {
    scraped_at: new Date().toISOString(),
    source: 'byfarma.com (HTTP + JSON-LD)',
    in_progress: inProgress,
    products,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out), 'utf8');
}

function parsePtPrice(text) {
  if (!text) return null;
  const m = text.match(/([\d.]+,\d{2}|[\d.]+)/);
  if (!m) return null;
  const s = m[1].replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

function extractProductData(html, url) {
  // 1. JSON-LD Product (concatenados em vários scripts; pegar o que tem @type=Product)
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let product = null;
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj['@type'] === 'Product') { product = obj; break; }
      if (Array.isArray(obj['@graph'])) {
        const p = obj['@graph'].find(x => x['@type'] === 'Product');
        if (p) { product = p; break; }
      }
    } catch {}
  }
  if (!product) return null;

  // 2. Price: offers[0].price (JSON-LD); previous_price: scrap do .old-price DOM
  const offers = Array.isArray(product.offers) ? product.offers
    : (product.offers ? [product.offers] : []);
  const offer = offers[0];
  const price = offer ? (typeof offer.price === 'number' ? offer.price : parseFloat(offer.price)) : null;
  const inStock = offer ? /InStock/i.test(offer.availability || '') : false;

  // byFarma é Next.js com CSS-in-JS (classes geradas) — não conseguimos
  // detectar strikethrough via classes semânticas. previous_price fica null.
  let previous_price = null;

  // 3. EAN — byFarma 'gtin' é SKU interno (7 dígitos), não GTIN-13 real.
  // Só aceitar se for ≥12 dígitos (GTIN-12/13/14 reais).
  const rawEan = product.gtin13 || product.gtin || offer?.gtin13 || offer?.gtin || null;
  const ean = (rawEan && /^\d{12,14}$/.test(String(rawEan))) ? String(rawEan) : null;

  // 4. Imagem
  const image_url = Array.isArray(product.image) ? product.image[0]
    : (typeof product.image === 'string' ? product.image
    : product.image?.url || null);

  // 5. Marca — byFarma JSON-LD não tem .brand. Estratégia:
  //   1. URL slug começa pela marca: /products/{brand-slug}-{name-slug}
  //   2. Brands compostas conhecidas (multi-palavra) requerem matching especial
  //   3. Fallback: extrair primeiro token Capitalizado do nome
  let brand = typeof product.brand === 'string' ? product.brand
    : product.brand?.name || null;
  if (!brand) {
    const slug = url.replace(PRODUCT_URL_PREFIX, '').toLowerCase();
    // Brands multi-palavra conhecidas (checar PRIMEIRO — mais específico)
    const KNOWN_MULTI = [
      ['la-roche-posay', 'La Roche-Posay'],
      ['estee-lauder', 'Estée Lauder'],
      ['rene-furterer', 'René Furterer'],
      ['roger-gallet', 'Roger & Gallet'],
      ['loreal-paris', "L'Oréal Paris"],
      ['eau-thermale-avene', 'Avène'],
    ];
    for (const [pref, name] of KNOWN_MULTI) {
      if (slug.startsWith(pref + '-')) { brand = name; break; }
    }
    if (!brand) {
      // Single-word: primeiro segmento do slug
      const first = slug.split('-')[0];
      if (first && first.length >= 2) {
        // Capitalizar; mapear casos especiais
        const SINGLE_MAP = { avene: 'Avène', lancome: 'Lancôme', kerastase: 'Kérastase', loreal: "L'Oréal" };
        brand = SINGLE_MAP[first] || (first.charAt(0).toUpperCase() + first.slice(1));
      }
    }
  }

  // 6. Volume — extrair do nome (regex comum)
  let volume_ml = null;
  const volM = (product.name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (volM) {
    const v = parseFloat(volM[1].replace(',', '.'));
    const u = volM[2].toLowerCase();
    volume_ml = (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
  }

  return {
    name: product.name || null,
    brand,
    ean: typeof ean === 'string' ? ean : (ean ? String(ean) : null),
    description: typeof product.description === 'string' ? product.description.slice(0, 300) : null,
    image_url,
    price,
    previous_price,
    in_stock: inStock,
    volume_ml,
    category: urlCategory(url),
    variants: [], // byFarma usa páginas separadas por volume → variantes não estão num único PDP
  };
}

async function fetchPage(url, attempt = 1) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; price comparison)',
        'Accept': 'text/html',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
    });
    if (r.status === 404) return { status: 'not_found' };
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 3) {
        await new Promise(s => setTimeout(s, 2000 * attempt));
        return fetchPage(url, attempt + 1);
      }
      return { status: 'http_error', http: r.status };
    }
    const html = await r.text();
    return { status: 'ok', html };
  } catch (e) {
    if (attempt < 3) {
      await new Promise(s => setTimeout(s, 2000 * attempt));
      return fetchPage(url, attempt + 1);
    }
    return { status: 'fetch_error', error: e.message };
  }
}

(async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

  // 1. Sitemap
  console.log('📋 A descarregar sitemap byFarma…');
  const smRes = await fetch(SITEMAP_URL, { headers: { 'User-Agent': 'GirlMath-Catalog-Bot/1.0' } });
  const smXml = await smRes.text();
  const allUrls = (smXml.match(/<loc>([^<]+)<\/loc>/g) || [])
    .map(m => m.replace(/<\/?loc>/g, ''))
    .filter(u => u.startsWith(PRODUCT_URL_PREFIX));
  console.log(`  ${allUrls.length} URLs no sitemap`);

  // 2. Filtrar por beauty hints
  let urls = allUrls.filter(isBeautyUrl);
  console.log(`  ${urls.length} URLs beauty/dermo (após filtro keywords)`);

  // 3. Chunking
  if (CHUNK) {
    const [n, m] = CHUNK.split('/').map(Number);
    const sorted = [...urls].sort();
    const size = Math.ceil(sorted.length / m);
    urls = sorted.slice((n - 1) * size, n * size);
    console.log(`  Chunk ${CHUNK}: ${urls.length} URLs`);
  }
  if (LIMIT !== Infinity) urls = urls.slice(0, LIMIT);

  // 4. Resume
  const cp = loadCheckpoint();
  const products = cp?.products || [];
  const done = cp?.done || new Set();
  if (cp) console.log(`  Resume: ${done.size} já scraped, ${urls.length - done.size} pendentes`);

  // 5. Scrape com pool
  const queue = urls.filter(u => !done.has(u));
  console.log(`\n🚀 A scrapar ${queue.length} URLs (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)…\n`);

  const start = Date.now();
  let idx = 0;
  const stats = { ok: 0, no_jsonld: 0, not_found: 0, error: 0 };

  async function worker() {
    while (idx < queue.length) {
      const i = idx++;
      const url = queue[i];
      const r = await fetchPage(url);
      const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        const data = extractProductData(r.html, url);
        if (data) {
          products.push({ url, status: 'ok', scraped_at, ...data });
          stats.ok++;
        } else {
          products.push({ url, status: 'no_jsonld', scraped_at });
          stats.no_jsonld++;
        }
      } else if (r.status === 'not_found') {
        products.push({ url, status: 'not_found', scraped_at });
        stats.not_found++;
      } else {
        products.push({ url, status: 'error', scraped_at, error: r.error || ('HTTP ' + r.http) });
        stats.error++;
      }
      if ((stats.ok + stats.no_jsonld + stats.not_found + stats.error) % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(products);
        const done = stats.ok + stats.no_jsonld + stats.not_found + stats.error;
        const elapsed = (Date.now() - start) / 1000;
        const rate = done / elapsed;
        const eta = (queue.length - done) / rate;
        console.log(`  [${done}/${queue.length}] ok:${stats.ok} no_ld:${stats.no_jsonld} 404:${stats.not_found} err:${stats.error} · ${rate.toFixed(1)}/s · ETA ${Math.round(eta / 60)}m`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  saveCheckpoint(products, false);

  // Stats finais
  const byCat = {};
  const withDisc = products.filter(p => p.status === 'ok' && p.previous_price).length;
  for (const p of products) {
    if (p.status === 'ok') byCat[p.category || 'unclassified'] = (byCat[p.category || 'unclassified'] || 0) + 1;
  }
  console.log(`\n══════ byFarma scrape ══════`);
  console.log(`  Total: ${products.length}`);
  console.log(`  OK:    ${stats.ok}`);
  console.log(`  No JSON-LD: ${stats.no_jsonld}`);
  console.log(`  404:   ${stats.not_found}`);
  console.log(`  Erro:  ${stats.error}`);
  console.log(`  Com desconto activo: ${withDisc} (${stats.ok ? Math.round(100 * withDisc / stats.ok) : 0}%)`);
  console.log(`\n  Por categoria:`);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`    ${c.padEnd(14)} ${n}`));
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
})();
