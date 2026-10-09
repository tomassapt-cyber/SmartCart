#!/usr/bin/env node
// Teste offline de upsertStoreItem: uma leitura fresca sem variante atualiza a
// única variante lida da mesma página (registo de correções #30, Wells).
// Uso: node scripts/test-variante-unica-fresca.cjs
const assert = require('assert');
const { upsertStoreItem } = require('./lib/store-item-merge');

const URL_ = 'https://wells.pt/golden-radiance-body-scrub-8853160.html';
const TS = '2026-10-09T14:00:00.000Z';

function estado(item) {
  const storeSp = { store_slug: 'teste-loja', items: [item] };
  return { storeSp, itemByEan: { [item.ean]: item } };
}
function oferta(extra) {
  return {
    ean: '8436616952549', price: 22.95, previous_price: null, discount_pct: null, in_stock: true,
    url: URL_, verified: true, verified_url: true, verified_at: '2026-09-01T00:00:00.000Z', source: 'scraped',
    variants: [{ volume_ml: 100, unit: 'ml', price: 22.95, previous_price: null, in_stock: true, url: URL_ }],
    ...extra,
  };
}
// nome sem volume e URL sem volume: a leitura não traz variante (como a Wells)
const ler = extra => ({ name: 'Golden Radiance Body Scrub', url: URL_, in_stock: true, scraped_at: TS, ...extra });

let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }

caso('promoção chega à variante (o caso Wells)', () => {
  const it = oferta();
  upsertStoreItem(estado(it), it.ean, ler({ price: 13.77, previous_price: 22.95 }), TS);
  assert.strictEqual(it.variants[0].price, 13.77);
  assert.strictEqual(it.variants[0].previous_price, 22.95);
  assert.strictEqual(it.price, 13.77);
  assert.strictEqual(it.discount_pct, 40);
  assert.strictEqual(it.verified_at, TS);
});

caso('subida de preço também chega e limpa o desconto antigo', () => {
  const it = oferta({ price: 13.77, previous_price: 22.95, discount_pct: 40,
    variants: [{ volume_ml: 100, unit: 'ml', price: 13.77, previous_price: 22.95, in_stock: true, url: URL_ }] });
  upsertStoreItem(estado(it), it.ean, ler({ price: 22.95 }), TS);
  assert.strictEqual(it.variants[0].price, 22.95);
  assert.strictEqual(it.variants[0].previous_price, null);
  assert.strictEqual(it.price, 22.95);
  assert.strictEqual(it.discount_pct, null);
});

caso('esgotado com preço: variante e oferta ficam esgotadas', () => {
  const it = oferta();
  upsertStoreItem(estado(it), it.ean, ler({ price: 21.5, in_stock: false }), TS);
  assert.strictEqual(it.variants[0].in_stock, false);
  assert.strictEqual(it.in_stock, false);
  assert.strictEqual(it.variants[0].price, 21.5);
});

caso('variante de OUTRO URL não é tocada', () => {
  const outro = 'https://wells.pt/outro-tamanho-1.html';
  const it = oferta({ variants: [{ volume_ml: 100, unit: 'ml', price: 22.95, previous_price: null, in_stock: true, url: outro }] });
  upsertStoreItem(estado(it), it.ean, ler({ price: 13.77, previous_price: 22.95 }), TS);
  assert.strictEqual(it.variants[0].price, 22.95);
  assert.strictEqual(it.price, 13.77);          // headline = leitura fresca (comportamento anterior)
});

caso('duas variantes da mesma página: ambíguo, não se mexe', () => {
  const it = oferta({ variants: [
    { volume_ml: 50, unit: 'ml', price: 12, previous_price: null, in_stock: true, url: URL_ },
    { volume_ml: 100, unit: 'ml', price: 22.95, previous_price: null, in_stock: true, url: URL_ },
  ] });
  upsertStoreItem(estado(it), it.ean, ler({ price: 13.77 }), TS);
  assert.deepStrictEqual(it.variants.map(v => v.price), [12, 22.95]);
});

caso('leitura COM volume continua pelo caminho normal', () => {
  const it = oferta();
  upsertStoreItem(estado(it), it.ean, ler({ name: 'Golden Radiance Body Scrub 100ml', price: 19.99 }), TS);
  assert.strictEqual(it.variants.length, 1);
  assert.strictEqual(it.variants[0].price, 19.99);
  assert.strictEqual(it.price, 19.99);
});

caso('oferta sem variantes: nada muda no comportamento', () => {
  const it = oferta({ variants: undefined });
  upsertStoreItem(estado(it), it.ean, ler({ price: 13.77 }), TS);
  assert.strictEqual(it.variants, undefined);
  assert.strictEqual(it.price, 13.77);
});

console.log(`\n${n}/7 casos passaram`);
