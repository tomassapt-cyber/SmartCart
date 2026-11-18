'use strict';
// Power Beauty (2026-11-18): o refresh diário também apanha as fichas do mapa que vendem um produto
// que já temos e ainda não eram lidas (o EAN vem no fim do endereço). Sem rede.
// Uso: node scripts/test-powerbeauty-novos.cjs
const assert = require('node:assert/strict');
const { eanDoUrl, escolherNovos } = require('./scrape-powerbeauty-catalog');

const B = 'https://powerbeauty.pt';
assert.equal(eanDoUrl(`${B}/unisexo/25-fructis-aloe-naturel-sec-gel-creme-sans-rincage-400-ml-3600542117623.html`), '3600542117623');
assert.equal(eanDoUrl(`${B}/mulher/1234-perfume-sem-codigo.html`), null);
assert.equal(eanDoUrl(`${B}/homem/77-bed-head-615908431490`), '615908431490'); // sem .html, UPC de 12 dígitos

const nossos = new Set(['3600542117623', '3600523587834', '0615908431490', '615908432572']);
const conhecida = `${B}/mulher/23-elvive-dream-long-crema-stop-tijeras-200-ml-3600523587834.html`;
const mapa = [
  `${B}/unisexo/25-fructis-aloe-naturel-sec-gel-creme-sans-rincage-400-ml-3600542117623.html`, // nosso, nova → entra
  conhecida,                                                                                     // já lida → não repete
  `${B}/mulher/99-produto-que-nao-temos-8412345678905.html`,                                     // não é nosso → fica de fora
  `${B}/homem/77-bed-head-straighten-out-615908431490.html`,                                     // 12 díg. na loja, 13 connosco → entra
  `${B}/homem/78-bed-head-down-n-dirty-0615908432572.html`,                                      // 13 díg. na loja, 12 connosco → entra
  `${B}/mulher/100-marca-sem-codigo.html`,                                                       // sem EAN no endereço
  `${B}/1_pt_0_sitemap.xml`,                                                                     // não é ficha de produto
  `${B}/unisexo/25-fructis-aloe-naturel-sec-gel-creme-sans-rincage-400-ml-3600542117623.html`, // repetida no mapa
];
const novos = escolherNovos(mapa, nossos, new Set([conhecida]));
assert.deepEqual(novos, [
  `${B}/unisexo/25-fructis-aloe-naturel-sec-gel-creme-sans-rincage-400-ml-3600542117623.html`,
  `${B}/homem/77-bed-head-straighten-out-615908431490.html`,
  `${B}/homem/78-bed-head-down-n-dirty-0615908432572.html`,
]);
assert.deepEqual(escolherNovos([], nossos, new Set()), []);
console.log('ok test-powerbeauty-novos');
