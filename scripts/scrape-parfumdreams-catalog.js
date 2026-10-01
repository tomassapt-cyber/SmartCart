#!/usr/bin/env node
/**
 * CosMath — scraper da Parfumdreams (parfumdreams.pt) · loja 89
 * ===============================================================
 * Perfumaria online alemã (Parfümerie Akzente GmbH) com loja portuguesa
 * própria: ~15.400 fichas no mapa do site, perfumes + cuidado de rosto/corpo/
 * cabelo + maquilhagem de marcas de perfumaria (Shiseido, Clarins, Lancaster…).
 *
 * PORQUE ENTROU (2026-10-01, amostra de 150 fichas com EAN): 0,97× a mediana
 * nos 22 produtos em comum, a mais barata em 36% — e 85% dos EAN são NOVOS no
 * CosMath (a perfumaria de marca que as farmácias não vendem).
 *
 * A FICHA É UM "ProductGroup": um bloco JSON-LD com hasVariant[], uma entrada
 * por tamanho, cada uma com gtin13, preço e stock próprios. Por isso o
 * `extrair` devolve uma LISTA (uma entrada por variante com EAN), e não o
 * Product único que a recolha genérica espera. Fichas antigas com @type
 * Product simples também são lidas.
 *
 * ⚠️ Cada ficha pesa ~1,3 MB (~93 KB comprimida — o fetch pede gzip); 4 em
 * paralelo, ~1 h por passagem. Acessível dos runners (sondar-acesso.yml,
 * 2026-10-01).
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/parfumdreams-full.json
 * Uso: node scripts/scrape-parfumdreams-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');
const { decodeEntities } = require('./lib/name-cleanup');

const BASE = 'https://www.parfumdreams.pt';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'parfumdreams-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const eanOk = s => /^\d{8}$|^\d{12,14}$/.test(String(s || '').trim());
// "20 Stk." (alemão, ficou por traduzir) → "20 un."
const limpaNome = s => decodeEntities(String(s || '')).replace(/\bStk\.?(?=\s|$)/g, 'un.').replace(/\s+/g, ' ').trim();

function blocosJsonLd(html) {
  const saida = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { saida.push(...[].concat(JSON.parse(m[1].trim())).flatMap(x => (x && x['@graph']) ? x['@graph'] : [x])); } catch { /* bloco partido: ignora */ }
  }
  return saida;
}

function entrada(url, p, marca, img) {
  const o = [].concat(p.offers || [])[0] || {};
  const preco = Number(o.price ?? (o.priceSpecification && [].concat(o.priceSpecification)[0]?.price));
  if (!(preco > 0)) return null;
  const ean = [p.gtin13, p.gtin, p.gtin14, p.gtin12, p.gtin8].map(x => String(x || '').trim()).find(eanOk) || null;
  const imagem = [].concat(p.image || img || [])[0];
  return {
    url: o.url || url, status: 'ok', scraped_at: new Date().toISOString(),
    name: limpaNome(p.name),
    brand: marca ? decodeEntities(String(marca)).trim() : null,
    ean, cnp: null,
    image_url: typeof imagem === 'string' ? imagem : (imagem && imagem.url) || null,
    price: preco, previous_price: null,
    in_stock: !o.availability || /InStock|LimitedAvailability|PreOrder/i.test(String(o.availability)),
    volume_ml: null, category: null, variants: [],
  };
}

function extrair(url, html) {
  const cands = blocosJsonLd(html);
  const tipo = (x, t) => x && [].concat(x['@type'] || []).includes(t);
  const grupo = cands.find(x => tipo(x, 'ProductGroup'));
  const marcaDe = x => typeof x.brand === 'string' ? x.brand : (x.brand && x.brand.name) || null;
  if (grupo) {
    const vistos = new Set();
    return [].concat(grupo.hasVariant || []).map(v => entrada(url, v, marcaDe(v) || marcaDe(grupo), grupo.image))
      .filter(e => e && e.ean && !vistos.has(e.ean) && vistos.add(e.ean));
  }
  const p = cands.find(x => tipo(x, 'Product'));
  const e = p && entrada(url, p, marcaDe(p));
  return e ? [e] : null;
}

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: `${BASE}/Sitemaps/sitemap.pt.xml`,
    filtroFilho: /\/Articles\./i,
    filtroUrl: /\/index_\d+\.aspx$/i,
    concorrencia: 4, pausaMs: 300,
    limite: args.limite ? Number(args.limite) : undefined,
    extrair,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} entradas`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · entradas: ${r.produtos.length} (com EAN: ${r.produtos.filter(p => p.ean).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 10000) { console.error(`✗ Só ${r.produtos.length} entradas (mínimo 10.000; ~15.400 fichas a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
