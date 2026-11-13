'use strict';
// Sem maquilhagem (decisão do Tomás, 2026-11-13): só cosmética e perfumes no site.
// eMaquilhagem decide; o filtro de visibilidade esconde. Sem rede.
// Uso: node scripts/test-sem-maquilhagem.cjs
const assert = require('node:assert/strict');
const { eMaquilhagem, fixCategory } = require('./lib/classify-category');
const cv = require('./lib/catalog-visibility');

const sim = [
  ['Clarins Batom Joli Rouge 773', 'skincare', 'Clarins'],
  ['Catrice Lashes To Kill Máscara De Pestanas Volume', 'skincare', 'Catrice'],
  ['OPI Verniz de unhas Classics 15 ml', 'skincare', 'OPI'],
  ['Shiseido Synchro Skin Base de Maquilhagem SPF30', 'skincare', 'Shiseido'],
  ['Avène Couvrance Base Compacta em Creme', 'skincare', 'Avène'],
  ['Rouge Allure', 'makeup', 'Chanel'],
  ['Volumatic Mascara', 'makeup', 'L.A. Girl'],
  ['Naked Reloaded Eyeshadow Palette 14,2 gr', 'makeup', 'Urban Decay'],
  ['Glow on the Go Pincel de Maquilhagem 4 em 1', 'makeup', 'Cala'],
];
for (const [n, c, b] of sim) assert.equal(eMaquilhagem(n, c, b), true, 'é maquilhagem: ' + n);
const nao = [
  ['Batom de Cieiro Labello Original', 'body', 'Labello'],
  ['Avène Cicalfate Reparador Labial 10ml', 'skincare', 'Avène'],
  ['La Roche-Posay Effaclar Duo+', 'skincare', 'La Roche-Posay'],
  ['Good Girl Blush EDP 80ml', 'skincare', 'Carolina Herrera'],
  ['Creme de Mãos e Unhas Neutrogena', 'makeup', 'Neutrogena'],
  ['Bêlisina Forte Ampolas 20 ampolas x 5 ml', 'makeup', 'Bêlisina'],
  ['Coffret Acid Color Gloss', 'makeup', 'Redken'],
  ['Première Huile Gloss Réparatrice', 'makeup', 'Kérastase'],
  ['Mascara Capilar Reparadora Elvive', 'makeup', "L'Oréal Paris"],
  ['Nasomar Infantil Solução Pulverização Nasal', 'makeup', 'Nasomar'],
];
for (const [n, c, b] of nao) assert.equal(eMaquilhagem(n, c, b), false, 'não é maquilhagem: ' + n);
assert.equal(fixCategory('Nasomar Infantil Solução Nasal', 'makeup', 'Nasomar'), null, '«makeup» da loja sem confirmação no nome cai');
assert.equal(fixCategory('Rouge Allure', 'makeup', 'Chanel'), 'makeup');

// o filtro de visibilidade esconde a maquilhagem e conta-a
const agora = new Date().toISOString();
const seed = {
  products: [
    { ean: '1', name: 'Clarins Batom Joli Rouge 773', brand: 'Clarins', category: 'makeup' },
    { ean: '2', name: 'La Roche-Posay Effaclar Duo+ 40ml', brand: 'La Roche-Posay', category: 'skincare' },
    { ean: '3', name: 'Dior Sauvage Eau de Toilette 100ml', brand: 'Dior', category: 'perfume' },
  ],
  store_products: [
    { store_slug: 'a', items: ['1', '2', '3'].map(ean => ({ ean, price: 10, in_stock: true, verified_at: agora })) },
    { store_slug: 'b', items: ['1', '2', '3'].map(ean => ({ ean, price: 11, in_stock: true, verified_at: agora })) },
  ],
};
const r = cv.applyVisibilityFilter(seed, () => false);
assert.deepEqual(seed.products.map(p => p.ean), ['2', '3'], 'o batom sai; o creme e o perfume ficam');
assert.equal(r.maquilhagem, 1);
assert.ok(seed.store_products.every(g => g.items.every(i => i.ean !== '1')), 'as ofertas do batom saem também');
console.log('sem maquilhagem: reconhecimento (nome e categoria confirmada), cuidado dos lábios e unhas e cabelo protegidos, filtro de visibilidade — tudo passou');
