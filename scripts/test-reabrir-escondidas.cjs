'use strict';
// Reabrir as escondidas (2026-11-16): quais ofertas e lojas entram, e a decisão sobre
// a página reaberta (EAN, CNP, nome, preço). Sem rede.
// Uso: node scripts/test-reabrir-escondidas.cjs
const assert = require('node:assert/strict');
const { escondidasPorLoja, lojasElegiveis, julgar } = require('./reabrir-escondidas');

const DIA = 864e5, agora = Date.parse('2026-11-16T12:00:00Z');
const d = n => new Date(agora - n * DIA).toISOString();

// 1. escondidas = >7 dias atrás da leitura mais recente da loja, ou >14 dias
const seed = { store_products: [
  { store_slug: 'a', items: [
    { ean: '1', url: 'https://a/1', verified_at: d(0) },
    { ean: '2', url: 'https://a/2', verified_at: d(8) },                                  // 8 d atrás da loja
    { ean: '3', url: 'https://a/3', verified_at: d(5) },
    { ean: '4', url: 'https://a/4', verified_at: d(30), variants: [{ verified_at: d(1) }] }, // a variante está fresca
  ] },
  { store_slug: 'b', items: [{ ean: '5', url: 'https://b/5', verified_at: d(20) }, { ean: '6', url: 'https://b/6', verified_at: d(19) }] }, // loja toda parada: tecto de 14 d
] };
const e = escondidasPorLoja(seed, agora);
assert.deepEqual(e.get('a').map(i => i.ean), ['2']);
assert.deepEqual(e.get('b').map(i => i.ean), ['5', '6']);

// 2. lojas que nunca se reabrem
const { ok, fora } = lojasElegiveis(['wells', 'notino', 'perfumesclub', 'caretobeauty', 'farmacianovadamaia', 'primor', 'glammy'],
  { bloqueadas: new Set(['caretobeauty']), soPc: new Set(['farmacianovadamaia', 'glammy']), espera: new Set(['notino']), so: null });
assert.deepEqual(ok, ['wells']);
assert.equal(fora.notino, 'nunca'); assert.equal(fora.primor, 'leitura alargada'); assert.equal(fora.glammy, 'só do PC');

// 3. a decisão sobre a página
const produto = { ean: '3337875597197', name: 'CeraVe Gel de Limpeza Espumante 473ml', brand: 'CeraVe' };
const it = { ean: '3337875597197', price: 14 };
const pag = o => ({ name: 'CeraVe Gel de Limpeza Espumante 473 ml', brand: 'CeraVe', price: 13.5, in_stock: true, ean: null, cnp: null, ...o });
assert.equal(julgar(it, produto, null).resultado, 'sem_dados');
assert.equal(julgar(it, produto, pag({ ean: '3337875597197' })).resultado, 'refrescada', 'GTIN igual');
assert.equal(julgar(it, produto, pag({ ean: '03337875597197' })).resultado, 'refrescada', 'GTIN com zero à esquerda');
assert.equal(julgar(it, produto, pag({ ean: '3337875597210' })).resultado, 'outro_produto', 'GTIN diferente');
assert.equal(julgar({ ...it, cnp: '1234567' }, produto, pag({ cnp: '1234567' })).resultado, 'refrescada', 'CNP igual');
assert.equal(julgar({ ...it, cnp: '1234567' }, produto, pag({ cnp: '7654321' })).resultado, 'outro_produto', 'CNP diferente');
assert.equal(julgar(it, produto, pag({})).resultado, 'refrescada', 'sem códigos: o nome bate');
assert.equal(julgar(it, produto, pag({ name: 'CeraVe Gel de Limpeza Espumante 236 ml' })).resultado, 'sem_prova', 'outro tamanho');
assert.equal(julgar(it, produto, pag({ name: 'Bioderma Sébium Gel Moussant 500 ml', brand: 'Bioderma' })).resultado, 'sem_prova', 'outra marca');
assert.equal(julgar(it, produto, pag({ ean: '3337875597197', price: 40 })).resultado, 'preco_suspeito', 'preço mais do dobro');
assert.equal(julgar(it, produto, pag({ ean: '3337875597197', price: 5 })).resultado, 'preco_suspeito', 'preço menos de metade (ex.: sem IVA)');
// 4. aplicar os resultados (o mesmo que o resilient-push volta a correr)
const { aplicar } = require('./reabrir-escondidas');
const s2 = { store_products: [{ store_slug: 'a', items: [
  { ean: '3337875597197', price: 14, previous_price: 20, discount_pct: 30, in_stock: true, url: 'https://a/velho', verified_at: d(30), variants: [{ volume_ml: 473, price: 14, url: 'https://a/velho' }] },
  { ean: '3282770149524', price: 9, in_stock: true, url: 'https://a/outro', verified_at: d(30) },
] }] };
const ghost = {};
const quando = new Date(agora).toISOString();
const res = aplicar(s2, ghost, { quando, mortas: [{ url: 'https://a/morta', code: 404 }], refrescadas: [
  { loja: 'a', ean: '3337875597197', url_antes: 'https://a/velho', url: 'https://a/novo', name: 'CeraVe Gel 473ml', price: 13.5, in_stock: true, scraped_at: quando },
  { loja: 'a', ean: '3282770149524', url_antes: 'https://a/ja-mudou', url: 'https://a/ja-mudou', name: 'X', price: 8, in_stock: true, scraped_at: quando },
] });
const [cv, out] = s2.store_products[0].items;
assert.equal(res.refrescadas, 1); assert.equal(res.mortas, 1);
assert.equal(ghost['https://a/morta'].status, 'dead');
assert.equal(cv.url, 'https://a/novo', 'endereço novo guardado');
assert.equal(cv.variants[0].url, 'https://a/novo');
assert.equal(cv.verified_at, quando); assert.equal(cv.previous_price, null, 'sem desconto inventado');
assert.equal(out.price, 9, 'a oferta que mudou entretanto não é tocada');
console.log('reabrir escondidas: escondidas por loja, lojas excluídas, decisão por GTIN/CNP/nome/preço, aplicar resultados — tudo passou');
