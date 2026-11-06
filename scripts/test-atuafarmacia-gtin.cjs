'use strict';
// A Tua Farmácia (2026-11-06): EAN por tamanho a partir da cache do .js; um
// produto com vários tamanhos de EAN próprio sai um por tamanho. Sem rede.
// Uso: node scripts/test-atuafarmacia-gtin.cjs
const assert = require('node:assert/strict');
const { aplicarGtin, mapProduct, keyFromSku } = require('./scrape-atuafarmacia-catalog');

const shopify = {
  handle: 'cerave-gel-espuma', title: 'CeraVe Gel de Limpeza Espumante', vendor: 'CeraVe', images: [],
  variants: [
    { id: 111, title: '236 ml', option1: '236 ml', price: '9.90', compare_at_price: null, available: true, sku: '6913112' },
    { id: 222, title: '473 ml', option1: '473 ml', price: '15.40', compare_at_price: '17.00', available: false, sku: '6913120' },
  ],
};
const simples = { handle: 'avene-agua', title: 'Avène Água Termal 300ml', vendor: 'Avène', images: [], variants: [{ id: 333, title: 'Default Title', price: '9.00', available: true, sku: '5440987' }] };
const semCodigo = { handle: 'x', title: 'Produto sem barcode 50ml', vendor: 'X', images: [], variants: [{ id: 444, title: 'Default Title', price: '5.00', available: true, sku: '1234567' }] };

const ps = [mapProduct(shopify, 'skincare'), mapProduct(simples, 'skincare'), mapProduct(semCodigo, 'skincare')];
assert.equal(ps[0].variants[0].id, '111', 'o id da variante fica guardado para a cache');
assert.deepEqual(keyFromSku('6913112'), { ean: null, cnp: '6913112' });

const cache = { 111: '3337875597180', 222: '3337875597197', 333: '3433422404397', 444: '' };
const out = aplicarGtin(ps, cache);

const cerave = out.filter(p => p.handle === 'cerave-gel-espuma');
assert.equal(cerave.length, 2, 'dois tamanhos com EAN próprio → dois produtos');
assert.deepEqual(cerave.map(p => [p.url, p.ean, p.price, p.in_stock, p.volume_ml, p.cnp]), [
  ['https://www.atuafarmacia.pt/products/cerave-gel-espuma?variant=111', '3337875597180', 9.9, true, 236, '6913112'],
  ['https://www.atuafarmacia.pt/products/cerave-gel-espuma?variant=222', '3337875597197', 15.4, false, 473, '6913120'],
]);
assert.equal(cerave[1].previous_price, 17, 'o preço riscado acompanha o tamanho');
assert.equal(cerave[0].variants.length, 1);

const avene = out.find(p => p.handle === 'avene-agua');
assert.equal(avene.ean, '3433422404397', 'um só tamanho: o EAN passa a ser o do produto');
assert.equal(avene.cnp, '5440987', 'o CNP continua lá');
assert.equal(avene.url, 'https://www.atuafarmacia.pt/products/avene-agua');

const sem = out.find(p => p.handle === 'x');
assert.equal(sem.ean, null, 'barcode vazio: fica só o CNP, como antes');
assert.equal(sem.cnp, '1234567');

// barcode com dígito de controlo errado não entra
const ps2 = [mapProduct(simples, 'skincare')];
assert.equal(aplicarGtin(ps2, { 333: '3433422404390' })[0].ean, null);

console.log('atuafarmacia-gtin: EAN por tamanho pela cache, desdobramento com ?variant=, CNP mantido, barcode inválido fora — tudo passou');
