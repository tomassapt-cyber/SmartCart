'use strict';
// Perfumes da seleção (2026-11-06): reconhecimento das linhas, categoria
// «perfume» e leitura dos tamanhos da Primor (gs1:hasVariant). Sem rede.
// Uso: node scripts/test-perfumes-selecao.cjs
const assert = require('node:assert/strict');
const { linhaDoPerfume, carregar } = require('./lib/perfumes-selecao');
const { fixCategory } = require('./lib/classify-category');
const { extractProductData, extractVariantes } = require('./scrape-primor-catalog');

// 1. a seleção está bem formada
const c = carregar();
assert.ok(c.linhas.length >= 80, 'pelo menos 80 linhas');
for (const l of c.linhas) assert.ok(l.marcas.length && l.palavras.length && /^[fmu]$/.test(l.genero), 'linha mal formada: ' + JSON.stringify(l));

// 2. reconhecimento
const sim = [
  ['Dior Sauvage Eau de Toilette 100ml', 'Dior', 'sauvage'],
  ['Sauvage Elixir 60 ml', 'Christian Dior', 'sauvage'],
  ['CHANEL Nº5 Eau de Parfum Vaporizador 50 ml', 'Chanel', 'n 5'],
  ['Good Girl Blush EDP 80ml', 'Carolina Herrera', 'good girl'],
  ['Lancôme Idôle Eau de Parfum 25 ml', 'Lancome', 'idole'],
  ['Y Eau de Parfum 100ml', 'Yves Saint Laurent', 'y'],
  ['Acqua di Giò Pour Homme EDT 100 ml', 'Giorgio Armani', 'acqua di gio'],
  ['Lacoste L.12.12 Blanc EDT 100ml', 'Lacoste', 'l 12 12'],
  ['Nina Ricci Nina EDT 50ml', 'Nina Ricci', 'nina'],
  ['hugo boss hugo man edt 125ml', 'Hugo Boss', 'hugo man'],
];
for (const [name, brand, linha] of sim) { const l = linhaDoPerfume({ name, brand }); assert.ok(l, 'devia reconhecer: ' + name); assert.equal(l.linha, linha, name); }
assert.ok(linhaDoPerfume({ name: 'Acqua Di Gio Intense', brand: 'ARMANI', category: 'fragrance' }), 'a categoria da loja conta como fragrância');
const nao = [
  ['Sauvage Desodorizante Stick 75g', 'Dior'],
  ['Coffret Sauvage EDT 100ml + Gel de banho', 'Dior'],
  ['Cofre Libre 50ML', 'Yves Saint Laurent'],
  ['Yvresse Eau de Toilette', 'Yves Saint Laurent'],
  ['Burberry Weekend EDP', 'Burberry'],
  ['nina ricci nina ricci l air du temps eau de toilette', ''],
  ['Issey Miyake L\'Eau d\'Issey Desodorizante Roll-On', 'Issey Miyake'],
  ['Sauvage', 'Dior'],
  ['Effaclar Duo+ 40ml', 'La Roche-Posay'],
];
for (const [name, brand] of nao) assert.equal(linhaDoPerfume({ name, brand }), null, 'não devia reconhecer: ' + name);

// 3. categoria: perfume da seleção sem «Eau de…» passa a perfume; o resto como antes
assert.equal(fixCategory('Terre d\'Hermès Parfum Recarga 125ml', 'skincare', 'Hermès'), 'perfume');
assert.equal(fixCategory('HAPPY HEART parfum spray 50 ml', 'skincare', 'Clinique'), 'perfume');
assert.equal(fixCategory('Creme Hidratante Sans Parfum 50ml', 'skincare', 'Avène'), 'skincare');
assert.equal(fixCategory('Effaclar Duo+', 'skincare', 'La Roche-Posay'), 'skincare');
assert.equal(fixCategory('Champô Anticaspa 200ml', 'skincare'), 'hair');

// 4. Primor: ficha com tamanhos (o caso do Miss Dior Parfum, 06/11)
const pagina = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Miss Dior Parfum', brand: { '@type': 'Brand', name: 'DIOR' }, image: 'https://cdn/x.jpg',
  offers: [{ '@type': 'Offer', price: 70.95, sku: '4AF08094', availability: 'https://schema.org/InStock' }, { '@type': 'Offer', price: 99.95, sku: '4AF08095', availability: 'https://schema.org/OutOfStock' }] })}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': { '@vocab': 'https://gs1.org/voc/' }, '@type': 'gs1:Product', 'gs1:hasVariant': [
  { '@type': 'gs1:IndividualProduct', '@id': 'https://pt.primor.eu/pt_pt/dior-miss-dior-parfum-112157.html#variant-4AF08094', 'gs1:productName': 'Miss Dior Parfum - 35ML', 'gs1:netContent': { 'gs1:value': 35, 'gs1:unitCode': 'MLT' }, 'gs1:gtin': '3348901708944' },
  { '@type': 'gs1:IndividualProduct', '@id': 'https://pt.primor.eu/pt_pt/dior-miss-dior-parfum-112157.html#variant-4AF08095', 'gs1:productName': 'Miss Dior Parfum - 50ML', 'gs1:netContent': { 'gs1:value': 50, 'gs1:unitCode': 'MLT' }, 'gs1:gtin': '3348901708937' },
  { '@type': 'gs1:IndividualProduct', '@id': 'https://pt.primor.eu/pt_pt/dior-miss-dior-parfum-112157.html#variant-SEMOFERTA', 'gs1:productName': 'Miss Dior Parfum - 80ML', 'gs1:netContent': { 'gs1:value': 80, 'gs1:unitCode': 'MLT' }, 'gs1:gtin': '3348901708920' },
] })}</script>`;
assert.equal(extractProductData(pagina), null, 'o Product sem EAN continua a não dar produto simples');
const vs = extractVariantes(pagina);
assert.deepEqual(vs.map(v => [v.sufixo, v.ean, v.price, v.in_stock, v.volume_ml]), [
  ['#variant-4AF08094', '3348901708944', 70.95, true, 35],
  ['#variant-4AF08095', '3348901708937', 99.95, false, 50],
], 'um por tamanho com preço; sem oferta não entra');
assert.equal(vs[0].brand, 'DIOR');
assert.deepEqual(extractVariantes('<html></html>'), []);
console.log('perfumes da seleção: linhas, reconhecimento, categoria e tamanhos da Primor — tudo passou');
