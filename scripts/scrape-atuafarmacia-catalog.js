#!/usr/bin/env node
/**
 * CosMath — A Tua Farmácia catalog scrape (atuafarmacia.pt, Shopify PT)
 * ============================================================
 *
 * A Tua Farmácia (Farmácia Central de Rio Tinto) é a maior farmácia dermo
 * do KuantoKusta (8095 produtos em "Saúde e Beleza"). Shopify PT, envia PT.
 *
 * DESCOBERTA-CHAVE: o `/products.json` NÃO expõe `barcode`, MAS o `sku` da
 * variante É a chave nacional — CNP (7 díg) na esmagadora maioria e às vezes
 * EAN-13 real. Ou seja, apanhamos título + marca (vendor) + CNP/EAN + preço
 * + variantes com UM único fetch paginado (~33 páginas), sem visitar as 8095
 * fichas uma a uma (ao contrário do enrich `.js` da easyfarma).
 *
 * Guardamos:
 *   • `cnp`  quando o sku tem 7 díg  → matching nacional (apply-cnp-merge).
 *   • `ean`  quando o sku tem 12-14 díg → GTIN real.
 *
 * MODO COMPARAÇÃO (enrich-only no integrador): esta loja entra só como fonte
 * de preço sobre produtos que já temos — não cria produtos novos.
 *
 * EAN POR TAMANHO (2026-11-06, auditoria aos catálogos): o `/products/<handle>.js`
 * dá o `barcode` (EAN) de cada variante — em 34 de 40 fichas amostradas. Sem ele,
 * as ofertas só casavam pelo CNP e muitas ficavam de fora. O código lê-se UMA vez
 * e fica na cache data/catalog/atuafarmacia-gtin.json (id da variante → código),
 * no máximo --max-gtin leituras por corrida (omissão 400), com bot declarado e
 * robots.txt (scripts/lib/shopify-existentes.js). Ao primeiro 403/429 o passo
 * pára e a corrida continua com o que já tem. Um produto com vários tamanhos com
 * EAN próprio sai um por tamanho, com o URL «?variant=<id>» (como na Primor).
 *
 * ⚠️ RATE-LIMIT: a loja limita o /products.json de forma agressiva (429 após
 * ~12 pedidos rápidos). Por isso: delay generoso entre páginas + backoff longo
 * no 429 + CHECKPOINT por página (--resume continua onde parou; o workflow
 * diário completa em runs sucessivos se um run for cortado).
 *
 * Uso:
 *   node scripts/scrape-atuafarmacia-catalog.js              # tudo
 *   node scripts/scrape-atuafarmacia-catalog.js --resume     # continua
 *   node scripts/scrape-atuafarmacia-catalog.js --limit=250  # smoke test
 */

const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');
const { pedir, gtinValido, regrasRobots, Paragem } = require('./lib/shopify-existentes');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'atuafarmacia-full.json');
const CACHE_GTIN = path.join(CATALOG_DIR, 'atuafarmacia-gtin.json');
const BASE = 'https://www.atuafarmacia.pt';
// a loja redireciona www → sem www, e a lib pára quando o domínio muda: o .js lê-se já no domínio final
const ORIGEM_JS = BASE.replace('://www.', '://');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const RESUME = !!args.resume;
const PAGE_DELAY = args.delay ? parseInt(args.delay, 10) : 1500;   // gentil com o rate-limit
const MAX_GTIN = args['max-gtin'] != null ? parseInt(args['max-gtin'], 10) : 400;   // leituras do .js por corrida

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ── Filtro: excluir claramente-não-cosmética (medicamentos/suplementos/bebé) ──
// Enrich-only → o que passar mas não casar é simplesmente ignorado; por isso
// somos PERMISSIVOS (só cortamos o que nunca seria dermo) para maximizar
// comparação. A categoria é best-effort (fica no registo do catálogo).
const EXCLUDE = { test: isNonCosmetic };  // filtro nao-cosmetica partilhado (lib)
const CAT = [
  { c: 'haircare', rx: /\b(cabelo|champ[oô]|shampoo|condicion|capilar|anti[- ]?queda|anti[- ]?caspa|óleo capilar|máscara capilar)\b/i },
  { c: 'skincare', rx: /\b(rosto|facial|s[eé]rum|creme|hidrat|protetor[ -]?solar|solar|spf|fps|m[aá]scara|esfoliant|t[óo]nico|micel|hialur|antirrug|antiidad|manchas|at[óo]pic|sens[íi]vel|contorno|peeling|limpeza|pele)\b/i },
  { c: 'body', rx: /\b(corpo|body|gel de banho|sabonete|loç[ãa]o|m[ãa]os|p[ée]s|desodoriz|higiene [ií]ntima)\b/i },
  { c: 'perfume', rx: /\b(perfum|eau de (parfum|toilette)|colónia|fragr[âa]nc)\b/i },
  { c: 'makeup', rx: /\b(maquilh|batom|gloss|sombra|pestanas|eyeliner|base|foundation|blush|bronze|concealer|primer|verniz|unhas)\b/i },
];

function normVolume(t) {
  if (!t) return null;
  const m = String(t).match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  if (u === 'l' && n < 10) n *= 1000; if (u === 'kg') n *= 1000;
  return n;
}
function categorize(p) {
  const hay = [p.product_type, p.title, ...(p.tags || []), (p.body_html || '').slice(0, 400)].join(' ');
  if (EXCLUDE.test(hay)) return null;                 // fora (não-cosmética)
  for (const { c, rx } of CAT) if (rx.test(hay)) return c;
  return 'other';                                     // permissivo: mantém, sem categoria forte
}
function bestImage(p) {
  if (!p.images || !p.images.length) return null;
  return String(p.images[0].src || '').replace(/_\d+x\d+(?=\.)/, '_500x500') || null;
}
// sku → { ean, cnp }: EAN-13/14 real vs CNP-7 nacional.
function keyFromSku(sku) {
  const s = String(sku || '').trim();
  if (/^\d{12,14}$/.test(s) && !/0{6,}/.test(s)) return { ean: s, cnp: null };
  if (/^\d{7}$/.test(s)) return { ean: null, cnp: s };
  return { ean: null, cnp: null };
}
function variantToOffer(v, defVol) {
  const price = parseFloat(v.price);
  if (!(price > 0)) return null;
  const prev = v.compare_at_price ? parseFloat(v.compare_at_price) : null;
  const vol = normVolume([v.title, v.option1, v.option2].filter(Boolean).join(' ')) || defVol || null;
  return {
    volume_ml: vol, price,
    previous_price: prev && prev > price ? prev : null,
    discount_pct: prev && prev > price ? Math.round((1 - price / prev) * 100) : null,
    in_stock: !!v.available,
    sku: v.sku || null,
    id: v.id != null ? String(v.id) : null,
  };
}

// ── EAN por tamanho, pela cache (ver o cabeçalho) ──
function lerCache() { try { return JSON.parse(fs.readFileSync(CACHE_GTIN, 'utf8')); } catch { return {}; } }
function gravarCache(cache) {
  const ordenada = Object.fromEntries(Object.keys(cache).sort().map(k => [k, cache[k]]));
  fs.writeFileSync(CACHE_GTIN, JSON.stringify(ordenada, null, 0) + '\n', 'utf8');
}
async function enriquecerGtin(products, cache) {
  const porLer = products.filter(p => (p.variants || []).some(v => v.id && !(v.id in cache)));
  const st = { lidos: 0, retirados: 0, falhas: 0, parado: null, pendentes: Math.max(0, porLer.length - MAX_GTIN) };
  if (!porLer.length || MAX_GTIN <= 0) return st;
  let regras = [];
  try { const rb = await pedir(`${ORIGEM_JS}/robots.txt`, null); if (rb.estado === 200) regras = regrasRobots(rb.corpo); } catch (e) { st.parado = e.message; return st; }
  for (const p of porLer.slice(0, MAX_GTIN)) {
    await new Promise(s => setTimeout(s, 2000));
    let r;
    try { r = await pedir(`${ORIGEM_JS}/products/${encodeURIComponent(p.handle)}.js`, regras); }
    catch (e) { if (e instanceof Paragem) { st.parado = e.message; break; } st.falhas++; continue; }
    st.lidos++;
    if (r.estado === 404 || r.estado === 410) { st.retirados++; continue; }
    if (r.estado !== 200) { st.falhas++; continue; }
    let j; try { j = JSON.parse(r.corpo); } catch { st.falhas++; continue; }
    for (const v of j.variants || []) cache[String(v.id)] = String(v.barcode == null ? '' : v.barcode).trim();
    if (st.lidos % 100 === 0) console.log(`  …EAN pelo .js: ${st.lidos}/${Math.min(porLer.length, MAX_GTIN)}`);
  }
  return st;
}
// Aplica a cache: EAN em cada variante; produto com 2+ tamanhos de EAN diferente → um por tamanho.
function aplicarGtin(products, cache) {
  const saida = [];
  for (const p of products) {
    for (const v of p.variants || []) { const bc = v.id && cache[v.id]; if (gtinValido(bc)) v.ean = bc; }
    const comEan = (p.variants || []).filter(v => v.ean);
    if (comEan.length >= 2 && new Set(comEan.map(v => v.ean)).size === comEan.length) {
      for (const v of comEan) saida.push({ ...p, url: `${p.url}?variant=${v.id}`, ean: v.ean, cnp: keyFromSku(v.sku).cnp || p.cnp,
        price: v.price, previous_price: v.previous_price, discount_pct: v.discount_pct, in_stock: v.in_stock, volume_ml: v.volume_ml, variants: [v] });
      continue;
    }
    // um só tamanho com EAN (ou todos o mesmo): o EAN do produto passa a ser esse
    if (!p.ean && comEan.length) p.ean = (comEan.find(v => v.price === p.price && v.in_stock === p.in_stock) || comEan[0]).ean;
    saida.push(p);
  }
  return saida;
}
function mapProduct(p, category) {
  const defVol = normVolume(p.title) || normVolume(p.body_html);
  const variants = (p.variants || []).map(v => variantToOffer(v, defVol)).filter(Boolean);
  if (!variants.length) return null;
  // chave a nível de produto: a primeira variante com CNP/EAN (todas as
  // variantes de volume partilham tipicamente a mesma raiz, mas cada uma tem o
  // seu sku — guardamos a do headline).
  let ean = null, cnp = null;
  for (const v of variants) { const k = keyFromSku(v.sku); if (!ean && k.ean) ean = k.ean; if (!cnp && k.cnp) cnp = k.cnp; }
  const inStock = variants.filter(v => v.in_stock);
  const pool = inStock.length ? inStock : variants;
  const best = pool.reduce((a, b) => (b.price < a.price ? b : a), pool[0]);
  return {
    status: 'ok',
    handle: p.handle,
    url: `${BASE}/products/${p.handle}`,
    name: (p.title || '').replace(/\s+/g, ' ').trim(),
    brand: (p.vendor || '').trim() || null,
    ean, cnp,
    category,
    image_url: bestImage(p),
    price: best.price,
    previous_price: best.previous_price,
    discount_pct: best.discount_pct,
    in_stock: best.in_stock,
    volume_ml: best.volume_ml,
    variants,
  };
}

async function fetchPage(page, attempt = 1) {
  try {
    // Cookie localization=PT: Shopify Markets serve preços por GEO-IP — do runner
    // GitHub (IP US) vinham preços do mercado internacional (+16,7% constante em
    // TODO o catálogo; registo de correções #2, 2026-07-17). O cookie é o mesmo
    // que o seletor de país do site define e força o mercado PT.
    const r = await fetch(`${BASE}/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'pt-PT,pt;q=0.9', 'Cookie': 'localization=PT' } });
    if (r.status === 429 || r.status >= 500) {
      if (attempt <= 6) { const wait = 3000 * attempt + Math.random() * 1000; console.log(`    ⏳ ${r.status} na página ${page} — espera ${Math.round(wait / 1000)}s (tentativa ${attempt}/6)`); await new Promise(s => setTimeout(s, wait)); return fetchPage(page, attempt + 1); }
      return { rateLimited: true };
    }
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { if (attempt <= 4) { await new Promise(s => setTimeout(s, 2000 * attempt)); return fetchPage(page, attempt + 1); } return null; }
}

function mapAll(raw) {
  const products = [];
  for (const p of raw) { const cat = categorize(p); if (cat === null) continue; const m = mapProduct(p, cat); if (!m) continue; products.push(m); }
  return products;
}
// Checkpoint/final: escreve os produtos MAPEADOS já acumulados. next_page!=null
// e in_progress=true → --resume continua daí. Sem perda: parte-se sempre do
// catálogo anterior (carried), o scrape fresco SUBSTITUI o preço por handle.
function writeCatalog(byHandle, nextPage) {
  if (LIMIT !== Infinity) return;   // smoke-test nunca escreve produção
  const products = [...byHandle.values()];
  if (!products.length) return;
  fs.writeFileSync(OUT_FILE, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'atuafarmacia.pt (Shopify products.json; sku=CNP/EAN)', in_progress: nextPage != null, next_page: nextPage, products }), 'utf8');
}
function loadExisting() {
  if (!fs.existsSync(OUT_FILE)) return null;
  try { const d = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); if (!Array.isArray(d.products)) return null; return d; } catch { return null; }
}

module.exports = { aplicarGtin, keyFromSku, mapProduct };
if (require.main === module) (async function main() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📦 A buscar catálogo A Tua Farmácia (Shopify /products.json)…\n');

  // Sempre partimos do catálogo existente (byHandle) para NUNCA encolher se o
  // rate-limit cortar um run a meio. O scrape fresco actualiza o preço por
  // handle (fresh-wins). Página inicial: se o catálogo anterior está PARCIAL
  // (next_page), continua daí; se está COMPLETO, recomeça na 1 (refresh de preço).
  const prev = RESUME ? loadExisting() : null;
  const byHandle = new Map();
  // (2026-11-06) entradas desdobradas por tamanho («?variant=») voltam a um produto por handle
  if (prev) for (const p of prev.products) {
    const cur = byHandle.get(p.handle);
    if (!cur) { byHandle.set(p.handle, { ...p, url: String(p.url).split('?')[0], variants: [...(p.variants || [])] }); continue; }
    const ids = new Set(cur.variants.map(v => v.id));
    for (const v of p.variants || []) if (!v.id || !ids.has(v.id)) cur.variants.push(v);
  }
  const startPage = (prev && prev.next_page) ? prev.next_page : 1;
  if (prev) console.log(`  ↻ ${byHandle.size} produtos no catálogo · ${prev.next_page ? `continuar na página ${startPage}` : `refresh desde a página 1`}\n`);

  let rateLimited = false, exhausted = false, nextPage = startPage;
  for (let page = startPage; ; page++) {
    const j = await fetchPage(page);
    if (j && j.rateLimited) { console.warn(`  ⚠ rate-limit persistente na página ${page} — paro e guardo (--resume continua).`); rateLimited = true; nextPage = page; break; }
    const arr = j && j.products || [];
    if (!arr.length) { exhausted = true; break; }                 // fim do catálogo
    for (const p of mapAll(arr)) byHandle.set(p.handle, p);       // fresh-wins por handle
    console.log(`  página ${String(page).padStart(2)} → +${arr.length} (cosmética no catálogo ${byHandle.size})`);
    if (arr.length < 250) { exhausted = true; break; }            // última página
    if (page % 4 === 0) writeCatalog(byHandle, page + 1);         // checkpoint
    if (byHandle.size >= LIMIT) { nextPage = page + 1; break; }
    await new Promise(s => setTimeout(s, PAGE_DELAY + Math.random() * PAGE_DELAY * 0.3));
  }

  // EAN por tamanho: lê os .js em falta (até MAX_GTIN) e aplica a cache.
  // Os produtos do catálogo anterior (resume) podem vir já desdobrados por
  // tamanho: junta-se pela forma base (handle) antes de reaplicar.
  const cache = lerCache();
  const base = [...new Map([...byHandle.values()].map(p => [p.handle, { ...p, url: String(p.url).split('?')[0] }])).values()];
  const gt = await enriquecerGtin(base, cache);
  if (LIMIT === Infinity) gravarCache(cache);
  console.log(`  EAN pelo .js: ${gt.lidos} lidos · ${gt.retirados} retirados · ${gt.falhas} falhas · ${gt.pendentes} produtos por ler na próxima corrida${gt.parado ? ` · parado: ${gt.parado}` : ''}`);
  const combined = aplicarGtin(base, cache);
  byHandle.clear(); for (const p of combined) byHandle.set(p.handle + '|' + p.url, p);
  const done = exhausted;
  const withCnp = combined.filter(p => p.cnp).length, withEan = combined.filter(p => p.ean).length;
  const byCat = {}; for (const p of combined) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log(`\n══════ A Tua Farmácia scrape — resumo ══════`);
  console.log(`  Produtos cosmética: ${combined.length} · com CNP: ${withCnp} · com EAN: ${withEan}${done ? '' : ' · (PARCIAL — rate-limit; --resume completa)'}`);
  console.log('  Por categoria:', Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join(' · '));

  if (combined.length === 0) { console.error('\n✗ 0 produtos (feed vazio/bloqueio?). NÃO sobrescrevo o catálogo existente.'); process.exit(1); }
  if (LIMIT !== Infinity) { console.log(`\n[--limit=${LIMIT}] smoke-test: catálogo de produção NÃO escrito.`); return; }

  writeCatalog(byHandle, done ? null : nextPage);
  console.log(`\n✓ ${OUT_FILE.replace(ROOT, '.')} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)${done ? '' : ` — parcial (próxima página ${nextPage}); --resume completa`}`);
})();
