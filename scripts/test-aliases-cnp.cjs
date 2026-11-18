'use strict';
// Fichas do mesmo produto com códigos de barras diferentes, ligadas pelo CNP (2026-11-17):
// as regras do gerador e a leitura do ficheiro na publicação (manuais e sintéticos mandam).
// Sem rede. Uso: node scripts/test-aliases-cnp.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { gerar } = require('./aliases-cnp');
const { mergeEanVariants } = require('./dedup-ean-variants');

const of = (ean, ml, url) => ({ ean, price: 10, url, variants: [{ volume_ml: ml, price: 10, url }] });
const P = (ean, name, brand) => ({ ean, name, brand, category: 'skincare' });
const seed = {
  products: [
    // 4 embalagens do mesmo produto no mesmo CNP: juntam-se todas na de mais lojas
    P('3401575390447', 'Bioderma Sensibio Sol Micelar H2O 250mL', 'Bioderma'),
    P('3701129812068', 'Água Micelar Bioderma Sensibio H2O 250 ml', 'Bioderma'),
    P('3401398335694', 'Sensibio Bioderma A Sol Limpeza H20 250 Ml', 'Bioderma'),
    P('3401574767110', 'Bioderma Sensibio H2O Solução Micelar 250ml', 'Bioderma'),
    // abreviaturas de farmácia (até 18/11 era um colírio, que o #152 tirou do site: o teste parou o db-sync)
    P('5000000000017', 'La Roche-Posay Effaclar Solução Micelar Purificante 400ml', 'La Roche-Posay'),
    P('5000000000024', 'La Roche-Posay Effaclar Sol Micel Purif 400 Ml', 'La Roche-Posay'),
    // CNP errado numa loja: marcas diferentes não se juntam
    P('4009077072527', 'Em-eukal Limão Rebuçados Sem Açúcar 50g', 'Em-Eukal'),
    P('7896222720863', 'Strepsils Limão Sem Açúcar 50g', 'Strepsils'),
    // com cor ≠ sem cor
    P('8470001000011', 'The Originals Proteos Screen SPF 50+ 50ml', 'Neostrata'),
    P('8470001000028', 'Proteos Screen SPF50+ Color Fluid Cream 50ml', 'Neostrata'),
    // tamanho diferente
    P('3600000000017', 'Avène Cleanance Gel de Limpeza 200ml', 'Avène'),
    P('3600000000024', 'Avène Cleanance Gel de Limpeza 400ml', 'Avène'),
    // aroma só de um lado: é o mesmo (o CNP prova); aromas diferentes dos dois lados: não
    P('5201279072889', 'Apivita Água Micelar 300ml', 'Apivita'),
    P('5201279036249', 'Apivita Água Micelar de Limpeza Rosa e Mel 300 ml', 'Apivita'),
    // palavras de limpeza diferentes: é o mesmo gel
    P('3282770000017', 'Ducray Keracnyl Gel Espuma - 400 mL', 'Ducray'),
    P('3282770000024', 'Ducray Keracnyl Gel Limpeza Anti-Imperfeições 400ml', 'Ducray'),
    P('4001638095436', 'Weleda Desodorizante Roll-on Romã 50 ml', 'Weleda'),
    P('4001638095443', 'Weleda Desodorizante Roll-on Citrus 50 ml', 'Weleda'),
    // a mesma loja vende os dois em páginas diferentes: ficam separados
    P('3337875000013', 'Vichy Mineral 89 Booster 50ml', 'Vichy'),
    P('3337875000020', 'Vichy Mineral 89 Booster Fortificante 50ml', 'Vichy'),
    // CNP de linha (7 EANs): nada se junta por ele
    ...[1, 2, 3, 4, 5, 6, 7].map(i => P('84000000000' + (10 + i), `Isdin Fotoprotector Fusion Water 50ml`, 'Isdin')),
  ],
  store_products: [
    { store_slug: 'a', items: [of('3401575390447', 250, 'https://a/sens'), of('5000000000017', 400, 'https://a/eff'), of('4009077072527', 50, 'https://a/em'), of('8470001000011', 50, 'https://a/pro'), of('3600000000017', 200, 'https://a/cle'), of('5201279072889', 200, 'https://a/api'), of('4001638095436', 50, 'https://a/rom'), of('3337875000013', 50, 'https://a/m89'), of('3337875000020', 50, 'https://a/m89-fort')] },
    { store_slug: 'b', items: [of('3401575390447', 250, 'https://b/sens'), of('3701129812068', 250, 'https://b/sens-novo'.replace('b/sens-novo', 'b/sens'))] },
    { store_slug: 'c', items: [of('3701129812068', 250, 'https://c/sens'), of('5000000000024', 400, 'https://c/eff'), of('7896222720863', 50, 'https://c/str'), of('8470001000028', 50, 'https://c/pro'), of('3600000000024', 400, 'https://c/cle'), of('5201279036249', 200, 'https://c/api'), of('4001638095443', 50, 'https://c/cit')] },
    { store_slug: 'd', items: [of('3401398335694', 250, 'https://d/sens'), of('3401575390447', 250, 'https://d/sens2'.replace('sens2', 'sens'))] },
    { store_slug: 'e', items: [of('3401574767110', 250, 'https://e/sens'), of('3282770000017', 400, 'https://e/ker')] },
    { store_slug: 'f', items: [of('3282770000024', 400, 'https://f/ker')] },
  ],
};
const L = (loja, ean, cnp) => ({ loja, ean, cnp, url: '' });
const linhas = [
  L('a', '3401575390447', '6576678'), L('c', '3701129812068', '6576678'), L('d', '3401398335694', '6576678'), L('e', '3401574767110', '6576678'),
  L('a', '5000000000017', '5555555'), L('c', '5000000000024', '5555555'),
  L('a', '4009077072527', '5154778'), L('c', '7896222720863', '5154778'),
  L('a', '8470001000011', '6385450'), L('c', '8470001000028', '6385450'),
  L('a', '3600000000017', '6000001'), L('c', '3600000000024', '6000001'),
  L('a', '5201279072889', '6236216'), L('c', '5201279036249', '6236216'),
  L('a', '4001638095436', '6000002'), L('c', '4001638095443', '6000002'),
  L('a', '3337875000013', '6000003'), L('a', '3337875000020', '6000003'),
  L('e', '3282770000017', '6000004'), L('f', '3282770000024', '6000004'),
  ...[1, 2, 3, 4, 5, 6, 7].map(i => L('x' + i, '84000000000' + (10 + i), '6000009')),
];
const { finais, motivos } = gerar(seed, linhas);
const par = new Map(finais.map(x => [x.sai, x.fica]));

// 1. junta o que é o mesmo produto, sempre na ficha de mais lojas
for (const e of ['3701129812068', '3401398335694', '3401574767110']) assert.equal(par.get(e), '3401575390447', `Sensibio ${e}`);
assert.ok(!par.has('3401575390447'), 'a ficha de mais lojas fica');
assert.ok(par.has('5000000000024') || par.has('5000000000017'), 'abreviaturas: «Sol Micel Purif» = «Solução Micelar Purificante»');
assert.ok(par.has('5201279036249') || par.has('5201279072889'), 'aroma só de um lado (com o CNP a provar) junta');
assert.ok(par.has('3282770000017') || par.has('3282770000024'), '«Gel Espuma» = «Gel Limpeza»');

// 2. recusa o que não é
for (const e of ['4009077072527', '7896222720863']) assert.ok(!par.has(e), 'marcas diferentes');
for (const e of ['8470001000011', '8470001000028']) assert.ok(!par.has(e), 'com cor ≠ sem cor');
for (const e of ['3600000000017', '3600000000024']) assert.ok(!par.has(e), 'tamanho diferente');
for (const e of ['4001638095436', '4001638095443']) assert.ok(!par.has(e), 'Romã ≠ Citrus');
for (const e of ['3337875000013', '3337875000020']) assert.ok(!par.has(e), 'a mesma loja vende os dois');
assert.ok([1, 2, 3, 4, 5, 6, 7].every(i => !par.has('84000000000' + (10 + i))), 'CNP de linha');
assert.ok(motivos['código de linha'] >= 1 && motivos['marca diferente'] >= 1);

// 3. a publicação lê o ficheiro depois dos manuais e dos sintéticos, sem cadeias
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'cnp-'));
fs.mkdirSync(path.join(raiz, 'data'));
const pub = {
  products: [P('1000000000001', 'Produto A 50ml', 'X'), P('1000000000002', 'Produto A 50ml', 'X'), P('1000000000003', 'Produto A 50ml', 'X'), P('sweetcare-a', 'Produto A', 'X')],
  store_products: [
    { store_slug: 'l1', items: [of('1000000000001', 50, 'https://l1/a')] },
    { store_slug: 'l2', items: [of('1000000000002', 50, 'https://l2/a')] },
    { store_slug: 'l3', items: [of('1000000000003', 50, 'https://l3/a')] },
    { store_slug: 'sweetcare', items: [of('sweetcare-a', 50, 'https://sc/a')] },
  ],
};
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases.json'), JSON.stringify({}));
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases-auto.json'), JSON.stringify({ '1000000000002': { aliases: ['sweetcare-a'], reason: ['sintético'] } }));
// o CNP quer pôr o 1000000000002 (canónico de um sintético) noutra ficha: não entra, para não haver cadeia
fs.writeFileSync(path.join(raiz, 'data', 'product-aliases-cnp.json'), JSON.stringify({ '1000000000001': { aliases: ['1000000000002', '1000000000003'], reason: ['cnp', 'cnp'] } }));
const r = mergeEanVariants(pub, raiz);
const eans = new Set(pub.products.map(p => p.ean));
assert.ok(eans.has('1000000000001') && eans.has('1000000000002') && !eans.has('1000000000003') && !eans.has('sweetcare-a'));
const onde = Object.fromEntries(pub.store_products.map(g => [g.store_slug, g.items[0].ean]));
assert.deepEqual(onde, { l1: '1000000000001', l2: '1000000000002', l3: '1000000000001', sweetcare: '1000000000002' }, 'sem ofertas órfãs nem cadeias');
for (const g of pub.store_products) for (const it of g.items) assert.ok(eans.has(it.ean), 'oferta sem ficha');
assert.ok(r.merged >= 2);
fs.rmSync(raiz, { recursive: true, force: true });

console.log('aliases pelo CNP: junta embalagens do mesmo produto (abreviaturas, aroma de um lado), recusa marca/cor/tamanho/aroma/loja com os dois/CNP de linha, publicação sem cadeias — tudo passou');
