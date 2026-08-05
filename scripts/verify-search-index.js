#!/usr/bin/env node
/**
 * A porta da Fase 4: o índice bate certo com o que o SITE calcula?
 * ============================================================================
 * O índice tem uma réplica das contas do cliente (nº de lojas, preço mínimo,
 * preço máximo, texto pesquisável). Se essa réplica divergir do original, a
 * pesquisa passa a devolver outra coisa, as ordenações trocam a ordem e os
 * preços mostrados deixam de ser os verdadeiros — tudo em silêncio.
 *
 * Este verificador não relê o código nem confia em comentários: EXTRAI as
 * funções reais do demo.html, corre-as sobre o mesmo catálogo, e compara
 * produto a produto. Enquanto não der ZERO divergências, não se troca a fonte
 * de dados da página.
 *
 * Uso:
 *   node scripts/verify-search-index.js [--amostra=N]
 * Sai com código 1 se houver divergências.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const AMOSTRA = args.amostra ? parseInt(args.amostra, 10) : 0;   // 0 = todos

// ── extrair as funções REAIS do demo.html ──────────────────────────────────
const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
function extrairFuncao(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não encontrei no demo.html: ' + assinatura);
  let n = 0, fim = -1;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') n++;
    else if (html[k] === '}') { n--; if (n === 0) { fim = k + 1; break; } }
  }
  if (fim < 0) throw new Error('não consegui fechar: ' + assinatura);
  return html.slice(i, fim);
}

const DEPENDENCIAS = [
  'function _volFromName(', 'function refVolumeFor(', 'function offerPriceAtVol(',
  'function rebuildCatalogIndexes(seed)',
  // o mínimo ABSOLUTO que o cartão mostra quando é menor que o mínimo ao volume
  // de referência — em 4,9% dos produtos é, e por muito. O índice guarda-o em
  // `ab`; sem esta comparação esse campo passava sem gate.
  'function bestOfferFor(ean)',
];
const codigo = DEPENDENCIAS.map(d => {
  try { return extrairFuncao(d); } catch (e) { console.warn('  ⚠ ' + e.message); return null; }
}).filter(Boolean).join('\n');

// ── o catálogo, com a mesma cadeia de correcções do inject ─────────────────
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

// ── correr as funções do SITE ──────────────────────────────────────────────
const ctx = {
  IMAGE_OVERRIDES: {}, HIDE_ESTIMATES: true,
  SEED: null, STORES: null, STORE_BY_SLUG: null, PRODUCTS: null, PRODUCT_BY_EAN: null,
  OFFERS_BY_PRODUCT: null, OFFERS_BY_PRODUCT_ALL: null, PRODUCT_STATS: null,
  POPULARITY_SCORE: null, TOP50_ROT: null, HIGHLIGHTS: null,
  statsByEanMap: function () {},
  console, Object, Number, Boolean, Math, Array, Set, Date, String, JSON,
};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);
ctx.__seed = seed;
vm.runInContext('rebuildCatalogIndexes(__seed)', ctx);
const doSite = ctx.PRODUCT_STATS;
console.log(`  site: ${doSite.length} produtos indexados`);

// ── o meu índice ───────────────────────────────────────────────────────────
const { construirIndice, textoPesquisavel } = require('./build-search-index.js');
const { indice } = construirIndice(seed);
console.log(`  índice: ${indice.n} produtos\n`);

if (indice.n !== doSite.length) {
  console.error(`✗ contagens diferentes: índice ${indice.n} vs site ${doSite.length}`);
  process.exit(1);
}

// ── comparar produto a produto ─────────────────────────────────────────────
const statsPorEan = new Map(doSite.map(s => [s.ean, s]));
const cent = v => (v == null ? -1 : Math.round(v * 100));

let iguais = 0;
const difs = { lojas: [], min: [], max: [], absoluto: [], ausente: [], texto: [] };
const total = AMOSTRA ? Math.min(AMOSTRA, indice.n) : indice.n;
const passo = AMOSTRA ? Math.floor(indice.n / total) || 1 : 1;

for (let i = 0; i < indice.n; i += passo) {
  const ean = indice.e[i];
  const s = statsPorEan.get(ean);
  if (!s) { difs.ausente.push(ean); continue; }

  let ok = true;
  if (s.storeCount !== indice.s[i]) { if (difs.lojas.length < 6) difs.lojas.push(`${ean}: site=${s.storeCount} índice=${indice.s[i]}`); ok = false; }
  if (cent(s.bestPrice) !== indice.mn[i]) { if (difs.min.length < 6) difs.min.push(`${ean}: site=${s.bestPrice} índice=${indice.mn[i] / 100}`); ok = false; }
  if (cent(s.worstPrice) !== indice.mx[i]) { if (difs.max.length < 6) difs.max.push(`${ean}: site=${s.worstPrice} índice=${indice.mx[i] / 100}`); ok = false; }

  // `ab` contra o bestOfferFor REAL do site
  const melhor = ctx.bestOfferFor(ean);
  const doSiteAbs = melhor ? cent(melhor.price) : -1;
  if (doSiteAbs !== indice.ab[i]) {
    if (difs.absoluto.length < 6) difs.absoluto.push(`${ean}: site=${doSiteAbs / 100} índice=${indice.ab[i] / 100}`);
    ok = false;
  }

  // o texto pesquisável tem de dar exactamente o mesmo que o _snorm do cliente
  const p = ctx.PRODUCT_BY_EAN[ean];
  if (p) {
    const doCliente = ((p.name || '') + ' ' + (p.brand || '') + ' ' + (p.category || ''))
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const doIndice = textoPesquisavel(indice.nm[i], indice.brands[indice.b[i]], indice.cats[indice.c[i]]);
    if (doCliente !== doIndice) { if (difs.texto.length < 4) difs.texto.push(`${ean}`); ok = false; }
  }

  if (ok) iguais++;
}

const comparados = Math.ceil(indice.n / passo);
console.log(`  comparados: ${comparados.toLocaleString('pt-PT')} produtos`);
console.log(`  idênticos:  ${iguais.toLocaleString('pt-PT')}`);
console.log('');
for (const [nome, lista] of Object.entries(difs)) {
  if (!lista.length) { console.log(`  ✓ ${nome}: 0 divergências`); continue; }
  console.log(`  ✗ ${nome}: divergências (amostra)`);
  lista.forEach(d => console.log('      ' + d));
}

const totalDifs = Object.values(difs).reduce((a, l) => a + l.length, 0);
const perfeito = iguais === comparados && totalDifs === 0;
console.log(`\n⇒ ${perfeito ? '✓ ZERO DIVERGÊNCIAS — o índice pode substituir o catálogo' : '✗ HÁ DIVERGÊNCIAS — não avançar'}`);
process.exit(perfeito ? 0 : 1);
