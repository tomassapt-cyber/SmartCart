'use strict';
// Testes da fusão do mesmo GTIN com/sem zeros (scripts/dedup-ean-variants.js):
// o que já fazia (12 ↔ 13 ↔ 14), o UPC sem zero (11 dígitos) e a lista de
// exclusão. Sem rede. Uso: node scripts/test-dedup-ean-variants.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { mergeEanVariants, isGtin } = require('./dedup-ean-variants');

const of = (ean, extra = {}) => ({ ean, price: 10, in_stock: true, url: 'https://loja/' + ean, verified_at: '2026-10-14T00:00:00Z', ...extra });
const seed = () => ({
  products: [
    { ean: '850045076290', name: 'Olaplex Nº5P', brand: 'Olaplex' },
    { ean: '0850045076290', name: 'Olaplex 5P', brand: 'Olaplex', image_url: 'img.jpg' },
    { ean: '18084054970', name: 'Aveda Invati Light', brand: 'Aveda' },          // UPC sem o zero
    { ean: '018084054970', name: 'Aveda Invati Ultra Advanced Light', brand: 'Aveda' },
    { ean: '12345678906', name: 'Código de 11 com dígito errado', brand: 'X' },
    { ean: '012345678906', name: 'Outro', brand: 'X' },
    { ean: '3337875598767', name: 'CeraVe 1L', brand: 'CeraVe' },
  ],
  store_products: [
    { store_slug: 'druni', items: [of('850045076290'), of('18084054970')] },
    { store_slug: 'atida', items: [of('0850045076290'), of('018084054970', { price: 9 })] },
    { store_slug: 'notino', items: [of('850045076290'), of('018084054970')] },
    { store_slug: 'parfumdreams', items: [of('18084054970')] },
    { store_slug: 'x', items: [of('12345678906'), of('012345678906'), of('3337875598767')] },
  ],
});

assert.ok(isGtin('850045076290') && isGtin('0850045076290') && isGtin('18084054970'));
assert.ok(!isGtin('12345678906'), '11 dígitos só com dígito de controlo certo');
assert.ok(!isGtin('1234567') && !isGtin('000000123456'));

// sem lista de exclusão
let s = seed();
let r = mergeEanVariants(s);
const eans = s.products.map(p => p.ean);
assert.ok(eans.includes('850045076290') && !eans.includes('0850045076290'), '12 ↔ 13 como antes');
assert.ok(eans.includes('018084054970') && !eans.includes('18084054970'), '11 ↔ 12: fica o que tem mais ofertas');
assert.ok(eans.includes('12345678906') && eans.includes('012345678906'), 'dígito errado: não junta');
assert.equal(s.products.find(p => p.ean === '850045076290').image_url, 'img.jpg', 'herda a imagem como antes');
const loja = slug => s.store_products.find(g => g.store_slug === slug).items.map(i => i.ean);
assert.deepEqual(loja('parfumdreams'), ['018084054970']);
assert.deepEqual(loja('druni').sort(), ['018084054970', '850045076290']);
const existe = new Set(s.products.map(p => p.ean));
assert.ok(s.store_products.every(g => g.items.every(i => existe.has(i.ean))), 'nenhuma oferta sem produto');
assert.equal(r.merged, 2);
const uma = JSON.stringify(s); assert.equal(mergeEanVariants(s).merged, 0, 'idempotente'); assert.equal(JSON.stringify(s), uma);

// com lista de exclusão: oferta excluída pelo código ORIGINAL sai em vez de mudar de código
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dedup-'));
fs.mkdirSync(path.join(dir, 'data'));
fs.writeFileSync(path.join(dir, 'data', 'offer-ean-blocklist.json'), JSON.stringify({ blocked: [{ store_slug: 'parfumdreams', ean: '18084054970' }, { store_slug: 'atida', ean: '0850045076290' }] }));
s = seed(); r = mergeEanVariants(s, dir);
assert.deepEqual(s.store_products.find(g => g.store_slug === 'parfumdreams').items, []);
assert.deepEqual(s.store_products.find(g => g.store_slug === 'atida').items.map(i => i.ean), ['018084054970']);
fs.rmSync(dir, { recursive: true, force: true });
console.log('dedup-ean-variants: 12↔13 como antes, UPC sem zero (11), dígito de controlo, imagem, sem órfãs, idempotente, lista de exclusão — tudo passou');
