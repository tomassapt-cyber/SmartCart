#!/usr/bin/env node
/**
 * A PORTA DA FASE 4b: as fontes novas produzem as MESMAS globais?
 * ============================================================================
 * O site tem agora duas formas de construir o seu estado:
 *   · rebuildCatalogIndexes(seed)                  — do catálogo embutido (hoje)
 *   · rebuildCatalogIndexesFromSources(arranque, indice) — das fontes novas
 *
 * Este verificador corre AS DUAS sobre os mesmos dados e compara global a
 * global, campo a campo. Enquanto não der zero diferenças, o bloco do catálogo
 * NÃO se esvazia — porque tudo o que diverge aqui aparece no site como um
 * preço errado, uma ordem trocada ou um cartão em branco, sem dar erro nenhum.
 *
 * Uso: node scripts/verify-catalog-sources.js
 * Sai com 1 se houver divergências.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');

function extrair(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não encontrei: ' + assinatura);
  let n = 0, fim = -1;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') n++;
    else if (html[k] === '}') { n--; if (n === 0) { fim = k + 1; break; } }
  }
  return html.slice(i, fim);
}

const codigo = [
  'function _volFromName(', 'function refVolumeFor(', 'function offerPriceAtVol(',
  'function rebuildCatalogIndexes(seed)',
  'function rebuildCatalogIndexesFromSources(',
].map(d => { try { return extrair(d); } catch (e) { console.warn('  ⚠ ' + e.message); return null; } })
  .filter(Boolean).join('\n');

// ── o catálogo, com a mesma cadeia do inject ───────────────────────────────
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
const { isNonCosmetic } = require('./lib/product-fingerprint');
require('./lib/verified-shipping').applyVerifiedShipping(seed, ROOT);
const vf = require('./lib/variant-fixes');
vf.fixTruncatedVariantPrices(seed);
vf.dropWrongProductVariants(seed);
require('./dedup-ean-variants').mergeEanVariants(seed);
require('./lib/promo-fold').foldPromoVariants(seed);
require('./lib/ghost-offers').dropGhostOffers(seed);
const cv = require('./lib/catalog-visibility');
cv.dropRottenOffers(seed);
cv.applyVisibilityFilter(seed, isNonCosmetic);
require('./lib/name-cleanup').applyNameCleanup(seed);

const { construirIndice, construirArranque } = require('./build-search-index.js');
const { indice } = construirIndice(seed);
const arranque = construirArranque(indice, seed);

function correr(qual) {
  const ctx = {
    IMAGE_OVERRIDES: {}, HIDE_ESTIMATES: true,
    SEED: null, STORES: null, STORE_BY_SLUG: null, PRODUCTS: null, PRODUCT_BY_EAN: null,
    OFFERS_BY_PRODUCT: null, OFFERS_BY_PRODUCT_ALL: null, PRODUCT_STATS: null,
    POPULARITY_SCORE: null, TOP50_ROT: null, HIGHLIGHTS: null,
    statsByEanMap: function () { },
    console, Object, Number, Boolean, Math, Array, Set, Date, String, JSON,
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  ctx.__seed = seed; ctx.__arr = arranque; ctx.__idx = indice;
  vm.runInContext(qual === 'velho'
    ? 'rebuildCatalogIndexes(__seed)'
    : 'rebuildCatalogIndexesFromSources(__arr, __idx)', ctx);
  return ctx;
}

console.log('  a construir pelas DUAS vias…');
const A = correr('velho');   // catálogo embutido
const B = correr('novo');    // fontes novas
console.log('');

let mau = 0;
const ok = (nome, cond, detalhe) => {
  if (cond) console.log(`  ✓ ${nome}`);
  else { console.log(`  ✗ ${nome}${detalhe ? '  — ' + detalhe : ''}`); mau++; }
};

console.log('=== lojas ===');
ok(`quantas (${B.STORES.length})`, A.STORES.length === B.STORES.length, `antigo=${A.STORES.length}`);
const lojaDif = A.STORES.filter((s, i) => {
  const o = B.STORE_BY_SLUG[s.slug];
  return !o || o.name !== s.name || o.base_url !== s.base_url
    || o.free_shipping_threshold !== s.free_shipping_threshold;
});
ok('nome, endereço e portes iguais', lojaDif.length === 0,
  lojaDif.length ? `${lojaDif.length} diferentes, ex: ${lojaDif[0].slug}` : '');

console.log('\n=== produtos ===');
ok(`quantos (${B.PRODUCTS.length})`, A.PRODUCTS.length === B.PRODUCTS.length, `antigo=${A.PRODUCTS.length}`);
let difNome = 0, difMarca = 0, difCat = 0, difOrdem = 0, semImg = 0;
for (let i = 0; i < Math.min(A.PRODUCTS.length, B.PRODUCTS.length); i++) {
  const a = A.PRODUCTS[i], b = B.PRODUCTS[i];
  if (a.ean !== b.ean) { difOrdem++; continue; }
  if ((a.name || '') !== (b.name || '')) difNome++;
  if ((a.brand || null) !== (b.brand || null)) difMarca++;
  if ((a.category || null) !== (b.category || null)) difCat++;
  if (a.image_url && !b.image_url) semImg++;
}
ok('mesma ordem (ean a ean)', difOrdem === 0, `${difOrdem} fora de ordem`);
ok('nomes iguais', difNome === 0, `${difNome} diferentes`);
ok('marcas iguais', difMarca === 0, `${difMarca} diferentes`);
ok('categorias iguais', difCat === 0, `${difCat} diferentes`);
console.log(`  ℹ imagens ainda por carregar: ${semImg} (vêm com as ofertas, por desenho)`);

console.log('\n=== estatísticas (nº de lojas, preço mínimo e máximo) ===');
const sA = new Map(A.PRODUCT_STATS.map(s => [s.ean, s]));
let difLojas = 0, difMin = 0, difMax = 0, difPoup = 0, ausente = 0;
for (const s of B.PRODUCT_STATS) {
  const a = sA.get(s.ean);
  if (!a) { ausente++; continue; }
  if (a.storeCount !== s.storeCount) difLojas++;
  if (Math.round((a.bestPrice ?? -1) * 100) !== Math.round((s.bestPrice ?? -1) * 100)) difMin++;
  if (Math.round((a.worstPrice ?? -1) * 100) !== Math.round((s.worstPrice ?? -1) * 100)) difMax++;
  if (Math.abs((a.savings ?? 0) - (s.savings ?? 0)) > 0.005) difPoup++;
}
ok('todos presentes', ausente === 0, `${ausente} em falta`);
ok('nº de lojas', difLojas === 0, `${difLojas} diferentes`);
ok('preço mínimo', difMin === 0, `${difMin} diferentes`);
ok('preço máximo', difMax === 0, `${difMax} diferentes`);
ok('poupança', difPoup === 0, `${difPoup} diferentes`);

console.log('\n=== ordenação e etiquetas ===');
const popA = Object.keys(A.POPULARITY_SCORE).sort((x, y) => A.POPULARITY_SCORE[y] - A.POPULARITY_SCORE[x]).slice(0, 300);
const popB = Object.keys(B.POPULARITY_SCORE).sort((x, y) => B.POPULARITY_SCORE[y] - B.POPULARITY_SCORE[x]).slice(0, 300);
ok('os 300 mais populares, pela mesma ordem', JSON.stringify(popA) === JSON.stringify(popB));
for (const k of ['newReleases', 'bestSellers', 'tiktok']) {
  ok(`etiquetas ${k}`, JSON.stringify(A.HIGHLIGHTS[k]) === JSON.stringify(B.HIGHLIGHTS[k]),
    `antigo=${JSON.stringify(A.HIGHLIGHTS[k])} novo=${JSON.stringify(B.HIGHLIGHTS[k])}`);
}

console.log('\n=== o que muda por desenho (não é divergência) ===');
console.log(`  · OFFERS_BY_PRODUCT: antigo ${Object.keys(A.OFFERS_BY_PRODUCT).length} produtos · novo 0 (chegam da BD à medida)`);
console.log(`  · SEED.store_products: antigo ${A.SEED.store_products.length} lojas · novo 0`);

console.log(`\n⇒ ${mau === 0 ? '✓ ZERO DIVERGÊNCIAS — as fontes novas produzem o mesmo estado' : `✗ ${mau} DIVERGÊNCIAS — não esvaziar o catálogo`}`);
process.exit(mau === 0 ? 0 : 1);
