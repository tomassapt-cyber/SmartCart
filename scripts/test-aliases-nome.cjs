'use strict';
// Fichas pequenas juntas pelo nome, sem CNP (2026-11-17): as regras do gerador e a leitura
// do ficheiro na publicação, por último. Sem rede. Uso: node scripts/test-aliases-nome.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { gerar } = require('./aliases-nome');
const { mergeEanVariants } = require('./dedup-ean-variants');

const of = (ean, url) => ({ ean, price: 10, url });
const P = (ean, name, brand) => ({ ean, name, brand, category: 'skincare' });
const muitas = (ean, n, pref) => Array.from({ length: n }, (_, i) => ({ store_slug: pref + i, items: [of(ean, `https://${pref}${i}/x`)] }));
const seed = {
  products: [
    // o mesmo produto, nomes diferentes: a pequena junta-se à grande
    P('4005800000010', 'Eucerin UreaRepair Creme para Pés 10% Ureia 100 ml', 'Eucerin'),
    P('4005800000027', 'Creme Eucerin Pés Urea Repair 10% Ureia 100ml', 'Eucerin'),
    // sérum ≠ tónico (o «Milk» da linha não pode esconder a diferença)
    P('8800000000011', 'White in Milk Sérum 50ml', 'Wim'),
    P('8800000000028', 'White In Milk Toner 50ml', 'Wim'),
    // palavras diferentes dos dois lados: Concentrate ≠ Contour
    P('7290000000012', 'Benefiance Wrinkle Smoothing Concentrate Serum 30ml', 'Shiseido'),
    P('7290000000029', 'Benefiance Wrinkle Smoothing Contour Serum 30ml', 'Shiseido'),
    // «Fresh» conta, mesmo que o canonicalName o tire
    P('3282770000013', 'Astera Fresh Sérum 75ml', 'René Furterer'),
    P('3282770000020', 'René Furterer Astera Sérum Calmante 75ml', 'René Furterer'),
    // body spray ≠ eau de parfum
    P('6085010000014', 'Armaf Club De Nuit Intense Eau De Parfum 200ml', 'Armaf'),
    P('6085010000021', 'Armaf Body Spray Club De Nuit Intense 200ml', 'Armaf'),
    // aroma só de um lado: sem CNP não junta
    P('4005900000015', 'Nivea Gel de Banho Creme Care 250ml', 'Nivea'),
    P('4005900000022', 'Nivea Gel de Banho Creme Aloe 250ml', 'Nivea'),
    // tamanho diferente
    P('3600000000014', 'Avène Cleanance Gel 200ml', 'Avène'),
    P('3600000000021', 'Avène Cleanance Gel de Limpeza 400ml', 'Avène'),
    // duas pequenas diferentes entre si na mesma grande: nenhuma junta
    P('3401000000016', 'Darphin Prédermine Anti-Wrinkle Cream 50ml', 'Darphin'),
    P('3401000000023', 'Creme antirrugas Darphin Prédermine pele normal 50ml', 'Darphin'),
    P('3401000000030', 'Creme antirrugas Darphin Prédermine pele seca 50ml', 'Darphin'),
  ],
  store_products: [
    ...muitas('4005800000010', 6, 'e'), { store_slug: 'p1', items: [of('4005800000027', 'https://p1/x')] },
    ...muitas('8800000000028', 4, 'w'), { store_slug: 'p2', items: [of('8800000000011', 'https://p2/x')] },
    ...muitas('7290000000029', 4, 'b'), { store_slug: 'p3', items: [of('7290000000012', 'https://p3/x')] },
    ...muitas('3282770000013', 4, 'r'), { store_slug: 'p4', items: [of('3282770000020', 'https://p4/x')] },
    ...muitas('6085010000014', 4, 'a'), { store_slug: 'p5', items: [of('6085010000021', 'https://p5/x')] },
    ...muitas('4005900000015', 4, 'n'), { store_slug: 'p6', items: [of('4005900000022', 'https://p6/x')] },
    ...muitas('3600000000021', 4, 'c'), { store_slug: 'p7', items: [of('3600000000014', 'https://p7/x')] },
    ...muitas('3401000000016', 4, 'd'), { store_slug: 'p8', items: [of('3401000000023', 'https://p8/x')] }, { store_slug: 'p9', items: [of('3401000000030', 'https://p9/x')] },
  ],
};
const { finais } = gerar(seed);
const par = new Map(finais.map(x => [x.sai, x.fica]));
assert.equal(par.get('4005800000027'), '4005800000010', 'o mesmo produto com outro nome junta à ficha de mais lojas');
assert.ok(!par.has('4005800000010'), 'a grande fica');
for (const [e, porque] of [['8800000000011', 'sérum ≠ tónico'], ['7290000000012', 'Concentrate ≠ Contour'], ['3282770000020', 'Fresh ≠ Calmante'],
  ['6085010000021', 'body spray ≠ eau de parfum'], ['4005900000022', 'aroma só de um lado'], ['3600000000014', 'tamanho diferente'],
  ['3401000000023', 'pele normal e pele seca na mesma ficha'], ['3401000000030', 'pele normal e pele seca na mesma ficha']]) assert.ok(!par.has(e), porque);

// publicação: o ficheiro do nome lê-se por último e não cria cadeias
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'nome-'));
fs.mkdirSync(path.join(raiz, 'data'));
const pub = {
  products: [P('1000000000001', 'A 50ml', 'X'), P('1000000000002', 'A 50ml', 'X'), P('1000000000003', 'A 50ml', 'X')],
  store_products: [{ store_slug: 'l1', items: [of('1000000000001', 'u1')] }, { store_slug: 'l2', items: [of('1000000000002', 'u2')] }, { store_slug: 'l3', items: [of('1000000000003', 'u3')] }],
};
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases.json'), JSON.stringify({}));
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases-cnp.json'), JSON.stringify({ '1000000000001': { aliases: ['1000000000002'], reason: ['cnp'] } }));
// o do nome quer pôr o 1000000000002 (já alias do CNP) e o 1000000000003: só o 3 entra
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases-nome.json'), JSON.stringify({ '1000000000001': { aliases: ['1000000000002', '1000000000003'], reason: ['n', 'n'] } }));
mergeEanVariants(pub, raiz);
assert.deepEqual(pub.products.map(p => p.ean), ['1000000000001']);
assert.deepEqual(pub.store_products.map(g => g.items[0].ean), ['1000000000001', '1000000000001', '1000000000001'], 'sem ofertas órfãs');
fs.rmSync(raiz, { recursive: true, force: true });

console.log('aliases pelo nome: junta o mesmo produto com outro nome, recusa tipo/palavras dos dois lados/Fresh/perfume/aroma/tamanho/duas pequenas diferentes, publicação por último — tudo passou');
