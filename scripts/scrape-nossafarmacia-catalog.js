#!/usr/bin/env node
/**
 * CosMath — nossafarmacia.pt catalog scrape (VTEX, farmácia dermo PT)
 * ============================================================
 *
 * Nossa Farmácia é a 2ª maior farmácia dermo do KuantoKusta (6278 produtos
 * "Saúde e Beleza"). Plataforma **VTEX** (1ª VTEX nossa) — API pública JSON:
 *   /api/catalog_system/pub/products/search?fq=C:/<cat>/&_from=N&_to=M
 * devolve nome, marca, preço, stock, imagem e **productReference = CNP (7 díg)**
 * (o campo items[].ean vem vazio). 50 produtos/pedido → catálogo inteiro em
 * ~250 pedidos, sem tocar em HTML.
 *
 * MODO COMPARAÇÃO (enrich-only): match por CNP contra produtos existentes.
 *
 * Particularidades VTEX:
 *   • resposta 206 = parcial (normal); header `resources: 0-49/4793` dá o total.
 *   • teto de ~2500 por query → varremos por SUBCATEGORIA (fq=C:/pai/filho/).
 *   • rate-limit em bursts (429) → pacing + backoff.
 *
 * Categorias varridas (cosmética/higiene; medicamentos ficam fora):
 *   Beleza 11 (subcats 1101-1109) · Dermatologia 16 · Bem-Estar 12 (solares…)
 *   · Bebé: 10/1006 + 10/1007 (higiene/hidratação) · Saúde: 15/1508 + 15/1524.
 *
 * Uso:
 *   node scripts/scrape-nossafarmacia-catalog.js
 *   node scripts/scrape-nossafarmacia-catalog.js --limit=200
 */

const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'nossafarmacia-full.json');
const BASE = 'https://www.nossafarmacia.pt';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 450;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// fq de categoria → varremos cada uma paginada (todas <2500 por segmentação).
const CATEGORY_FQS = [
  'C:/11/1101/', 'C:/11/1102/', 'C:/11/1103/', 'C:/11/1104/', 'C:/11/1105/',
  'C:/11/1106/', 'C:/11/1107/', 'C:/11/1108/', 'C:/11/1109/',   // Beleza
  'C:/16/',                                                      // Dermatologia
  'C:/12/',                                                      // Bem-Estar (solares, mãos/pés…)
  'C:/10/1006/', 'C:/10/1007/',                                  // Bebé higiene/hidratação
  'C:/15/1508/', 'C:/15/1524/',                                  // Dermatologia OTC + Saúde Oral
];

function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

async function apiGet(url, attempt = 1) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    if (r.status === 429 || r.status >= 500) {
      if (attempt <= 6) { const w = 2500 * attempt + Math.random() * 1000; await new Promise(s => setTimeout(s, w)); return apiGet(url, attempt + 1); }
      return { code: r.status, j: null, resources: null };
    }
    let j = null; try { j = await r.json(); } catch {}
    return { code: r.status, j, resources: r.headers.get('resources') };
  } catch (e) {
    if (attempt <= 4) { await new Promise(s => setTimeout(s, 2000 * attempt)); return apiGet(url, attempt + 1); }
    return { code: 0, j: null, resources: null };
  }
}

function mapProduct(p) {
  const it = (p.items || [])[0] || {};
  const seller = ((it.sellers || [])[0] || {}).commertialOffer || {};
  const price = typeof seller.Price === 'number' ? seller.Price : parseFloat(seller.Price);
  if (!(price > 0)) return null;
  const name = String(p.productName || '').replace(/\s+/g, ' ').trim();
  if (!name || isNonCosmetic(name)) return null;
  const ref = String(p.productReference || '').trim();
  const cnp = /^\d{7}$/.test(ref) ? ref : null;
  const eanRaw = String(it.ean || '').trim();
  const ean = /^\d{12,14}$/.test(eanRaw) && !/0{6,}/.test(eanRaw) ? eanRaw : null;
  if (!cnp && !ean) return null;                       // sem chave → inútil p/ comparação
  const list = typeof seller.ListPrice === 'number' ? seller.ListPrice : parseFloat(seller.ListPrice);
  const img = ((it.images || [])[0] || {}).imageUrl || null;
  return {
    status: 'ok',
    url: `${BASE}/${p.linkText}/p`,
    name,
    brand: (p.brand || '').trim() || null,
    ean, cnp,
    category: null,
    image_url: img,
    price,
    previous_price: list && list > price ? list : null,
    discount_pct: list && list > price ? Math.round((1 - price / list) * 100) : null,
    in_stock: seller.IsAvailable !== false,
    volume_ml: volumeFromName(name),
    variants: [],
  };
}

(async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📦 Nossa Farmácia (VTEX API) — varrer categorias cosmética…\n');

  const byId = new Map();   // productId → mapped (dedup entre categorias)
  let reqs = 0;
  for (const fq of CATEGORY_FQS) {
    let from = 0, total = null;
    while (true) {
      const to = from + 49;
      const { code, j, resources } = await apiGet(`${BASE}/api/catalog_system/pub/products/search?fq=${encodeURIComponent(fq)}&_from=${from}&_to=${to}`);
      reqs++;
      if (!j || !Array.isArray(j)) { console.warn(`  ⚠ ${fq} @${from}: HTTP ${code} — salto categoria`); break; }
      if (total == null && resources) { const m = resources.match(/\/(\d+)/); if (m) total = parseInt(m[1], 10); }
      for (const p of j) { const mp = mapProduct(p); if (mp && !byId.has(p.productId)) byId.set(p.productId, mp); }
      if (j.length < 50) break;
      from += 50;
      if (total != null && from >= Math.min(total, 2500)) break;
      if (byId.size >= LIMIT) break;
      await new Promise(s => setTimeout(s, DELAY_MS + Math.random() * 200));
    }
    console.log(`  ${fq.padEnd(14)} → total-cat:${total ?? '?'} · acumulado c/ chave: ${byId.size}`);
    if (byId.size >= LIMIT) break;
    await new Promise(s => setTimeout(s, DELAY_MS));
  }

  const products = [...byId.values()];
  const withCnp = products.filter(p => p.cnp).length, withEan = products.filter(p => p.ean).length;
  console.log(`\n══════ nossafarmacia scrape ══════`);
  console.log(`  Pedidos API: ${reqs} · Produtos c/ chave: ${products.length} · CNP: ${withCnp} · EAN: ${withEan} · in_stock: ${products.filter(p => p.in_stock).length}`);

  if (products.length === 0) { console.error('\n✗ 0 produtos (API em baixo/bloqueio?). NÃO sobrescrevo o catálogo.'); process.exit(1); }
  if (LIMIT !== Infinity) { console.log(`\n[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`); return; }

  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'nossafarmacia.pt (VTEX API; productReference=CNP)', products }), 'utf8');
  console.log(`\n✓ ${OUT_FILE.replace(ROOT, '.')} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`);
})();
