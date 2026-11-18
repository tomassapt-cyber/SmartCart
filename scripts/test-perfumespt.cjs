'use strict';
// Perfumes.pt (2026-11-18): leitura das fichas Magento (ProductGroup com um Product por tamanho, EAN
// no sku), rotação com memória, feed com a data de cada linha e integração só-existentes. Sem rede.
// Uso: node scripts/test-perfumespt.cjs
const assert = require('node:assert/strict');
const { linhasDaFicha, planear, feedDaMemoria, FICHA, DIAS_FEED, REVER_OUTRAS_DIAS } = require('./scrape-perfumespt-catalog');
const { integrar } = require('./lib/integrar-existentes');
const { LOJA } = require('./integrate-perfumespt-catalog');

const U = 'https://www.perfumes.pt/pt/perfumes/leau-dissey-pour-homme-sport-edt_p21997.html';
const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const oferta = (price, disp = 'InStock') => ({ '@type': 'Offer', price: String(price), priceCurrency: 'EUR', availability: `https://schema.org/${disp}` });

// ---------- ficha com tamanhos: um Product por tamanho, EAN no sku, volume do próprio tamanho no nome
const grupo = ld({ '@type': 'ItemPage', mainEntity: { '@id': U + '#product' } }) + ld({
  '@type': 'ProductGroup', name: "L'Eau d'Issey Pour Homme Sport EDT 50ml", brand: { '@type': 'Brand', name: 'Issey Miyake' },
  hasVariant: [
    { '@type': 'Product', name: "L'Eau d'Issey Pour Homme Sport EDT 50ml - Única / 50 ml", sku: '3423474867059', size: '50 ml', offers: oferta(29.54) },
    { '@type': 'Product', name: "L'Eau d'Issey Pour Homme Sport EDT 50ml - Única / 100 ml", sku: '3423474867158', size: '100 ml', offers: oferta(35.99, 'OutOfStock') },
    { '@type': 'Product', name: 'repetido', sku: '3423474867059', size: '50 ml', offers: oferta(29.54) },
  ] });
let r = linhasDaFicha(U, grupo);
const porEan = ls => [...ls].sort((a, b) => (a.ean < b.ean ? -1 : 1));
assert.deepEqual(porEan(r.linhas), [
  { status: 'ok', ean: '3423474867059', name: "L'Eau d'Issey Pour Homme Sport EDT 50 ml", brand: 'Issey Miyake', price: 29.54, in_stock: true, url: U },
  { status: 'ok', ean: '3423474867158', name: "L'Eau d'Issey Pour Homme Sport EDT 100 ml", brand: 'Issey Miyake', price: 35.99, in_stock: false, url: U },
]);
assert.equal(r.linhas.length, 2, 'o EAN repetido não conta duas vezes');

// ficha simples (um Product), EAN no gtin13
r = linhasDaFicha(U, ld({ '@type': 'Product', name: 'Defining Brow Gel Clear 8 ml', brand: { name: 'Gosh' }, gtin13: '5701278619202', offers: oferta(7.72) }));
assert.deepEqual(r.linhas.map(l => [l.ean, l.name, l.price]), [['5701278619202', 'Defining Brow Gel Clear 8 ml', 7.72]]);
// código interno com zeros à frente («0000030065949») não é EAN; sem JSON-LD; preço inválido
assert.equal(linhasDaFicha(U, ld({ '@type': 'Product', name: 'Vichy', sku: '0000030065949', offers: oferta(13.38) })).motivo, 'sem_gtin');
assert.equal(linhasDaFicha(U, '<html>sem dados</html>').motivo, 'sem_jsonld');
assert.equal(linhasDaFicha(U, ld({ '@type': 'Product', name: 'X', sku: '5701278619202', offers: oferta(0) })).motivo, 'preco_invalido');
assert.ok(FICHA.test(U) && !FICHA.test('https://www.perfumes.pt/pt/ajuda/faq_209.html'));

// ---------- rotação: nunca lidas → com produtos nossos (mais antigas primeiro) → outras ao fim de 30 dias
const agora = Date.parse('2026-11-18T12:00:00Z');
const dias = d => new Date(agora - d * 864e5).toISOString();
const f = n => `https://www.perfumes.pt/pt/perfumes/x_p${n}.html`;
const visiveis = new Set(['3423474867059']);
const memoria = {
  [f(1)]: { lido_em: dias(1), eans: ['3423474867059'], linhas: [{ ean: '3423474867059', name: 'A 50 ml', brand: 'M', price: 10, in_stock: true }] },
  [f(2)]: { lido_em: dias(3), eans: ['03423474867059'], linhas: [{ ean: '03423474867059', name: 'B 50 ml', brand: 'M', price: 11, in_stock: true }] },
  [f(3)]: { lido_em: dias(2), eans: ['5701278619202'], linhas: [{ ean: '5701278619202', name: 'C', brand: 'M', price: 7, in_stock: true }] },
  [f(4)]: { lido_em: dias(REVER_OUTRAS_DIAS + 1), eans: [], estado: 'sem_gtin' },
  [f(5)]: { lido_em: dias(DIAS_FEED + 1), eans: ['3423474867059'], linhas: [{ ean: '3423474867059', name: 'E 50 ml', brand: 'M', price: 12, in_stock: true }] },
};
assert.deepEqual(planear([f(1), f(2), f(3), f(4), f(5), f(6), f(6), 'https://www.perfumes.pt/pt/ajuda/faq_209.html'], visiveis, memoria, agora),
  [f(6), f(5), f(2), f(1), f(4)], 'nunca lida; nossas da mais antiga para a mais recente; a sem produtos nossos só passado um mês; a f(3) fica de fora');

// ---------- feed: só linhas dos últimos DIAS_FEED dias e de produtos que o site mostra, com a data de cada leitura
const feed = feedDaMemoria(memoria, visiveis, agora);
assert.deepEqual(feed.map(l => [l.url, l.verified_at]), [[f(1), dias(1)], [f(2), dias(3)]]);

// ---------- integração: só ofertas em produtos existentes, verified_at da linha (não do feed)
const seed = { stores: [], products: [{ ean: '3423474867059', name: "Issey Miyake L'Eau d'Issey Pour Homme Sport EDT 50ml", brand: 'Issey Miyake' }], store_products: [] };
const linhas = linhasDaFicha(U, grupo).linhas.map(l => ({ ...l, verified_at: dias(2) }));
const res = integrar(seed, { in_progress: false, completed_at: new Date().toISOString(), products: linhas }, LOJA);
assert.equal(res.products_created, 0); assert.equal(res.offers, 1); assert.equal(seed.products.length, 1);
const item = seed.store_products.find(g => g.store_slug === 'perfumespt').items[0];
assert.equal(item.price, 29.54); assert.equal(item.verified_at, dias(2), 'a data que conta é a da leitura da ficha');
assert.deepEqual(seed.stores, [{ slug: 'perfumespt', name: 'Perfumes.pt', base_url: 'https://www.perfumes.pt/pt', logo_url: null }]);
// um ensaio com --limite (in_progress) não se integra
assert.throws(() => integrar(seed, { in_progress: true, completed_at: new Date().toISOString(), products: linhas }, LOJA), /incompleto/);

console.log('perfumes.pt: tamanhos com o EAN no sku e o volume certo, rotação com memória, feed com a data de cada leitura, integração só-existentes — tudo passou');
