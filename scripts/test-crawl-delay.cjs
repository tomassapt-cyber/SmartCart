'use strict';
// Crawl-delay (2026-11-26): as lojas cujo robots.txt pede uma espera entre pedidos têm de
// ter um leitor que a respeite. Auditoria de 26/11: 11 lojas com Crawl-delay em 104 (as
// proibidas e as «em espera» não se abriram). PENDENTES só pode encolher. Sem rede.
// Uso: node scripts/test-crawl-delay.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = __dirname;

// loja → [leitor, Crawl-delay em s medido a 26/11/2026]
const COM_CRAWL_DELAY = {
  cocooncenter: ['scrape-cocooncenter-catalog.js', 10],
  sofarma: ['scrape-sofarma-catalog.js', 1],
  glammy: ['scrape-glammy-catalog.js', 1],
  perfumespt: ['scrape-perfumespt-catalog.js', 1],
  pharmee: ['scrape-pharmee-catalog.js', 1],
  beleza37: ['scrape-beleza37-catalog.js', 10],
  smartbeauty: ['scrape-smartbeauty-catalog.js', 10],
  sobeauty: ['scrape-sobeauty-catalog.js', 10],
  pharma2you: ['scrape-pharma2you-catalog.js', 120],
  camelo: ['scrape-camelo-catalog.js', 10],
  vidamais: ['scrape-vidamais-catalog.js', 10],
};
// leitores que fazem UM pedido por corrida (um feed): a espera cumpre-se sozinha
const UM_PEDIDO = new Set(['pharma2you']);
// por corrigir: com 10 s, 2 758 fichas não cabem num job — precisam de rotação com orçamento
const PENDENTES = new Set(['camelo', 'vidamais']);

// lê-o diretamente (leitura alargada) ou por uma biblioteca que o lê (Shopkit, fichas existentes)
const respeita = (txt) => /ritmoDaLoja|prepararLeitura|crawlDelayDe/.test(txt) || /require\('\.\/lib\/(shopkit-granel|fichas-existentes)'\)/.test(txt);
const shopkit = fs.readFileSync(path.join(S, 'lib', 'shopkit-granel.js'), 'utf8');
assert.ok(/ritmoDaLoja/.test(shopkit), 'a recolha Shopkit lê o Crawl-delay');
const existentes = fs.readFileSync(path.join(S, 'lib', 'fichas-existentes.js'), 'utf8');
assert.ok(/crawl-delay/i.test(existentes) && /function crawlDelay/.test(existentes), 'fichas-existentes lê o Crawl-delay');

for (const [loja, [leitor]] of Object.entries(COM_CRAWL_DELAY)) {
  const txt = fs.readFileSync(path.join(S, leitor), 'utf8');
  if (PENDENTES.has(loja)) { assert.ok(!respeita(txt), `${loja} já respeita o Crawl-delay — tira-o de PENDENTES`); continue; }
  if (UM_PEDIDO.has(loja)) { assert.equal((txt.match(/await fetch\(/g) || []).length, 1, `${loja}: um só pedido por corrida`); continue; }
  assert.ok(respeita(txt), `${loja} (${leitor}) tem Crawl-delay no robots.txt e o leitor não o lê`);
}

// a recolha Shopkit pede o ritmo à loja quando não lhe dão uma pausa fixa
const { recolherCatalogo } = require('./lib/shopkit-granel');
const resposta = (corpo) => ({ status: 200, ok: true, headers: { get: () => null }, text: async () => corpo, body: { cancel: async () => {} } });
const paginas = [
  { total_count: 2, data: [{ id: 1 }], paging: { next: 'https://loja.test/products.json?limit=50&page=2' } },
  { total_count: 2, data: [{ id: 2 }], paging: { next: null } },
];
(async () => {
  const fetchOriginal = globalThis.fetch;
  let pedidos = 0;
  globalThis.fetch = async () => resposta(JSON.stringify(paginas[pedidos++]));
  const pedidosAoRitmo = [];
  try {
    await recolherCatalogo('https://loja.test', { ua: 'x', ritmo: async (base, pedido) => { pedidosAoRitmo.push([base, pedido]); return { concorrencia: 1, atrasoMs: 5, crawlDelay: 10 }; } });
    assert.equal(pedidosAoRitmo.length, 1);
    assert.equal(pedidosAoRitmo[0][0], 'https://loja.test');
    assert.equal(pedidosAoRitmo[0][1].atrasoMs, 10000, 'mínimo de 10 s na Shopkit, mesmo com o robots.txt ilegível (429)');
    assert.equal(pedidos, 2);
    pedidos = 0; pedidosAoRitmo.length = 0;
    await recolherCatalogo('https://loja.test', { ua: 'x', pausaMs: 0, ritmo: async () => { pedidosAoRitmo.push(1); return {}; } });
    assert.equal(pedidosAoRitmo.length, 0, 'com pausa fixa não se lê o robots.txt');
  } finally { globalThis.fetch = fetchOriginal; }
  console.log(`crawl-delay: ${Object.keys(COM_CRAWL_DELAY).length - PENDENTES.size} de ${Object.keys(COM_CRAWL_DELAY).length} lojas com Crawl-delay respeitam-no (pendentes: ${[...PENDENTES].join(', ')}) — tudo passou`);
})().catch(e => { console.error(e); process.exit(1); });
