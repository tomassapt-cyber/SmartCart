'use strict';
// duplicados (2026-10-22): a chave das possíveis fichas duplicadas, os grupos
// e a coerência de data/duplicados-revistos.json. Sem rede.
// Uso: node scripts/test-duplicados.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tamanhoDoNome, chaveDuplicado, chaveGrupo, gruposDuplicados } = require('./lib/duplicados');

// tamanho
assert.equal(tamanhoDoNome('Creme 50 ml'), '50ml');
assert.equal(tamanhoDoNome('Champô 1L'), '1000ml');
assert.equal(tamanhoDoNome('Pomada 80 g'), '80g');
assert.equal(tamanhoDoNome('Sérum'), '');

// chave: marca e tamanho contam; números e letras soltas também
const k = (name, brand = 'Marca') => chaveDuplicado({ name, brand });
assert.equal(k('Marca Sérum Hidratante 30 ml'), k('Sérum Hidratante 30ml'), 'a marca no nome não conta');
assert.notEqual(k('Sérum Hidratante 30 ml'), k('Sérum Hidratante 50 ml'), 'tamanhos diferentes');
assert.notEqual(k('Sérum Vitamina C 30 ml'), k('Sérum Vitamina D 30 ml'), 'Vitamina C ≠ D');
assert.notEqual(k('Protetor Solar SPF 30'), k('Protetor Solar SPF 50'), 'SPF 30 ≠ 50');
assert.equal(k('Creme'), null, 'nome curto demais');
assert.equal(chaveDuplicado({ name: 'Sérum Hidratante', brand: '' }), null, 'sem marca');

// grupos: sem loja nas duas fichas; com loja comum só a pedido
const seed = {
  products: [
    { ean: '1', name: 'Sérum Hidratante 30 ml', brand: 'Marca' },
    { ean: 'loja-a-serum', name: 'Marca Sérum Hidratante 30ml', brand: 'Marca' },
    { ean: '2', name: 'Creme Noite Reparador 50 ml', brand: 'Marca' },
    { ean: '3', name: 'Creme Noite Reparador 50 ml', brand: 'Marca' },
    { ean: '4', name: 'Sérum Hidratante 30 ml', brand: 'Outra' },
    { ean: '5', name: 'Loção Corporal Suave 200 ml', brand: 'Marca' },
    { ean: '6', name: 'Loção Corporal Suave 200 ml', brand: 'Marca' },
  ],
  store_products: [
    { store_slug: 'a', items: [{ ean: 'loja-a-serum', price: 10, in_stock: true }, { ean: '2', price: 5, in_stock: true }, { ean: '3', price: 6, in_stock: true }] },
    { store_slug: 'b', items: [{ ean: '1', price: 11, in_stock: true }, { ean: '4', price: 9, in_stock: true }, { ean: '5', price: 4, in_stock: true }] },
    { store_slug: 'c', items: [{ ean: '6', price: 4, in_stock: false }] },   // sem stock → não conta
  ],
};
const g = gruposDuplicados(seed);
assert.deepEqual(g.map(x => x.grupo), ['1|loja-a-serum'], 'só o par sem loja comum, entre fichas com stock');
assert.deepEqual(gruposDuplicados(seed, { comLojaComum: true }).map(x => x.grupo).sort(), ['1|loja-a-serum', '2|3']);
assert.equal(chaveGrupo(['b', 'a']), 'a|b');

// a lista de revistos: chave = EANs por ordem, motivo e data
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'duplicados-revistos.json'), 'utf8'));
assert.ok(R.grupos && Object.keys(R.grupos).length > 0);
for (const [chave, v] of Object.entries(R.grupos)) {
  assert.equal(chave, chaveGrupo(chave.split('|')), `chave fora de ordem: ${chave}`);
  assert.ok(chave.split('|').length >= 2, chave);
  assert.ok(/^(diferentes|por confirmar): /.test(v.motivo || ''), `${chave}: motivo começa por «diferentes:» ou «por confirmar:»`);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.revisto || ''), `${chave}: data de revisão`);
}

console.log(`duplicados: tamanho, chave (marca, tamanho, números e letras soltas), grupos sem loja comum e com stock, ${Object.keys(R.grupos).length} grupos revistos coerentes — tudo passou`);
