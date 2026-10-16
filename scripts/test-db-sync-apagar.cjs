'use strict';
// Limpezas do db-sync (2026-10-16): pedidos em paralelo com tecto, o primeiro
// erro pára e é lançado, e as variantes de uma oferta que sai não levam pedido
// próprio (vão em cascata). Sem rede: o fetch é substituído.
// Uso: node scripts/test-db-sync-apagar.cjs
const assert = require('node:assert/strict');
const E = require('./lib/db-sync-estado');
const S = '\u0001';

(async () => {
  // 1. cascata: só ficam as variantes cuja oferta NÃO sai
  const v = ['druni' + S + '1' + S + '50', 'druni' + S + '2' + S + '50', 'wells' + S + '1' + S + '30'];
  assert.deepEqual(E.variantesSemCascata(v, ['druni' + S + '1']), ['druni' + S + '2' + S + '50', 'wells' + S + '1' + S + '30']);
  assert.deepEqual(E.variantesSemCascata(v, undefined), v);
  assert.deepEqual(E.variantesSemCascata([], ['x' + S + 'y']), []);

  // 2. pedidos: agrupados como antes, em paralelo, no máximo 6 ao mesmo tempo
  const original = global.fetch;
  let emCurso = 0, maximo = 0;
  const pedidos = [];
  global.fetch = async (url, opt) => {
    assert.equal(opt.method, 'DELETE');
    pedidos.push(decodeURIComponent(url));
    emCurso++; maximo = Math.max(maximo, emCurso);
    await new Promise(r => setTimeout(r, 2));
    emCurso--;
    return { status: 204, text: async () => '' };
  };
  const chaves = [];
  for (let s = 0; s < 40; s++) for (let e = 0; e < 3; e++) chaves.push(`loja${s}${S}${1000 + e}${S}50`);
  const n = await E.apagarPorChave('https://x.supabase.co', 'k', 'offer_variants', chaves);
  assert.equal(n, 120, 'um pedido por loja+EAN, como antes');
  assert.equal(pedidos.length, 120);
  assert.ok(maximo > 1 && maximo <= 6, `em paralelo com tecto (máximo ${maximo})`);
  assert.ok(pedidos[0].includes('store_slug=eq.loja0') && pedidos[0].includes('ean=eq.1000') && pedidos[0].includes('volume_ml=in.("50")'));
  // ofertas: 150 EANs por pedido, agrupados por loja
  pedidos.length = 0;
  const of = Array.from({ length: 320 }, (_, i) => `druni${S}${5000 + i}`);
  assert.equal(await E.apagarPorChave('https://x.supabase.co', 'k', 'offers', of), 3, '320 EANs → 3 pedidos de ≤150');

  // 3. o primeiro erro pára e é lançado (o sync não pode dar verde com limpezas a meio)
  let feitos = 0;
  global.fetch = async () => { feitos++; return feitos === 5 ? { status: 500, text: async () => 'boom' } : { status: 204, text: async () => '' }; };
  await assert.rejects(() => E.apagarPorChave('https://x.supabase.co', 'k', 'offer_variants', chaves), /apagar offer_variants: HTTP 500/);
  assert.ok(feitos < 120, 'pára depois do erro');
  global.fetch = original;
  assert.equal(await E.apagarPorChave('u', 'k', 'offers', []), 0);
  console.log('db-sync apagar: cascata das variantes, lotes como antes, paralelo com tecto de 6, primeiro erro pára — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
