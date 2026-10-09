const assert = require('node:assert/strict');
const { isBlockedOffer, upsertStoreItem } = require('./lib/store-item-merge');

// Mesmo SKU interno em duas lojas, mas fichas de perfume capilar e óculos.
// O bloqueio deve impedir que o refresh volte a inserir a associação errada,
// preservando a oferta do perfume na loja que efetivamente o vende.
const ean = 'farmacia365-olistic-hair-mist-presence-30ml';
assert.equal(isBlockedOffer('farmaciarodrigues', ean), true);
assert.equal(isBlockedOffer('farmacia365', ean), false);
assert.equal(isBlockedOffer('farmaciarodrigues', '8809925186064'), false);

const state = {
  storeSp: { store_slug: 'farmaciarodrigues', items: [] },
  itemByEan: {}, addedCounter: { value: 0 }, updatedCounter: { value: 0 },
};
const before = JSON.stringify(state);
const result = upsertStoreItem(state, ean, {
  name: 'Oculos Nordic Vision Alingsas +3.00', price: 17.8,
  in_stock: true,
  url: 'https://farmaciarodrigues.pt/pt-pt/product/oculos-nordic-vision-alingsas-3-00',
}, '2026-10-09T01:00:00.000Z');
assert.equal(result.action, 'blocked');
assert.equal(result.item, null);
assert.equal(JSON.stringify(state), before, 'o bloqueio não altera itens/counters');
console.log('PASS: associação errada bloqueada; oferta Olistic legítima preservada');
