'use strict';
// Testes da fusão do mesmo GTIN com/sem zeros (scripts/dedup-ean-variants.js):
// o que já fazia (12 ↔ 13 ↔ 14), o UPC sem zero (11 dígitos) e a lista de
// exclusão. Sem rede. Uso: node scripts/test-dedup-ean-variants.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { mergeEanVariants, isGtin } = require('./dedup-ean-variants');

const of = (ean, extra = {}) => ({ ean, price: 10, in_stock: true, url: 'https://loja/' + ean, verified_at: '2026-10-14T00:00:00Z', ...extra });
const seed = () => ({
  products: [
    { ean: '850045076290', name: 'Olaplex Nº5P', brand: 'Olaplex' },
    { ean: '0850045076290', name: 'Olaplex 5P', brand: 'Olaplex', image_url: 'img.jpg' },
    { ean: '18084054970', name: 'Aveda Invati Light', brand: 'Aveda' },          // UPC sem o zero
    { ean: '018084054970', name: 'Aveda Invati Ultra Advanced Light', brand: 'Aveda' },
    { ean: '12345678906', name: 'Código de 11 com dígito errado', brand: 'X' },
    { ean: '012345678906', name: 'Outro', brand: 'X' },
    { ean: '3337875598767', name: 'CeraVe 1L', brand: 'CeraVe' },
  ],
  store_products: [
    { store_slug: 'druni', items: [of('850045076290'), of('18084054970')] },
    { store_slug: 'atida', items: [of('0850045076290'), of('018084054970', { price: 9 })] },
    { store_slug: 'notino', items: [of('850045076290'), of('018084054970')] },
    { store_slug: 'parfumdreams', items: [of('18084054970')] },
    { store_slug: 'x', items: [of('12345678906'), of('012345678906'), of('3337875598767')] },
  ],
});

assert.ok(isGtin('850045076290') && isGtin('0850045076290') && isGtin('18084054970'));
assert.ok(!isGtin('12345678906'), '11 dígitos só com dígito de controlo certo');
assert.ok(!isGtin('1234567') && !isGtin('000000123456'));

// sem lista de exclusão
let s = seed();
let r = mergeEanVariants(s);
const eans = s.products.map(p => p.ean);
assert.ok(eans.includes('850045076290') && !eans.includes('0850045076290'), '12 ↔ 13 como antes');
assert.ok(eans.includes('018084054970') && !eans.includes('18084054970'), '11 ↔ 12: fica o que tem mais ofertas');
assert.ok(eans.includes('12345678906') && eans.includes('012345678906'), 'dígito errado: não junta');
assert.equal(s.products.find(p => p.ean === '850045076290').image_url, 'img.jpg', 'herda a imagem como antes');
const loja = slug => s.store_products.find(g => g.store_slug === slug).items.map(i => i.ean);
assert.deepEqual(loja('parfumdreams'), ['018084054970']);
assert.deepEqual(loja('druni').sort(), ['018084054970', '850045076290']);
const existe = new Set(s.products.map(p => p.ean));
assert.ok(s.store_products.every(g => g.items.every(i => existe.has(i.ean))), 'nenhuma oferta sem produto');
assert.equal(r.merged, 2);
const uma = JSON.stringify(s); assert.equal(mergeEanVariants(s).merged, 0, 'idempotente'); assert.equal(JSON.stringify(s), uma);

// com lista de exclusão: oferta excluída pelo código ORIGINAL sai em vez de mudar de código
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dedup-'));
fs.mkdirSync(path.join(dir, 'data'));
fs.writeFileSync(path.join(dir, 'data', 'offer-ean-blocklist.json'), JSON.stringify({ blocked: [{ store_slug: 'parfumdreams', ean: '18084054970' }, { store_slug: 'atida', ean: '0850045076290' }] }));
s = seed(); r = mergeEanVariants(s, dir);
assert.deepEqual(s.store_products.find(g => g.store_slug === 'parfumdreams').items, []);
assert.deepEqual(s.store_products.find(g => g.store_slug === 'atida').items.map(i => i.ean), ['018084054970']);
fs.rmSync(dir, { recursive: true, force: true });

// aliases manuais (data/product-aliases.json, 2026-10-16): código inventado de uma loja → ficha com EAN
const sa = () => ({
  products: [
    { ean: '8809844996515', name: 'Dr. Jart+ Cicapair Intensive Soothing Repair', brand: 'Dr. Jart+' },
    { ean: 'wells-8174243', name: 'Cicapair Intensive Soothing Repair', brand: 'Dr. Jart+', image_url: 'wells.jpg' },
    { ean: 'wells-9', name: 'Alias cujo canónico não existe', brand: 'X' },
    { ean: 'wells-chain', name: 'Alias de um canónico que é variante GTIN', brand: 'Olaplex' },
    { ean: '850045076290', name: 'Olaplex Nº5P', brand: 'Olaplex' },
    { ean: '0850045076290', name: 'Olaplex 5P', brand: 'Olaplex' },
  ],
  store_products: [
    { store_slug: 'wells', items: [of('wells-8174243', { verified_at: '2026-10-16T00:00:00Z' }), of('wells-9'), of('wells-chain')] },
    { store_slug: 'druni', items: [of('8809844996515'), of('850045076290')] },
    { store_slug: 'atida', items: [of('0850045076290')] },
    // a mesma loja com as duas fichas: fica a oferta mais recente, com o código canónico
    { store_slug: 'dupla', items: [of('8809844996515', { price: 40 }), of('wells-8174243', { price: 38, verified_at: '2026-10-16T00:00:00Z' })] },
    { store_slug: 'bloqueada', items: [of('wells-8174243')] },
  ],
});
const da = fs.mkdtempSync(path.join(os.tmpdir(), 'alias-'));
fs.mkdirSync(path.join(da, 'data'));
fs.writeFileSync(path.join(da, 'data', 'product-aliases.json'), JSON.stringify({
  _comment: 'x',
  '8809844996515': { aliases: ['wells-8174243'], reason: 't' },
  '0000000000000': { aliases: ['wells-9'], reason: 'canónico inexistente' },
  '850045076290': { aliases: ['wells-chain'], reason: 'canónico que a fusão GTIN troca por 0850045076290' },
}));
fs.writeFileSync(path.join(da, 'data', 'offer-ean-blocklist.json'), JSON.stringify({ blocked: [{ store_slug: 'bloqueada', ean: 'wells-8174243' }] }));
s = sa(); r = mergeEanVariants(s, da);
const ids = s.products.map(p => p.ean);
assert.ok(!ids.includes('wells-8174243') && ids.includes('8809844996515'), 'o alias sai, o canónico fica');
assert.equal(s.products.find(p => p.ean === '8809844996515').image_url, 'wells.jpg', 'o canónico sem imagem herda a do alias');
assert.deepEqual(s.store_products.find(g => g.store_slug === 'wells').items.map(i => i.ean).sort(), ['0850045076290', '8809844996515', 'wells-9'].sort());
assert.ok(ids.includes('wells-9'), 'alias de um canónico que não existe: não se mexe');
assert.ok(!ids.includes('wells-chain'), 'o alias segue o canónico até ao código final da fusão GTIN');
const dupla = s.store_products.find(g => g.store_slug === 'dupla').items;
assert.equal(dupla.length, 1); assert.equal(dupla[0].ean, '8809844996515'); assert.equal(dupla[0].price, 38, 'fica a oferta mais recente');
assert.deepEqual(s.store_products.find(g => g.store_slug === 'bloqueada').items, [], 'bloqueada pelo código original: sai');
const ex = new Set(s.products.map(p => p.ean));
assert.ok(s.store_products.every(g => g.items.every(i => ex.has(i.ean))), 'nenhuma oferta sem produto');
const antesA = JSON.stringify(s); mergeEanVariants(s, da); assert.equal(JSON.stringify(s), antesA, 'idempotente');
assert.equal(r.aliases, 2);
s = sa(); mergeEanVariants(s); assert.ok(s.products.some(p => p.ean === 'wells-8174243'), 'sem root (CLI de ensaio): aliases não se aplicam');
fs.rmSync(da, { recursive: true, force: true });

// o ficheiro real: cada alias e cada canónico têm prova e não há cadeias
const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'product-aliases.json'), 'utf8'));
const canon = Object.keys(real).filter(k => !k.startsWith('_'));
for (const c of canon) {
  assert.ok(Array.isArray(real[c].aliases) && real[c].aliases.length, c);
  assert.ok(String(real[c].reason || '').length > 20, `${c} sem prova no reason`);
  for (const a of real[c].aliases) assert.ok(!canon.includes(a), `${a} é alias e canónico ao mesmo tempo`);
}
console.log('dedup-ean-variants: 12↔13 como antes, UPC sem zero (11), dígito de controlo, imagem, sem órfãs, idempotente, lista de exclusão, aliases manuais — tudo passou');
