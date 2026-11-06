'use strict';
// Recuperação do db-sync (2026-11-06): quando a BD recusa uma oferta por FK
// (23503) porque o estado guardado diz que um produto lá está e não está, o
// sync relê a BD e repete com as diferenças reais. Sem rede: a BD é simulada.
// Uso: node scripts/test-db-sync-recuperacao.cjs
const assert = require('node:assert/strict');
const E = require('./lib/db-sync-estado');

// o erro tal como o PostgREST o devolveu a 06/11 (via upsert do push-catalog-to-db)
const erroFk = ean => new Error(`offers lote 5: HTTP 409: {"code":"23503","details":"Key (ean)=(${ean}) is not present in table \\"products\\".","hint":null,"message":"insert or update on table \\"offers\\" violates foreign key constraint"}`);

const payloads = {
  stores: [{ slug: 'druni', name: 'Druni', updated_at: 't' }],
  products: [{ ean: '3337875597197', name: 'CeraVe Gel', updated_at: 't' }, { ean: '810020170795', name: 'Lip Balm SPF 50+', updated_at: 't' }],
  offers: [{ store_slug: 'druni', ean: '3337875597197', price: 12, synced_at: 't' }, { store_slug: 'druni', ean: '810020170795', price: 9.5, synced_at: 't' }],
  offer_variants: null,
};
const estadoDe = tabelas => Object.fromEntries(Object.entries(tabelas).filter(([, l]) => l).map(([t, l]) => [t, E.diferencas(t, l, null).atual]));
const difDe = ant => Object.fromEntries(Object.entries(payloads).filter(([, l]) => l).map(([t, l]) => [t, E.diferencas(t, l, ant && ant[t])]));

// BD simulada: produtos e ofertas por chave; a FK das ofertas é verificada
function bd(produtosNaBD) {
  const db = { products: new Set(produtosNaBD), offers: new Set(), stores: new Set(['druni']) };
  const enviados = [];
  const enviarTabela = async (t, linhas) => {
    enviados.push([t, linhas.map(l => l.ean || l.slug)]);
    for (const l of linhas) {
      if (t === 'offers' && !db.products.has(l.ean)) throw erroFk(l.ean);
      if (t === 'products') db.products.add(l.ean);
      if (t === 'offers') db.offers.add(l.store_slug + '|' + l.ean);
    }
  };
  // a leitura da BD devolve o que lá está, com as impressões dos payloads
  const lerBD = async () => estadoDe({
    stores: payloads.stores,
    products: payloads.products.filter(p => db.products.has(p.ean)),
    offers: payloads.offers.filter(o => db.offers.has(o.store_slug + '|' + o.ean)),
  });
  return { db, enviados, enviarTabela, lerBD };
}
const calado = () => {};

(async () => {
  assert.ok(E.ERRO_FK.test(erroFk('1').message), 'apanha o erro real do PostgREST');
  assert.ok(!E.ERRO_FK.test('offers lote 1: HTTP 500: boom'));

  // 1. caso normal: estado certo, nada a reler
  {
    const m = bd(['3337875597197', '810020170795']);
    const anterior = estadoDe({ stores: payloads.stores, products: payloads.products, offers: [] });
    let leu = false;
    const r = await E.enviarComRecuperacao({ payloads, dif: difDe(anterior), anterior, enviarTabela: m.enviarTabela, lerBD: async () => { leu = true; }, log: calado });
    assert.equal(r.relida, false); assert.equal(leu, false);
    assert.deepEqual(m.enviados.map(e => e[0]), ['stores', 'products', 'offers'], 'pela ordem das FK');
    assert.equal(m.db.offers.size, 2);
  }

  // 2. o caso de 06/11: o estado dá o Lip Balm como enviado, a BD não o tem
  {
    const m = bd(['3337875597197']);
    const anterior = estadoDe({ stores: payloads.stores, products: payloads.products, offers: [] });
    const dif = difDe(anterior);
    assert.deepEqual(dif.products.enviar, [], 'com o estado antigo o produto nunca seria reenviado');
    const r = await E.enviarComRecuperacao({ payloads, dif, anterior, enviarTabela: m.enviarTabela, lerBD: m.lerBD, log: calado });
    assert.equal(r.relida, true);
    assert.ok(m.db.products.has('810020170795'), 'o produto em falta foi reenviado');
    assert.equal(m.db.offers.size, 2, 'as duas ofertas entraram');
    assert.deepEqual(r.dif.products.enviar.map(p => p.ean), ['810020170795'], 'só o que falta na BD');
    assert.ok(r.anterior.products['3337875597197'] && !r.anterior.products['810020170795'], 'o estado novo é o da BD lida');
    assert.deepEqual(r.dif.products.apagar, [], 'nada a apagar');
  }

  // 3. outro erro (não FK): sobe sem reler
  {
    let leu = false;
    const anterior = estadoDe({ products: payloads.products });
    await assert.rejects(() => E.enviarComRecuperacao({ payloads, dif: difDe(anterior), anterior, enviarTabela: async t => { if (t === 'offers') throw new Error('offers lote 1: HTTP 500: boom'); }, lerBD: async () => { leu = true; }, log: calado }), /HTTP 500/);
    assert.equal(leu, false);
  }

  // 4. sync completo (sem estado): um erro de FK é um payload mau, sobe
  await assert.rejects(() => E.enviarComRecuperacao({ payloads, dif: difDe(null), anterior: null, enviarTabela: async t => { if (t === 'offers') throw erroFk('1'); }, lerBD: async () => ({}), log: calado }), /23503/);

  // 5. a leitura da BD falha: reenvia tudo e segue sem estado (completo)
  {
    const m = bd(['3337875597197']);
    const anterior = estadoDe({ stores: payloads.stores, products: payloads.products, offers: [] });
    const r = await E.enviarComRecuperacao({ payloads, dif: difDe(anterior), anterior, enviarTabela: m.enviarTabela, lerBD: async () => { throw new Error('HTTP 500'); }, log: calado });
    assert.equal(r.relida, true); assert.equal(r.anterior, null);
    assert.equal(r.dif.products.enviar.length, 2, 'sem estado vai tudo');
    assert.equal(m.db.offers.size, 2);
  }

  // 6. a FK continua a falhar depois de reler: sobe (o sync fica vermelho, como deve)
  {
    const anterior = estadoDe({ products: payloads.products });
    await assert.rejects(() => E.enviarComRecuperacao({ payloads, dif: difDe(anterior), anterior, enviarTabela: async t => { if (t === 'offers') throw erroFk('810020170795'); }, lerBD: async () => estadoDe({ products: payloads.products }), log: calado }), /23503/);
  }

  console.log('db-sync recuperação: estado certo não relê, FK com estado divergente relê a BD e reenvia só o que falta, outros erros sobem, leitura falhada reenvia tudo, FK persistente sobe — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
