'use strict';
// Ofertas no tamanho da ficha (2026-11-17): preço do tamanho que a ficha diz, ofertas de
// outro tamanho mudadas para a ficha delas ou fora, e fichas-família intactas. Sem rede.
// Uso: node scripts/test-tamanho-da-ficha.cjs
const assert = require('node:assert/strict');
const { alinharTamanhoDaFicha, tamanhoDoNome, tamanhoDoUrl } = require('./lib/tamanho-da-ficha');

// 1. o tamanho do nome e do endereço
assert.equal(tamanhoDoNome('Uriage Hyséac Gel Limpeza Suave 500ml'), 500);
assert.equal(tamanhoDoNome('Bioderma Sensibio H2O 1L'), 1000);
assert.equal(tamanhoDoNome('Volume Lift Shampoo'), null, 'sem tamanho: ficha-família');
assert.equal(tamanhoDoNome('Isdin Ureadin Creme 50ml + Contorno 15ml'), null, 'pack: fica de fora');
assert.equal(tamanhoDoNome('Neutrogena Loção 2x750ml'), null, 'pack: fica de fora');
assert.equal(tamanhoDoUrl('https://loja/uriage-hyseac-gel-limp-suave-150ml.html'), 150);
assert.equal(tamanhoDoUrl('https://loja/uriage-hyseac-gel-de-limpeza-150-ml'), 150);
assert.equal(tamanhoDoUrl('https://loja/produto/klorane-champo-de-roma/'), null);

// 2. a ficha de 500 ml com ofertas de várias páginas
const v = (ml, price, url) => ({ volume_ml: ml, price, url, in_stock: true });
const seed = {
  products: [
    { ean: '3661434000973', name: 'Uriage Hyséac Gel Limpeza Suave 500ml', brand: 'Uriage' },
    { ean: '3661434000966', name: 'Uriage Gel de Limpeza Hyséac 150ml', brand: 'Uriage' },
    { ean: '3600000000017', name: 'Avène Cicalfate Creme 40ml', brand: 'Avène' },
    { ean: '3600000000024', name: 'Avène Cicalfate Creme', brand: 'Avène' },          // ficha-família
  ],
  store_products: [
    // os dois tamanhos na página: o preço passa ao de 500 ml (era o de 150)
    { store_slug: 'pharma24', items: [{ ean: '3661434000973', price: 4.83, url: 'https://p24/hyseac-150ml.html', variants: [v(150, 4.83, 'https://p24/hyseac-150ml.html'), v(500, 9.87, 'https://p24/hyseac-500ml.html')] }] },
    // só 500 ml: fica igual
    { store_slug: 'atida', items: [{ ean: '3661434000973', price: 13.99, url: 'https://atida/hyseac-500-ml', variants: [v(500, 13.99, 'https://atida/hyseac-500-ml')] }] },
    { store_slug: 'easyfarma', items: [{ ean: '3661434000973', price: 14.34, url: 'https://easy/hyseac-500ml', variants: [v(500, 14.34, 'https://easy/hyseac-500ml')] }] },
    // só 150 ml: muda para a ficha de 150 ml (há exatamente uma)
    { store_slug: 'dermis', items: [{ ean: '3661434000973', price: 9.54, url: 'https://dermis/hyseac-150ml', variants: [v(150, 9.54, 'https://dermis/hyseac-150ml')] }] },
    // só 150 ml e a loja já tem a ficha de 150 ml: sai (não fica duplicada)
    { store_slug: 'barreiros', items: [
      { ean: '3661434000973', price: 15.5, url: 'https://barr/hyseac-150-ml', variants: [v(150, 15.5, 'https://barr/hyseac-150-ml')] },
      { ean: '3661434000966', price: 15.5, url: 'https://barr/hyseac-150-ml-b', variants: [v(150, 15.5, 'https://barr/hyseac-150-ml-b')] }] },
    // só 1 L e não há ficha de 1 L: sai desta ficha
    { store_slug: 'lojashampoo', items: [{ ean: '3661434000973', price: 25, url: 'https://ls/hyseac-1000ml', variants: [v(1000, 25, 'https://ls/hyseac-1000ml')] }] },
    // a variante diz 250 mas o endereço diz 500: a oferta fica
    { store_slug: 'hiperfarma', items: [{ ean: '3661434000973', price: 12, url: 'https://hiper/hyseac-500ml-x-1', variants: [v(250, 12, 'https://hiper/hyseac-500ml-x-1')] }] },
    // ficha-família: nada muda
    { store_slug: 'atida2', items: [{ ean: '3600000000024', price: 8, url: 'https://a2/cica-15ml', variants: [v(15, 8, 'https://a2/cica-15ml'), v(40, 12, 'https://a2/cica-40ml')] }] },
  ],
};
const r = alinharTamanhoDaFicha(seed);
const item = (loja, ean) => seed.store_products.find(g => g.store_slug === loja).items.find(i => i.ean === ean);
assert.equal(item('pharma24', '3661434000973').price, 9.87, 'preço do tamanho da ficha');
assert.equal(item('pharma24', '3661434000973').url, 'https://p24/hyseac-500ml.html', 'link do tamanho da ficha');
assert.equal(item('pharma24', '3661434000973').variants.length, 2, 'as variantes ficam todas (para o modal)');
assert.equal(item('atida', '3661434000973').price, 13.99);
assert.ok(item('dermis', '3661434000966') && !item('dermis', '3661434000973'), 'só 150 ml: mudou para a ficha de 150 ml');
assert.ok(!item('barreiros', '3661434000973') && item('barreiros', '3661434000966'), 'a loja já tinha a de 150 ml: sai, sem duplicar');
assert.ok(!item('lojashampoo', '3661434000973'), 'outro tamanho sem ficha: sai');
assert.ok(item('hiperfarma', '3661434000973'), 'o endereço confirma o tamanho da ficha: fica');
assert.equal(item('atida2', '3600000000024').price, 8, 'ficha-família intacta');
assert.deepEqual(r, { alinhadas: 1, movidas: 1, escondidas: 2, duvidosas: 0 });

// 3. idempotente
const antes = JSON.stringify(seed);
assert.deepEqual(alinharTamanhoDaFicha(seed), { alinhadas: 0, movidas: 0, escondidas: 0, duvidosas: 0 });
assert.equal(JSON.stringify(seed), antes);

// 4. a maioria das ofertas diz outro tamanho: o nome da ficha é que pode estar errado, não se mexe
const duvida = {
  products: [{ ean: '1', name: 'Creme X 50ml', brand: 'X' }],
  store_products: ['a', 'b', 'c'].map((l, i) => ({ store_slug: l, items: [{ ean: '1', price: 10 + i, url: `https://${l}/creme-x-100ml`, variants: [v(100, 10 + i, `https://${l}/creme-x-100ml`)] }] })),
};
assert.deepEqual(alinharTamanhoDaFicha(duvida), { alinhadas: 0, movidas: 0, escondidas: 0, duvidosas: 1 });
assert.equal(duvida.store_products.flatMap(g => g.items).length, 3);

console.log('tamanho da ficha: preço do tamanho certo, mudança para a ficha do tamanho, fora sem duplicar, endereço confirma, família intacta, nome em dúvida, idempotente — tudo passou');
