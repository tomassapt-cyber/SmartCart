'use strict';
// Sofarma (2026-11-26): 2 s entre pedidos e, num bloqueio por excesso de pedidos, esperar
// que a loja volte em vez de queimar fichas. Sem rede.
// Uso: node scripts/test-sofarma-ritmo.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { esperarDesbloqueio } = require('./lib/leitura-alargada');

const relogio = () => { const r = { t: 0, sonos: [] }; r.agora = () => r.t; r.dormir = async (ms) => { r.sonos.push(ms); r.t += ms; }; return r; };

(async () => {
  // a loja volta ao 11.º minuto: 11 tentativas, de minuto a minuto, e devolve a resposta
  let r = relogio(), vezes = 0;
  let d = await esperarDesbloqueio(async () => (++vezes < 11 ? { status: 'fetch_error', error: 'fetch failed' } : { status: 'ok', html: '<html>' }), { agora: r.agora, dormir: r.dormir });
  assert.equal(d.r.status, 'ok'); assert.equal(d.tentativas, 11); assert.equal(d.esperouMs, 11 * 60000);
  assert.ok(r.sonos.every(ms => ms === 60000), 'uma tentativa por minuto, não uma rajada');

  // um HTTP 404/429/5xx não é bloqueio de ligação: devolve logo (o leitor trata-o como sempre)
  r = relogio();
  d = await esperarDesbloqueio(async () => ({ status: 'http_error', http: 503 }), { agora: r.agora, dormir: r.dormir });
  assert.equal(d.r.http, 503); assert.equal(d.tentativas, 1);

  // nunca volta: desiste aos 15 min
  r = relogio();
  d = await esperarDesbloqueio(async () => ({ status: 'fetch_error' }), { agora: r.agora, dormir: r.dormir });
  assert.equal(d.r, null); assert.equal(d.tentativas, 15);

  // o orçamento da corrida manda mais do que os 15 min
  r = relogio();
  d = await esperarDesbloqueio(async () => ({ status: 'fetch_error' }), { agora: r.agora, dormir: r.dormir, fimDoTempo: () => r.t >= 3 * 60000 });
  assert.equal(d.r, null); assert.equal(d.tentativas, 3);

  // o leitor: 2 s por defeito, sem as 3 tentativas seguidas nas falhas de ligação, e usa a espera
  const leitor = fs.readFileSync(path.join(__dirname, 'scrape-sofarma-catalog.js'), 'utf8');
  assert.match(leitor, /const DELAY_MS = args\.delay \? parseInt\(args\.delay, 10\) : 2000;/);
  const catchDoFetch = leitor.slice(leitor.indexOf('async function fetchPage'), leitor.indexOf('async function fetchPage') + 1600).split('} catch (e) {')[1].split('\n}')[0];
  assert.ok(!/fetchPage\(url, attempt \+ 1\)/.test(catchDoFetch), 'falha de ligação não se repete logo');
  assert.match(leitor, /esperarDesbloqueio\(\(\) => fetchPage\(url\)/);
  assert.match(leitor, /leitura\.abrandar\(/);

  console.log('sofarma ritmo: 2 s entre pedidos; bloqueio → mesma ficha de minuto a minuto, desiste aos 15 min ou no fim do orçamento — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
