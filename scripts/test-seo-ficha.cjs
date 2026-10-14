#!/usr/bin/env node
// Teste offline do título e da descrição da ficha de produto (seoAbrirProduto do
// demo.html): o número de lojas é o DO PRODUTO (como o «N lojas» do cartão) e o
// texto vai com acentos. Antes: «Mela B3 — La Roche-Posay | preco em 102 lojas».
// Uso: node scripts/test-seo-ficha.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(process.env.DEMO || path.join(__dirname, '..', 'demo.html'), 'utf8');
const ini = html.indexOf('function seoSlug(');
const fim = html.indexOf('function seoFecharProduto(', ini);
assert.ok(ini > 0 && fim > ini, 'funções de SEO encontradas no demo.html');

function abrir(produto, stats, nLojasSite = 97) {
  const els = {};
  const el = id => (els[id] ||= { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const ctx = {
    PRODUCT_BY_EAN: { [produto.ean]: produto },
    STORES: Array.from({ length: nLojasSite }, (_, i) => ({ slug: 's' + i })),
    statsByEanMap: () => (stats ? { [produto.ean]: stats } : {}),
    PA_STATE: null, OFFERS_BY_PRODUCT: {}, SEO_URL_ANTERIOR: null,
    location: { origin: 'https://exemplo.test', pathname: '/', search: '' },
    history: { pushState() {} },
    document: {
      title: '', head: { appendChild() {} },
      getElementById: id => (id === 'seo-jsonld' ? null : el(id)),
      createElement: () => ({}),
    },
    setTimeout: () => 0, JSON, Math, String, Object,
  };
  vm.createContext(ctx);
  vm.runInContext('var SEO_URL_ANTERIOR = null;\n' + html.slice(ini, fim) + `\nseoAbrirProduto(${JSON.stringify(produto.ean)});`, ctx);
  return { titulo: ctx.document.title, desc: el('seo-og-desc').attrs.content, ogTitulo: el('seo-og-title').attrs.content };
}

let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }
const MELA = { ean: '3337875890021', name: 'Mela B3', brand: 'La Roche-Posay' };

caso('Mela B3 em 33 lojas: o título diz 33 (não as 97 do site) e leva acentos', () => {
  const r = abrir(MELA, { storeCount: 33 });
  assert.equal(r.titulo, 'Mela B3 — La Roche-Posay | preço em 33 lojas | CosMath');
  assert.equal(r.ogTitulo, r.titulo);
  assert.equal(r.desc, 'Compara o preço de Mela B3 em 33 lojas portuguesas. Preço verificado todos os dias.');
});

caso('uma só loja: singular', () => {
  const r = abrir(MELA, { storeCount: 1 });
  assert.equal(r.titulo, 'Mela B3 — La Roche-Posay | preço em 1 loja | CosMath');
  assert.equal(r.desc, 'Compara o preço de Mela B3 em 1 loja portuguesa. Preço verificado todos os dias.');
});

caso('sem contagem do índice: não inventa um número', () => {
  const r = abrir({ ean: '5601', name: 'Creme', brand: null }, null);
  assert.equal(r.titulo, 'Creme | preço | CosMath');
  assert.equal(r.desc, 'Compara o preço de Creme em lojas portuguesas. Preço verificado todos os dias.');
});

console.log(`\n${n}/${n} casos passaram`);
