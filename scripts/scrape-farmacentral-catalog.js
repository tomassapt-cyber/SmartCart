#!/usr/bin/env node
/**
 * CosMath — farmacentral.pt catalog scrape (API REST pública)
 * ============================================================
 * FARMACENTRAL = farmácia PT na MESMA plataforma "Ycommerce"/Nuxt do dermis e
 * do bemecare. Descoberta 2026-07-30: a app pagina contra
 * **https://api.farmacentral.pt/api/products?take=N&skip=M**, que devolve
 * {list, total, total_without_filters}. 3.548 produtos anunciados.
 *
 * ⚠️ NÃO É CÓPIA DO DERMIS. Três diferenças medidas na amostra, e cada uma
 * daria dados errados se o scraper do dermis fosse reaproveitado às cegas:
 *
 *   1. O PVP de tabela chama-se **sifarma_price**, não `system_price`. O campo
 *      `system_price` NÃO EXISTE aqui — lê-lo daria `undefined` e o preço
 *      barrado desapareceria silenciosamente de todo o catálogo.
 *   2. As imagens vivem em **`file`** (100% de cobertura), não em `media`
 *      (0% aqui). E o caminho é relativo a **api.**farmacentral.pt — o domínio
 *      sem `api.` devolve 301.
 *   3. Só **58%** têm EAN (o dermis tem ~81%); 100% têm sku = CNP de 7 dígitos.
 *      Ou seja: neste catálogo o CNP é a chave principal e o EAN o extra.
 *
 * ⚠️ PREÇOS — a armadilha, aqui mais grave que em qualquer outra loja desta
 * plataforma: **metade da amostra (126 em 250) está em campanha**. O
 * `campaign_price` (quando > 0 e < price) é o preço a pagar HOJE; `price` é o
 * normal da loja; `sifarma_price` é o PVP de tabela. Ignorar o campaign_price
 * mostraria preço a mais em ~50% do catálogo — é a mesma armadilha do wowfarma
 * e do dermis (registo de correções #1), mas com o dobro do alcance.
 *
 * VERIFICADO antes de escrever isto (2026-07-30):
 *   · não é catálogo espelhado do dermis — sobreposição de 40% em CNP e 29% em
 *     EAN, logo ~60% dos produtos são novos;
 *   · ficha em farmacentral.pt/pt/artigo/<slug> devolve 200 (as outras formas
 *     dão 301).
 *
 * Uso: node scripts/scrape-farmacentral-catalog.js [--limit=N] [--take=250]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'farmacentral-full.json');
const API = 'https://api.farmacentral.pt/api/products';
const SITE = 'https://farmacentral.pt';
const IMG_BASE = 'https://api.farmacentral.pt';   // o domínio sem "api." dá 301

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

/** imagem: `file` traz {original, small, large} com caminhos relativos */
function imagemDe(p) {
  const f = p.file;
  if (!f || typeof f !== 'object') return null;
  const rel = f.large || f.original || f.small;
  if (!rel || typeof rel !== 'string') return null;
  return rel.startsWith('http') ? rel : IMG_BASE + (rel.startsWith('/') ? '' : '/') + rel;
}


/**
 * Marcas: a API expõe /api/brands e cada produto traz brand_id.
 * Sem isto, productFingerprint() devolve null e a correspondência por
 * impressão digital dá sempre zero — o integrador deixa de reconhecer
 * produtos que já existem no catálogo com outro EAN.
 */
const MARCAS = new Map();
async function carregarMarcas() {
  try {
    const r = await fetch(`${API.replace(/\/products$/, "")}/brands?take=2000`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    for (const b of (j.list || [])) {
      const nome = pt(b.name);
      if (b.id != null && nome) MARCAS.set(Number(b.id), String(nome).trim());
    }
    console.log(`  marcas carregadas: ${MARCAS.size}`);
  } catch (e) {
    // sem marcas o scrape continua a valer (só perde qualidade de matching)
    console.warn(`  ⚠ não consegui carregar as marcas (${e.message}) — sigo sem elas`);
  }
}
function mapProduct(p) {
  const name = String(pt(p.name) || '').replace(/\s+/g, ' ').trim();
  if (!name || isNonCosmetic(name)) return null;
  const c = Array.isArray(p.combinations) ? p.combinations[0] : null;
  if (!c) return null;

  const base = typeof c.price === 'number' ? c.price : parseFloat(c.price);
  const camp = c.campaign_price != null ? parseFloat(c.campaign_price) : null;
  // AQUI é sifarma_price (no dermis é system_price) — ver o cabeçalho
  const sys = c.sifarma_price != null ? parseFloat(c.sifarma_price) : null;

  // campaign_price válido (>0 e < price) é o preço a pagar hoje
  const emCampanha = camp != null && isFinite(camp) && camp > 0 && camp < base;
  const price = emCampanha ? camp : base;
  if (!(price > 0) || !isFinite(price)) return null;

  // o preço barrado honesto: o normal da loja (em campanha) ou o PVP de tabela
  // quando a loja pratica abaixo dele
  let previous_price = null;
  if (emCampanha) previous_price = base;
  else if (sys != null && isFinite(sys) && sys > price) previous_price = sys;

  const skuRaw = String(p.sku || c.sku || '').trim();
  const cnp = /^\d{7}$/.test(skuRaw) ? skuRaw : null;
  const eanRaw = String(p.ean || p.gtin || '').trim();
  const ean = /^\d{12,14}$/.test(eanRaw) && !/0{6,}/.test(eanRaw) ? eanRaw : null;
  if (!cnp && !ean) return null;

  const slug = pt(p.slug);
  const inStock = p.is_active !== false && (c.has_unlimited_stock === true || Number(c.quantity) > 0);

  return {
    status: 'ok',
    url: slug ? `${SITE}/pt/artigo/${slug}` : null,
    name,
    brand: MARCAS.get(Number(p.brand_id)) || null,
    ean, cnp,
    category: null,
    image_url: imagemDe(p),
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
  console.log(`📦 FARMACENTRAL — API pública (take=${TAKE})…`);
  await carregarMarcas();
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

  // GUARDA: nunca sobrescrever o catálogo bom com um resultado vazio ou truncado
  if (products.length === 0) { console.error('✗ 0 produtos — NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  if (LIMIT === Infinity && fs.existsSync(OUT_FILE)) {
    try {
      const antes = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')).products || [];
      if (antes.length > 200 && products.length < antes.length * 0.6) {
        console.error(`✗ só ${products.length} produtos contra ${antes.length} da última vez (<60%) — NÃO sobrescrevo.`);
        process.exit(1);
      }
    } catch { /* ficheiro anterior ilegível: segue */ }
  }

  if (LIMIT === Infinity) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({
      scraped_at: new Date().toISOString(),
      source: 'api.farmacentral.pt/api/products (API pública; sku=CNP, campaign_price, sifarma_price)',
      in_progress: false, products,
    }), 'utf8');
  }

  const comCampanha = products.filter(p => p.previous_price).length;
  console.log(`\n══════ farmacentral scrape ══════`);
  console.log(`  Produtos: ${products.length} · CNP: ${products.filter(p => p.cnp).length} · EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
  console.log(`  com marca: ${products.filter(p => p.brand).length} · com imagem: ${products.filter(p => p.image_url).length} · com preço barrado: ${comCampanha} (${Math.round(comCampanha / products.length * 100)}%)`);
  console.log(`  filtrados: não-cosmética ${nonCosm} · sem chave ${noKey} · sem preço ${noPrice}`);
  if (LIMIT !== Infinity) console.log(`[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`);
  else console.log(`\n✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

module.exports = { mapProduct };
if (require.main === module) {
  process.on('unhandledRejection', (e) => console.warn('⚠ unhandledRejection (ignorado):', e && e.code || e));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
