#!/usr/bin/env node
/**
 * CosMath — POPULARIDADE POR PESQUISA (semente externa até o site ter tráfego)
 * ============================================================================
 * O hero mostra os "top produtos mais procurados". Enquanto o site não tem
 * pesquisas próprias suficientes (tracking Supabase — ver popular-searches
 * overlay), semeamos a popularidade a partir do que as pessoas REALMENTE
 * procuram na internet em PT, via **Google Suggest** (completações de pesquisa,
 * ordenadas por popularidade; fiável e sem o rate-limit agressivo do Trends).
 *
 * Fluxo:
 *   1. prefixos = top marcas do catálogo + categorias PT genéricas;
 *   2. Google Suggest (hl=pt, gl=pt) devolve as pesquisas populares de cada
 *      prefixo, por ordem de popularidade;
 *   3. cada completação é mapeada a um produto do catálogo (match marca+tokens);
 *   4. produtos rankeados pela soma de pontuação das pesquisas que lhes apontam;
 *   5. top N com oferta viva + imagem → data/popular-searches.json.
 *
 * Robustez: delay entre pedidos; se o Suggest falhar ou mapear < MIN_OUT
 * produtos, FALLBACK aos mais vendidos por nº de lojas (nunca deixa o hero vazio
 * e nunca sobrescreve com lixo). O overlay de tracking real (quando existir)
 * tem prioridade sobre esta semente.
 *
 * Uso: node scripts/build-popular-searches.js [--dry-run] [--limit=N]
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const BLOCKLIST = path.join(ROOT, 'data', 'offer-ean-blocklist.json');
const OUT = path.join(ROOT, 'data', 'popular-searches.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args['dry-run'];
const OUT_N = args.limit ? parseInt(args.limit, 10) : 8;   // guardamos 8, hero usa 5
const MIN_OUT = 5;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// categorias PT genéricas (pesquisas de tipo, não de marca)
const CATEGORY_PREFIXES = [
  'creme hidratante', 'protetor solar', 'protetor solar facial', 'sérum facial',
  'água micelar', 'contorno de olhos', 'esfoliante facial', 'máscara facial',
  'creme de rosto', 'ácido hialurónico', 'niacinamida', 'vitamina c rosto',
  'creme de mãos', 'champô anticaspa', 'creme anti-idade',
];

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
// FILLER = palavras não-descritivas (locadores/ruído). NÃO inclui tipos de
// produto (creme, gel, serum…) que são descritivos e essenciais para mapear.
const FILLER = new Set(('para o a os as de do da com sem e em no na loja lojas preco precos preço preços comprar online barato barata melhor melhores oficial site portugal paris espana espanha amazon mercadona continente worten opiniao opinioes opinião opiniões marca').split(' '));

function volFromName(name) {
  const m = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return (u === 'l' || u === 'kg') ? n * 1000 : n;
}

async function suggest(q, attempt = 1) {
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=pt&gl=pt&q=' + encodeURIComponent(q);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = JSON.parse(await r.text());
    return Array.isArray(j[1]) ? j[1] : [];
  } catch (e) {
    if (attempt < 3) { await new Promise(s => setTimeout(s, 800 * attempt)); return suggest(q, attempt + 1); }
    return null; // null = falhou (distingue de "sem sugestões")
  }
}

function bestOffer(seed, ean, blocked) {
  let best = null, n = 0;
  for (const g of seed.store_products) {
    if (blocked.has(g.store_slug + '|' + ean)) continue;
    let hasIt = false;
    for (const it of g.items) {
      if (it.ean !== ean || it.in_stock === false) continue;
      hasIt = true;
      const cands = [];
      if (it.price > 0) cands.push({ price: it.price, url: it.url });
      for (const v of (it.variants || [])) if (v.price > 0 && v.in_stock !== false) cands.push({ price: v.price, url: v.url || it.url });
      for (const c of cands) if (!best || c.price < best.price) {
        const st = seed.stores.find(s => s.slug === g.store_slug);
        best = { price: c.price, store_slug: g.store_slug, store_name: st ? st.name : g.store_slug, url: c.url };
      }
    }
    if (hasIt) n++;
  }
  return best ? { ...best, n_stores: n } : null;
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const blocked = new Set((() => { try { return (JSON.parse(fs.readFileSync(BLOCKLIST, 'utf8')).blocked || []).map(b => b.store_slug + '|' + b.ean); } catch { return []; } })());

  // índice de produtos: tokens normalizados de marca+nome, contagem de lojas
  const storeCount = {};
  for (const g of seed.store_products) for (const it of g.items) if (it.ean && it.in_stock !== false) storeCount[it.ean] = (storeCount[it.ean] || 0) + 1;
  const products = seed.products.filter(p => p.image_url && !isNonCosmetic(p.name)).map(p => {
    const brandN = norm(p.brand || '');
    const brandTok = brandN.split(' ').filter(Boolean);
    const nameN = norm(p.name || '');
    // tokens do NOME sem os da marca (para exigir match específico do produto)
    const nameOnly = new Set(nameN.split(' ').filter(w => w.length >= 3 && !brandTok.includes(w) && !FILLER.has(w)));
    return { ean: p.ean, name: p.name, brand: p.brand, text: norm((p.brand || '') + ' ' + (p.name || '')), brandTok, nameOnly, n: storeCount[p.ean] || 0 };
  });

  // prefixos = top marcas do catálogo (por nº produtos) + categorias
  const brandCount = {};
  for (const p of seed.products) { const b = (p.brand || '').trim(); if (b) brandCount[b] = (brandCount[b] || 0) + 1; }
  const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([b]) => b);
  const prefixes = [...topBrands.map(norm), ...CATEGORY_PREFIXES.map(norm)];

  console.log(`🔎 ${prefixes.length} prefixos (25 marcas + ${CATEGORY_PREFIXES.length} categorias) → Google Suggest…`);
  let failed = 0;
  const termScores = new Map(); // termo normalizado -> {score, term}
  for (const pfx of prefixes) {
    const list = await suggest(pfx);
    await new Promise(s => setTimeout(s, 220));
    if (list === null) { failed++; continue; }
    list.forEach((term, i) => {
      const t = norm(term);
      if (t === pfx || t.length < 4) return;
      const sc = Math.max(1, 10 - i);           // posição = popularidade
      const cur = termScores.get(t) || { score: 0, term };
      cur.score += sc; termScores.set(t, cur);
    });
  }
  console.log(`  ${termScores.size} pesquisas populares distintas (${failed}/${prefixes.length} prefixos falharam)`);

  // mapear cada pesquisa ao melhor produto do catálogo
  const perEan = new Map(); // ean -> {score, terms:Set}
  const rankedTerms = [...termScores.values()].sort((a, b) => b.score - a.score);
  for (const { term, score } of rankedTerms) {
    const tks = norm(term).split(' ').filter(w => w.length >= 3 && !FILLER.has(w));
    if (!tks.length) continue;
    let best = null, bestScore = 0;
    for (const p of products) {
      const brandHit = p.brandTok.length && p.brandTok.every(bt => tks.includes(bt));
      // tokens do termo que batem no NOME do produto (específicos, não a marca)
      let nameHits = 0;
      for (const w of tks) if (p.nameOnly.has(w)) nameHits++;
      // exige SEMPRE ≥1 token específico do NOME — mata pesquisas de marca pura
      // ("clarins paris" → 0 nameHits → ignorado). Categoria s/ marca precisa ≥2.
      if (nameHits < 1) continue;
      if (!brandHit && nameHits < 2) continue;
      // nº de lojas só desempata ligeiramente (peso alto homogeneizava tudo em
      // Avène, que nomeia produtos com as palavras da categoria e é muito vendido)
      const ms = nameHits * 2 + (brandHit ? 3 : 0) + Math.min(2, p.n / 8);
      if (ms > bestScore) { bestScore = ms; best = p; }
    }
    if (!best) continue;
    const cur = perEan.get(best.ean) || { score: 0, terms: new Set() };
    cur.score += score; cur.terms.add(term); perEan.set(best.ean, cur);
  }

  // condensar top produtos com oferta viva
  const ranked = [...perEan.entries()].sort((a, b) => b[1].score - a[1].score);
  const out = [];
  for (const [ean, info] of ranked) {
    if (out.length >= OUT_N) break;
    const p = seed.products.find(x => x.ean === ean);
    const off = bestOffer(seed, ean, blocked);
    if (!p || !off) continue;
    out.push({
      ean, name: String(p.name || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi, '').trim(),
      brand: p.brand, image_url: p.image_url || null,
      best_price: off.price, best_store: off.store_name, best_store_slug: off.store_slug, best_url: off.url,
      search_term: [...info.terms][0], pop_score: info.score,
    });
  }

  let source = 'google-suggest-pt';
  if (out.length < MIN_OUT) {
    // FALLBACK: mais vendidos por nº de lojas (nunca deixa o hero vazio/com lixo)
    console.log(`  ⚠ só ${out.length} mapeados (<${MIN_OUT}) — fallback aos mais carregados`);
    source = out.length ? 'google-suggest-pt+fallback' : 'fallback-mais-lojas';
    const seen = new Set(out.map(o => o.ean));
    const byStores = products.filter(p => !seen.has(p.ean)).sort((a, b) => b.n - a.n);
    for (const p of byStores) {
      if (out.length >= MIN_OUT) break;
      const off = bestOffer(seed, p.ean, blocked); if (!off) continue;
      const full = seed.products.find(x => x.ean === p.ean);
      out.push({ ean: p.ean, name: String(full.name || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi, '').trim(), brand: full.brand, image_url: full.image_url, best_price: off.price, best_store: off.store_name, best_store_slug: off.store_slug, best_url: off.url, search_term: null, pop_score: 0 });
    }
  }

  console.log('\n=== TOP produtos mais procurados ===');
  out.forEach((o, i) => console.log(`  ${i + 1}. [${o.pop_score}] ${o.brand} · ${o.name.slice(0, 38)} — ${o.best_price}€ @${o.best_store}${o.search_term ? '  («' + o.search_term + '»)' : ''}`));

  if (out.length < MIN_OUT) { console.error(`✗ só ${out.length} produtos — NÃO escrevo (evita hero fraco).`); process.exit(1); }
  if (DRY) { console.log('\n🧪 --dry-run: nada escrito.'); return; }
  fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), source, products: out }, null, 2));
  console.log(`\n✓ ${OUT.replace(ROOT, '.')} (${out.length} produtos, fonte: ${source})`);
}

if (require.main === module) {
  process.on('unhandledRejection', e => console.warn('⚠ unhandledRejection:', e && e.message));
  main().catch(e => { console.error('FATAL', e); process.exit(1); });
}
module.exports = { main };
