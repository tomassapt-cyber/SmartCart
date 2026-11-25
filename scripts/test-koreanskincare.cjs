'use strict';
// Korean Skincare (2026-11-25): linhas do .js da Shopify, rotação e feed da memória. Sem rede.
// Uso: node scripts/test-koreanskincare.cjs
const assert = require('node:assert/strict');
const { linhasDoJs, planear, feedDaMemoria, FICHA, MAPA_PRODUTOS, DIAS_FEED } = require('./scrape-koreanskincare-catalog');
const { LOJA } = require('./integrate-koreanskincare-catalog');
const { integrar } = require('./lib/integrar-existentes');

const U = 'https://koreanskincare.pt/products/cosrx-hyaluronic-hydra-power-essence';
assert.ok(FICHA.test(U));
assert.ok(!FICHA.test(U + '.js') && !FICHA.test('https://koreanskincare.pt/collections/cosrx'));
assert.ok(MAPA_PRODUTOS.test('https://koreanskincare.pt/sitemap_products_1.xml?from=9459185680648&to=9459238928648'));
assert.ok(!MAPA_PRODUTOS.test('https://koreanskincare.pt/sitemap_pages_1.xml?from=1&to=2'));

// uma variante: preço em cêntimos, preço riscado, stock, a marca da loja não é marca
let r = linhasDoJs(U, { title: 'Hyaluronic Acid Hydra Power Essence', vendor: 'COSRX',
  variants: [{ id: 1, title: 'Default Title', barcode: '8809416470184', price: 937, compare_at_price: 1695, available: true }] });
assert.deepEqual(r.linhas, [{ ean: '8809416470184', name: 'Hyaluronic Acid Hydra Power Essence', brand: 'COSRX', price: 9.37, in_stock: true, url: U, previous_price: 16.95 }]);
r = linhasDoJs(U, { title: 'Máscara', vendor: 'Korean Skincare', variants: [{ id: 1, title: 'Default Title', barcode: '8806185776219', price: 50, compare_at_price: null, available: false }] });
assert.equal(r.linhas[0].brand, null, '«Korean Skincare» é a loja, não a marca');
assert.equal(r.linhas[0].previous_price, undefined);
assert.equal(r.linhas[0].in_stock, false);

// várias variantes: endereço com ?variant=, nome com o tamanho; EAN inválido/repetido/sem preço ficam de fora
r = linhasDoJs(U, { title: 'Toner', vendor: 'Anua', variants: [
  { id: 11, title: '250ml', barcode: '8809640733147', price: 2190, available: true },
  { id: 12, title: '500ml', barcode: '8809640733148', price: 3490, available: true },        // dígito de controlo errado
  { id: 13, title: '40ml', barcode: '8809640733147', price: 990, available: true },         // EAN repetido
  { id: 14, title: 'Mini', barcode: '0000012345678', price: 500, available: true },        // código interno
  { id: 15, title: '100ml', barcode: '8809968130239', price: 0, available: true },          // sem preço
] });
assert.equal(r.linhas.length, 1);
assert.equal(r.linhas[0].url, U + '?variant=11');
assert.equal(r.linhas[0].name, 'Toner - 250ml');
assert.deepEqual(linhasDoJs(U, { title: 'X', variants: [{ id: 1, barcode: '', price: 100 }] }), { linhas: [], motivo: 'sem_gtin' });
assert.deepEqual(linhasDoJs(U, { title: 'X', variants: [] }), { linhas: [], motivo: 'sem_variantes' });

// rotação: nunca lidas → nossas (mais antigas primeiro) → outras ao fim de 30 dias; as outras recentes ficam de fora
const agora = Date.parse('2026-11-25T12:00:00Z');
const f = h => 'https://koreanskincare.pt/products/' + h;
const visiveis = new Set(['8809416470184']);
const memoria = {
  [f('nossa-recente')]: { lido_em: '2026-11-25T08:00:00Z', eans: ['8809416470184'] },
  [f('nossa-antiga')]: { lido_em: '2026-11-23T08:00:00Z', eans: ['08809416470184'] },
  [f('outra-recente')]: { lido_em: '2026-11-20T08:00:00Z', eans: ['8806185776219'] },
  [f('outra-velha')]: { lido_em: '2026-10-01T08:00:00Z', eans: [] },
};
assert.deepEqual(planear([f('nossa-recente'), f('outra-velha'), f('nova'), f('outra-recente'), f('nossa-antiga'), f('nova')], visiveis, memoria, agora),
  [f('nova'), f('nossa-antiga'), f('nossa-recente'), f('outra-velha')]);

// feed: só linhas de produtos que o site mostra, dos últimos DIAS_FEED dias, com a data de cada uma
const linha = (ean, url) => ({ ean, name: 'n', brand: null, price: 9.37, in_stock: true, url });
const mem2 = {
  [f('a')]: { lido_em: '2026-11-24T10:00:00Z', linhas: [linha('8809416470184', f('a')), linha('8806185776219', f('a'))] },
  [f('b')]: { lido_em: new Date(agora - (DIAS_FEED + 1) * 864e5).toISOString(), linhas: [linha('8809416470184', f('b'))] },
};
const feed = feedDaMemoria(mem2, visiveis, agora);
assert.deepEqual(feed, [{ ...linha('8809416470184', f('a')), status: 'ok', verified_at: '2026-11-24T10:00:00Z' }]);

// o feed passa no integrador (só produtos existentes, url da loja)
const seed = { stores: [], products: [{ ean: '8809416470184', name: 'COSRX Hyaluronic Acid Hydra Power Essence 100ml', brand: 'COSRX' }], store_products: [] };
const res = integrar(seed, { in_progress: false, completed_at: new Date().toISOString(), products: feed }, LOJA);
assert.equal(res.offers, 1); assert.equal(res.products_created, 0);
const item = seed.store_products.find(g => g.store_slug === 'koreanskincare').items[0];
assert.equal(item.verified_at, '2026-11-24T10:00:00Z', 'a data de leitura de cada linha é a que conta');
assert.ok(seed.stores.some(s => s.slug === 'koreanskincare' && s.name === 'Korean Skincare'));

console.log('koreanskincare: linhas do .js (cêntimos, riscado, variantes, EAN válido), rotação, feed com a data de cada linha, integração só em existentes — tudo passou');
