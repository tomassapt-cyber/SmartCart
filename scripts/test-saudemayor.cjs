'use strict';
// Saúde Mayor (2026-11-26): o EAN passou de `mpn` para `gtin13` a 20/11 e o leitor ignorou
// todas as fichas durante 6 dias. Lêem-se as duas formas da ficha. Sem rede.
// Uso: node scripts/test-saudemayor.cjs
const assert = require('node:assert/strict');
const { extractProductData } = require('./scrape-saudemayor-catalog');

const ficha = (ld) => `<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`;

// 1) ficha de 26/11/2026 (tirada da loja): JSON válido, EAN em gtin13, barras e acentos escapados
const NOVA = '{"@context":"https:\\/\\/schema.org","@type":"Product","name":"Caudalie Vinotherapist Lo\\u00e7\\u00e3o Corpo Nutritiva 200Ml","description":"","image":["https:\\/\\/assets.saudemayor.pt\\/images\\/originals\\/7088351.webp"],"sku":"7088351","offers":{"@type":"Offer","url":"https:\\/\\/www.saudemayor.pt\\/caudalie-vinotherapist-locao-corpo-nutritiva-200ml.html","availability":"https:\\/\\/schema.org\\/InStock","priceCurrency":"EUR","itemCondition":"https:\\/\\/schema.org\\/NewCondition","price":13.95},"brand":{"@type":"Brand","name":"Caudalie"},"gtin13":"3522930003632"}';
let d = extractProductData(ficha(NOVA));
assert.ok(d, 'a ficha nova tem de dar produto');
assert.equal(d.ean, '3522930003632');
assert.equal(d.cnp, '7088351');
assert.equal(d.price, 13.95);
assert.equal(d.in_stock, true, 'InStock com barras escapadas');
assert.equal(d.name, 'Caudalie Vinotherapist Loção Corpo Nutritiva 200Ml');
assert.equal(d.brand, 'Caudalie');
assert.equal(d.image_url, 'https://assets.saudemayor.pt/images/originals/7088351.webp');
assert.equal(d.volume_ml, 200);

// esgotado
d = extractProductData(ficha(NOVA.replace('InStock', 'OutOfStock')));
assert.equal(d.in_stock, false);

// 2) ficha antiga (até 20/11): JSON partido pelo template, EAN em mpn — continua a ler-se
const ANTIGA = '{"@context":"https://schema.org\n{{ $x }}\n","@type":"Product","name":"Avène Cicalfate+ Creme 40ml","image":["https://assets.saudemayor.pt/images/originals/6914418.webp"],"sku":"6914418","mpn":"3282770390421","brand":{"@type":"Brand","name":"Avène"},"offers":{"@type":"Offer","availability":"https://schema.org/InStock","price":9.9}}';
d = extractProductData(ficha(ANTIGA));
assert.ok(d, 'a ficha antiga continua a dar produto');
assert.equal(d.ean, '3282770390421');
assert.equal(d.in_stock, true);
assert.equal(d.image_url, 'https://assets.saudemayor.pt/images/originals/6914418.webp');

// 3) o gtin ganha ao mpn; códigos falsos não contam
d = extractProductData(ficha(NOVA.replace('"gtin13":"3522930003632"', '"gtin13":"3522930003632","mpn":"1234567"')));
assert.equal(d.ean, '3522930003632');
assert.equal(extractProductData(ficha(NOVA.replace('3522930003632', '3520000000632'))), null, 'enchimento 000000 não é EAN');
assert.equal(extractProductData(ficha(NOVA.replace('"gtin13":"3522930003632"', '"gtin13":"7088351"'))), null, 'CNP não é EAN');
d = extractProductData(ficha(NOVA.replace('"gtin13":"3522930003632"', '"gtin13":"","mpn":"3522930003632"')));
assert.equal(d.ean, '3522930003632', 'gtin13 vazio → cai para o mpn');

// 4) sem preço ou sem JSON-LD → nada
assert.equal(extractProductData(ficha(NOVA.replace('"price":13.95', '"price":0'))), null);
assert.equal(extractProductData('<html><body>sem dados</body></html>'), null);

console.log('saudemayor: EAN em gtin13 (ficha nova) e em mpn (ficha antiga), stock, imagem e acentos — tudo passou');
