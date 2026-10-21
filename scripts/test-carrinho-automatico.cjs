'use strict';
// carrinho-automatico (2026-10-19): o link que abre a loja Shopify com o cabaz
// já no carrinho, a escolha da variante e a coerência da lista de lojas.
// Sem rede. Uso: node scripts/test-carrinho-automatico.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { handleDoUrl, skuVtexDoUrl, varianteDoEan, linksDeCarrinho } = require('./carrinho-automatico');

// handle
assert.equal(handleDoUrl('https://loja.farmaciagarcia.net/products/creme-x?variant=1'), 'creme-x');
assert.equal(handleDoUrl('https://www.atuafarmacia.pt/collections/rosto/products/serum-y'), 'serum-y');
assert.equal(handleDoUrl('https://loja.pt/p/123'), null);
assert.equal(handleDoUrl('não é url'), null);

// variante: ?variant= do endereço → EAN no barcode (sem zeros) → única → null
const prod = { variants: [{ id: 11, barcode: '03600523000000' }, { id: 22, barcode: '3600523000017' }] };
assert.equal(varianteDoEan(prod, '3600523000017', 'https://x.pt/products/a?variant=11'), 11, 'o ?variant= manda');
assert.equal(varianteDoEan(prod, '3600523000017', 'https://x.pt/products/a?variant=99'), 22, '?variant= que não existe → EAN');
assert.equal(varianteDoEan(prod, '3600523000000', 'https://x.pt/products/a'), 11, 'barcode com zero à esquerda');
assert.equal(varianteDoEan(prod, '5000000000000', 'https://x.pt/products/a'), null, 'EAN que não está → não se adivinha');
assert.equal(varianteDoEan({ variants: [{ id: 7, barcode: '' }] }, '5000000000000', 'https://x.pt/products/a'), 7, 'uma só variante');
assert.equal(varianteDoEan(null, '5000000000000', 'https://x.pt/products/a'), null);

// tamanho escolhido no cabaz (a linha leva o EAN da ficha, não o do tamanho)
assert.equal(varianteDoEan(prod, '3600523000017', 'https://x.pt/products/a', 50), null,
  'vários tamanhos no mesmo produto, sem ?variant= → não se adivinha');
assert.equal(varianteDoEan(prod, '3600523000017', 'https://x.pt/products/a?variant=11', 50), 11,
  'com ?variant= o tamanho é o do endereço');
assert.equal(varianteDoEan({ variants: [{ id: 7, barcode: '' }] }, '5000000000000', 'https://x.pt/products/tamanho-50ml', 50), 7,
  'cada tamanho é um produto à parte (o endereço já é o do tamanho) → a única variante');

// links: um por origem, quantidades inteiras ≥ 1, sem variante → fica de fora
const links = linksDeCarrinho([
  { url: 'https://www.farmatogo.com/products/a', variante: 101, quantidade: 2 },
  { url: 'https://www.farmatogo.com/products/b?variant=202', variante: 202, quantidade: 1 },
  { url: 'https://nouxis.com/products/c', variante: 303, quantidade: 0 },
  { url: 'https://www.farmatogo.com/products/d', variante: null, quantidade: 1 },
]);
assert.deepEqual(links, [
  { origem: 'https://www.farmatogo.com', link: 'https://www.farmatogo.com/cart/add?items[0][id]=101&items[0][quantity]=2&items[1][id]=202&items[1][quantity]=1' },
  { origem: 'https://nouxis.com', link: 'https://nouxis.com/cart/add?items[0][id]=303&items[0][quantity]=1' },
]);
assert.deepEqual(linksDeCarrinho([]), []);

// VTEX (Nossa Farmácia): SKU no endereço, link /checkout/cart/add com seller=1
assert.equal(skuVtexDoUrl('https://www.nossafarmacia.pt/cerave-serum/p?skuId=7127498'), 7127498);
assert.equal(skuVtexDoUrl('https://www.nossafarmacia.pt/cerave-serum/p'), null);
assert.equal(skuVtexDoUrl('https://www.nossafarmacia.pt/cerave-serum/p?skuId=abc'), null);
assert.deepEqual(linksDeCarrinho([
  { url: 'https://www.nossafarmacia.pt/a/p?skuId=7478107', variante: 7478107, quantidade: 2 },
  { url: 'https://www.nossafarmacia.pt/b/p?skuId=7127498', variante: 7127498, quantidade: 1 },
  { url: 'https://www.nossafarmacia.pt/c/p', variante: null, quantidade: 1 },
], 'vtex'), [{ origem: 'https://www.nossafarmacia.pt',
  link: 'https://www.nossafarmacia.pt/checkout/cart/add?sku=7478107&qty=2&seller=1&sku=7127498&qty=1&seller=1&redirect=true&sc=1' }]);

// a lista de lojas: slugs que existem, origem https, só shopify
const ROOT = path.resolve(__dirname, '..');
const fich = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'carrinho-automatico.json'), 'utf8'));
const slugs = new Set(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json.gz', 'lojas.jsonl'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l).slug));
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(fich.verificado), 'data de verificação');
assert.ok(Object.keys(fich.lojas).length > 0);
for (const [slug, l] of Object.entries(fich.lojas)) {
  assert.ok(slugs.has(slug), `loja desconhecida: ${slug}`);
  assert.ok(['shopify', 'vtex'].includes(l.plataforma), slug);
  assert.ok(/^https:\/\/[^/]+$/.test(l.origem), `${slug}: origem sem caminho nem barra final`);
}

console.log(`carrinho-automatico: handle, variante (?variant=, EAN sem zeros, única, tamanho escolhido), VTEX (skuId, link), um link por origem, lista de ${Object.keys(fich.lojas).length} lojas coerente — tudo passou`);
