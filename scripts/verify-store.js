#!/usr/bin/env node
// Resolve URL canónica + valida brand/volume contra catálogo para cada produto × 1 loja. Gera data/inventory/{slug}-verified.json.
/**
 * SmartCartCosmetics — verify-store.js (FASE B do pipeline)
 * ============================================================
 *
 * Para uma loja específica, percorre os produtos do catálogo
 * (scripts/build-catalog.js → PRODUCTS) e tenta:
 *
 *   1. Resolver URL canónica via search da loja (EAN → nome)
 *   2. Fetch da PDP, extrair JSON-LD Product
 *   3. Validar brand match + volume match contra o produto canónico
 *   4. Marcar:
 *        verified=true        → match completo (brand + volume bate)
 *        verified=variant     → marca bate mas volume é outro (loja vende outro tamanho)
 *        verified=false       → não vende / sem confidence
 *
 * Output: data/inventory/{slug}-verified.json
 *   {
 *     store_slug, store_name, verified_at,
 *     stats: { resolved, verified, variant, not_sold },
 *     items: [
 *       { ean, name, brand, expected_volume_ml,
 *         resolved_url, observed_name, observed_brand, observed_volume_ml,
 *         observed_price, observed_in_stock,
 *         confidence, status, notes }
 *     ]
 *   }
 *
 * Uso:
 *   node scripts/verify-store.js --store=druni
 *   node scripts/verify-store.js --store=druni --max-products=5    # piloto
 *   node scripts/verify-store.js --store=druni --dry-run            # sem fetch
 *
 * Integra-se com build-catalog.js: este último lê o ficheiro
 * inventory/{slug}-verified.json e marca as ofertas correspondentes
 * com verified=true em prices-snapshot.json.
 */

const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const STORE = args.store;
if (!STORE) { console.error('✗ uso: node scripts/verify-store.js --store=<slug>'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const store = STORES.find(s => s.id === STORE);
if (!store) { console.error(`✗ loja '${STORE}' não encontrada`); process.exit(1); }

// Lê o catálogo canónico directamente do build-catalog.js (single source of truth)
let CATALOG_PRODUCTS;
try {
  const mod = require('./build-catalog.js');
  CATALOG_PRODUCTS = mod.PRODUCTS;
} catch (_) {
  // Fallback: lê do JSON gerado
  CATALOG_PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products-master.json'), 'utf8')).products;
}

const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args['max-products'] ? Number(args['max-products']) : Infinity;
const DELAY_MS = Number(process.env.VERIFY_DELAY_MS || 2000);
const USER_AGENT = process.env.VERIFY_USER_AGENT
  || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const OUT_DIR = path.join(ROOT, 'data', 'inventory');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT_PATH = path.join(OUT_DIR, `${STORE}-verified.json`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ============================================================
// Helpers
// ============================================================
function levenshtein(a, b) {
  a = String(a||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  b = String(b||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!a.length) return b.length; if (!b.length) return a.length;
  const dp = Array.from({ length: a.length+1 }, (_,i)=>i);
  for (let j=1;j<=b.length;j++) {
    let prev=dp[0]; dp[0]=j;
    for (let i=1;i<=a.length;i++) {
      const tmp=dp[i];
      dp[i] = a[i-1]===b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]);
      prev=tmp;
    }
  }
  return dp[a.length];
}
const similarity = (a,b) => { const m = Math.max(String(a).length, String(b).length); return m ? 1 - levenshtein(a,b)/m : 1; };

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch (_) {}
  }
  return out;
}
function findProductLd(html) {
  return extractJsonLd(html).find(n => {
    const t = n['@type'];
    return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
  });
}
function parsePrice(str) {
  if (str == null) return null;
  const m = String(str).replace(/\s+/g,'').match(/(\d+)[.,]?(\d{0,2})/);
  if (!m) return null;
  return parseFloat(m[1] + (m[2] ? '.'+m[2].padEnd(2,'0') : ''));
}
function extractVolume(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|cl|l|amp|un)\b/i);
  return m ? { value: parseFloat(m[1].replace(',','.')), unit: m[2].toLowerCase() } : null;
}

// ============================================================
// HTTP fetch
// ============================================================
async function httpGet(url) {
  if (DRY_RUN) return '<html><!-- dry-run --></html>';
  await sleep(DELAY_MS + Math.random()*500);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.7',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

// ============================================================
// Resolver URL via search da loja
// ============================================================
async function resolveUrl(product) {
  const strat = store.search_strategy;
  if (!strat || strat.type !== 'url-template' || !strat.template) {
    return { url: null, method: 'no-strategy' };
  }

  const queries = [];
  if (strat.supports_ean) queries.push({ q: product.ean, method: 'ean-search' });
  queries.push({ q: `${product.brand} ${product.name.replace(/\s*\d+\s*ml\b/i,'').trim()}`, method: 'name-search' });

  for (const { q, method } of queries) {
    const searchUrl = strat.template.replace('{q}', encodeURIComponent(q));
    let html;
    try { html = await httpGet(searchUrl); }
    catch (err) { return { url: null, method: method + '-fail', error: err.message }; }

    // Primeiro link de produto. Heurística: <a href que match o selector
    const sel = strat.result_link_selector || '';
    const tokens = sel.split(/[,\s]+/).filter(Boolean).slice(0, 3);
    for (const tok of tokens) {
      const cls = tok.replace(/^a\./, '').replace(/[\[\]"']/g,'');
      const re = new RegExp(`<a[^>]+(?:class|data-testid)="[^"]*${cls.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}[^"]*"[^>]+href="([^"]+)"`, 'i');
      const m = html.match(re);
      if (m) {
        const u = m[1].startsWith('http') ? m[1] : store.url.replace(/\/$/,'') + (m[1].startsWith('/') ? m[1] : '/'+m[1]);
        return { url: u, method };
      }
    }
  }
  return { url: null, method: 'no-result' };
}

// ============================================================
// Fetch + validate PDP
// ============================================================
async function fetchAndValidate(url, product) {
  let html;
  try { html = await httpGet(url); }
  catch (err) { return { error: err.message }; }

  const ld = findProductLd(html);
  if (!ld) return { error: 'no-jsonld' };

  const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const price = offer ? parsePrice(offer.price ?? offer.lowPrice) : null;
  const inStock = offer ? /InStock|LimitedAvailability/i.test(String(offer.availability||'')) : null;
  const obsName = ld.name || null;
  const obsBrand = ld.brand?.name || ld.brand || null;
  const obsEan = ld.gtin13 || ld.gtin || ld.sku || null;
  const obsVol = extractVolume(obsName) || extractVolume(ld.size) || extractVolume(ld.description);

  // ─── Validações ───
  const expectedBrand = product.brand;
  const expectedVol = product.volume_ml;
  const brandSim = obsBrand ? similarity(obsBrand, expectedBrand) : 0;
  const volMatch = obsVol && obsVol.value === expectedVol;
  const eanMatch = obsEan && String(obsEan) === product.ean;

  let status, confidence;
  if (eanMatch) {                                            // gold standard
    status = 'verified'; confidence = 1.0;
  } else if (brandSim >= 0.85 && volMatch) {                  // brand+volume
    status = 'verified'; confidence = 0.9;
  } else if (brandSim >= 0.85 && !volMatch) {                 // marca bate, volume é outro
    status = 'variant'; confidence = 0.6;
  } else if (brandSim >= 0.7) {                               // marca fraca
    status = 'low-confidence'; confidence = 0.5;
  } else {
    status = 'mismatch'; confidence = 0.0;
  }

  return {
    observed_name: obsName,
    observed_brand: obsBrand,
    observed_ean: obsEan,
    observed_volume_ml: obsVol?.value,
    observed_volume_unit: obsVol?.unit,
    observed_price: price,
    observed_currency: offer?.priceCurrency || 'EUR',
    observed_in_stock: inStock,
    brand_similarity: Number(brandSim.toFixed(3)),
    volume_match: volMatch,
    ean_match: eanMatch,
    confidence,
    status,
  };
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`▶ verify-store: ${STORE} (${store.nome}) · ${CATALOG_PRODUCTS.length} produtos · dry-run=${DRY_RUN}`);
  const items = [];
  const products = CATALOG_PRODUCTS.slice(0, MAX_PRODUCTS);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`  [${i+1}/${products.length}] ${p.brand} · ${p.name.slice(0,50)} … `);

    const resolved = await resolveUrl(p);
    if (!resolved.url) {
      console.log(`✗ ${resolved.method}`);
      items.push({
        ean: p.ean, name: p.name, brand: p.brand,
        expected_volume_ml: p.volume_ml,
        resolved_url: null, status: 'not-found',
        notes: resolved.method, verified_at: new Date().toISOString(),
      });
      continue;
    }

    const val = await fetchAndValidate(resolved.url, p);
    if (val.error) {
      console.log(`✗ ${val.error}`);
      items.push({
        ean: p.ean, name: p.name, brand: p.brand,
        expected_volume_ml: p.volume_ml,
        resolved_url: resolved.url, status: 'fetch-failed',
        notes: val.error, verified_at: new Date().toISOString(),
      });
      continue;
    }

    console.log(`${val.status === 'verified' ? '✓' : '⚠'} ${val.status} (conf ${val.confidence}) · €${val.observed_price ?? '?'}`);
    items.push({
      ean: p.ean, name: p.name, brand: p.brand,
      expected_volume_ml: p.volume_ml,
      resolved_url: resolved.url,
      resolution_method: resolved.method,
      ...val,
      verified_at: new Date().toISOString(),
    });
  }

  const stats = {
    total: items.length,
    verified: items.filter(i => i.status === 'verified').length,
    variant: items.filter(i => i.status === 'variant').length,
    low_confidence: items.filter(i => i.status === 'low-confidence').length,
    mismatch: items.filter(i => i.status === 'mismatch').length,
    not_found: items.filter(i => i.status === 'not-found').length,
    fetch_failed: items.filter(i => i.status === 'fetch-failed').length,
  };

  const output = {
    version: '1.0',
    store_slug: STORE,
    store_name: store.nome,
    store_url: store.url,
    verified_at: new Date().toISOString(),
    stats,
    items,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log();
  console.log(`✔ ${OUT_PATH}`);
  console.log(`  ${stats.verified} verified · ${stats.variant} variant · ${stats.low_confidence} low-conf`);
  console.log(`  ${stats.mismatch} mismatch · ${stats.not_found} not-found · ${stats.fetch_failed} fetch-failed`);
}

main().catch(err => { console.error('FATAL:', err.stack || err.message); process.exit(1); });
