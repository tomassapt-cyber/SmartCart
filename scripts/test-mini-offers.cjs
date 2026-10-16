'use strict';
// Minis / viagem / amostras ligados à ficha do tamanho normal (2026-10-16). Sem rede.
// Uso: node scripts/test-mini-offers.cjs
const assert = require('node:assert/strict');
const { dropMiniOffers, dropRottenOffers } = require('./lib/catalog-visibility');

const of = (loja, ean, preco, url, extra = {}) => ({ store_slug: loja, items: [{ ean, price: preco, in_stock: true, url, verified_at: new Date().toISOString(), ...extra }] });
const seed = () => ({
  products: [
    { ean: '1', name: 'Tresemmé Keratin Smooth Shampoo 400ml' },
    { ean: '2', name: 'Moroccanoil Repair Shampoo Tamanho Viagem 70ml' },   // a ficha É o mini
    { ean: '3', name: 'Champô Normal' },
    { ean: '4', name: 'Só minis' },
    { ean: '5', name: 'Sérum Minimalist 30ml' },
  ],
  store_products: [
    of('a', '1', 14.3, 'https://a.pt/tresemme-keratin-smooth-400ml'),
    of('b', '1', 13.9, 'https://b.pt/tresemme-keratin-smooth'),
    of('c', '1', 15.1, 'https://c.pt/keratin-smooth'),
    of('druni', '1', 1.75, 'https://druni.pt/keratin-smooth-tresemme-mini-shampoo-cabelo-normal'),   // sai
    of('druni', '2', 9.99, 'https://druni.pt/repair-moroccanoil-shampoo-tamanho-viagem'),
    of('x', '2', 10.5, 'https://x.pt/moroccanoil-repair-70ml'),
    of('a', '3', 10, 'https://a.pt/champo-normal'),
    of('b', '3', 8.5, 'https://b.pt/champo-normal-travel-size'),             // mini a 85%: fica
    of('c', '3', 3, 'https://c.pt/champo-normal-amostra', { in_stock: false }),   // esgotado: não conta
    of('a', '4', 2, 'https://a.pt/produto-mini'),
    of('b', '4', 2.2, 'https://b.pt/produto-sample'),
    of('a', '5', 20, 'https://a.pt/serum-minimalist-30ml'),
    of('b', '5', 4, 'https://b.pt/serum-minimalist-30ml-promo'),            // «minimalist» não é mini
  ],
});
const restantes = s => s.store_products.flatMap(g => g.items.map(i => `${g.store_slug}|${i.ean}|${i.price}`)).sort();

let s = seed();
const r = dropMiniOffers(s);
assert.equal(r.hidden, 1);
assert.deepEqual(r.perStore, ['druni:1']);
const ficou = restantes(s);
assert.ok(!ficou.includes('druni|1|1.75'), 'o mini barato sai da ficha do tamanho normal');
assert.ok(ficou.includes('druni|2|9.99'), 'na ficha que É o mini, o mini fica');
assert.ok(ficou.includes('b|3|8.5'), 'mini a preço de normal (≥60% da mediana) fica');
assert.ok(ficou.includes('c|3|3'), 'esgotado não é tocado');
assert.ok(ficou.includes('a|4|2') && ficou.includes('b|4|2.2'), 'ficha só com minis: ficam todos');
assert.ok(ficou.includes('b|5|4'), '«minimalist» não conta como mini');

// idempotente, e corre dentro do dropRottenOffers (que todos os sítios já chamam)
const uma = JSON.stringify(s); assert.equal(dropMiniOffers(s).hidden, 0); assert.equal(JSON.stringify(s), uma);
s = seed();
const rr = dropRottenOffers(s);
assert.equal(rr.mini.hidden, 1, 'dropRottenOffers inclui a regra');
assert.ok(!restantes(s).includes('druni|1|1.75'));
console.log('mini-offers: mini barato sai da ficha normal; ficha-mini, mini a preço normal, esgotados, só-minis e «minimalist» ficam; idempotente; dentro do dropRottenOffers — tudo passou');
