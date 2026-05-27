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

    // ── VARIANTES REAIS — só de blocos .price-product do produto principal ──
    // Cada subtype/variante de volume tem o seu próprio .price-product com:
    //   data-base-price="X.YZ"
    //   data-subtype="01"
    //   data-full-description="Nome do produto 50mL"  (← volume aqui)
    //   .pvp → preço actual desta variante
    //   .pvpR → preço riscado (se houver promo)
    // Single-volume products têm 1 só .price-product. Multi-volume têm N.
    function parseVolumeFromText(txt) {
      if (!txt) return null;
      const m = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
      if (!m) return null;
      const v = parseFloat(m[1].replace(',', '.'));
      const u = m[2].toLowerCase();
      if (!isFinite(v) || v <= 0 || v > 5000) return null;
      return { volume_ml: u === 'l' ? v * 1000 : v, unit: u };
    }
    const filteredVariants = [];
    const seenVariants = new Set();
    document.querySelectorAll('.price-product').forEach(pc => {
      // Excluir SÓ produtos relacionados — variantes display-none são reais
      // (e.g. tamanho 1000mL escondido até user mudar selector). Queremos
      // todas as variantes de volume disponíveis.
      if (pc.closest('.productList-container, .glide__slide, ul.glide__slides')) return;
      // Preço da variante: prefer .pvp (DOM), fallback data-base-price
      let current = null;
      const pvpEl = pc.querySelector('.pvp');
      if (pvpEl) current = parseSweetcarePrice(pvpEl.textContent);
      if (!current) {
        const bp = parseFloat(pc.getAttribute('data-base-price') || '');
        if (isFinite(bp) && bp > 0) current = bp;
      }
      if (!current || current < 0.5 || current > 10000) return;
      // Volume: data-full-description está num elemento separado (p.product-initialDescription)
      // partilhando o mesmo data-subtype com o .price-product. Correlacionamos pelo subtype.
      const sub = pc.getAttribute('data-subtype');
      let fullDesc = pc.getAttribute('data-full-description') || '';
      if (!fullDesc && sub) {
        const matchEl = document.querySelector(`[data-subtype="${sub}"][data-full-description]`);
        if (matchEl) fullDesc = matchEl.getAttribute('data-full-description') || '';
      }
      const volInfo = parseVolumeFromText(fullDesc);
      if (!volInfo) return; // sem volume legível → ignorar (não é variante válida)
      const pvpREl = pc.querySelector('.pvpR');
      const prev = pvpREl ? parseSweetcarePrice(pvpREl.textContent) : null;
      const key = `${volInfo.volume_ml}${volInfo.unit}|${current.toFixed(2)}`;
      if (seenVariants.has(key)) return;
      seenVariants.add(key);
      filteredVariants.push({
        volume_ml: volInfo.volume_ml,
        unit: volInfo.unit,
        price: current,
        previous_price: (prev && prev > current * 1.01) ? prev : null,
        subtype: pc.getAttribute('data-subtype') || null,
        is_default: !pc.classList.contains('display-none'),
      });
    });
    // Ordenar por volume (ascendente) — melhor UX no front-end
    filteredVariants.sort((a, b) => (a.volume_ml || 0) - (b.volume_ml || 0));

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
    // ── PREÇO ACTUAL via DOM (.pvp) — AUTORITATIVO ──
    // O Sweetcare tem MÚLTIPLOS .price-product (um por variante/subtype).
    // O JSON-LD price corresponde frequentemente ao da variante principal
    // (default). Estratégia:
    //   1. Procurar o .price-product principal — não-related, não-hidden, e
    //      idealmente com data-base-price ≈ JSON-LD price (variante default)
    //   2. Dentro desse, .pvp é o preço actual mostrado ao utilizador,
    //      .pvpR (se existir) é o preço riscado/antigo.
    let currentPriceFromDom = null;
    let previousPriceFromDom = null;
    const jsonldPrice = normOffers.length
      ? Math.min(...normOffers.map(o => o.price).filter(Boolean))
      : null;

    function pickMainBlock(blocks) {
      const valid = [];
      for (const pc of blocks) {
        if (pc.closest('.productList-container, .glide__slide, ul.glide__slides')) continue;
        if (pc.classList.contains('display-none')) continue;
        if (!pc.querySelector('.pvp')) continue;
        valid.push(pc);
      }
      if (!valid.length) return null;
      // Se temos jsonldPrice, escolhe o bloco cujo data-base-price está mais próximo
      if (jsonldPrice && valid.length > 1) {
        const scored = valid.map(pc => {
          const bp = parseFloat(pc.getAttribute('data-base-price') || '');
          const dist = isFinite(bp) ? Math.abs(bp - jsonldPrice) : Infinity;
          return { pc, dist };
        }).sort((a, b) => a.dist - b.dist);
        if (scored[0].dist < jsonldPrice * 0.05) return scored[0].pc; // <5% diff = match
      }
      // Fallback: primeiro visível
      return valid[0];
    }

    const mainBlock = pickMainBlock(document.querySelectorAll('.price-product'));
    if (mainBlock) {
      const pvpEl = mainBlock.querySelector('.pvp');
      if (pvpEl) {
        const current = parseSweetcarePrice(pvpEl.textContent);
        if (current) currentPriceFromDom = current;
        const pvpREl = mainBlock.querySelector('.pvpR');
        if (pvpREl) {
          const previous = parseSweetcarePrice(pvpREl.textContent);
          if (previous && previous > current * 1.01) previousPriceFromDom = previous;
        }
      }
    }

    return {
      name: p?.name || null,
      brand: typeof p?.brand === 'string' ? p.brand : p?.brand?.name || null,
      ean: p?.gtin13 || p?.gtin || p?.gtin12 || null,
      description: p?.description?.slice(0, 300) || null,
      offers: normOffers,
      variants: filteredVariants,
      // DOM prices are AUTHORITATIVE — JSON-LD pode estar desactualizado
      current_price_dom: currentPriceFromDom,
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
          // PRIORIDADE de preço (importante!):
          //   1) DOM .pvp do bloco .price-product principal — é EXACTAMENTE
          //      o que o utilizador vê. JSON-LD muitas vezes tem o data-base-price
          //      (sem desconto) que NÃO bate certo com o site.
          //   2) Fallback: cheapest in-stock offer do JSON-LD
          const finalPrice = data.current_price_dom ?? (cheapest?.price || null);
          allProducts.push({
            url: t.url,
            slug: t.slug,
            category: t.category,
            status: 'ok',
            name: data.name,
            brand: data.brand,
            ean: data.ean,
            description: data.description,
            price: finalPrice,
            previous_price: data.previous_price_dom || null,
            // Debug: ver de onde veio o preço (para validar discrepâncias)
            _price_source: data.current_price_dom ? 'dom_pvp' : (cheapest ? 'jsonld_offers' : null),
            _jsonld_price: cheapest?.price || null,
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
