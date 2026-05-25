#!/usr/bin/env node
/**
 * SmartCart — Sweetcare full catalog scraper
 * ============================================================
 *
 * Lê data/catalog/sweetcare-urls.json e visita cada URL para extrair:
 *  - JSON-LD (Product / AggregateOffer com price + GTIN)
 *  - DOM variants (volume_ml + price pairs, com exclusão de Refill/Cofre)
 *  - og:image
 *
 * Output: data/catalog/sweetcare-full.json
 *
 * Uso:
 *   node scripts/scrape-sweetcare-catalog.js
 *   node scripts/scrape-sweetcare-catalog.js --category=skincare
 *   node scripts/scrape-sweetcare-catalog.js --chunk=1/3
 *   node scripts/scrape-sweetcare-catalog.js --resume
 *   node scripts/scrape-sweetcare-catalog.js --limit=10 --headed   # debug
 */

const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('✗ playwright não instalado'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const URL_LIST = path.join(ROOT, 'data', 'catalog', 'sweetcare-urls.json');
const OUT_FILE = path.join(ROOT, 'data', 'catalog', 'sweetcare-full.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const CATEGORY = args.category || null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 3;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 1500;
const HEADED = !!args.headed;
const RESUME = !!args.resume;
const CHUNK = args.chunk || null;
const CHECKPOINT_EVERY = 50;
const TIMEOUT_MS = 25000;

if (!fs.existsSync(URL_LIST)) {
  console.error(`✗ ${URL_LIST} não existe. Corre primeiro:`);
  console.error('  node scripts/discover-sweetcare-catalog.js');
  process.exit(1);
}

const urlList = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
let targets = urlList.urls;

if (CATEGORY) {
  targets = targets.filter(t => t.category === CATEGORY);
  console.log(`🔍 Filtro categoria=${CATEGORY}: ${targets.length} URLs`);
}

// Chunking determinístico
if (CHUNK) {
  targets = targets.slice().sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  const m = CHUNK.match(/^(\d+)\/(\d+)$/);
  if (!m) { console.error('✗ --chunk inválido. Usa N/M.'); process.exit(1); }
  const n = parseInt(m[1], 10), total = parseInt(m[2], 10);
  const size = Math.ceil(targets.length / total);
  const start = (n - 1) * size;
  const end = Math.min(start + size, targets.length);
  console.log(`📦 Chunk ${n}/${total}: ${start}..${end} (${end - start} URLs)`);
  targets = targets.slice(start, end);
}

if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT);

let existing = { products: [], stats: { ok: 0, blocked: 0, no_jsonld: 0, error: 0 } };
if (RESUME && fs.existsSync(OUT_FILE)) {
  existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  const done = new Set((existing.products || []).map(p => p.url));
  targets = targets.filter(t => !done.has(t.url));
  console.log(`▶ RESUME: ${existing.products.length} done, ${targets.length} restantes`);
}

console.log(`📊 ${targets.length} URLs · concurrency=${CONCURRENCY} · delay=${DELAY_MS}ms\n`);

const VARIANT_EXCLUDE = /\b(recarga|refill|cofre|estuche|estuje|pack|set|kit|gift|conjunto|edicion limitada|limited edition|edição limitada|mini|sample|amostra)\b/i;

async function scrapeProductPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  // Esperar até JSON-LD estar presente OU timeout 3s
  try {
    await page.waitForFunction(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      return scripts.length > 0 && [...scripts].some(s => s.textContent.includes('"Product"'));
    }, { timeout: 3000 });
  } catch { /* ignore — may be no JSON-LD */ }
  await page.waitForTimeout(500);

  return await page.evaluate(({ source, flags }) => {
    try {
    const VARIANT_EXCLUDE = new RegExp(source, flags);

    // JSON-LD — Sweetcare concatena múltiplos objects JSON num mesmo <script>
    // sem array wrapper (JSON.parse falha). Parser depth-aware para extrair cada
    // top-level object individualmente.
    function parseAllJsonObjects(text) {
      const results = [];
      let depth = 0, start = -1, inString = false, escape = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (c === '{') { if (depth === 0) start = i; depth++; }
        else if (c === '}') {
          depth--;
          if (depth === 0 && start >= 0) {
            try { results.push(JSON.parse(text.slice(start, i + 1))); } catch {}
            start = -1;
          }
        }
      }
      return results;
    }
    const ldScripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const ldJson = ldScripts.flatMap(s => parseAllJsonObjects(s.textContent));
    const allItems = [];
    for (const ld of ldJson) {
      if (Array.isArray(ld)) allItems.push(...ld);
      else if (ld?.['@graph'] && Array.isArray(ld['@graph'])) allItems.push(...ld['@graph']);
      else allItems.push(ld);
    }
    const products = allItems.filter(it =>
      it && (it['@type'] === 'Product' || (Array.isArray(it['@type']) && it['@type'].includes('Product')))
    );
    // Quando Sweetcare expõe múltiplos Product (uma por subtype/variante),
    // escolher o que tem o preço mais baixo das ofertas in-stock — esse é o
    // "current" promotional price que o utilizador vê. Antes pegávamos
    // products[0] que era frequentemente a variante mais cara.
    function getMinOfferPrice(prod) {
      const raw = prod?.offers;
      let offers = [];
      if (Array.isArray(raw)) offers = raw;
      else if (raw?.['@type'] === 'AggregateOffer' && Array.isArray(raw.offers)) offers = raw.offers;
      else if (raw && typeof raw === 'object') offers = [raw];
      const inStock = offers.filter(o => /in[_ ]?stock/i.test(o.availability || '') && o.price);
      const pool = inStock.length ? inStock : offers.filter(o => o.price);
      if (!pool.length) return Infinity;
      return Math.min(...pool.map(o => typeof o.price === 'number' ? o.price : parseFloat(o.price) || Infinity));
    }
    let p = products.length > 1
      ? products.reduce((a, b) => (getMinOfferPrice(b) < getMinOfferPrice(a) ? b : a))
      : products[0] || null;

    if (!p) return { name: null, ean: null, brand: null, offers: [], variants: [], image_url: null };

    // og:image fallback
    const imgEl = document.querySelector('meta[property="og:image"]');
    const imgUrl = (typeof p?.image === 'string' ? p.image : p?.image?.[0] || p?.image?.url)
      || imgEl?.getAttribute('content') || null;

    // Offers
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

    // DOM variants
    const variants = [];
    const seen = new Set();
    function parseVolumePrice(txt) {
      if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) return null;
      if (/\bpor\s+(ml|l|g|kg)\b/i.test(txt)) return null;
      if (VARIANT_EXCLUDE.test(txt)) return null;
      const volM = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
      if (!volM) return null;
      const vol = parseFloat(volM[1].replace(',', '.'));
      const unit = volM[2].toLowerCase();
      if (!isFinite(vol)) return null;
      const priceMatches = [...txt.matchAll(/€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)];
      const prices = priceMatches.map(m => parseFloat((m[1]||m[2]).replace(',','.'))).filter(p => isFinite(p) && p > 0.5 && p < 5000);
      if (prices.length === 0) return null;
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
      let ctxTxt = txt;
      try {
        let par = el.parentElement;
        for (let depth = 0; depth < 2 && par; depth++) {
          const ptxt = (par.innerText || par.textContent || '').trim();
          if (ptxt.length < 240) ctxTxt += ' ' + ptxt;
          par = par.parentElement;
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

    // Sanity check variants vs JSON-LD range
    let filteredVariants = variants;
    if (normOffers.length > 0) {
      const ldPrices = normOffers.map(o => o.price);
      const lo = Math.min(...ldPrices) * 0.4;
      const hi = Math.max(...ldPrices) * 2;
      filteredVariants = variants.filter(v => v.price >= lo && v.price <= hi);
    }

    // DOM strikethrough detection — Sweetcare expõe:
    //   .pvp  → preço actual (vendido a)
    //   .pvpR → preço recomendado (riscado) — só presente quando há promo
    // EXCLUIR áreas de produtos relacionados (sidebar "Os Mais Desejados"
    // tem dezenas de .pvp/.pvpR de produtos diferentes).
    function parseSweetcarePrice(text) {
      // "€ 42,75" → 42.75
      const m = (text || '').match(/(\d{1,4}(?:[.,]\d{1,2})?)/);
      return m ? parseFloat(m[1].replace(',', '.')) : null;
    }
    let previousPriceFromDom = null;
    // Sweetcare encapsula o preço do produto principal em .price-product
    // (NÃO .price-container — esse é dos relacionados). Estrutura:
    //   <div class="price-product" data-base-price="65.10" data-subtype="01">
    //     <span class="pvp">€ 65,10</span>
    //     <span class="pvpR">€ 100,15</span>
    //     <span class="label-promo">-35%</span>
    //   </div>
    // Excluímos os produtos relacionados via .productList-container etc.
    const priceBlocks = document.querySelectorAll('.price-product');
    for (const pc of priceBlocks) {
      if (pc.closest('.productList-container, .glide__slide, ul.glide__slides')) continue;
      // Preferir o subtype não-display:none (variante actualmente selecionada)
      if (pc.classList.contains('display-none')) continue;
      const pvpEl = pc.querySelector('.pvp');
      const pvpREl = pc.querySelector('.pvpR');
      if (!pvpEl || !pvpREl) continue;
      const current = parseSweetcarePrice(pvpEl.textContent);
      const previous = parseSweetcarePrice(pvpREl.textContent);
      if (current && previous && previous > current * 1.01) {
        previousPriceFromDom = previous;
        break;
      }
    }

    return {
      name: p?.name || null,
      brand: typeof p?.brand === 'string' ? p.brand : p?.brand?.name || null,
      ean: p?.gtin13 || p?.gtin || p?.gtin12 || null,
      description: p?.description?.slice(0, 300) || null,
      offers: normOffers,
      variants: filteredVariants,
      previous_price_dom: previousPriceFromDom,
      image_url: imgUrl,
    };
    } catch (e) {
      return { name: null, ean: null, brand: null, offers: [], variants: [], image_url: null, _debug: { err: e.message, stack: e.stack?.slice(0, 200) } };
    }
  }, { source: VARIANT_EXCLUDE.source, flags: VARIANT_EXCLUDE.flags });
}

function saveCheckpoint(allProducts, stats, final = false) {
  const out = {
    scraped_at: new Date().toISOString(),
    source: URL_LIST,
    in_progress: !final,
    total: allProducts.length,
    stats,
    products: allProducts,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  if (!final) console.log(`  💾 checkpoint: ${allProducts.length} produtos`);
}

(async () => {
  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'pt-PT',
    viewport: { width: 1366, height: 768 },
  });
  // Block images for speed
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', r => r.abort());

  const allProducts = [...(existing.products || [])];
  const stats = { ...(existing.stats || { ok: 0, blocked: 0, no_jsonld: 0, error: 0 }) };

  // Queue-based concurrency
  const queue = targets.slice();
  let scraped = 0;

  async function worker(id) {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) break;
      const page = await context.newPage();
      try {
        const data = await scrapeProductPage(page, t.url);
        if (data._debug) console.log(`  DBG ${t.slug.slice(0,40)}: ${JSON.stringify(data._debug)}`);
        if (!data.name && !data.ean) {
          stats.no_jsonld++;
          allProducts.push({ url: t.url, slug: t.slug, category: t.category, status: 'no-jsonld', scraped_at: new Date().toISOString() });
        } else {
          // Escolher OFERTA EM STOCK MAIS BARATA. Sem inferir previous_price
          // de max-vs-min — multi-offer em Sweetcare é multi-variant (subtype),
          // não strikethrough promo. previous_price só vem de strikethrough
          // explícito (TODO: extrair de data-base-price na próxima sessão).
          const inStockOffers = data.offers.filter(o =>
            /in[_ ]?stock/i.test(o.availability || '') && typeof o.price === 'number' && o.price > 0
          );
          const pool = inStockOffers.length > 0 ? inStockOffers : data.offers.filter(o => typeof o.price === 'number' && o.price > 0);
          const cheapest = pool.length > 0 ? pool.reduce((a, b) => (b.price < a.price ? b : a)) : null;
          stats.ok++;
          allProducts.push({
            url: t.url,
            slug: t.slug,
            category: t.category,
            status: 'ok',
            name: data.name,
            brand: data.brand,
            ean: data.ean,
            description: data.description,
            price: cheapest?.price || null,
            previous_price: data.previous_price_dom || null,
            in_stock: data.offers.some(o => /in[_ ]?stock/i.test(o.availability || '')),
            image_url: data.image_url,
            variants: data.variants,
            scraped_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        stats.error++;
        allProducts.push({ url: t.url, slug: t.slug, status: 'error', error: e.message.slice(0, 200), scraped_at: new Date().toISOString() });
      } finally {
        await page.close();
      }
      scraped++;
      if (scraped % 20 === 0) {
        console.log(`  [${scraped}/${queue.length + scraped}] ✓ok:${stats.ok} ⚠no-jsonld:${stats.no_jsonld} ✗err:${stats.error}`);
      }
      if (scraped % CHECKPOINT_EVERY === 0) saveCheckpoint(allProducts, stats);
      await new Promise(r => setTimeout(r, DELAY_MS + Math.random() * DELAY_MS * 0.3));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  await browser.close();

  saveCheckpoint(allProducts, stats, true);
  console.log(`\n═══════ Resumo ═══════`);
  console.log(`  OK:           ${stats.ok}`);
  console.log(`  Sem JSON-LD:  ${stats.no_jsonld}`);
  console.log(`  Erros:        ${stats.error}`);
  console.log(`  Total:        ${allProducts.length}`);
  console.log(`💾 ${OUT_FILE.replace(ROOT, '.')}`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
