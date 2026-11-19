'use strict';
// Pharma24 (2026-11-18): o EAN passou do «mpn» para o «gtin13»; o CNP continua no sku. Sem rede.
// Uso: node scripts/test-pharma24.cjs
const assert = require('node:assert/strict');
const { ficha } = require('./scrape-pharma24-catalog');

// o bloco da loja tem PHP por processar (JSON inválido): lê-se por expressões regulares
const pag = campos => `<html><script type="application/ld+json">{"@context": "<?php $__contextArgs = [] ?>", "@type": "Product", ${campos},
  "name": "Chicco Easy Bowl Azul 6M", "brand": {"@type": "Brand", "name": "Chicco"}, "image": ["https://x/i.jpg"],
  "offers": {"@type": "Offer", "price": "7.99", "availability": "https://schema.org/InStock"}}</script></html>`;
const U = 'https://www.pharma24.pt/x.html';

let p = ficha(U, pag('"sku": "6608208", "gtin13": "8058664127771"'));
assert.equal(p.cnp, '6608208'); assert.equal(p.ean, '8058664127771', 'EAN no gtin13 (desde 2026-11)');
assert.equal(p.price, 7.99); assert.equal(p.in_stock, true); assert.equal(p.brand, 'Chicco');
assert.equal(ficha(U, pag('"sku": "6608208", "mpn": "8058664127771"')).ean, '8058664127771', 'EAN no mpn (até 2026-11)');
assert.equal(ficha(U, pag('"sku": "1001156"')).ean, null, 'só CNP');
assert.equal(ficha(U, pag('"sku": "1001156"')).cnp, '1001156');
assert.equal(ficha(U, pag('"sku": "6608208", "gtin13": "8058664127772"')).ean, null, 'dígito de controlo errado');
assert.equal(ficha(U, pag('"sku": "ABC"')), null, 'sem CNP não é ficha de produto');

console.log('pharma24: EAN no gtin13 ou no mpn (com verificação), CNP no sku, bloco com PHP — tudo passou');
