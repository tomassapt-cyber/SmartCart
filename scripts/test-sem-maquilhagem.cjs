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

// 2026-11-16: maquilhagem com a categoria da loja errada («skincare»), pelo tipo de
// produto, pela secção da Notino («Marca Olhos/Lábios …») e pelas marcas só de maquilhagem
const simContexto = [
  ["Lancôme Lábios L'Absolu Rouge Drama Matte 274", 'skincare', 'Lancôme'],
  ['Base de maquilhagem Isdin Coverage FPS50+ Tom 3 Areia 30 ml', 'skincare', 'Isdin'],
  ['Estée Lauder Maquilhagem para o rosto Double Wear Stay-In-Place Makeup 1W1', 'skincare', 'Estée Lauder'],
  ['SISLEY Olhos Phyto Khol Star Waterproof No. 07 Mystic Blue / 0,3 g', 'skincare', 'Sisley'],
  ['SENSAI Mascara 38°C Collection Lash Lengthener Mascara 10 ml', 'skincare', 'Sensai'],
  ['La Roche Posay Toleriane Teint Pó Fixador Matificante 12gr', 'skincare', 'La Roche-Posay'],
  ['Lápis de Olhos La Roche Posay Respectissime Preto 1 pc', 'skincare', 'La Roche-Posay'],
  ['Andreia Hybrid Gel Fusion Cor H13 Nude', 'skincare', 'Andreia'],
  ['Clarins Joli Rouge 711 Papaya', 'skincare', 'Clarins'],
  ['TIRTIR Mask Fit Aura Cushion 21W NATURAL IVORY', 'skincare', 'TirTir'],
  ['Beter Elite 45 Pincel Maquilhagem de Pós', 'skincare', 'Beter'],
  ['Maybelline New York Instant Perfector Glow 4 em 1', 'skincare', 'Maybelline'],
];
for (const [n, c, b] of simContexto) assert.equal(eMaquilhagem(n, c, b), true, 'é maquilhagem (contexto): ' + n);
const naoContexto = [
  ['Uriage Batom Hidratante Eau Thermale 4 gr', 'skincare', 'Uriage'],
  ['Care Protective Lipstick Almond Oil SPF50', 'makeup', 'Lirene'],
  ['Lierac Diopti Fluido Corretor de Olheiras 15 ml', 'skincare', 'Lierac'],
  ['Martiderm Platinum Corretor de Olhos Diurnos 10ml', 'skincare', 'Martiderm'],
  ['Roc Creme Noturno Corretor de Rugas 30 ml', 'skincare', 'RoC'],
  ['Caudalie Vinoperfect Tratamento Iluminador de Olhos 15 ml', 'skincare', 'Caudalie'],
  ['Filorga OPTIM-EYES Contorno dos Olhos 3em1 15 ml', 'skincare', 'Filorga'],
  ['Klorane Pensos para Olhos Lisos Hidro-Gel 2 Pensos', 'skincare', 'Klorane'],
  ['Colírio iVision para Olhos Secos 10 ml', 'skincare', 'iVision'],
  ['Neutrogena Lábios Stick Hidratante 2 x 3g', 'skincare', 'Neutrogena'],
  ['Schwarzkopf Palette Coloração Permanente 5-68', 'skincare', 'Schwarzkopf'],
  ['Máscara Facial Revitalizante Argile Rouge', 'skincare', 'Gamarde'],
  ['Ecrinal Unhas Verniz Amargo 10ml', 'skincare', 'Ecrinal'],
  ['Excilor Forte Verniz Fungos Unhas - 30ml', 'body', 'Excilor'],
  ['Sensodyne Expert Protect Creme Dental Reforço Esmalte 75 ml', 'skincare', 'Sensodyne'],
  ['Pixi Olhos Ultra-Conditioning Lash & Brow Serum 2 ml', 'skincare', 'Pixi'],
  ['Essence Hello, Good Stuff! Sérum de Óleo Bifásico 30ml', 'skincare', 'Essence'],
  ['Pincel Mineral Trópico Havaiano FPS30 1ud', 'skincare', 'Hawaiian Tropic'],
  ['URGO Glitter 2 Tamanhos - 18 Pensos', 'skincare', 'Urgo'],
  ['Versace Dylan Blush Pink Eau De Parfum Spray 30ml', 'perfume', 'Versace'],
  // «cuidado com cor» fica por agora (ESCONDER_CUIDADO_COM_COR = false; decisão do Tomás)
  ['Bioderma Sensibio AR BB Creme 40ml', 'skincare', 'Bioderma'],
  ['Avène Protetor Solar SPF50 Creme com Cor 50 ml', 'skincare', 'Avène'],
];
for (const [n, c, b] of naoContexto) assert.equal(eMaquilhagem(n, c, b), false, 'não é maquilhagem (contexto): ' + n);
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
console.log('sem maquilhagem: reconhecimento (nome, categoria confirmada e contexto), cuidado dos lábios, olhos, unhas e cabelo protegidos, filtro de visibilidade — tudo passou');
