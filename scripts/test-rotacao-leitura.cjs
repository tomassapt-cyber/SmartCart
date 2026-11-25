'use strict';
// Rotação com orçamento de tempo (2026-11-25): Wells e Loja da Farmácia liam o mapa inteiro
// e o GitHub cortava o job antes de gravar. Sem rede.
// Uso: node scripts/test-rotacao-leitura.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ordenar, idadesDoSeed, prepararRotacao, orcamentoDosArgs } = require('./lib/rotacao-leitura');
const { UA_COSMATH } = require('./lib/leitura-alargada');

const seed = { store_products: [
  { store_slug: 'loja', items: [
    { url: 'https://l/a', verified_at: '2026-11-20T10:00:00Z' },
    { url: 'https://l/b', verified_at: '2026-11-24T10:00:00Z' },
    { url: 'https://l/b', verified_at: '2026-11-18T10:00:00Z' },
    { url: 'https://l/c#v2', verified_at: '2026-11-22T10:00:00Z' },
  ] },
  { store_slug: 'outra', items: [{ url: 'https://l/d', verified_at: '2026-01-01T00:00:00Z' }] },
] };

// idade de cada endereço no catálogo
const idade = idadesDoSeed(seed, 'loja');
assert.equal(idade.get('https://l/b'), '2026-11-18T10:00:00Z', 'duas ofertas no mesmo endereço: conta a mais antiga');
assert.equal(idade.get('https://l/c'), '2026-11-22T10:00:00Z', 'o fragmento não vai ao servidor');
assert.equal(idade.has('https://l/d'), false, 'só as ofertas desta loja');

// nunca lidas à frente; depois da leitura mais antiga para a mais recente; a memória conta quando é mais recente
const fila = ordenar(['https://l/a', 'https://l/b', 'https://l/c', 'https://l/novo'],
  { idadeSeed: idade, lidas: { 'https://l/a': '2026-11-25T09:00:00Z' }, aleatorio: () => 0 });
assert.deepEqual(fila, ['https://l/novo', 'https://l/b', 'https://l/c', 'https://l/a']);
// corrida sem memória (1.ª vez, ou cache perdida): as ofertas do site primeiro, os nunca lidos no fim
assert.deepEqual(ordenar(['https://l/novo', 'https://l/a', 'https://l/b'], { idadeSeed: idade, nuncaLidasNoFim: true }),
  ['https://l/b', 'https://l/a', 'https://l/novo']);
// objetos com o endereço dentro (Wells: { url, productId, category })
assert.equal(ordenar([{ url: 'https://l/a' }, { url: 'https://l/b' }], { idadeSeed: idade, url: t => t.url })[0].url, 'https://l/b');

// --orcamento-min
assert.equal(orcamentoDosArgs({}), Infinity);
assert.equal(orcamentoDosArgs({ 'orcamento-min': '120' }), 120);
assert.equal(orcamentoDosArgs({ 'orcamento-min': true }), Infinity);
assert.equal(orcamentoDosArgs({ 'orcamento-min': '0' }), Infinity);

// preparar: a memória perde o que saiu do mapa, grava-se e relê-se; o tempo acaba
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotacao-'));
const ficheiro = path.join(dir, 'loja-lidas.json');
fs.writeFileSync(ficheiro, JSON.stringify({ versao: 1, lidas: { 'https://l/saiu': '2026-11-01T00:00:00Z', 'https://l/a': '2026-11-25T09:00:00Z' } }));
let t = Date.parse('2026-11-25T12:00:00Z');
const rot = prepararRotacao({ loja: 'loja', itens: ['https://l/a', 'https://l/b', 'https://l/novo'], orcamentoMin: 2, seed, ficheiro, agora: () => t });
assert.deepEqual(rot.fila, ['https://l/novo', 'https://l/b', 'https://l/a']);
assert.match(rot.resumo, /3 endereços no mapa \(2 já são ofertas, 1 nunca lidos\)/);
assert.equal(rot.fimDoTempo(), false);
rot.lida('https://l/novo#x');
t += 121000;
assert.equal(rot.fimDoTempo(), true, 'passados os 2 minutos');
rot.gravar();
const mem = JSON.parse(fs.readFileSync(ficheiro, 'utf8')).lidas;
assert.equal(mem['https://l/saiu'], undefined, 'o que saiu do mapa sai da memória');
assert.equal(mem['https://l/novo'], '2026-11-25T12:00:00.000Z');
assert.equal(mem['https://l/a'], '2026-11-25T09:00:00Z');
// sem orçamento, o tempo nunca acaba; memória ilegível = memória vazia
fs.writeFileSync(ficheiro, '{estragado');
const livre = prepararRotacao({ loja: 'loja', itens: ['https://l/novo', 'https://l/a'], seed, ficheiro, agora: () => t });
assert.equal(livre.fimDoTempo(), false);
assert.match(livre.resumo, /sem orçamento de tempo/);
assert.deepEqual(livre.fila, ['https://l/a', 'https://l/novo'], 'sem memória, a oferta vem antes do nunca lido');
assert.match(livre.resumo, /ficam para o fim: corrida sem memória/);
fs.rmSync(dir, { recursive: true, force: true });

// a rotação dá a volta: com K fichas por corrida, cada endereço é lido pelo menos a cada ceil(N/K) corridas
{
  const N = 1000, K = 370;
  const urls = Array.from({ length: N }, (_, i) => `https://l/p${i}`);
  const idadeSeed = new Map(urls.slice(0, 600).map((u, i) => [u, `2026-11-${10 + (i % 10)}T00:00:00Z`]));
  const lidas = {}, ultima = {};
  let maior = 0;
  for (let corrida = 1; corrida <= 12; corrida++) {
    const quando = `2026-11-25T${String(corrida).padStart(2, '0')}:00:00Z`;
    for (const u of ordenar(urls, { idadeSeed, lidas }).slice(0, K)) {
      if (ultima[u]) maior = Math.max(maior, corrida - ultima[u]);
      ultima[u] = corrida; lidas[u] = quando;
    }
    if (corrida === Math.ceil(N / K)) assert.equal(Object.keys(ultima).length, N, 'todos lidos ao fim de ceil(N/K) corridas');
  }
  assert.ok(maior <= Math.ceil(N / K), `intervalo máximo entre leituras: ${maior} corridas`);
}

// a Loja da Farmácia identifica-se como o robô do CosMath
assert.equal(require('./scrape-lojafarmacia-catalog').UA, UA_COSMATH);

console.log('rotação: nunca lidas à frente, depois a leitura mais antiga; memória limpa e gravada; orçamento de tempo; volta completa em ceil(N/K) corridas; UA honesto na Loja da Farmácia — tudo passou');
