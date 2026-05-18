#!/usr/bin/env node
/**
 * SmartCart — Playwright-based price scraper (standalone, zero AI tokens)
 * ============================================================
 *
 * Lê os URLs verificados das inventories em data/inventory/*-verified.json,
 * corre Playwright headless em cada PDP, extrai JSON-LD com preço/stock/GTIN,
 * e escreve a snapshot em data/scraped/<YYYY-MM-DD>/<store>.json.
 *
 * Pipeline:
 *   1. fs.readdirSync(data/inventory) → cada *-verified.json
 *   2. Para cada item com `resolved_url`, abrir página + extrair JSON-LD
 *   3. Guardar resultado normalizado
 *   4. Resumo no terminal (verified/changed/blocked/errored)
 *
 * Pré-requisitos:
 *   npm install playwright
 *   npx playwright install chromium   ← descarrega ~120MB Chromium uma vez
 *
 * Uso:
 *   node scripts/scrape-prices.js                  # todas as lojas, todos os URLs
 *   node scripts/scrape-prices.js --store=wells    # só uma loja
 *   node scripts/scrape-prices.js --limit=5        # só 5 produtos por loja (teste)
 *   node scripts/scrape-prices.js --headed         # browser visível (debug)
 *   node scripts/scrape-prices.js --concurrency=3  # 3 PDPs em paralelo (default 2)
 *   node scripts/scrape-prices.js --delay=2000     # ms entre PDPs por contexto (default 1500)
 *
 * Output:
 *   data/scraped/2026-05-16/wells.json
 *   data/scraped/2026-05-16/_summary.json
 *
 * Comparado com Claude in Chrome MCP: ZERO tokens AI consumidos.
 */

const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('✗ playwright não está instalado. Corre:');
  console.error('  npm install playwright');
  console.error('  npx playwright install chromium');
  process.exit(1);
}

// jsdom é só necessário se usares --use-scrapingbee (lazy require mais abaixo)

// ── ScrapingBee config ──────────────────────────────────────────
// Lojas conhecidas por bloquear scraping directo (Cloudflare/DataDome/Akamai)
// → quando --use-scrapingbee passa, estas vão via API.
const BLOCKED_STORES = new Set(['atida', 'douglas', 'sephora', 'notino']);
const SCRAPINGBEE_API = 'https://app.scrapingbee.com/api/v1/';

function loadScrapingBeeKey() {
  // 1) env var
  if (process.env.SCRAPINGBEE_KEY) return process.env.SCRAPINGBEE_KEY.trim();
  // 2) ficheiro local
  const f = path.resolve(__dirname, '..', 'data', '.scrapingbee.key');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  return null;
}

const ROOT = path.resolve(__dirname, '..');
const INVENTORY_DIR = path.join(ROOT, 'data', 'inventory');
const OUTPUT_ROOT = path.join(ROOT, 'data', 'scraped');

// ---------------- CLI args ----------------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const STORE_FILTER = args.store || null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const HEADED = !!args.headed;
const CONCURRENCY = args.concurrency ? Math.max(1, Math.min(6, parseInt(args.concurrency, 10))) : 2;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 1500;
const STORE_TIMEOUT_MS = 25000;
const USE_SCRAPINGBEE = !!args['use-scrapingbee'];
const SKIP_BLOCKED = !!args['skip-blocked'];
// --max-age=24h ou --max-age=7d filtra produtos com verified_at mais velho que X
// Útil para CI: refresh diário só dos stale (poupa runtime + créditos SB).
const MAX_AGE_MS = (() => {
  const s = args['max-age'];
  if (!s) return null;
  const m = String(s).match(/^(\d+)(h|d|m)?$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2] || 'h';
  return n * (unit === 'd' ? 86400000 : unit === 'm' ? 60000 : 3600000);
})();
const SB_KEY = USE_SCRAPINGBEE ? loadScrapingBeeKey() : null;
if (USE_SCRAPINGBEE && !SB_KEY) {
  console.error('✗ --use-scrapingbee mas sem chave. Define SCRAPINGBEE_KEY ou cria data/.scrapingbee.key');
  process.exit(1);
}

// ---------------- Inventory loader ----------------

function loadInventories() {
  if (!fs.existsSync(INVENTORY_DIR)) {
    console.error('✗ Diretoria não existe:', INVENTORY_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(INVENTORY_DIR).filter(f => f.endsWith('-verified.json'));
  const out = [];
  for (const f of files) {
    let inv;
    try { inv = JSON.parse(fs.readFileSync(path.join(INVENTORY_DIR, f), 'utf8')); }
    catch { continue; }
    if (!inv?.store_slug || !Array.isArray(inv?.items)) continue;
    if (STORE_FILTER && inv.store_slug !== STORE_FILTER) continue;
    out.push(inv);
  }
  return out;
}

// ---------------- Extractor (corre dentro da página) ----------------

// ── Extractor partilhado (funciona em Playwright page OU jsdom document) ──
// Recebe um objecto `doc` com .querySelectorAll. Devolve a mesma shape
// que extractFromPage devolve via page.evaluate.
function extractFromDocument(doc) {
  const ldScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const allLd = ldScripts.flatMap(s => {
    try {
      const parsed = JSON.parse(s.textContent || '{}');
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { return []; }
  });
  const products = [];
  for (const node of allLd) {
    if (!node || typeof node !== 'object') continue;
    if (node['@type'] === 'Product') products.push(node);
    else if (Array.isArray(node['@graph'])) {
      node['@graph'].forEach(g => { if (g?.['@type'] === 'Product') products.push(g); });
    }
  }
  let p = products[0] || null;
  let jsonLdOffers = [];
  let aggregateLow = null, aggregateHigh = null;
  if (p) {
    const rawOffers = p.offers;
    if (Array.isArray(rawOffers)) jsonLdOffers = rawOffers;
    else if (rawOffers && typeof rawOffers === 'object') {
      if (rawOffers['@type'] === 'AggregateOffer') {
        aggregateLow = parseFloat(rawOffers.lowPrice) || null;
        aggregateHigh = parseFloat(rawOffers.highPrice) || null;
        if (Array.isArray(rawOffers.offers)) jsonLdOffers = rawOffers.offers;
        else jsonLdOffers = [{ price: rawOffers.lowPrice, priceCurrency: rawOffers.priceCurrency, availability: rawOffers.availability, name: p.name }];
      } else {
        jsonLdOffers = [rawOffers];
      }
    }
  }
  const normalizedJsonLd = jsonLdOffers.map(o => ({
    source: 'jsonld',
    price: typeof o.price === 'number' ? o.price : (parseFloat(o.price) || null),
    previousPrice: o.priceSpecification?.price && o.priceSpecification.priceType === 'https://schema.org/ListPrice'
      ? parseFloat(o.priceSpecification.price) : null,
    currency: o.priceCurrency || 'EUR',
    availability: typeof o.availability === 'string' ? o.availability.split('/').pop() : null,
    sku: o.sku || null,
    name: o.name || null,
  })).filter(o => o.price !== null);

  // DOM variants (Wells/Druni style)
  const domVariants = [];
  const seen = new Set();
  // Apanha (vol, unit) de qualquer match no texto + retorna o preço MAIS BAIXO
  // de todos os preços no texto (o mais baixo é o "atual" quando há strikethrough).
  // STRICT: vol e price têm de estar a ≤ ~25 chars de pelo menos um preço.
  function parseVolumePrice(txt) {
    // 🚫 Rejeitar preços-por-unidade
    if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) return null;
    if (/\bpor\s+(ml|l|g|kg|litro|grama)\b/i.test(txt)) return null;

    // Volume
    const volM = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
    if (!volM) return null;
    const vol = parseFloat(volM[1].replace(',', '.'));
    const unit = volM[2].toLowerCase();
    if (!isFinite(vol)) return null;

    // Todos os preços no texto
    const priceMatches = [...txt.matchAll(/€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)];
    const prices = priceMatches
      .map(m => parseFloat((m[1] || m[2]).replace(',', '.')))
      .filter(p => isFinite(p) && p > 0.5 && p < 5000);
    if (prices.length === 0) return null;

    // Proximidade: pelo menos UM preço tem de estar a ≤25 chars do volume
    const volPos = volM.index + volM[0].length;
    const volStart = volM.index;
    const close = priceMatches.filter(m => {
      const pStart = m.index;
      const pEnd = m.index + m[0].length;
      const distance = Math.min(Math.abs(pStart - volPos), Math.abs(volStart - pEnd));
      return distance <= 30;
    });
    if (close.length === 0) return null;

    // PREÇO MAIS BAIXO = preço actual (descarta strikethrough/old)
    const price = Math.min(...prices);
    return { volMl: unit === 'l' ? vol * 1000 : vol, unit, price };
  }
  const elements = doc.querySelectorAll('a, button, label, li, div, span');
  elements.forEach(el => {
    if (el.children && el.children.length > 4) return;
    const sources = [
      el.getAttribute && el.getAttribute('data-attr-value'),
      el.getAttribute && el.getAttribute('aria-label'),
      el.getAttribute && el.getAttribute('title'),
      // Em jsdom, innerText nem sempre existe — fallback p/ textContent
      (el.innerText !== undefined ? el.innerText : el.textContent),
    ].filter(Boolean).map(t => t.trim()).filter(t => t.length > 0 && t.length < 120);
    for (const txt of sources) {
      const parsed = parseVolumePrice(txt);
      if (!parsed) continue;
      const { volMl, unit, price } = parsed;
      if (price <= 0.5 || price > 10000) continue;
      if (volMl <= 0 || volMl > 5000) continue;
      const key = `${volMl}${unit}|${price.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      domVariants.push({
        source: 'dom', volume: volMl, unit, price,
        url: el.tagName === 'A' ? (el.href || null) : null,
        raw: txt.slice(0, 80),
      });
      break;
    }
  });

  // ── Fallback 1: Microdata schema.org (Sephora) ───────────────────────────
  // <meta itemprop="price" content="75"><meta itemprop="priceCurrency" content="EUR">
  // Tipicamente num container <div itemtype="schema.org/Product"> ou <li> com variantes
  let fallbackUsed = null;
  if (normalizedJsonLd.length === 0) {
    const microPriceEls = Array.from(doc.querySelectorAll('meta[itemprop="price"]'));
    const microVariants = [];
    for (const priceEl of microPriceEls) {
      const price = parseFloat((priceEl.getAttribute('content') || '').replace(',', '.'));
      if (!isFinite(price) || price <= 0) continue;
      // Procurar o container Product mais próximo e extrair nome/SKU/currency
      let parent = priceEl.parentElement;
      let name = null, currency = 'EUR', sku = null, availability = null;
      for (let depth = 0; parent && depth < 6; depth++) {
        const nameEl = parent.querySelector('meta[itemprop="name"], [itemprop="name"]');
        if (nameEl && !name) name = nameEl.getAttribute('content') || nameEl.textContent?.trim();
        const curEl = parent.querySelector('meta[itemprop="priceCurrency"]');
        if (curEl) currency = curEl.getAttribute('content') || currency;
        const skuEl = parent.querySelector('meta[itemprop="sku"], [itemprop="sku"]');
        if (skuEl && !sku) sku = skuEl.getAttribute('content') || skuEl.textContent?.trim();
        const availEl = parent.querySelector('[itemprop="availability"], link[itemprop="availability"]');
        if (availEl && !availability) availability = availEl.getAttribute('href') || availEl.getAttribute('content');
        if (name) break;
        parent = parent.parentElement;
      }
      microVariants.push({
        source: 'microdata',
        price, previousPrice: null, currency,
        availability: availability ? (availability.includes('InStock') || availability.includes('in_stock') ? 'InStock' : 'OutOfStock') : null,
        sku, name,
      });
    }
    if (microVariants.length > 0) {
      microVariants.forEach(v => normalizedJsonLd.push(v));
      fallbackUsed = 'microdata';
    }
  }

  // ── Fallback 2: Open Graph meta tags (alguns Shopify, woocommerce) ──────
  let ogPriceOffer = null;
  if (normalizedJsonLd.length === 0) {
    const getMeta = (prop) => {
      const el = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      return el?.getAttribute('content') || null;
    };
    const ogPrice = parseFloat((getMeta('product:price:amount') || getMeta('og:price:amount') || getMeta('twitter:data1') || '').replace(',', '.'));
    const ogCurrency = getMeta('product:price:currency') || getMeta('og:price:currency') || 'EUR';
    const ogName = getMeta('og:title') || getMeta('twitter:title');
    if (isFinite(ogPrice) && ogPrice > 0) {
      ogPriceOffer = {
        source: 'og-meta',
        price: ogPrice, previousPrice: null, currency: ogCurrency,
        availability: 'InStock', sku: null, name: ogName,
      };
      normalizedJsonLd.push(ogPriceOffer);
      fallbackUsed = 'og-meta';
    }
  }

  // ── Fallback 3: scan elementos com class*="price" (Douglas-style) ───────
  // Para lojas onde volumes e preços estão em containers separados.
  // A URL já é por variante, então só precisamos da price principal da página.
  if (normalizedJsonLd.length === 0) {
    const priceContainers = doc.querySelectorAll(
      '[class*="price" i]:not([class*="old" i]):not([class*="strike" i]):not([class*="crossed" i]):not([class*="initial" i]):not([class*="recommended" i]):not([class*="msrp" i])'
    );
    const prices = [];
    for (const el of priceContainers) {
      if (el.children && el.children.length > 3) continue;
      const txt = (el.innerText !== undefined ? el.innerText : el.textContent || '').trim().replace(/\s+/g, ' ');
      // Rejeitar texto com per-unit
      if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) continue;
      // Match preço limpo: "€ 79,99" ou "79,99 €" (tolerante a whitespace)
      const m = txt.match(/^\s*(?:€\s*)?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€)?\s*$/);
      if (m) {
        const price = parseFloat(m[1].replace(',', '.'));
        if (price > 1 && price < 1000) prices.push({ price, txt });
      }
    }
    if (prices.length > 0) {
      // Pega na mediana — descarta old prices e crossed-out potenciais que escapem
      prices.sort((a, b) => a.price - b.price);
      const med = prices[Math.floor(prices.length / 2)];
      normalizedJsonLd.push({
        source: 'price-class-scan',
        price: med.price, previousPrice: null, currency: 'EUR',
        availability: 'InStock', sku: null, name: null,
      });
      fallbackUsed = 'price-class-scan';
    }
  }

  // ── Sanity check: filtrar DOM variants pelo range JSON-LD aggregate ─────
  // (rejeita falsos positivos como "50 ml ... voucher €1800")
  let filteredDomVariants = domVariants;
  if (aggregateLow != null && isFinite(aggregateLow)) {
    const lo = aggregateLow * 0.4;
    const hi = (aggregateHigh && isFinite(aggregateHigh)) ? aggregateHigh * 2 : aggregateLow * 8;
    filteredDomVariants = domVariants.filter(v => v.price >= lo && v.price <= hi);
  } else if (normalizedJsonLd.length > 0) {
    // Sem aggregate: usa min/max dos JSON-LD offers como referência
    const ldPrices = normalizedJsonLd.map(o => o.price).filter(p => isFinite(p));
    if (ldPrices.length) {
      const lo = Math.min(...ldPrices) * 0.4;
      const hi = Math.max(...ldPrices) * 2;
      filteredDomVariants = domVariants.filter(v => v.price >= lo && v.price <= hi);
    }
  } else {
    // ── Sem JSON-LD (Douglas-style): dedup por volume usando MEDIANA ──
    // Para cada volume, agrupa todas as candidatas e fica com o mediana.
    // Mata outliers extremos (€1800 quando os outros são €50-100).
    const byVol = {};
    for (const v of domVariants) {
      const k = `${v.volMl ?? v.volume}|${v.unit}`;
      (byVol[k] ||= []).push(v);
    }
    const reps = [];
    for (const arr of Object.values(byVol)) {
      arr.sort((a, b) => a.price - b.price);
      // Mediana: para 1-2 elementos pega no min; para 3+ usa o do meio
      const rep = arr.length <= 2 ? arr[0] : arr[Math.floor(arr.length / 2)];
      // Filtrar outliers absolutos: se rep < 1€ ou > 1000€, ignorar
      if (rep.price >= 1 && rep.price <= 1000) reps.push(rep);
    }
    filteredDomVariants = reps;
  }

  return {
    ok: normalizedJsonLd.length > 0 || filteredDomVariants.length > 0,
    reason: (normalizedJsonLd.length === 0 && filteredDomVariants.length === 0) ? 'no_jsonld_no_dom' : null,
    gtin13: p?.gtin13 || p?.gtin || null,
    brand: p ? (typeof p.brand === 'string' ? p.brand : p.brand?.name || null) : null,
    name: p?.name || getMetaSafe(doc, 'og:title') || null,
    offers: normalizedJsonLd,
    domVariants: filteredDomVariants,
    domVariantsRaw: domVariants, // p/ debug
    aggregateLow,
    aggregateHigh,
    fallbackUsed,
  };
}

// Helper para apanhar meta tag de forma segura
function getMetaSafe(doc, prop) {
  try {
    const el = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    return el?.getAttribute('content') || null;
  } catch { return null; }
}

// ── Fetch HTML via ScrapingBee + parse com jsdom ──────────────────────────
async function scrapeViaScrapingBee(targetUrl) {
  const { JSDOM } = require('jsdom');
  const params = new URLSearchParams({
    api_key: SB_KEY,
    url: targetUrl,
    render_js: 'true',
    premium_proxy: 'true',
    country_code: 'pt',
    wait: '4000', // 4s — dá tempo a Sephora hidratar conteúdo via JS
    block_resources: 'true',
  });
  const apiUrl = `${SCRAPINGBEE_API}?${params.toString()}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`ScrapingBee HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const html = await resp.text();
  const dom = new JSDOM(html);
  return extractFromDocument(dom.window.document);
}

async function extractFromPage(page) {
  return await page.evaluate(() => {
    // ──────────────────────────────────────────────────────────────
    // 1) JSON-LD Product schema (Notino, Atida, Sephora, Farmácia365…)
    // ──────────────────────────────────────────────────────────────
    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const allLd = ldScripts.flatMap(s => {
      try {
        const parsed = JSON.parse(s.textContent || '{}');
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch { return []; }
    });
    const products = [];
    for (const node of allLd) {
      if (!node || typeof node !== 'object') continue;
      if (node['@type'] === 'Product') products.push(node);
      else if (Array.isArray(node['@graph'])) {
        node['@graph'].forEach(g => { if (g?.['@type'] === 'Product') products.push(g); });
      }
    }
    let p = products[0] || null;
    let jsonLdOffers = [];
    let aggregateLow = null, aggregateHigh = null;
    if (p) {
      const rawOffers = p.offers;
      if (Array.isArray(rawOffers)) jsonLdOffers = rawOffers;
      else if (rawOffers && typeof rawOffers === 'object') {
        if (rawOffers['@type'] === 'AggregateOffer') {
          aggregateLow = parseFloat(rawOffers.lowPrice) || null;
          aggregateHigh = parseFloat(rawOffers.highPrice) || null;
          if (Array.isArray(rawOffers.offers)) jsonLdOffers = rawOffers.offers;
          else jsonLdOffers = [{ price: rawOffers.lowPrice, priceCurrency: rawOffers.priceCurrency, availability: rawOffers.availability, name: p.name }];
        } else {
          jsonLdOffers = [rawOffers];
        }
      }
    }
    const normalizedJsonLd = jsonLdOffers.map(o => ({
      source: 'jsonld',
      price: typeof o.price === 'number' ? o.price : (parseFloat(o.price) || null),
      previousPrice: o.priceSpecification?.price && o.priceSpecification.priceType === 'https://schema.org/ListPrice'
        ? parseFloat(o.priceSpecification.price) : null,
      currency: o.priceCurrency || 'EUR',
      availability: typeof o.availability === 'string' ? o.availability.split('/').pop() : null,
      sku: o.sku || null,
      name: o.name || null,
    })).filter(o => o.price !== null);

    // ──────────────────────────────────────────────────────────────
    // 2) DOM variant scraping — varre TODOS os elementos interactivos
    //    pequenos e filtra pelos que têm padrão "VOL UNIT €PRICE".
    //    Mais robusto que selectors CSS por classe (que mudam por loja).
    // ──────────────────────────────────────────────────────────────
    const domVariants = [];
    const seen = new Set();

    // Extrai (vol, unit, price) de texto curto.
    // Quando texto tem múltiplos preços (e.g. tile com strikethrough + current),
    // retorna o LOWEST (preço atual). Rejeita per-unit prices "/100 ml".
    function parseVolumePrice(txt) {
      // Rejeitar per-unit
      if (/\/\s*\d*\s*(ml|gr|g|kg|l)\b/i.test(txt)) return null;
      if (/\bpor\s+(ml|l|g|kg|litro|grama)\b/i.test(txt)) return null;

      const volM = txt.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
      if (!volM) return null;
      const vol = parseFloat(volM[1].replace(',', '.'));
      const unit = volM[2].toLowerCase();
      if (!isFinite(vol)) return null;

      const priceMatches = [...txt.matchAll(/€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)];
      const prices = priceMatches.map(m => parseFloat((m[1]||m[2]).replace(',','.'))).filter(p => isFinite(p) && p > 0.5 && p < 5000);
      if (prices.length === 0) return null;

      // Proximidade: pelo menos 1 preço perto do volume
      const volPos = volM.index + volM[0].length;
      const volStart = volM.index;
      const close = priceMatches.filter(m => {
        const d = Math.min(Math.abs(m.index - volPos), Math.abs(volStart - (m.index + m[0].length)));
        return d <= 30;
      });
      if (close.length === 0) return null;

      // Preço mais baixo = actual (strikethrough sempre maior)
      const price = Math.min(...prices);
      const volMl = unit === 'l' ? vol * 1000 : vol;
      return { volMl, unit, price };
    }

    const elements = document.querySelectorAll('a, button, label, li, div, span');
    elements.forEach(el => {
      if (el.children.length > 4) return;
      const sources = [
        el.getAttribute('data-attr-value'),
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.innerText, // innerText respeita CSS (skips display:none)
      ].filter(Boolean).map(t => t.trim()).filter(t => t.length > 0 && t.length < 120);

      for (const txt of sources) {
        const parsed = parseVolumePrice(txt);
        if (!parsed) continue;
        const { volMl, unit, price } = parsed;
        if (price <= 0.5 || price > 10000) continue;
        if (volMl <= 0 || volMl > 5000) continue;
        const key = `${volMl}${unit}|${price.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        domVariants.push({
          source: 'dom',
          volume: volMl,
          unit,
          price,
          url: el.tagName === 'A' ? el.href : null,
          raw: txt.slice(0, 80),
        });
        break;
      }
    });

    return {
      ok: normalizedJsonLd.length > 0 || domVariants.length > 0,
      reason: (normalizedJsonLd.length === 0 && domVariants.length === 0) ? 'no_jsonld_no_dom' : null,
      gtin13: p?.gtin13 || p?.gtin || null,
      brand: p ? (typeof p.brand === 'string' ? p.brand : p.brand?.name || null) : null,
      name: p?.name || null,
      offers: normalizedJsonLd,
      domVariants,
      aggregateLow,
      aggregateHigh,
    };
  });
}

// ---------------- Main ----------------

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(OUTPUT_ROOT, today);
  fs.mkdirSync(outDir, { recursive: true });

  const inventories = loadInventories();
  console.log(`📦 Inventories carregadas: ${inventories.map(i => i.store_slug).join(', ')}`);
  console.log(`⚙  Config: concurrency=${CONCURRENCY} · delay=${DELAY_MS}ms · headed=${HEADED} · limit=${LIMIT===Infinity?'∞':LIMIT}`);
  console.log('');

  const browser = await chromium.launch({
    headless: !HEADED,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--lang=pt-PT',
    ],
  });

  const summary = { date: today, stats: {}, errors: [] };

  for (const inv of inventories) {
    const isBlocked = BLOCKED_STORES.has(inv.store_slug);

    // --skip-blocked: pular completamente lojas conhecidas como WAF
    if (SKIP_BLOCKED && isBlocked) {
      console.log(`\n⏭  ${inv.store_slug}: skip (--skip-blocked)`);
      continue;
    }

    let targets = inv.items
      .filter(it => it.resolved_url && /^https?:\/\//.test(it.resolved_url));
    // --max-age: filtra produtos com verified_at recente (poupa runtime)
    if (MAX_AGE_MS != null) {
      const cutoff = Date.now() - MAX_AGE_MS;
      const before = targets.length;
      targets = targets.filter(it => {
        if (!it.verified_at) return true; // sem timestamp → considera stale
        return new Date(it.verified_at).getTime() < cutoff;
      });
      const skipped = before - targets.length;
      if (skipped > 0) console.log(`   (--max-age skip: ${skipped} produtos frescos)`);
    }
    targets = targets.slice(0, LIMIT);

    if (targets.length === 0) {
      console.log(`⏭  ${inv.store_slug}: sem URLs para scrapar — skip`);
      continue;
    }

    const useSB = USE_SCRAPINGBEE && isBlocked;
    const tag = useSB ? ' 🐝 via ScrapingBee' : '';
    console.log(`\n🏬 ${inv.store_name || inv.store_slug} — ${targets.length} produtos${tag}`);
    console.log('   ' + '─'.repeat(60));

    const context = await browser.newContext({
      // UA real Chrome 131 em Windows (mais recente, menos suspeito)
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      // Headers HTTP completos como Chrome real
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // Anti-detection: esconder navigator.webdriver e outras flags de automação
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-PT', 'pt', 'en-US', 'en'] });
      // Chrome runtime stub
      window.chrome = { runtime: {}, app: {}, csi: () => ({}), loadTimes: () => ({}) };
      // Esconder Playwright-specific properties
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );
    });

    // bloquear apenas imagens (fonts podem afectar render de variantes E são sinal de bot bloqueá-las)
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', r => r.abort());

    const stats = { ok: 0, blocked: 0, no_jsonld: 0, error: 0 };
    const results = [];

    // worker pool simples
    const queue = [...targets];
    async function worker(id) {
      while (queue.length) {
        const t = queue.shift();
        if (!t) break;
        const startedAt = Date.now();
        let page = null;
        let extracted = null;
        try {
          if (useSB) {
            // ── Path ScrapingBee (lojas bloqueadas) ──────────────
            extracted = await scrapeViaScrapingBee(t.resolved_url);
          } else {
            // ── Path Playwright (lojas funcionais) ───────────────
            page = await context.newPage();
            await page.goto(t.resolved_url, { waitUntil: 'domcontentloaded', timeout: STORE_TIMEOUT_MS });
            await page.waitForTimeout(2500);
            await Promise.race([
              page.waitForSelector('[class*="variation"], [data-attr-value], [class*="variant" i]', { timeout: 1500 }),
              page.waitForTimeout(1500),
            ]).catch(() => {});

            // Retry após WAF transitório
            const earlyTitle = await page.title().catch(() => '');
            const earlyBody = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '').catch(() => '');
            if (/access denied|captcha|verify you are human|cloudflare|datadome|just a moment|attention required/i.test(earlyTitle + ' ' + earlyBody)) {
              await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));
              await page.goto(t.resolved_url, { waitUntil: 'domcontentloaded', timeout: STORE_TIMEOUT_MS }).catch(() => {});
              await page.waitForTimeout(3500);
            }

            // Detecção final de WAF
            const title = await page.title().catch(() => '');
            const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '').catch(() => '');
            const isWaf = /access denied|captcha|verify you are human|cloudflare|datadome/i.test(title + ' ' + bodyText);
            if (isWaf) {
              stats.blocked++;
              results.push({ ean: t.ean, url: t.resolved_url, status: 'blocked_waf', latency_ms: Date.now() - startedAt });
              console.log(`   ⛔ ${t.ean} WAF block`);
              await page.close();
              continue;
            }

            extracted = await extractFromPage(page);
          }
          // ── A partir daqui o tratamento é igual ──
          if (!extracted.ok) {
            stats.no_jsonld++;
            results.push({ ean: t.ean, url: t.resolved_url, status: 'no_jsonld', reason: extracted.reason, latency_ms: Date.now() - startedAt });
            console.log(`   ⚠  ${t.ean} sem JSON-LD`);
          } else {
            // ─── Estratégia de selecção da oferta ─────────────────────
            // 1) Variante DOM que match exactamente o volume esperado
            // 2) Oferta JSON-LD com o volume no nome
            // 3) Variante DOM mais próxima do volume
            // 4) Oferta JSON-LD única (sem ambiguidade)
            // 5) Fallback: cheapest in stock
            // ──────────────────────────────────────────────────────────
            const expectedVolume = t.expected_volume_ml;
            let bestOffer = null;
            let matchMethod = null;

            // 1) DOM exact
            if (expectedVolume && extracted.domVariants?.length) {
              const exact = extracted.domVariants.find(v => Math.abs(v.volume - expectedVolume) < 0.5);
              if (exact) {
                bestOffer = { price: exact.price, previousPrice: null, currency: 'EUR', availability: 'InStock', sku: null, name: `${exact.volume}${exact.unit}` };
                matchMethod = 'dom_exact';
              }
            }

            // 2) JSON-LD name match
            if (!bestOffer && expectedVolume && extracted.offers.length) {
              const byName = extracted.offers.find(o => o.name && new RegExp(`\\b${expectedVolume}\\s*ml\\b`, 'i').test(o.name));
              if (byName) { bestOffer = byName; matchMethod = 'jsonld_name'; }
            }

            // 3) DOM closest
            if (!bestOffer && expectedVolume && extracted.domVariants?.length) {
              const closest = [...extracted.domVariants].sort((a, b) => Math.abs(a.volume - expectedVolume) - Math.abs(b.volume - expectedVolume))[0];
              const distance = Math.abs(closest.volume - expectedVolume);
              if (distance / expectedVolume <= 0.3) { // dentro de 30%
                bestOffer = { price: closest.price, previousPrice: null, currency: 'EUR', availability: 'InStock', sku: null, name: `${closest.volume}${closest.unit}` };
                matchMethod = 'dom_closest';
              }
            }

            // 4) JSON-LD único
            if (!bestOffer && extracted.offers.length === 1) {
              bestOffer = extracted.offers[0];
              matchMethod = 'jsonld_single';
            }

            // 5) Fallback: cheapest in stock
            if (!bestOffer && extracted.offers.length) {
              const inStock = extracted.offers.filter(o => !o.availability || /InStock/i.test(o.availability));
              bestOffer = (inStock.length ? inStock : extracted.offers).sort((a,b) => a.price - b.price)[0];
              matchMethod = 'fallback_cheapest';
            }
            stats.ok++;
            const prev = inv.items.find(it => it.ean === t.ean);
            const oldPrice = prev?.observed_price ?? null;
            const newPrice = bestOffer?.price ?? null;
            const delta = (oldPrice != null && newPrice != null) ? (newPrice - oldPrice) : null;
            const arrow = delta == null ? '·' : delta > 0 ? '↑' : delta < 0 ? '↓' : '=';
            results.push({
              ean: t.ean,
              url: t.resolved_url,
              status: 'ok',
              scraped_at: new Date().toISOString(),
              gtin_observed: extracted.gtin13,
              brand_observed: extracted.brand,
              name_observed: extracted.name,
              expected_volume_ml: expectedVolume,
              match_method: matchMethod,
              best_offer: bestOffer,
              all_offers: extracted.offers,
              dom_variants: extracted.domVariants,
              previous_price: oldPrice,
              delta,
              latency_ms: Date.now() - startedAt,
            });
            const methodTag = matchMethod === 'dom_exact' ? '[dom✓]'
              : matchMethod === 'jsonld_name' ? '[ld✓]'
              : matchMethod === 'dom_closest' ? '[dom~]'
              : matchMethod === 'jsonld_single' ? '[ld·1]'
              : '[??]';
            const domHint = extracted.domVariants?.length ? ` (${extracted.domVariants.length} variants DOM)` : '';
            console.log(`   ✓  ${t.ean} ${methodTag.padEnd(7)} ${newPrice?.toFixed(2)+'€'} ${arrow}${delta?Math.abs(delta).toFixed(2)+'€':''}  ${extracted.name?.slice(0,50)||''}${domHint}`);
          }
        } catch (e) {
          stats.error++;
          results.push({ ean: t.ean, url: t.resolved_url, status: 'error', error: e.message?.slice(0, 200), latency_ms: Date.now() - startedAt });
          console.log(`   ✗  ${t.ean} ${e.message?.split('\n')[0]?.slice(0, 80)}`);
          summary.errors.push({ store: inv.store_slug, ean: t.ean, error: e.message?.slice(0,200) });
        } finally {
          if (page) await page.close().catch(() => {});
        }
        // delay com jitter (±40%) para não parecer bot a ritmo constante
        const jitter = DELAY_MS * (0.6 + Math.random() * 0.8);
        await new Promise(r => setTimeout(r, jitter));
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
    await Promise.all(workers);
    await context.close();

    // escrever ficheiro da loja
    const storeOut = {
      store_slug: inv.store_slug,
      store_name: inv.store_name,
      scraped_at: new Date().toISOString(),
      method: 'playwright-headless-jsonld',
      stats,
      total: targets.length,
      results,
    };
    const storeFile = path.join(outDir, `${inv.store_slug}.json`);
    fs.writeFileSync(storeFile, JSON.stringify(storeOut, null, 2));
    summary.stats[inv.store_slug] = stats;
    console.log(`   ${stats.ok}/${targets.length} OK · ${stats.blocked} WAF · ${stats.no_jsonld} sem JSON-LD · ${stats.error} erro`);
    console.log(`   → ${storeFile.replace(ROOT, '.')}`);
  }

  await browser.close();

  // resumo geral
  fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n═════════ Resumo ═════════');
  let totalOk = 0, totalAll = 0;
  Object.entries(summary.stats).forEach(([slug, s]) => {
    const t = s.ok + s.blocked + s.no_jsonld + s.error;
    totalOk += s.ok; totalAll += t;
    console.log(` ${slug.padEnd(15)} ${s.ok}/${t} OK · ${s.blocked} WAF · ${s.no_jsonld} sem JSON-LD · ${s.error} erro`);
  });
  console.log(` TOTAL          ${totalOk}/${totalAll} (${totalAll?Math.round(100*totalOk/totalAll):0}%)`);
  console.log(`\n💾 Output: ${outDir.replace(ROOT, '.')}`);
  console.log(`\nPróximo: node scripts/ingest-scraped.js --date=${today}`);
})().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
