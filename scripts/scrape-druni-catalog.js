#!/usr/bin/env node
/**
 * SmartCart — Druni catalog scrape (full)
 * ============================================================
 *
 * Lê data/catalog/druni-urls.json (do discover-druni-catalog.js)
 * e visita cada PDP para extrair: nome, marca, EAN, variantes, preços, URL.
 *
 * Druni expõe JSON-LD Product com offers[] (1 entry por variant), MAS
 * o volume está apenas no DOM (tiles tipo Wells). Combinamos ambos:
 *  - JSON-LD: nome, marca, lista de preços (sem volume)
 *  - DOM: pares (volume_ml + price) extraídos via parseVolumePrice
 *
 * Features:
 *  - Checkpoint every 50 products
 *  - --resume retoma do checkpoint
 *  - --category=skincare filtra
 *  - --limit=N para testes
 *
 * Uso:
 *   node scripts/scrape-druni-catalog.js                          # tudo
 *   node scripts/scrape-druni-catalog.js --category=fragrance --limit=10 --headed
 *   node scripts/scrape-druni-catalog.js --resume
 */

const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  console.error('✗ playwright não instalado. Corre: npm install playwright && npx playwright install chromium');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const URL_LIST = path.join(CATALOG_DIR, 'druni-urls.json');
const OUT_FILE = path.join(CATALOG_DIR, 'druni-full.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const CATEGORY = args.category || null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
// Chunking: --chunk=N/M corre o slice [N-1, N) de M chunks alfabéticos.
// Ex: --chunk=1/3 corre primeiro terço; --chunk=2/3 segundo terço.
// Útil para dividir 4h em 3 runs de ~1h20min com checkpoints commitáveis.
const CHUNK = args.chunk || null;
const ALPHA_GROUPS = args.alpha || null; // ex: "a-f" ou "g-m"
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 1500;
const HEADED = !!args.headed;
const RESUME = !!args.resume;
const CHECKPOINT_EVERY = 50;
const TIMEOUT_MS = 25000;

if (!fs.existsSync(URL_LIST)) {
  console.error(`✗ ${URL_LIST} não existe. Corre primeiro:`);
  console.error('  node scripts/discover-druni-catalog.js');
  process.exit(1);
}

const urlList = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
let targets = urlList.urls;

if (CATEGORY) {
  targets = targets.filter(t => t.category === CATEGORY);
  console.log(`🔍 Filtro categoria=${CATEGORY}: ${targets.length} URLs`);
}

// ── Chunking ──
// Ordenação por slug (alfabética) → split determinístico
if (CHUNK || ALPHA_GROUPS) {
  targets = targets.slice().sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
}
if (CHUNK) {
  const m = CHUNK.match(/^(\d+)\/(\d+)$/);
  if (!m) { console.error('✗ --chunk inválido. Usa N/M, ex: 1/3'); process.exit(1); }
  const n = parseInt(m[1], 10), total = parseInt(m[2], 10);
  if (n < 1 || n > total) { console.error('✗ chunk fora do intervalo'); process.exit(1); }
  const size = Math.ceil(targets.length / total);
  const start = (n - 1) * size;
  const end = Math.min(start + size, targets.length);
  console.log(`📦 Chunk ${n}/${total}: ${start}..${end} (${end - start} URLs de ${targets.length} totais)`);
  targets = targets.slice(start, end);
}
if (ALPHA_GROUPS) {
  // ex: "a-f" → primeira letra do slug entre a e f
  const m = ALPHA_GROUPS.toLowerCase().match(/^([a-z])-([a-z])$/);
  if (!m) { console.error('✗ --alpha inválido. Usa formato a-f'); process.exit(1); }
  const [from, to] = [m[1], m[2]];
  targets = targets.filter(t => {
    const first = (t.slug || '').toLowerCase()[0] || 'z';
    return first >= from && first <= to;
  });
  console.log(`🔠 Alpha ${from}-${to}: ${targets.length} URLs`);
}

if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT);

// Resume
let existing = { products: [], stats: { ok: 0, blocked: 0, no_jsonld: 0, error: 0 } };
if (RESUME && fs.existsSync(OUT_FILE)) {
  existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  const scrapedUrls = new Set(existing.products.map(p => p.url));
  const before = targets.length;
  targets = targets.filter(t => !scrapedUrls.has(t.url));
  console.log(`▶ Resume: ${existing.products.length} já scraped, ${targets.length} restantes (de ${before})`);
} else {
  console.log(`📦 ${targets.length} produtos para scrapar (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)`);
}

// Extractor — corre dentro do browser
async function extract(page) {
  return await page.evaluate(() => {
    // ── JSON-LD ──
    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const allLd = ldScripts.flatMap(s => { try { const j = JSON.parse(s.textContent||'{}'); return Array.isArray(j)?j:[j]; } catch { return []; } });
    // Druni: ProductGroup + Product. Preferimos Product (tem offers).
    const productGroup = allLd.find(n => n?.['@type'] === 'ProductGroup');
    const product = allLd.find(n => n?.['@type'] === 'Product');
    const p = product || productGroup;

    // Image
    const imgEl = document.querySelector('meta[property="og:image"]') || document.querySelector('img[itemprop="image"]') || document.querySelector('.product-image img, .pdp-image img');
    const imgUrl = imgEl?.getAttribute('content') || imgEl?.getAttribute('src') || null;

    // JSON-LD offers (Druni format: 1 offer per variant, no volume)
    let offers = [];
    const raw = p?.offers;
    if (Array.isArray(raw)) offers = raw;
    else if (raw?.['@type'] === 'AggregateOffer' && Array.isArray(raw.offers)) offers = raw.offers;
    else if (raw && typeof raw === 'object') offers = [raw];

    const normOffers = offers.map(o => ({
      price: typeof o.price === 'number' ? o.price : (parseFloat(o.price) || null),
      currency: o.priceCurrency || 'EUR',
      availability: typeof o.availability === 'string' ? o.availability.split('/').pop() : null,
      sku: o.sku || null,
      url: o.url || null,
    })).filter(o => o.price !== null);

    // ── DOM variants — (volume_ml + price) pairs ──
    // Mesma lógica que Wells: scan elementos curtos com padrão "X ml ... €Y"
    // Reject per-unit prices "€X / 100 ml". Pick LOWEST price near volume
    // (Druni mostra strikethrough + current + per-unit; current é o mais baixo)
    const variants = [];
    const seen = new Set();
    // Variant context markers — produtos com estas palavras na proximidade NÃO
    // são variants do produto base (são refills, gift sets, etc. com EAN diferente).
    const VARIANT_EXCLUDE = /\b(recarga|refill|cofre|estuche|estuje|pack|set|kit|gift|conjunto|edicion limitada|limited edition|edição limitada|mini|sample|amostra)\b/i;

    function parseVolumePrice(txt) {
      if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) return null;
      if (/\bpor\s+(ml|l|g|kg)\b/i.test(txt)) return null;
      // Skip se o texto inclui palavras de variante distinta (Recarga, Refill, Cofre, ...)
      if (VARIANT_EXCLUDE.test(txt)) return null;
      const volM = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
      if (!volM) return null;
      const vol = parseFloat(volM[1].replace(',', '.'));
      const unit = volM[2].toLowerCase();
      if (!isFinite(vol)) return null;
      const priceMatches = [...txt.matchAll(/€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)];
      const prices = priceMatches.map(m => parseFloat((m[1]||m[2]).replace(',','.'))).filter(p => isFinite(p) && p > 0.5 && p < 5000);
      if (prices.length === 0) return null;
      // Proximidade
      const close = priceMatches.filter(m => {
        const d = Math.min(Math.abs(m.index - (volM.index + volM[0].length)), Math.abs(volM.index - (m.index + m[0].length)));
        return d <= 30;
      });
      if (close.length === 0) return null;
      const price = Math.min(...prices);
      const volMl = unit === 'l' ? vol * 1000 : vol;
      return { volMl, unit, price };
    }
    document.querySelectorAll('a, button, label, li, span, div').forEach(el => {
      if (el.children && el.children.length > 4) return;
      const txt = (el.innerText || el.textContent || '').trim();
      if (!txt || txt.length > 120) return;
      // Verificar também TEXTO DO PAI imediato (até 2 níveis) para apanhar
      // casos onde "Recarga" está num span vizinho e o preço noutro span.
      let ctxTxt = txt;
      try {
        let p = el.parentElement;
        for (let depth = 0; depth < 2 && p; depth++) {
          const ptxt = (p.innerText || p.textContent || '').trim();
          if (ptxt.length < 240) ctxTxt += ' ' + ptxt;
          p = p.parentElement;
        }
      } catch {}
      if (VARIANT_EXCLUDE.test(ctxTxt)) return;
      const parsed = parseVolumePrice(txt);
      if (!parsed) return;
      const { volMl, unit, price } = parsed;
      if (price <= 0.5 || price > 10000) return;
      if (volMl <= 0 || volMl > 5000) return;
      const key = `${volMl}${unit}|${price.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);
      variants.push({ volume_ml: volMl, unit, price, url: el.tagName === 'A' ? (el.href||null) : null });
    });

    // Sanity check: filtrar variants pelo range JSON-LD offers
    let filteredVariants = variants;
    if (normOffers.length > 0) {
      const ldPrices = normOffers.map(o => o.price);
      const lo = Math.min(...ldPrices) * 0.4;
      const hi = Math.max(...ldPrices) * 2;
      filteredVariants = variants.filter(v => v.price >= lo && v.price <= hi);
    }

    // DOM strikethrough — Druni expõe `.old-price > .price` quando há promo,
    // e `.special-price > .price` para o preço actual. Quando não há promo,
    // só existe um `.price` simples.
    function parseDruniPriceText(text) {
      // "296,25 €" → 296.25
      const m = (text || '').match(/([\d.]+,\d{2}|[\d.]+)/);
      if (!m) return null;
      const s = m[1].replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      return isFinite(n) ? n : null;
    }
    let previousPriceFromDom = null;
    // Procurar o "main product price block" — evita produtos relacionados
    const productInfo = document.querySelector('.product-info-main, .product-page-info, .product-essential, body');
    if (productInfo) {
      const oldPriceEl = productInfo.querySelector('.old-price .price, .old-price .price-wrapper');
      const specialPriceEl = productInfo.querySelector('.special-price .price, .product-info-price .price');
      const oldPrice = parseDruniPriceText(oldPriceEl?.textContent);
      const specialPrice = parseDruniPriceText(specialPriceEl?.textContent);
      if (oldPrice && specialPrice && oldPrice > specialPrice * 1.01) {
        previousPriceFromDom = oldPrice;
      }
    }

    return {
      name: p?.name || null,
      brand: typeof p?.brand === 'string' ? p.brand : p?.brand?.name || null,
      ean: p?.gtin13 || p?.gtin || null,
      description: p?.description?.slice(0, 300) || null,
      offers: normOffers,
      variants: filteredVariants,
      image_url: imgUrl,
      previous_price_dom: previousPriceFromDom,
    };
  });
}

function saveCheckpoint(allProducts, stats, final = false) {
  const out = {
    scraped_at: new Date().toISOString(),
    source: URL_LIST,
    in_progress: !final,
    stats: { total: allProducts.length, ...stats },
    products: allProducts,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
}

(async () => {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  if (targets.length === 0) { console.log('Nada para scrapar.'); process.exit(0); }

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    viewport: { width: 1366, height: 768 },
  });
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', r => r.abort());

  const allProducts = existing.products.slice();
  const stats = { ...existing.stats };
  let processed = 0;
  const startTime = Date.now();

  const queue = [...targets];
  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      if (!t) break;
      const page = await context.newPage();
      const startedAt = Date.now();
      try {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await page.waitForTimeout(1500);

        const title = await page.title().catch(() => '');
        if (/access denied|captcha|cloudflare|just a moment/i.test(title)) {
          stats.blocked = (stats.blocked||0) + 1;
          allProducts.push({ ...t, status: 'blocked_waf', latency_ms: Date.now()-startedAt });
          console.log(`  ⛔ ${t.slug.slice(0,40)} WAF`);
          await page.close(); continue;
        }

        const data = await extract(page);
        if (!data.name && data.variants.length === 0 && data.offers.length === 0) {
          stats.no_jsonld = (stats.no_jsonld||0) + 1;
          allProducts.push({ ...t, status: 'no_jsonld', latency_ms: Date.now()-startedAt });
          console.log(`  ⚠  ${t.slug.slice(0,40)} sem dados`);
          await page.close(); continue;
        }

        stats.ok = (stats.ok||0) + 1;
        // Pickar o preço MAIS BAIXO em stock (era offers[0] antes — escolhia
        // arbitrariamente uma variante).
        // IMPORTANTE: NÃO inferir previous_price do max-vs-min das ofertas.
        // Druni expõe AggregateOffer com offers diferentes por VOLUME (não por
        // promoção), por isso max-vs-min é o spread 100ml-vs-500ml — não é
        // strikethrough. previous_price só vem de priceSpecification.maxPrice
        // explícito (não disponível em Druni JSON-LD actualmente).
        const inStockOffers = (data.offers || []).filter(o =>
          o.price && (!o.availability || /InStock/i.test(o.availability))
        );
        const offerPool = inStockOffers.length ? inStockOffers : (data.offers || []).filter(o => o.price);
        const cheapestOffer = offerPool.length ? offerPool.reduce((a, b) => (b.price < a.price ? b : a)) : null;
        const cheapestPrice = cheapestOffer?.price ?? data.variants[0]?.price ?? null;
        allProducts.push({
          ...t,
          status: 'ok',
          scraped_at: new Date().toISOString(),
          name: data.name,
          brand: data.brand,
          ean: data.ean,
          description: data.description,
          image_url: data.image_url,
          price: cheapestPrice,
          previous_price: data.previous_price_dom || null,
          currency: cheapestOffer?.currency || 'EUR',
          in_stock: cheapestOffer ? true : (data.offers[0]?.availability ? /InStock/i.test(data.offers[0].availability) : true),
          variants: data.variants,
          latency_ms: Date.now()-startedAt,
        });
        processed++;
        if (processed % 20 === 0) {
          const rate = processed / ((Date.now()-startTime)/1000);
          console.log(`  ✓ ${processed} done · ${rate.toFixed(1)}/s · ${queue.length} left · ETA ${Math.round(queue.length/rate/60)}min`);
        }
        if (processed % CHECKPOINT_EVERY === 0) saveCheckpoint(allProducts, stats, false);
      } catch (e) {
        stats.error = (stats.error||0) + 1;
        allProducts.push({ ...t, status: 'error', error: e.message?.slice(0,200), latency_ms: Date.now()-startedAt });
        console.log(`  ✗ ${t.slug?.slice(0,40)} ${e.message?.slice(0,50)}`);
      } finally {
        await page.close().catch(()=>{});
      }
      await new Promise(r => setTimeout(r, DELAY_MS * (0.7 + Math.random() * 0.6)));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();

  saveCheckpoint(allProducts, stats, true);
  const totalSec = (Date.now()-startTime)/1000;
  console.log('\n═══════ Resumo ═══════');
  console.log(` Total: ${processed} processados`);
  console.log(` OK: ${stats.ok || 0}`);
  console.log(` Blocked (WAF): ${stats.blocked || 0}`);
  console.log(` Sem dados: ${stats.no_jsonld || 0}`);
  console.log(` Erros: ${stats.error || 0}`);
  console.log(` Tempo: ${(totalSec/60).toFixed(1)} min`);
  console.log(` Taxa: ${(processed/totalSec).toFixed(2)}/s`);
  console.log(`\n💾 ${OUT_FILE.replace(ROOT, '.')}`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
