'use strict';
// Farmacentral (2026-11-26): páginas de 50 e página que falha lida em metades. Sem rede.
// Uso: node scripts/test-farmacentral.cjs
const assert = require('node:assert/strict');
process.argv.push('--delay=0');   // sem pausa entre metades no teste
const { fetchRange, TAKE, TAKE_MIN } = require('./scrape-farmacentral-catalog');

assert.equal(TAKE, 50, 'take=250 dava HTTP 500 em todas as corridas desde 15/11');
assert.equal(TAKE_MIN, 10);

const itens = (skip, take) => Array.from({ length: take }, (_, i) => ({ id: skip + i }));
const ids = (p) => p.list.map(x => x.id);

(async () => {
  // a API aguenta a página inteira → um pedido só
  let pedidos = [];
  let r = await fetchRange(0, 50, async (skip, take) => { pedidos.push([skip, take]); return { list: itens(skip, take), total: 3799 }; });
  assert.deepEqual(pedidos, [[0, 50]]);
  assert.equal(r.list.length, 50);
  assert.equal(r.total, 3799);

  // a API só aguenta até 25 → duas metades, sem buracos nem repetidos
  pedidos = [];
  r = await fetchRange(100, 50, async (skip, take) => { pedidos.push([skip, take]); return take > 25 ? { error: 'HTTP 500' } : { list: itens(skip, take), total: 3799 }; });
  assert.deepEqual(pedidos, [[100, 50], [100, 25], [125, 25]]);
  assert.deepEqual(ids(r), Array.from({ length: 50 }, (_, i) => 100 + i));
  assert.equal(r.parcial, false);
  assert.equal(r.total, 3799);

  // tamanho ímpar: 25 → 13 + 12
  r = await fetchRange(0, 25, async (skip, take) => take > 13 ? { error: 'HTTP 500' } : { list: itens(skip, take) });
  assert.deepEqual(ids(r), Array.from({ length: 25 }, (_, i) => i));

  // um troço que falha sempre → o resto chega, marcado como parcial
  r = await fetchRange(0, 50, async (skip, take) => (skip <= 30 && 30 < skip + take) ? { error: 'HTTP 500' } : { list: itens(skip, take) });
  assert.equal(r.parcial, true);
  assert.ok(!ids(r).includes(30));
  assert.ok(ids(r).length >= 40, 'perde-se só o troço que falha');

  // tudo falha → erro, sem descer abaixo de TAKE_MIN
  pedidos = [];
  r = await fetchRange(0, 50, async (skip, take) => { pedidos.push(take); return { error: 'HTTP 500' }; });
  assert.ok(r.error);
  assert.ok(Math.min(...pedidos) >= Math.ceil(TAKE_MIN / 2), 'não pede páginas minúsculas');
  assert.ok(pedidos.length <= 15, 'nem centenas de pedidos');

  // resposta sem lista (forma estranha) conta como falha
  r = await fetchRange(0, 10, async () => ({ algo: 1 }));
  assert.ok(!Array.isArray(r.list));

  console.log('farmacentral: páginas de 50, metades quando a API corta, troço perdido não leva o resto — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
