'use strict';
// juntar-por-cnp (2026-11-13): ofertas CNP-only juntas ao produto do EAN certo, só com
// o CNP «seguro» e as guardas de marca, nome, tamanho, preço e URL. Sem rede.
// Uso: node scripts/test-juntar-por-cnp.cjs
const assert = require('node:assert/strict');
const { dicionarioSeguro, juntar, FONTE } = require('./juntar-por-cnp');

const agora = '2026-11-13T10:00:00Z';
const seed = () => ({
  products: [
    { ean: '3337875597197', name: 'CeraVe Gel de Limpeza Espumante 473ml', brand: 'CeraVe', category: 'skincare' },
    { ean: '3282770149524', name: 'Avène Cicalfate+ Creme Reparador 40ml', brand: 'Avène', category: 'skincare' },
    { ean: '5600000000017', name: 'BOW Eau de Parfum Nancy 100ml', brand: 'BOW', category: 'perfume' },
    { ean: '3337872411991', name: 'La Roche-Posay Effaclar Gel 400ml', brand: 'La Roche-Posay', category: 'skincare' },
  ],
  store_products: [
    { store_slug: 'a', items: [{ ean: '3337875597197', price: 14, in_stock: true, url: 'https://a/cerave', verified_at: agora }, { ean: '3282770149524', price: 9, in_stock: true, url: 'https://a/cicalfate', verified_at: agora }, { ean: '5600000000017', price: 20, in_stock: true, url: 'https://a/bow', verified_at: agora }] },
    { store_slug: 'b', items: [{ ean: '3337875597197', price: 13, in_stock: true, url: 'https://b/cerave', verified_at: agora }, { ean: '3282770149524', price: 9.5, in_stock: true, url: 'https://b/cicalfate', verified_at: agora }] },
    { store_slug: 'farm', items: [{ ean: '3337872411991', price: 15, in_stock: true, url: 'https://farm/effaclar', verified_at: agora }] },
  ],
});
// lojas a e b dão CNP + EAN; «farm» só dá CNP
const catalogos = () => new Map([
  ['a', [{ ean: '3337875597197', cnp: '1111111', name: 'CeraVe Gel 473', status: 'ok' }, { ean: '3282770149524', cnp: '2222222', name: 'Cicalfate', status: 'ok' }, { ean: '5600000000017', cnp: '3333333', name: 'BOW Nancy', status: 'ok' }, { ean: '3337872411991', cnp: '4444444', name: 'Effaclar', status: 'ok' }]],
  ['b', [{ ean: '3337875597197', cnp: '1111111', name: 'CeraVe', status: 'ok' }, { ean: '3282770149524', cnp: '2222222', name: 'Cicalfate', status: 'ok' }, { ean: '5600000000017', cnp: '3333333', name: 'BOW Nancy', status: 'ok' }, { ean: '3337872411992', cnp: '4444444', name: 'Effaclar outro', status: 'ok' }]],
  ['farm', [
    { cnp: '1111111', name: 'CeraVe Gel de Limpeza Espumante 473 ml', brand: 'CeraVe', price: 12.5, in_stock: true, url: 'https://farm/cerave', status: 'ok', scraped_at: agora },   // junta-se
    { cnp: '2222222', name: 'Bioderma Cicabio Creme 40ml', brand: 'Bioderma', price: 9, in_stock: true, url: 'https://farm/cicabio', status: 'ok', scraped_at: agora },        // marca em conflito
    { cnp: '3333333', name: 'BOW Perfume Betty 100ml', brand: 'BOW', price: 19, in_stock: true, url: 'https://farm/bow-betty', status: 'ok', scraped_at: agora },             // outro perfume (nome)
    { cnp: '4444444', name: 'Effaclar Gel 400ml', brand: 'La Roche-Posay', price: 14, in_stock: true, url: 'https://farm/effaclar2', status: 'ok', scraped_at: agora },      // CNP em conflito
  ]],
]);

// 1. dicionário: 2+ lojas a concordar, nenhuma a contradizer
const d = dicionarioSeguro(catalogos());
assert.equal(d.get('1111111'), '3337875597197');
assert.equal(d.has('4444444'), false, 'CNP com dois EANs diferentes não entra');

// 2. junção com as guardas
const s = seed();
const { contas } = juntar(s, catalogos());
const farm = s.store_products.find(g => g.store_slug === 'farm').items;
const cerave = farm.find(i => i.ean === '3337875597197');
assert.ok(cerave && cerave.source === FONTE && cerave.price === 12.5, 'a CeraVe da farmácia junta-se pelo CNP');
assert.ok(!farm.some(i => i.ean === '3282770149524'), 'marca em conflito (Bioderma ≠ Avène) fica de fora');
assert.ok(!farm.some(i => i.ean === '5600000000017'), 'BOW Betty ≠ BOW Nancy fica de fora');
assert.equal(contas.farm.novas, 1);
assert.equal(farm.find(i => i.ean === '3337872411991').price, 15, 'a oferta do integrador não é tocada');

// 3. outra corrida: refresca só as ofertas deste passo
const cat2 = catalogos(); cat2.get('farm')[0].price = 11.9; cat2.get('farm')[0].scraped_at = '2026-11-14T10:00:00Z';
const r2 = juntar(s, cat2);
assert.equal(farm.find(i => i.ean === '3337875597197').price, 11.9);
assert.equal(r2.contas.farm.novas, 0);
console.log('juntar-por-cnp: dicionário seguro, junção com guardas (marca, nome, CNP em conflito), oferta do integrador intacta, refresco — tudo passou');
