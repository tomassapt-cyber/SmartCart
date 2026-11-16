'use strict';
// Shopkit (2026-11-16): num 429 «demasiados pedidos» espera o que a loja pede e continua,
// em vez de desistir; uma página boa é pedida UMA só vez. Sem rede.
// Uso: node scripts/test-shopkit-ritmo.cjs
const assert = require('node:assert/strict');
const { pedirPagina } = require('./lib/shopkit-granel');

const resposta = (status, corpo, cab = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: k => cab[k.toLowerCase()] ?? null },
  text: async () => corpo, body: { cancel: async () => {} },
});

(async () => {
  // 1. 429 com Retry-After: espera esse tempo e continua; a página boa vem à 3.ª
  const fila = [resposta(429, 'devagar', { 'retry-after': '7' }), resposta(429, 'devagar'), resposta(200, '{"data":[1]}')];
  let pedidos = 0; const esperas = [];
  const corpo = await pedirPagina('https://loja/products.json?limit=50', { 'User-Agent': 'x' }, {
    pedir: async () => { pedidos++; return fila.shift(); },
    dormir: async ms => { esperas.push(ms); },
  });
  assert.equal(corpo, '{"data":[1]}');
  assert.equal(pedidos, 3, 'uma página boa não é pedida duas vezes');
  assert.deepEqual(esperas, [7000, 120000], 'Retry-After da loja; sem ele, a escada (60, 120…)');

  // 2. página boa à primeira: um só pedido, sem esperas
  let n = 0;
  const c2 = await pedirPagina('https://loja/p', {}, { pedir: async () => { n++; return resposta(200, '[]'); }, dormir: async () => assert.fail('não devia esperar') });
  assert.equal(c2, '[]'); assert.equal(n, 1);
  console.log('shopkit ritmo: 429 espera o Retry-After (ou a escada) e continua; página boa pedida uma vez — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
