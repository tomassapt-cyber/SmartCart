#!/usr/bin/env node
/**
 * CosMath — Sofarma catalog scrape
 * ============================================================
 * Loja 74 (2026-07-30). Grupo de farmácias do Norte. 8.010 produtos no mapa.
 *
 * PORQUE ESTA E NAO OUTRA — medido antes de escrever uma linha:
 *   · nivel de preco: mediana **0,94x** a do mercado (p10 0,73x);
 *   · passa a ser o MAIS BARATO em **6%** dos produtos comparaveis, mesmo
 *     naqueles onde ja competem 25 a 28 lojas.
 *   Para referencia, no mesmo teste: Care to Beauty 1,26x e 0%; Loja do
 *   Shampoo 0,99x e 2%. Uma loja cara acrescenta ofertas mas nao muda a
 *   resposta do site — e a resposta e o produto.
 *
 * DADOS: os melhores de todas as candidatas avaliadas. Em 40 fichas lidas,
 * **100% com EAN-13 (gtin) E 100% com CNP (sku de 7 digitos)** no mesmo
 * JSON-LD, com marca e disponibilidade. Cruzamento forte pelos dois lados:
 * EAN para as lojas internacionais, CNP para as farmacias portuguesas.
 *
 * ⚠️ CODIFICACAO ISO-8859-1, nao UTF-8. O servidor declara-o no cabecalho.
 * Ler a pagina como utf8 estraga TODOS os acentos ("Avène" vira "Av?ne") e os
 * nomes estragados iam parar ao catalogo. Le-se o corpo como bytes e
 * descodifica-se em latin1 — e a unica diferenca real face ao scraper da
 * sofarma, mas e uma diferenca que estraga o catalogo inteiro se for ignorada.
 *
 * ⚠️ SEM PRECOS BARRADOS na amostra. As classes base-price-old /
 * base-price-current existem no CSS, mas em 12 produtos dermo nenhum tinha
 * promocao — ao contrario do que o relatorio de candidatas sugeria. O codigo
 * apanha-as se aparecerem; se a contagem de descontos vier a zero, e a loja.
 *
 * Pipeline:
 *  1. sitemaps/sitemap_products_pt.xml (8.010 URLs)
 *  2. filtro de keywords (poupa pedidos em veterinaria, ortopedia, etc.)
 *  3. por URL: fetch + JSON-LD Product (latin1) + preco anterior do DOM
 *  4. checkpoint a cada 100 (resume seguro)
 *
 * Uso:
 *   node scripts/scrape-sofarma-catalog.js              # completo
 *   node scripts/scrape-sofarma-catalog.js --limit=100  # ensaio
 *   node scripts/scrape-sofarma-catalog.js --resume     # retoma
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'sofarma-full.json');
const SITEMAP_URL = 'https://www.sofarma.com/sitemaps/sitemap_products_pt.xml';
const URL_PREFIX = 'https://www.sofarma.com/pt/';

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
  if (URL_BEAUTY_HINTS.test(url)) return true;
  // Recuperação: keywords sem-acento (champo!) + nomes de GAMA dermo que o
  // filtro positivo perdia (produtos nomeados só por marca+gama). +milhares.
  return /(champo|oleo|óleo|balsamo|bálsamo|fluido|emuls|espuma|desodoriz|syndet|anti.?queda|anti.?caspa|cica|atoderm|sebium|sensibio|cicaplast|lipikar|effaclar|hyseac|nutritic|toleriane|dercos|kerium|cleanance|hydrance|anthelios|bariederm|photoderm|pigmentbio|hydrabio|cytelium|cicalfate|nuxuriance|keratine|squalane|exomega|trixera|sensifluid)/i.test(url);
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
    // Resume CONSCIENTE DA FRESCURA: só mantém/salta produtos raspados nas
    // últimas ~20h. Os mais velhos são RE-RASPADOS (preços frescos). Sem isto,
    // um catálogo committado congela os preços (o --resume salta TUDO e o run
    // diário só re-integra dados velhos → staleness). Num run diário tudo é
    // >20h → re-scrape completo; num resume no MESMO dia salta os recentes.
    const MAX_AGE_MS = (parseFloat(process.env.RESUME_MAX_AGE_HOURS) || 20) * 3600e3;
    const now = Date.now();
    const fresh = d.products.filter(p => p.scraped_at && (now - new Date(p.scraped_at)) < MAX_AGE_MS);
    const done = new Set(fresh.map(p => p.url));
    return { products: fresh, done };
  } catch { return null; }
}

function saveCheckpoint(products, inProgress = true) {
  if (LIMIT !== Infinity) return;  // smoke-test (--limit) NÃO sobrescreve o catálogo de produção
  const out = {
    scraped_at: new Date().toISOString(),
    source: 'sofarma.com (HTTP + JSON-LD)',
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
  let price = offer ? (typeof offer.price === 'number' ? offer.price : parseFloat(offer.price)) : null;
  let inStock = offer ? /InStock/i.test(offer.availability || '') : false;
  // 2b. AggregateOffer (marketplace multi-vendedor): ~5.6k fichas sofarma usam
  // lowPrice/offers[] em vez de price simples — sem isto ficavam SEM preço
  // para sempre (não era soft-block: o mesmo HTML vem em qualquer IP).
  if ((price == null || isNaN(price)) && offer && /AggregateOffer/i.test(String(offer['@type'] || ''))) {
    const nested = Array.isArray(offer.offers) ? offer.offers : [];
    const nestedPrices = nested
      .map(o => (typeof o.price === 'number' ? o.price : parseFloat(o.price)))
      .filter(pr => pr > 0);
    const low = typeof offer.lowPrice === 'number' ? offer.lowPrice : parseFloat(offer.lowPrice);
    price = nestedPrices.length ? Math.min(...nestedPrices) : (low > 0 ? low : null);
    inStock = nested.some(o => /InStock/i.test(o.availability || '')) || Number(offer.offerCount) > 0 || low > 0;
  }
  if (price != null && isNaN(price)) price = null;

  // strikethrough do Magento: classe old-price contém preço lista
  let previous_price = null;
  // classes desta loja: base-price-old (riscado) e base-price-current.
  // Sem <style>, senao apanha-se a folha de estilo em vez do preco.
  const semCss = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  const oldPriceMatch = semCss.match(/class="[^"]*base-price-old[^"]*"[^>]*>([\s\S]{0,160}?)<\/(?:div|span|p)>/i);
  if (oldPriceMatch) {
    const prev = parsePtPrice(oldPriceMatch[1].replace(/<[^>]+>/g, ' '));
    if (prev && price && prev > price * 1.01) previous_price = prev;
  }

  // 3. EAN
  const ean = product.gtin13 || product.gtin || offer?.gtin13 || offer?.gtin || null;

  // 4. Imagem
  const image_url = Array.isArray(product.image) ? product.image[0]
    : (typeof product.image === 'string' ? product.image
    : product.image?.url || null);

  // 5. Marca
  const brand = typeof product.brand === 'string' ? product.brand
    : product.brand?.name || null;

  // 6. Volume — extrair do nome (regex comum)
  let volume_ml = null;
  const volM = (product.name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (volM) {
    const v = parseFloat(volM[1].replace(',', '.'));
    const u = volM[2].toLowerCase();
    volume_ml = (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
  }

  // sku de 7 digitos = CNP. Guarda-lo deixa o apply-cnp-merge juntar este
  // produto aos das farmacias portuguesas que so publicam CNP.
  const skuRaw = String(product.sku || '').trim();
  const cnp = /^\d{7}$/.test(skuRaw) ? skuRaw : null;

  return {
    name: product.name || null,
    brand,
    cnp,
    ean: typeof ean === 'string' ? ean : (ean ? String(ean) : null),
    description: typeof product.description === 'string' ? product.description.slice(0, 300) : null,
    image_url,
    price,
    previous_price,
    in_stock: inStock,
    volume_ml,
    category: urlCategory(url),
    variants: [], // Sofarma usa páginas separadas por volume → variantes não estão num único PDP
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
    const html = Buffer.from(await r.arrayBuffer()).toString('latin1');   // ISO-8859-1
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
  console.log('📋 A descarregar mapa do site Sofarma…');
  const smRes = await fetch(SITEMAP_URL, { headers: { 'User-Agent': 'GirlMath-Catalog-Bot/1.0' } });
  // O MAPA e UTF-8 (declara-o no cabecalho XML); so as FICHAS sao ISO-8859-1.
  const smXml = Buffer.from(await smRes.arrayBuffer()).toString('utf8');
  const allUrls = (smXml.match(/<loc>([^<]+)<\/loc>/g) || [])
    .map(m => m.replace(/<\/?loc>/g, ''))
    .filter(u => u.startsWith(URL_PREFIX));
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
  const stats = { ok: 0, no_jsonld: 0, not_found: 0, error: 0, retried: 0, retry_ok: 0 };
  const RETRY_BUDGET = parseInt(process.env.RETRY_BUDGET || '0', 10); // 0 = off (o "soft-block" afinal era AggregateOffer; env reativa se preciso)

  async function worker() {
    while (idx < queue.length) {
      const i = idx++;
      const url = queue[i];
      const r = await fetchPage(url);
      const scraped_at = new Date().toISOString();
      if (r.status === 'ok') {
        let data = extractProductData(r.html, url);
        // Soft-block anti-datacenter (classe perfumesclub, 2026-07-10): a sofarma
        // devolve 200 SEM JSON-LD/preço em ~45% dos pedidos da nuvem — ao vivo
        // a página tem preço e carrinho. Retry único com pausa, com ORÇAMENTO
        // por run (senão dobrava a duração): recupera a maioria; o resto fica
        // para o run seguinte (a lib agora carimba a verificação na mesma).
        if ((!data || !(data.price > 0)) && stats.retried < RETRY_BUDGET) {
          stats.retried++;
          await new Promise(s => setTimeout(s, 2500 + Math.random() * 2000));
          const r2 = await fetchPage(url);
          if (r2.status === 'ok') {
            const d2 = extractProductData(r2.html, url);
            if (d2 && (d2.price > 0 || !data)) { data = d2; if (d2.price > 0) stats.retry_ok++; }
          }
        }
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
        console.log(`  [${done}/${queue.length}] ok:${stats.ok} no_ld:${stats.no_jsonld} 404:${stats.not_found} err:${stats.error} · retry:${stats.retried}(+${stats.retry_ok}) · ${rate.toFixed(1)}/s · ETA ${Math.round(eta / 60)}m`);
      }
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (products.length === 0) { console.error('✗ 0 produtos (sitemap vazio/bloqueio de IP/site mudou?) — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  saveCheckpoint(products, false);

  // Stats finais
  const byCat = {};
  const withDisc = products.filter(p => p.status === 'ok' && p.previous_price).length;
  for (const p of products) {
    if (p.status === 'ok') byCat[p.category || 'unclassified'] = (byCat[p.category || 'unclassified'] || 0) + 1;
  }
  console.log(`\n══════ Sofarma scrape ══════`);
  console.log(`  Total: ${products.length}`);
  console.log(`  OK:    ${stats.ok}`);
  console.log(`  No JSON-LD: ${stats.no_jsonld}`);
  console.log(`  404:   ${stats.not_found}`);
  console.log(`  Erro:  ${stats.error}`);
  console.log(`  Com desconto activo: ${withDisc} (${stats.ok ? Math.round(100 * withDisc / stats.ok) : 0}%)`);
  console.log(`\n  Por categoria:`);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`    ${c.padEnd(14)} ${n}`));
  // em modo de ensaio (--limit) o catalogo nao e gravado — medi-lo rebentava
  if (fs.existsSync(OUT_FILE)) {
  console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
  } else {
    console.log(String.fromCharCode(10) + "[ensaio] catalogo de producao NAO escrito.");
  }
})();
