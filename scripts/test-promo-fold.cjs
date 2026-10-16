'use strict';
// promo-fold: o «+» de uma oferta junta a ficha à base; o «+» do NOME do
// produto (B5+, Creme+, SPF50+) não — 2026-10-16. Sem rede.
// Uso: node scripts/test-promo-fold.cjs
const assert = require('node:assert/strict');
const { PROMO, MULTIUNIT, stripPromo, classifyPromo, foldPromoVariants } = require('./lib/promo-fold');

// 1. o que é e o que não é promoção
for (const nome of [
  'La Roche-Posay Cicaplast Baume B5+ 15 ml',
  'Bioderma Cicabio Creme+ 40 mL',
  'La Roche-Posay Cicaplast Gel de Limpeza B5+ 100 ml',
  'Bioderma Photoderm Spray SPF50+ 200ML',
  'Heliocare 360º Solução Fluida Pigmentada FPS50+ 50 ml',
  'Perfume Iap Pharma Senhora Nº30+ 150ml',
]) assert.equal(PROMO.test(nome), false, `não é promoção: ${nome}`);
for (const nome of [
  'Eucerin pH5 Loção Hidratante + Oferta 100ml',
  'Iraltone Champô Fortificante 400ml+75ml',
  'Klorane Champô (+100ml)',
  'Creme Mãos 50ml +25%',
  'Isdin Lambdapil Champô 400ml −50% 2ª Unidade',
  'Avène Leite Solar FPS50+ 2x250 ml',
  'Rene Furterer Astera Fresh Champô 250ml Edição Limitada',
]) assert.equal(PROMO.test(nome), true, `é promoção: ${nome}`);

// 2. a etiqueta e o nome-base
assert.equal(classifyPromo('Iraltone Champô Fortificante 400ml+75ml').note, '+75ml grátis');
assert.equal(classifyPromo('Eucerin pH5 Loção Hidratante + Oferta 100ml').note, '+100ml grátis');
assert.equal(stripPromo('Eucerin pH5 Loção Hidratante + Oferta 100ml'), 'Eucerin pH5 Loção Hidratante');
assert.equal(stripPromo('La Roche-Posay Cicaplast Baume B5+ 15 ml'), 'La Roche-Posay Cicaplast Baume B5+ 15 ml', 'o B5+ fica no nome');
assert.equal(MULTIUNIT.test('Avène Leite Solar FPS50+ 2x250 ml'), true);
assert.equal(MULTIUNIT.test('Bioderma Photoderm Spray SPF50+ 200ML'), false);

// 3. a fusão: o B5+ 15 ml NÃO entra no B5 40 ml; a oferta verdadeira entra na base
const of = (ean, loja, preco) => ({ store_slug: loja, items: [{ ean, price: preco, in_stock: true, url: `https://${loja}/${ean}` }] });
const seed = {
  products: [
    { ean: '3337872412998', name: 'La Roche-Posay Cicaplast Baume B5 40ml', brand: 'La Roche-Posay' },
    { ean: '3337875816779', name: 'La Roche-Posay Cicaplast Baume B5+ 15 ml', brand: 'La Roche-Posay' },
    { ean: '1111111111116', name: 'Eucerin pH5 Loção Hidratante', brand: 'Eucerin' },
    { ean: '2222222222222', name: 'Eucerin pH5 Loção Hidratante + Oferta 100ml', brand: 'Eucerin' },
  ],
  store_products: [of('3337872412998', 'a', 9), of('3337875816779', 'b', 6), of('1111111111116', 'c', 12), of('2222222222222', 'd', 12.5)],
};
foldPromoVariants(seed);
const ids = seed.products.map(p => p.ean);
assert.ok(ids.includes('3337875816779'), 'o Cicaplast B5+ 15 ml fica com ficha própria');
assert.ok(!ids.includes('2222222222222'), 'a versão «+ Oferta» funde-se na base');
assert.equal(seed.store_products.find(g => g.store_slug === 'b').items[0].ean, '3337875816779');
assert.equal(seed.store_products.find(g => g.store_slug === 'd').items[0].ean, '1111111111116');

console.log('promo-fold: «+» do nome (B5+, Creme+, SPF50+) não é oferta; «+ Oferta», «400ml+75ml», «(+100ml)», «+25%», packs e edição limitada sim; fusão certa — tudo passou');
