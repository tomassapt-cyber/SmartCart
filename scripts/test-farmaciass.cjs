'use strict';
// Farmácia Santos Salvador (2026-11-18): o ficheiro de produtos que a loja envia ao KuantoKusta,
// EAN quando há, CNP só quando aponta para UM produto nosso, e integração só-existentes. Sem rede.
// Uso: node scripts/test-farmaciass.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { lerFeed, preco, marcaBate, indiceCnp, linhas } = require('./scrape-farmaciass-catalog');
const { integrar } = require('./lib/integrar-existentes');
const { LOJA } = require('./integrate-farmaciass-catalog');

const P = (o) => `<product><id_product>${o.id || 1}</id_product><designation><![CDATA[${o.nome}]]></designation><category><![CDATA[Rosto]]></category>` +
  `<brand><![CDATA[${o.marca || ''}]]></brand><reference>${o.cnp || ''}</reference><description><![CDATA[x]]></description>` +
  `<product_url>${o.url || 'https://www.farmaciass.pt/' + (o.id || 1) + '.html'}</product_url><price>${o.preco}</price><stock>${o.stock ?? 3}</stock>` +
  `<ean>${o.ean || ''}</ean><shipping_value>3.99</shipping_value><delivery_time>5</delivery_time></product>`;
const xml = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><products>` + [
  P({ id: 1, nome: 'Atoderm Bioderma Intensive Gel Cr 500ml', marca: 'Bioderma', cnp: '6000001', ean: '3701129803721', preco: '15,99' }),
  P({ id: 2, nome: 'Avène Cicalfate Creme 40ml', marca: 'Avène', cnp: '6000002', preco: '1.234,50', stock: 0 }),        // só CNP, único → entra
  P({ id: 3, nome: 'Isdin Fusion Water 50ml', marca: 'Isdin', cnp: '6000003', preco: '20' }),                          // CNP de linha (2 produtos) → fora
  P({ id: 4, nome: 'Uriage Bariéderm 40ml', marca: 'Uriage', cnp: '6000004', preco: '9,90' }),                         // CNP de outra marca → fora
  P({ id: 5, nome: 'Creme Genérico 50ml', marca: 'Farmácia', cnp: '6000005', preco: '5,00' }),                        // marca genérica: CNP único → entra
  P({ id: 6, nome: 'Bioderma repetido pelo CNP', marca: 'Bioderma', cnp: '6000006', preco: '16' }),                    // CNP → EAN que já veio pelo EAN → repetido
  P({ id: 7, nome: 'Sem código nosso', marca: 'X', cnp: '6999999', preco: '3' }),
  P({ id: 8, nome: 'Outra loja', marca: 'Bioderma', ean: '3701129803738', preco: '3', url: 'https://outra.pt/x' }),
  P({ id: 9, nome: 'Sem preço', marca: 'Bioderma', ean: '3701129803745', preco: '0' }),
  P({ id: 10, nome: 'Entidades &amp; acentos', marca: 'Bioderma', ean: '3701129803752', preco: '4.5' }),
].join('') + `</products></rss>`;

// ---------- leitura do ficheiro
assert.equal(preco('3,50'), 3.5); assert.equal(preco('1.234,50'), 1234.5); assert.equal(preco('12.9'), 12.9); assert.equal(preco('0'), null); assert.equal(preco(''), null);
const itens = lerFeed(xml);
assert.equal(itens.length, 10);
assert.deepEqual(itens[0], { nome: 'Atoderm Bioderma Intensive Gel Cr 500ml', marca: 'Bioderma', cnp: '6000001', ean: '3701129803721', preco: 15.99, em_stock: true, url: 'https://www.farmaciass.pt/1.html' });
assert.equal(itens[1].em_stock, false); assert.equal(itens[1].preco, 1234.5);
assert.equal(itens[9].nome, 'Entidades & acentos');

// ---------- marca: genérica não prova nada; com marca tem de bater
assert.ok(marcaBate('Farmácia', 'Avène') && marcaBate('', 'Avène') && marcaBate('AVÈNE', 'Avène') && marcaBate('La Roche Posay', 'La Roche-Posay'));
assert.ok(!marcaBate('Uriage', 'Avène'));

// ---------- índice CNP pelos catálogos das outras lojas (o da própria loja não conta)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fss-'));
const cat = (f, ps) => fs.writeFileSync(path.join(dir, f), JSON.stringify({ products: ps }));
cat('lojaa-full.json', [{ ean: '3282770146691', cnp: '6000002' }, { ean: '8400000000017', cnp: '6000003' }, { ean: '3282770100006', sku: '6000004' }, { ean: '3401000000002', cnp: '6000005' }, { ean: '3701129803721', cnp: '6000006' }, { ean: '9999999999994', cnp: '6000007' }]);
cat('lojab-chunk-1-2.json', [{ ean: '8400000000024', cnp: '6000003' }, { ean: '3282770146691', cnp: '6000002' }]);
cat('farmaciass-full.json', [{ ean: '3401000000019', cnp: '6000005' }]);   // o próprio feed: ignorado
const produtos = [
  { ean: '3701129803721', name: 'Bioderma Atoderm Intensive Gel-Creme 500ml', brand: 'Bioderma' },
  { ean: '3282770146691', name: 'Avène Cicalfate+ Creme Reparador 40ml', brand: 'Avène' },
  { ean: '8400000000017', name: 'Isdin Fusion Water 50ml', brand: 'Isdin' },
  { ean: '8400000000024', name: 'Isdin Fusion Water Color 50ml', brand: 'Isdin' },
  { ean: '3282770100006', name: 'Avène Cold Cream 40ml', brand: 'Avène' },
  { ean: '3401000000002', name: 'Creme Genérico 50ml', brand: 'Genérico' },
];
const porEan = new Map(produtos.map(p => [p.ean, p]));
const idx = indiceCnp(dir, new Set(porEan.keys()));
assert.deepEqual([...idx.get('6000003')].sort(), ['8400000000017', '8400000000024']);
assert.deepEqual([...idx.get('6000005')], ['3401000000002'], 'o catálogo da própria loja não entra no índice');
assert.ok(!idx.has('6000007'), 'CNP de um EAN que não temos não entra');

// ---------- linhas
const { linhas: ls, contas } = linhas(itens, porEan, idx);
assert.deepEqual(ls.map(l => [l.ean, l.cnp || null, l.price, l.in_stock]), [
  ['3701129803721', null, 15.99, true], ['3701129803752', null, 4.5, true],
  ['3282770146691', '6000002', 1234.5, false], ['3401000000002', '6000005', 5, true],
]);
assert.deepEqual(contas, { ean: 2, cnp: 2, cnp_varios_produtos: 1, cnp_outra_marca: 1, sem_codigo_nosso: 1, repetido: 1, preco_invalido: 1, url_fora: 1 });

// ---------- integração só-existentes (a linha do EAN que não temos fica em «sem par»)
const seed = { stores: [], products: produtos.map(p => ({ ...p })), store_products: [] };
const res = integrar(seed, { in_progress: false, completed_at: new Date().toISOString(), products: ls }, LOJA);
assert.equal(res.products_created, 0); assert.equal(seed.products.length, produtos.length);
assert.equal(res.offers, 3); assert.equal(res.unmatched_count, 1);
assert.deepEqual(seed.stores, [{ slug: 'farmaciass', name: 'Farmácia Santos Salvador', base_url: 'https://www.farmaciass.pt', logo_url: null }]);
assert.throws(() => integrar(seed, { in_progress: true, completed_at: new Date().toISOString(), products: ls }, LOJA), /incompleto/, 'um ensaio não se integra');

console.log('farmaciass: ficheiro do KK (preços com vírgula, stock, entidades), EAN primeiro, CNP só quando é de UM produto nosso e da mesma marca, repetidos, integração só-existentes — tudo passou');
