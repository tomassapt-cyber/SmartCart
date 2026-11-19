'use strict';
// Continente (2026-11-18): o EAN (gtin13) do JSON-LD e a leitura completa garantida. Sem rede.
// Uso: node scripts/test-continente.cjs
const assert = require('node:assert/strict');
const { extractProductData, isProductUrl, precisaFull, FULL_DIAS } = require('./scrape-continente-catalog');

const ficha = produto => `<html><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', ...produto })}</script></html>`;
const base = { name: 'Sabonete Sólido Creme Soft Nivea', sku: '4456060', brand: { '@type': 'Brand', name: 'Nivea' }, offers: { '@type': 'Offer', price: '1.99', availability: 'https://schema.org/InStock' } };

// ---------- EAN: gtin13 válido entra; inválido, ausente ou o sku interno de 7 dígitos não
let d = extractProductData(ficha({ ...base, gtin13: '9005800405063' }));
assert.equal(d.ean, '9005800405063'); assert.equal(d.sku, '4456060'); assert.equal(d.price, 1.99); assert.equal(d.in_stock, true); assert.equal(d.brand, 'Nivea');
assert.equal(extractProductData(ficha({ ...base, gtin13: '9005800405064' })).ean, null, 'dígito de controlo errado');
assert.equal(extractProductData(ficha(base)).ean, null, 'sem gtin: fica para o fingerprint');
assert.equal(extractProductData(ficha({ ...base, gtin: '4005808135318' })).ean, '4005808135318', 'também aceita «gtin»');
assert.equal(extractProductData(ficha({ ...base, offers: { price: '0' } })), null, 'sem preço não entra');
assert.ok(isProductUrl('https://www.continente.pt/produto/sabonete-solido-creme-soft-nivea-nivea-4456060.html'));

// ---------- leitura completa: sem registo ou com mais de FULL_DIAS dias → completa
const agora = Date.parse('2026-11-18T12:00:00Z');
const dias = n => new Date(agora - n * 864e5).toISOString();
assert.equal(precisaFull(null, agora), true, 'sem catálogo anterior');
assert.equal(precisaFull({ products: [] }, agora), true, 'catálogo antigo sem full_at');
assert.equal(precisaFull({ full_at: dias(FULL_DIAS - 1) }, agora), false);
assert.equal(precisaFull({ full_at: dias(FULL_DIAS + 0.5) }, agora), true);
assert.equal(precisaFull({ full_at: 'lixo' }, agora), true);

console.log('continente: gtin13 = EAN (com verificação), sem EAN fica para o fingerprint, leitura completa garantida aos 7 dias — tudo passou');
