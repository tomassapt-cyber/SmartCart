'use strict';
// A contagem de lojas por EAN do build-homepage-data.js (feita de uma vez desde
// 2026-10-16) dá o mesmo que a forma antiga, produto a produto, e os workflows
// que a usam não voltam ao caminho lento. Sem rede e sem o seed.
// Uso: node scripts/test-homepage-contagem-lojas.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-homepage-data.js'), 'utf8');
const ini = src.indexOf('const lojasPorEan');
const fim = src.indexOf('\nfunction condenseProduct');
assert.ok(ini > 0 && fim > ini, 'countStores não encontrado no build-homepage-data.js');
const countStores = new Function(src.slice(ini, fim) + '\nreturn countStores;')();

function antiga(seed, ean) {
  let n = 0;
  for (const sp of seed.store_products) if (sp.items.some(i => i.ean === ean && i.in_stock)) n++;
  return n;
}

// 1. casos de canto: sem stock, EAN repetido na mesma loja, loja repetida, EAN inexistente
const seed = {
  store_products: [
    { store_slug: 'a', items: [{ ean: '1', in_stock: true }, { ean: '1', in_stock: true }, { ean: '2', in_stock: false }] },
    { store_slug: 'b', items: [{ ean: '1', in_stock: true }, { ean: '2', in_stock: true }, { ean: '3' }] },
    { store_slug: 'b', items: [{ ean: '2', in_stock: true }] },
    { store_slug: 'c', items: [] },
    { store_slug: 'd', items: [{ ean: '2', in_stock: false }, { ean: '2', in_stock: true }] },
  ],
};
for (const ean of ['1', '2', '3', '9', undefined]) assert.equal(countStores(seed, ean), antiga(seed, ean), 'EAN ' + ean);
assert.equal(countStores(seed, '2'), 3);

// 2. ao acaso: 200 seeds pequenos
let s = 7;
const r = n => { s = (s * 1103515245 + 12345) % 2147483648; return s % n; };
for (let k = 0; k < 200; k++) {
  const sd = { store_products: Array.from({ length: 1 + r(6) }, (_, i) => ({
    store_slug: 'l' + r(4), items: Array.from({ length: r(8) }, () => ({ ean: String(r(10)), in_stock: r(3) > 0 })) })) };
  for (let e = 0; e < 11; e++) assert.equal(countStores(sd, String(e)), antiga(sd, String(e)));
}

// 3. seeds diferentes não partilham a contagem guardada
const outro = { store_products: [{ store_slug: 'z', items: [{ ean: '1', in_stock: true }] }] };
assert.equal(countStores(outro, '1'), 1);
assert.equal(countStores(seed, '1'), 2);

// 4. os workflows: comparáveis salta a curadoria; recommendations não regenera no push;
//    quality monitor não apaga fichas
const wf = f => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
assert.match(wf('create-comparable-products.yml'), /COSMATH_SKIP_HP: '1'/);
assert.match(wf('recommendations.yml'), /resilient-push\.sh \\\s*\n\s*"true" \\/);
assert.doesNotMatch(wf('quality-monitor.yml'), /purge-corrupt-merges\.js[^\n]*--apply/);
assert.doesNotMatch(wf('quality-monitor.yml'), /contents: write/);

console.log('test-homepage-contagem-lojas: ok');
