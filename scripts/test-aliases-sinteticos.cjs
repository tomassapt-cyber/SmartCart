'use strict';
// Fichas sem EAN juntas às fichas com EAN (2026-11-16): as regras do gerador e a leitura
// do ficheiro gerado na publicação (os manuais mandam). Sem rede.
// Uso: node scripts/test-aliases-sinteticos.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { gerar, versoes } = require('./aliases-sinteticos');
const { mergeEanVariants } = require('./dedup-ean-variants');

// 1. palavras de versão, tom, aroma e FPS
assert.deepEqual([...versoes('Anthelios SPF 50+')], ['spf-50'], '«50+» não é a versão Plus');
assert.ok(versoes('Halibut Derma Plus').has('plus'));
assert.ok(!versoes('Effaclar Duo +M').has('pack'), '«Duo» é nome de produto');
assert.ok(versoes('Desodorizante Roll-on Citrus').has('aroma-citrus'));
assert.ok(versoes('Weleda Desodorizante de Romã').has('aroma-roma'));
assert.ok(versoes('Creme Noite').has('noite') && versoes('Night Cream').has('noite'));
assert.ok(versoes('Máscara Tecido Hidratante').has('tecido') && !versoes('Máscara Facial Hidratante').has('tecido'));

// 2. o gerador
const of = (ean, ml, url) => ({ ean, price: 10, url, variants: [{ volume_ml: ml, price: 10, url }] });
const seed = {
  products: [
    { ean: '3401397240470', name: 'Bioderma Sensibio DS+ Creme 40 ml', brand: 'Bioderma', category: 'skincare' },
    { ean: 'sweetcare-sensibio-ds', name: 'Sensibio DS+ Creme', brand: 'Bioderma', category: 'skincare' },
    { ean: '4001638095436', name: 'Weleda Desodorizante Roll-on de Romã 50 ml', brand: 'Weleda', category: 'body' },
    { ean: 'wells-111', name: 'Weleda Desodorizante Roll-on Citrus', brand: 'Weleda', category: 'body' },
    { ean: '3600000000017', name: 'Cetaphil Creme Hidratante Facial Diário FPS 30 50 ml', brand: 'Cetaphil', category: 'skincare' },
    { ean: 'wells-222', name: 'Cetaphil Creme Hidratante Facial Diário', brand: 'Cetaphil', category: 'skincare' },
    { ean: '3600000000024', name: 'Elvive Shampoo Hidra Hialurónico 250ml', brand: 'Elvive', category: 'hair' },
    { ean: 'wells-333', name: 'Elvive Máscara Hidra Hialurónico', brand: 'Elvive', category: 'hair' },
    { ean: '3600000000031', name: 'Avène Cicalfate Creme Reparador 40ml', brand: 'Avène', category: 'skincare' },
    // nome traduzido: «Body Milk» = «Leite Corporal»
    { ean: '8429420100015', name: 'Sesderma Atopises Leite Corporal 400ml', brand: 'Sesderma', category: 'body' },
    { ean: 'sweetcare-atopises', name: 'Atopises Body Milk', brand: 'Sesderma', category: 'body' },
    { ean: 'sweetcare-xemose', name: 'Avène Cicalfate Creme Reparador Protetor', brand: 'Avène', category: 'skincare' },
  ],
  store_products: [
    { store_slug: 'a', items: [of('3401397240470', 40, 'https://a/ds'), of('4001638095436', 50, 'https://a/roma'), of('3600000000017', 50, 'https://a/ceta'), of('3600000000024', 250, 'https://a/elv'), of('3600000000031', 40, 'https://a/xem'), of('8429420100015', 400, 'https://a/ato')] },
    { store_slug: 'sweetcare', items: [of('sweetcare-sensibio-ds', 40, 'https://sc/ds'), of('sweetcare-xemose', 40, 'https://sc/xem'), of('sweetcare-atopises', 400, 'https://sc/ato')] },
    { store_slug: 'wells', items: [of('wells-111', 50, 'https://w/citrus'), of('wells-222', 50, 'https://w/ceta'), of('wells-333', 250, 'https://w/elv')] },
  ],
};
const { finais } = gerar(seed);
const par = Object.fromEntries(finais.map(x => [x.s.ean, x.p.ean]));
assert.equal(par['sweetcare-sensibio-ds'], '3401397240470', 'o mesmo creme junta-se');
assert.equal(par['sweetcare-xemose'], '3600000000031', 'uma palavra a mais de um lado só não impede');
assert.equal(par['sweetcare-atopises'], '8429420100015', 'nome traduzido: Body Milk = Leite Corporal');
assert.equal(par['wells-111'], undefined, 'Citrus ≠ Romã');
assert.equal(par['wells-222'], undefined, 'sem FPS ≠ com FPS 30');
assert.equal(par['wells-333'], undefined, 'máscara ≠ shampoo');

// 3. a publicação lê o ficheiro gerado; os manuais mandam
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'aliases-'));
fs.mkdirSync(path.join(raiz, 'data'));
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases-auto.json'), JSON.stringify({ _comment: 'x',
  '3401397240470': { aliases: ['sweetcare-sensibio-ds'] }, '3600000000031': { aliases: ['sweetcare-xemose'] } }));
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases.json'), JSON.stringify({ '3600000000024': { aliases: ['sweetcare-xemose'], reason: 'teste: o manual manda' } }));
const s2 = JSON.parse(JSON.stringify(seed));
mergeEanVariants(s2, raiz);
const eans = new Set(s2.products.map(p => p.ean));
assert.ok(!eans.has('sweetcare-sensibio-ds'), 'a ficha sem EAN sai');
assert.ok(s2.store_products.find(g => g.store_slug === 'sweetcare').items.some(i => i.ean === '3401397240470'), 'a oferta passa para a ficha com EAN');
assert.ok(s2.store_products.find(g => g.store_slug === 'sweetcare').items.some(i => i.ean === '3600000000024'), 'o par manual manda sobre o gerado');
console.log('aliases sintéticos: versões/tons/aromas/FPS/tecido, nomes traduzidos, junta o mesmo produto e recusa variantes, publicação com os manuais a mandar — tudo passou');
