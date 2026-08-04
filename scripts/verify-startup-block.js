#!/usr/bin/env node
/**
 * A porta do bloco de arranque: bate certo com o que o SITE calcula?
 * ============================================================================
 * O bloco leva as etiquetas (Viral/Novo/Bestseller), as contagens por categoria
 * e por marca, e os 150 produtos mais populares. Tudo isso é hoje calculado no
 * browser, a partir do catálogo inteiro. Se a réplica do build divergir, as
 * etiquetas passam a apontar para outros produtos e as contagens mentem — sem
 * dar erro nenhum.
 *
 * Este verificador extrai as funções REAIS do demo.html, corre-as sobre o mesmo
 * catálogo e compara. Enquanto não der zero divergências, não se liga nada.
 *
 * Uso: node scripts/verify-startup-block.js
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
].map(d => { try { return extrair(d); } catch { return null; } }).filter(Boolean).join('\n');

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
ctx.__seed = seed;
vm.runInContext('rebuildCatalogIndexes(__seed)', ctx);

// ── o que o build produziu ─────────────────────────────────────────────────
const { construirIndice, construirArranque } = require('./build-search-index.js');
const { indice } = construirIndice(seed);
const arranque = construirArranque(indice, seed);

let mau = 0;
const ok = (nome, cond, detalhe) => {
  if (cond) console.log(`  ✓ ${nome}`);
  else { console.log(`  ✗ ${nome}${detalhe ? ' — ' + detalhe : ''}`); mau++; }
};

console.log('=== etiquetas (Viral / Novo / Bestseller) ===');
for (const chave of ['newReleases', 'bestSellers', 'tiktok']) {
  const doSite = ctx.HIGHLIGHTS[chave];
  const doBuild = arranque.highlights[chave];
  const iguais = JSON.stringify(doSite) === JSON.stringify(doBuild);
  ok(`${chave}: ${doBuild.length} EANs`, iguais,
    iguais ? '' : `site=${JSON.stringify(doSite)} build=${JSON.stringify(doBuild)}`);
}

console.log('\n=== popularidade: a ORDEM dos 150 primeiros ===');
// o site ordena por POPULARITY_SCORE (antes do baralhamento por época)
const ordemSite = Object.keys(ctx.POPULARITY_SCORE)
  .sort((a, b) => (ctx.POPULARITY_SCORE[b] ?? 0) - (ctx.POPULARITY_SCORE[a] ?? 0))
  .slice(0, 150);
const ordemBuild = arranque.primeiros.map(p => p.ean);
const iguaisOrdem = JSON.stringify(ordemSite) === JSON.stringify(ordemBuild);
ok(`os mesmos 150 produtos, pela mesma ordem`, iguaisOrdem);
if (!iguaisOrdem) {
  const soSite = ordemSite.filter(e => !ordemBuild.includes(e));
  const soBuild = ordemBuild.filter(e => !ordemSite.includes(e));
  console.log(`      só no site:  ${soSite.slice(0, 4).join(', ')}${soSite.length > 4 ? ` (+${soSite.length - 4})` : ''}`);
  console.log(`      só no build: ${soBuild.slice(0, 4).join(', ')}${soBuild.length > 4 ? ` (+${soBuild.length - 4})` : ''}`);
  const primeiraDif = ordemSite.findIndex((e, i) => e !== ordemBuild[i]);
  if (primeiraDif >= 0) console.log(`      primeira diferença na posição ${primeiraDif + 1}`);
}

console.log('\n=== contagens ===');
const catsSite = {};
for (const p of ctx.PRODUCTS) { const c = p.category || ''; if (c) catsSite[c] = (catsSite[c] || 0) + 1; }
const catsIguais = JSON.stringify(Object.entries(catsSite).sort()) === JSON.stringify(Object.entries(arranque.categorias).sort());
ok(`categorias (${Object.keys(arranque.categorias).length})`, catsIguais,
  catsIguais ? '' : `site=${JSON.stringify(catsSite)} build=${JSON.stringify(arranque.categorias)}`);

const marcasSite = {};
for (const p of ctx.PRODUCTS) { const m = p.brand || ''; if (m) marcasSite[m] = (marcasSite[m] || 0) + 1; }
const top40Site = Object.entries(marcasSite).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([n, c]) => `${n}:${c}`);
const top40Build = arranque.marcas.map(m => `${m.nome}:${m.n}`);
ok(`as 40 marcas mais frequentes`, JSON.stringify(top40Site) === JSON.stringify(top40Build));

ok(`total de produtos (${arranque.totais.produtos})`, arranque.totais.produtos === ctx.PRODUCTS.length,
  `site=${ctx.PRODUCTS.length}`);

console.log('\n=== integridade dos 150 ===');
ok('todos têm EAN', arranque.primeiros.every(p => p.ean));
ok('todos têm preço mínimo', arranque.primeiros.every(p => p.min != null && p.min > 0));
ok('todos têm nome', arranque.primeiros.every(p => p.nome));
const comImg = arranque.primeiros.filter(p => p.img).length;
console.log(`  ℹ com imagem: ${comImg}/150`);

console.log(`\n⇒ ${mau === 0 ? '✓ ZERO DIVERGÊNCIAS — o bloco de arranque pode substituir o cálculo em runtime' : `✗ ${mau} DIVERGÊNCIAS — não ligar`}`);
process.exit(mau === 0 ? 0 : 1);
