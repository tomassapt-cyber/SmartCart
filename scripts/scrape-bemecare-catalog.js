#!/usr/bin/env node
/**
 * CosMath — bemecare.com catalog scrape (API REST pública)
 * ============================================================
 * REESCRITO 2026-07-18 (sniff de browser): a app Nuxt pagina contra
 * **https://api.bemecare.com/api/products?take=N&skip=M** — API pública que
 * devolve {list, total, total_without_filters} com TUDO o que precisamos:
 * sku(=CNP 7 díg, 100% cobertura), ean (parcial ~16%), name/slug (pt+es),
 * is_active e combinations[0] com price / campaign_price / system_price /
 * quantity. take=250 aceite → **15 pedidos para 3.552 produtos**.
 *
 * Substituiu a abordagem antiga (sitemap /feeds/sitemap.xml + vm-eval do
 * window.__NUXT__ ficha-a-ficha): esse sitemap está 92% MORTO (3.188 de 3.466
 * davam 404) e rendia só 259 produtos em ~40 min.
 *
 * ⚠️ PREÇOS: campaign_price (quando > 0 e < price) é o preço ATUAL de promoção;
 * price é o normal da loja; system_price é o PVP de tabela. Ignorar
 * campaign_price mostraria preço a mais em ~15% do catálogo — é exatamente a
 * armadilha do wowfarma (registo de correções #1).
 *
 * Uso: node scripts/scrape-bemecare-catalog.js [--limit=N] [--take=250]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'bemecare-full.json');
const API = 'https://api.bemecare.com/api/products';
const SITE = 'https://bemecare.com';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const TAKE = args.take ? Math.min(250, parseInt(args.take, 10)) : 250;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 600;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const pt = v => (v && typeof v === 'object') ? (v.pt || v.es || Object.values(v)[0] || null) : (v || null);
function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

function mapProduct(p) {
  const name = String(pt(p.name) || '').replace(/\s+/g, ' ').trim();
  if (!name || isNonCosmetic(name)) return null;
  const c = Array.isArray(p.combinations) ? p.combinations[0] : null;
  if (!c) return null;
  const base = typeof c.price === 'number' ? c.price : parseFloat(c.price);
  const camp = c.campaign_price != null ? parseFloat(c.campaign_price) : null;
  const sys = c.system_price != null ? parseFloat(c.system_price) : null;
  // campaign_price válido (>0 e < price) é o preço a pagar hoje
  const emCampanha = camp != null && isFinite(camp) && camp > 0 && camp < base;
  const price = emCampanha ? camp : base;
  if (!(price > 0) || !isFinite(price)) return null;
  // previous: o preço barrado honesto é o normal da loja (em campanha) ou o
  // PVP de tabela quando a loja pratica abaixo dele
  let previous_price = null;
  if (emCampanha) previous_price = base;
  else if (sys != null && isFinite(sys) && sys > price) previous_price = sys;
  const skuRaw = String(p.sku || c.sku || '').trim();
  const cnp = /^\d{7}$/.test(skuRaw) ? skuRaw : null;
  const eanRaw = String(p.ean || p.gtin || '').trim();
  const ean = /^\d{12,14}$/.test(eanRaw) && !/0{6,}/.test(eanRaw) ? eanRaw : null;
  if (!cnp && !ean) return null;
  const slug = pt(p.slug);
  const media = Array.isArray(p.media) && p.media[0] ? (p.media[0].original_url || p.media[0].url) : null;
  const inStock = p.is_active !== false && (c.has_unlimited_stock === true || Number(c.quantity) > 0);
  return {
    status: 'ok',
    url: slug ? `${SITE}/pt/artigo/${slug}` : null,
    name,
    brand: null,
    ean, cnp,
    category: null,
    image_url: media ? String(media) : null,
    price: Number(price.toFixed(2)),
    previous_price: previous_price ? Number(previous_price.toFixed(2)) : null,
    discount_pct: previous_price ? Math.round((1 - price / previous_price) * 100) : null,
    in_stock: inStock,
    volume_ml: volumeFromName(name),
    variants: [],
  };
}

async function fetchPage(skip, attempt = 1) {
  const url = `${API}?take=${TAKE}&skip=${skip}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'pt-PT,pt;q=0.9' } });
    if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
    if (!r.ok) return { error: 'HTTP ' + r.status };
    return await r.json();
  } catch (e) {
    if (attempt < 4) { await new Promise(s => setTimeout(s, 2500 * attempt)); return fetchPage(skip, attempt + 1); }
    return { error: e.message };
  }
}

async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log(`📦 BEMECARE — API pública (take=${TAKE})…`);
  const first = await fetchPage(0);
  if (first.error || !Array.isArray(first.list)) { console.error('✗ API não respondeu como esperado:', first.error || Object.keys(first)); process.exit(1); }
  const total = Number(first.total) || first.list.length;
  console.log(`  total anunciado: ${total}`);
  const products = [];
  let nonCosm = 0, noKey = 0, noPrice = 0;
  const push = list => {
    for (const p of list) {
      const d = mapProduct(p);
      if (d) products.push(d);
      else { const nm = String(pt(p.name) || ''); if (nm && isNonCosmetic(nm)) nonCosm++; else if (!p.combinations || !p.combinations[0]) noPrice++; else noKey++; }
    }
  };
  push(first.list);
  const alvo = LIMIT === Infinity ? total : Math.min(total, LIMIT);
  for (let skip = TAKE; skip < alvo; skip += TAKE) {
    await new Promise(s => setTimeout(s, DELAY_MS));
    const page = await fetchPage(skip);
    if (page.error || !Array.isArray(page.list)) { console.warn(`  ⚠ skip=${skip} falhou (${page.error || 'shape'}) — continuo`); continue; }
    push(page.list);
    if (page.list.length === 0) break;
    console.log(`  [${Math.min(skip + TAKE, alvo)}/${alvo}] ${products.length} cosméticos válidos`);
  }
  if (products.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  if (LIMIT === Infinity) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'api.bemecare.com/api/products (API pública; sku=CNP, campaign_price)', in_progress: false, products }), 'utf8');
  }
  console.log(`\n══════ bemecare scrape ══════`);
  console.log(`  Produtos: ${products.length} · CNP: ${products.filter(p => p.cnp).length} · EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  em campanha/PVP: ${products.filter(p => p.previous_price).length} · filtrados: não-cosmética ${nonCosm} · sem chave ${noKey} · sem preço ${noPrice}`);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  else console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { mapProduct };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
