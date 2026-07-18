#!/usr/bin/env node
/**
 * SmartCart — Wells catalog scrape (full)
 * ============================================================
 *
 * Lê data/catalog/wells-urls.json (output do discover-wells-catalog.js)
 * e visita cada PDP para extrair: nome, marca, EAN, variantes, preços, URL.
 *
 * Features:
 *  - Checkpoint: cada N produtos faz save parcial → podes parar e retomar
 *  - Filtro por categoria (--category=skincare)
 *  - Limit (--limit=100) para testes
 *  - Reusa lógica de extracção do scrape-prices.js (JSON-LD + DOM variants)
 *
 * Output:
 *   data/catalog/wells-full.json
 *   {
 *     scraped_at,
 *     stats: { total, ok, blocked, no_jsonld, error },
 *     products: [
 *       {
 *         url, slug, productId, category,
 *         scraped_at,
 *         name, brand, ean,
 *         price (preço default mostrado),
 *         variants: [{ volume_ml, unit, price, in_stock, url }],
 *         in_stock,
 *         image_url,
 *         status: 'ok' | 'blocked_waf' | 'no_jsonld' | 'error'
 *       }, ...
 *     ]
 *   }
 *
 * Uso:
 *   node scripts/scrape-wells-catalog.js                       # tudo
 *   node scripts/scrape-wells-catalog.js --category=skincare   # só categoria
 *   node scripts/scrape-wells-catalog.js --limit=50            # teste rápido
 *   node scripts/scrape-wells-catalog.js --resume              # retoma do checkpoint
 *   node scripts/scrape-wells-catalog.js --concurrency=3 --delay=1500
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
const URL_LIST = path.join(CATALOG_DIR, 'wells-urls.json');
const OUT_FILE = path.join(CATALOG_DIR, 'wells-full.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const CATEGORY = args.category || null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 1500;
const HEADED = !!args.headed;
const RESUME = !!args.resume;
const CHECKPOINT_EVERY = 50;
const TIMEOUT_MS = 25000;

if (!fs.existsSync(URL_LIST)) {
  console.error(`✗ ${URL_LIST} não existe. Corre primeiro:`);
  console.error('  node scripts/discover-wells-catalog.js');
  process.exit(1);
}

const urlList = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
let targets = urlList.urls;

if (CATEGORY) {
  targets = targets.filter(t => t.category === CATEGORY);
  console.log(`🔍 Filtro categoria=${CATEGORY}: ${targets.length} URLs`);
}
if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT);

// Resume: skip URLs já scrapadas
let existing = { products: [], stats: { total: 0, ok: 0, blocked: 0, no_jsonld: 0, error: 0 } };
if (RESUME && fs.existsSync(OUT_FILE)) {
  existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  const scrapedUrls = new Set(existing.products.map(p => p.url));
  const before = targets.length;
  targets = targets.filter(t => !scrapedUrls.has(t.url));
  console.log(`▶ Resume: ${existing.products.length} já scraped, ${targets.length} restantes (de ${before})`);
} else {
  console.log(`📦 ${targets.length} produtos para scrapar (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)`);
}

// Extractor — corre dentro do browser page.evaluate
async function extract(page) {
  return await page.evaluate(() => {
    // JSON-LD Product
    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const allLd = ldScripts.flatMap(s => { try { const j = JSON.parse(s.textContent||'{}'); return Array.isArray(j)?j:[j]; } catch { return []; } });
    const products = [];
    for (const node of allLd) {
      if (!node || typeof node !== 'object') continue;
      if (node['@type'] === 'Product') products.push(node);
      else if (Array.isArray(node['@graph'])) node['@graph'].forEach(g => { if (g?.['@type'] === 'Product') products.push(g); });
    }
    const p = products[0] || null;

    // Image
    const imgEl = document.querySelector('meta[property="og:image"]') || document.querySelector('img[itemprop="image"]') || document.querySelector('.product-image img, .pdp-image img, [class*="product-img"] img');
    const imgUrl = imgEl?.getAttribute('content') || imgEl?.getAttribute('src') || null;

    // JSON-LD offers
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
      name: o.name || null,
    })).filter(o => o.price !== null);

    // DOM variants (Wells expoem 30ml — €X,YY em links a[class*="variation-tile"])
    // VARIANT_EXCLUDE: textos com estas palavras NÃO são variants do produto base,
    // são SKUs distintos (refills, gift sets, packs).
    const VARIANT_EXCLUDE = /\b(recarga|refill|cofre|estuche|estuje|pack|set|kit|gift|conjunto|edicion limitada|limited edition|edição limitada|mini|sample|amostra)\b/i;
    const variants = [];
    const seen = new Set();
    const elements = document.querySelectorAll('a, button, label, li, span, div');
    elements.forEach(el => {
      if (el.children && el.children.length > 4) return;
      const txt = (el.innerText || el.textContent || '').trim();
      if (txt.length === 0 || txt.length > 120) return;
      if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) return; // per-unit
      if (/\bpor\s+(ml|l|g|kg)\b/i.test(txt)) return;
      if (VARIANT_EXCLUDE.test(txt)) return;
      // Verificar contexto pai (até 2 níveis) para apanhar casos onde "Recarga"
      // está num span vizinho e o preço noutro span.
      let ctxTxt = txt;
      try {
        let parent = el.parentElement;
        for (let depth = 0; depth < 2 && parent; depth++) {
          const ptxt = (parent.innerText || parent.textContent || '').trim();
          if (ptxt.length < 240) ctxTxt += ' ' + ptxt;
          parent = parent.parentElement;
        }
      } catch {}
      if (VARIANT_EXCLUDE.test(ctxTxt)) return;
      const volM = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
      if (!volM) return;
      // Preço EXATO por atributo primeiro: a Wells expõe content="6.59" no
      // elemento do preço (.js-w-sales-price-value). O texto renderizado separa
      // euros/cêntimos em spans e o scan de texto truncava (9,99→9; 48% do
      // catálogo — registo de correções #2/#3).
      let price = null;
      try {
        const pEl = el.querySelector('.js-w-sales-price-value[content], [itemprop="price"][content]');
        if (pEl) { const v = parseFloat(pEl.getAttribute('content')); if (isFinite(v) && v > 0.5 && v < 5000) price = v; }
      } catch {}
      if (price == null) {
        const priceMatches = [...txt.matchAll(/€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)];
        const prices = priceMatches.map(m => parseFloat((m[1]||m[2]).replace(',', '.'))).filter(p => isFinite(p) && p > 0.5 && p < 5000);
        if (prices.length === 0) return;
        price = Math.min(...prices); // current price (não strikethrough)
        // Sem confirmação por atributo, um preço inteiro é quase de certeza a
        // truncagem int/dec — descartar; o headline cai no JSON-LD, que é exato.
        if (Number.isInteger(price)) return;
      }
      const vol = parseFloat(volM[1].replace(',', '.'));
      const unit = volM[2].toLowerCase();
      const volMl = unit === 'l' ? vol * 1000 : vol;
      const key = `${volMl}${unit}|${price.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);
      variants.push({ volume_ml: volMl, unit, price, url: el.tagName === 'A' ? (el.href||null) : null });
    });

    // Filtrar variants pelo aggregate range
    let filteredVariants = variants;
    if (normOffers.length > 0) {
      const ldPrices = normOffers.map(o => o.price);
      const lo = Math.min(...ldPrices) * 0.4;
      const hi = Math.max(...ldPrices) * 2;
      filteredVariants = variants.filter(v => v.price >= lo && v.price <= hi);
    }

    // Defesa contra preço TRUNCADO: a Wells separa euros/cêntimos em spans
    // (.w-price-int / .w-price-dec). O scan de variantes pode apanhar só os
    // euros (7,98 € → 7). Descartamos a variante cujo preço inteiro é o floor
    // de um preço JSON-LD não-inteiro — o integrador reconstrói a variante a
    // partir do preço fiável do item (price/_jsonld_price).
    if (normOffers.length > 0) {
      const ldP = normOffers.map(o => o.price).filter(p => p > 0);
      filteredVariants = filteredVariants.filter(v =>
        !(Number.isInteger(v.price) && ldP.some(p => !Number.isInteger(p) && Math.floor(p) === v.price)));
    }

    // DOM strikethrough detection — Wells expõe:
    //   .w-sales-price → preço actual promocional
    //   .w-price-list  → preço lista/anterior (só visível quando há promo)
    // Funciona como fallback ao JSON-LD que só tem preço único.
    function parseWellsPrice(el) {
      if (!el) return null;
      const intEl = el.querySelector('.w-price-int');
      const decEl = el.querySelector('.w-price-dec');
      // Sem AMBAS as partes não há preço fiável: assumir 0 cêntimos quando o
      // span dos decimais falta foi o que truncou 48% do catálogo (9,99→9;
      // registo de correções #2, 2026-07-17). Devolver null faz o pipeline
      // cair no JSON-LD, que é sempre completo.
      if (!intEl || !decEl) return null;
      const intVal = parseInt((intEl.textContent || '').replace(/[^\d]/g, ''), 10);
      const decVal = parseInt((decEl.textContent || '').replace(/[^\d]/g, ''), 10);
      if (!isFinite(intVal) || !isFinite(decVal)) return null;
      return intVal + (decVal / 100);
    }
    const salesPriceEl = document.querySelector('.w-pdp-price-container .w-sales-price, .w-pdp-price .w-sales-price');
    const listPriceEl = document.querySelector('.w-pdp-price-container .w-price-list, .w-pdp-price .w-price-list');
    const domSalePrice = parseWellsPrice(salesPriceEl);
    const domListPrice = parseWellsPrice(listPriceEl);
    const previousPriceFromDom = (domListPrice && domSalePrice && domListPrice > domSalePrice * 1.01)
      ? domListPrice
      : null;

    return {
      name: p?.name || null,
      brand: typeof p?.brand === 'string' ? p.brand : p?.brand?.name || null,
      ean: p?.gtin13 || p?.gtin || null,
      description: p?.description?.slice(0, 300) || null,
      offers: normOffers,
      variants: filteredVariants,
      image_url: imgUrl,
      previous_price_dom: previousPriceFromDom,
      dom_sale_price: domSalePrice,
    };
  });
}

function saveCheckpoint(allProducts, stats, finalSave = false) {
  if (LIMIT !== Infinity) return; /* smoke-test (--limit) NÃO sobrescreve o catálogo de produção */
  if (finalSave && allProducts.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  const out = {
    scraped_at: new Date().toISOString(),
    source: URL_LIST,
    in_progress: !finalSave,
    stats: { total: allProducts.length, ...stats },
    products: allProducts,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
}

(async () => {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });

  if (targets.length === 0) {
    console.log('Nada para scrapar. Sai.');
    process.exit(0);
  }

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
  async function worker(id) {
    while (queue.length) {
      const t = queue.shift();
      if (!t) break;
      const page = await context.newPage();
      const startedAt = Date.now();
      try {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await page.waitForTimeout(1500);

        // Detect WAF
        const title = await page.title().catch(() => '');
        if (/access denied|captcha|cloudflare|just a moment/i.test(title)) {
          stats.blocked = (stats.blocked || 0) + 1;
          allProducts.push({ ...t, status: 'blocked_waf', latency_ms: Date.now() - startedAt });
          console.log(`  ⛔ ${t.productId} WAF`);
          await page.close();
          continue;
        }

        const data = await extract(page);
        if (!data.name && data.variants.length === 0 && data.offers.length === 0) {
          stats.no_jsonld = (stats.no_jsonld || 0) + 1;
          allProducts.push({ ...t, status: 'no_jsonld', latency_ms: Date.now() - startedAt });
          console.log(`  ⚠  ${t.productId} sem dados`);
          await page.close();
          continue;
        }

        stats.ok = (stats.ok || 0) + 1;
        // Pickar oferta MAIS BARATA in-stock. Sem previous_price auto-inference —
        // multi-offer no JSON-LD são VARIANTES (volumes), não strikethrough promo.
        const inStockOffers = (data.offers || []).filter(o =>
          o.price && (!o.availability || /InStock/i.test(o.availability))
        );
        const offerPool = inStockOffers.length ? inStockOffers : (data.offers || []).filter(o => o.price);
        const cheapestOffer = offerPool.length ? offerPool.reduce((a, b) => (b.price < a.price ? b : a)) : null;
        const cheapestPrice = cheapestOffer?.price ?? data.variants[0]?.price ?? null;
        // PRIORIDADE: DOM .w-sales-price (preço promocional displayed) > JSON-LD
        // — JSON-LD às vezes tem o preço lista, DOM tem o que utilizador vê.
        let finalPrice = data.dom_sale_price ?? cheapestPrice;
        // Assinatura de truncagem: DOM inteiro com JSON-LD não-inteiro de floor
        // igual (9 vs 9,99) → o JSON-LD é que está certo.
        if (finalPrice != null && Number.isInteger(finalPrice) && typeof cheapestPrice === 'number' &&
            !Number.isInteger(cheapestPrice) && Math.floor(cheapestPrice) === finalPrice) {
          finalPrice = cheapestPrice;
        }
        allProducts.push({
          ...t,
          status: 'ok',
          scraped_at: new Date().toISOString(),
          name: data.name,
          brand: data.brand,
          ean: data.ean,
          description: data.description,
          image_url: data.image_url,
          price: finalPrice,
          previous_price: data.previous_price_dom || null,
          _price_source: data.dom_sale_price ? 'dom' : 'jsonld',
          _jsonld_price: cheapestPrice,
          currency: cheapestOffer?.currency || 'EUR',
          in_stock: cheapestOffer ? true : (data.offers[0]?.availability ? /InStock/i.test(data.offers[0].availability) : true),
          variants: data.variants,
          latency_ms: Date.now() - startedAt,
        });
        processed++;
        if (processed % 20 === 0) {
          const rate = processed / ((Date.now() - startTime) / 1000);
          const remaining = queue.length;
          const eta = remaining / rate;
          console.log(`  ✓ ${processed} done · ${rate.toFixed(1)}/s · ETA ${Math.round(eta/60)}min · ${remaining} left`);
        }
        if (processed % CHECKPOINT_EVERY === 0) {
          saveCheckpoint(allProducts, stats, false);
        }
      } catch (e) {
        stats.error = (stats.error || 0) + 1;
        allProducts.push({ ...t, status: 'error', error: e.message?.slice(0, 200), latency_ms: Date.now() - startedAt });
        console.log(`  ✗ ${t.productId} ${e.message?.slice(0, 60)}`);
      } finally {
        await page.close().catch(() => {});
      }
      await new Promise(r => setTimeout(r, DELAY_MS * (0.7 + Math.random() * 0.6)));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);
  await browser.close();

  saveCheckpoint(allProducts, stats, true);

  const totalSec = (Date.now() - startTime) / 1000;
  console.log('\n═══════ Resumo ═══════');
  console.log(` Total processados: ${processed}`);
  console.log(` OK:                ${stats.ok}`);
  console.log(` Blocked (WAF):     ${stats.blocked || 0}`);
  console.log(` Sem dados:         ${stats.no_jsonld || 0}`);
  console.log(` Erros:             ${stats.error || 0}`);
  console.log(` Tempo total:       ${(totalSec/60).toFixed(1)} min`);
  console.log(` Taxa:              ${(processed/totalSec).toFixed(2)} produtos/s`);
  console.log(`\n💾 Output: ${OUT_FILE.replace(ROOT, '.')}`);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
