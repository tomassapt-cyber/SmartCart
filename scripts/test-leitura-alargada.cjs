'use strict';
// Leitura alargada (2026-11-16): ritmo do robots.txt, plano da corrida (ofertas,
// memória, descoberta, maquilhagem saltada) e memória só das fichas descobertas. Sem rede.
// Uso: node scripts/test-leitura-alargada.cjs
const assert = require('node:assert/strict');
const L = require('./lib/leitura-alargada');

// 1. Crawl-delay: o grupo «*» depois de grupos de robôs proibidos (Cocooncenter)
const cocoon = 'User-agent: BadBot\nUser-agent: OtherBot\nDisallow: /\n\nUser-Agent: *\nCrawl-delay: 10\nDisallow: /panier/\n';
assert.equal(L.crawlDelayDe(cocoon), 10);
assert.equal(L.crawlDelayDe('User-agent: *\nCrawl-delay: 1\nDisallow: /api/\n'), 1);
assert.equal(L.crawlDelayDe('User-agent: *\nDisallow: /checkout\n'), null);
// um grupo com o nosso nome manda sobre o «*»
assert.equal(L.crawlDelayDe('User-agent: *\nCrawl-delay: 10\n\nUser-agent: CosMath-Catalog-Bot\nCrawl-delay: 2\n'), 2);

// 2. ritmo: com Crawl-delay, um pedido de cada vez e pelo menos essa espera
(async () => {
  const falso = txt => async () => ({ ok: true, text: async () => txt });
  assert.deepEqual(await L.ritmoDaLoja('https://x', { concorrencia: 5, atrasoMs: 200 }, falso(cocoon)), { concorrencia: 1, atrasoMs: 10000, crawlDelay: 10 });
  assert.deepEqual(await L.ritmoDaLoja('https://x', { concorrencia: 5, atrasoMs: 250 }, falso('User-agent: *\nDisallow: /x\n')), { concorrencia: 5, atrasoMs: 250, crawlDelay: null });
  const caiu = async () => { throw new Error('rede'); };
  assert.equal((await L.ritmoDaLoja('https://x', { concorrencia: 4, atrasoMs: 600 }, caiu)).concorrencia, 4);

  // 3. plano
  const seed = {
    products: [
      { ean: '3337875597197', name: 'CeraVe Gel 473ml', category: 'skincare' },
      { ean: '0012345678905', name: 'Produto com zero', category: 'body' },
      { ean: '3600531000000', name: 'Batom Rouge 3g', category: 'makeup' },
    ],
    store_products: [{ store_slug: 'loja', items: [
      { ean: '3337875597197', url: 'https://l/velha#variant-1', verified_at: '2026-11-01T00:00:00Z' },
      { ean: '1', url: 'https://l/recente', verified_at: '2026-11-15T00:00:00Z' },
      { ean: '2', url: 'https://l/saiu-do-mapa', verified_at: '2026-10-01T00:00:00Z' },
    ] }],
  };
  const estado = L.estadoDoSeed('loja', seed);
  assert.ok(estado.eans.has('12345678905'), 'EAN sem zeros à esquerda');
  assert.ok(!estado.eans.has('3600531000000'), 'maquilhagem não conta como catálogo');
  const hoje = new Date().toISOString().slice(0, 10);
  const memoria = { versao: 1, urls: {
    'https://l/descoberta-com-ean': ['012345678905', hoje],   // EAN do catálogo → entra na leitura
    'https://l/vista-sem-ean': ['', hoje],                     // vista há pouco → não se reabre
    'https://l/vista-ha-muito': ['9999999999994', '2026-01-01'], // passou a validade → volta a descobrir
  } };
  const todas = ['https://l/dermo', 'https://l/velha', 'https://l/recente', 'https://l/descoberta-com-ean', 'https://l/vista-sem-ean',
    'https://l/vista-ha-muito', 'https://l/batom-rouge-matte', 'https://l/nova-1', 'https://l/nova-2', 'https://l/nova-3'];
  const plano = L.planear({ todas, filtradas: ['https://l/dermo'], estado, memoria, maxNovas: 2, saltar: L.pareceMaquilhagem });
  assert.deepEqual(plano.fila.slice(0, 2), ['https://l/vista-ha-muito', 'https://l/nova-1'], 'a descoberta à frente');
  assert.deepEqual(plano.fila.slice(2, 6).sort(), ['https://l/descoberta-com-ean', 'https://l/dermo', 'https://l/recente', 'https://l/velha'].sort());
  assert.ok(plano.fila.indexOf('https://l/velha') < plano.fila.indexOf('https://l/recente'), 'o mais antigo primeiro');
  assert.deepEqual([...plano.descobrir], ['https://l/vista-ha-muito', 'https://l/nova-1'], 'maquilhagem saltada, vista há pouco saltada, máximo 2');
  assert.equal(plano.fila[plano.fila.length - 1], 'https://l/saiu-do-mapa', 'ofertas fora do mapa no fim');
  assert.equal(plano.fila.filter(u => u === 'https://l/velha').length, 1, 'o #variante não duplica o pedido');
  assert.equal(plano.daMemoria, 1);
  assert.ok(L.pareceMaquilhagem('https://pt.primor.eu/pt_pt/maybelline-rimel-lash-sensational-123.html'));
  assert.ok(!L.pareceMaquilhagem('https://aveirofarma.pt/la-roche-posay-cicaplast-baume-b5-40ml'));
  assert.ok(!L.pareceMaquilhagem('https://x/uriage-bariederm-cica-labios-15ml'), 'cuidado dos lábios não é maquilhagem');

  // 4. a memória só regista as fichas descobertas
  const fs = require('fs'), os = require('os'), path = require('path');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'alargada-')), 'mem.json');
  fs.writeFileSync(f, JSON.stringify(memoria));
  const leitura = await L.prepararLeitura({ loja: 'loja', base: 'http://127.0.0.1:9', todas, filtradas: ['https://l/dermo'], maxNovas: 2, seed, ficheiro: f, concorrencia: 3, atrasoMs: 100 });
  leitura.registar('https://l/nova-1', '4006000000005');
  leitura.registar('https://l/dermo', '4006000000012');
  leitura.gravar();
  const gravada = JSON.parse(fs.readFileSync(f, 'utf8')).urls;
  assert.equal(gravada['https://l/nova-1'][0], '4006000000005');
  assert.equal(gravada['https://l/dermo'], undefined, 'as fichas do filtro não vão para a memória');
  assert.equal(gravada['https://l/vista-sem-ean'][0], '', 'o resto da memória fica');
  assert.ok(leitura.eDescoberta('https://l/nova-1') && !leitura.eDescoberta('https://l/dermo'));
  console.log('leitura alargada: Crawl-delay, ritmo, plano (ofertas, memória, descoberta, maquilhagem, fora do mapa) e memória — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
