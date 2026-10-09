'use strict';
// Testes offline das lojas "só produtos existentes" em Shopify (SkinLovers e Ilha
// dos Cosméticos): recolha (robots, GTIN, bloco + cache de GTIN, cobertura,
// paragem em 403/429/desafio, ensaio parcial) e integração (sem criar produtos,
// aliases, volumes, feeds velhos, conflitos, cobertura, idempotência, outras
// lojas intactas). Sem rede. Uso: node scripts/test-integrar-existentes.js
const assert = require('node:assert/strict');
const { integrar } = require('./lib/integrar-existentes');
const { recolher, linhas, gtinValido, regrasRobots, permitido } = require('./lib/shopify-existentes');
const { LOJA: SKL } = require('./integrate-skinlovers-catalog');
const { LOJA: ILHA } = require('./integrate-ilhadoscosmeticos-catalog');

(async () => {
  // ---------- GTIN e robots
  assert.ok(gtinValido('3337875598767') && gtinValido('7899572810383') && gtinValido('012345678905'));
  assert.ok(!gtinValido('3337875598768') && !gtinValido('30160606') && !gtinValido('') && !gtinValido(null) && !gtinValido('LB9804'));
  const robots = 'User-agent: adsbot-google\nDisallow: /\n\nUser-agent: *\nAllow: /\nDisallow: /cart/\nDisallow: /*/cart/\nDisallow: /cart.js\nDisallow: /collections/*sort_by*\n';
  const regras = regrasRobots(robots);
  assert.ok(permitido(regras, '/pt-pt/products/cerave.js') && permitido(regras, '/pt-pt/products.json?limit=250&page=1') && permitido(regras, '/sitemap_products_1.xml?from=1&to=2'));
  assert.ok(!permitido(regras, '/cart/add.js') && !permitido(regras, '/pt-pt/cart/x') && !permitido(regras, '/collections/all?sort_by=price'));

  // ---------- linhas: GTIN da cache, título com a variante, preço barrado, por ler
  const prods = [{ handle: 'creme', title: 'Creme X', vendor: 'Marca', variants: [
    { id: 1, title: '50ml', price: '19.99', compare_at_price: '24.99', available: true },
    { id: 2, title: '100ml', price: '29.99', compare_at_price: null, available: true },
    { id: 3, title: '200ml', price: '39.99', available: false },
    { id: 4, title: '300ml', price: '49.99', available: false } ] }];
  const { linhas: ls, contas } = linhas('https://loja.pt/pt-pt', prods, { 1: '3337875598767', 2: '3337875598768', 3: '' });
  assert.deepEqual(ls, [{ status: 'ok', ean: '3337875598767', name: 'Creme X - 50ml', brand: 'Marca', price: 19.99, in_stock: true, url: 'https://loja.pt/pt-pt/products/creme?variant=1', previous_price: 24.99 }]);
  assert.deepEqual(contas, { sem_gtin: 2, por_ler: 1, preco_invalido: 0 });

  // ---------- recolha com fetch simulado: bloco + GTIN só das variantes por ler
  const fetchOriginal = globalThis.fetch;
  const pedidos = [];
  const loja = (rotas) => async (url) => {
    const u = new URL(url); pedidos.push(u.pathname + u.search);
    const r = rotas[u.pathname + u.search] ?? rotas[u.pathname];
    const [estado, corpo] = typeof r === 'function' ? r() : (r || [404, '']);
    return { status: estado, url, text: async () => corpo };
  };
  const p = (h, id, preco = '10.00', available = true) => ({ handle: h, title: h, vendor: 'M', variants: [{ id, title: 'Default Title', price: preco, available }] });
  const js = (h, id, barcode) => [200, JSON.stringify({ handle: h, variants: [{ id, barcode }] })];
  const base = {
    '/robots.txt': [200, robots],
    '/sitemap.xml': [200, '<sitemapindex><sitemap><loc>https://loja.pt/sitemap_products_1.xml?from=1&amp;to=2</loc></sitemap><sitemap><loc>https://loja.pt/es/sitemap_products_1.xml?from=1&amp;to=2</loc></sitemap></sitemapindex>'],
    '/sitemap_products_1.xml?from=1&to=2': [200, '<urlset><url><loc>https://loja.pt/products/a</loc></url><url><loc>https://loja.pt/products/b</loc></url><url><loc>https://loja.pt/products/c</loc></url></urlset>'],
    '/es/sitemap_products_1.xml?from=1&to=2': () => { throw Error('não devia ler o mapa de outro mercado'); },
    '/pt-pt/products.json?limit=250&page=1': [200, JSON.stringify({ products: [p('a', 11, '12.50'), p('b', 22), p('c', 33, '9.99', false)] })],
    '/pt-pt/products.json?limit=250&page=2': [200, '{"products":[]}'],
    '/pt-pt/products/a.js': js('a', 11, '3337875598767'), '/pt-pt/products/b.js': js('b', 22, 'SEM'), '/pt-pt/products/c.js': [404, ''],
  };
  const opcoes = (extra = {}) => ({ origem: 'https://loja.pt', prefixo: 'https://loja.pt/pt-pt', pausaMs: 0, pausaJsMs: 0, minimo: 1, ...extra });
  try {
    globalThis.fetch = loja(base);
    const cache = {};
    let r = await recolher(opcoes({ cache }));
    assert.equal(r.in_progress, false); assert.equal(r.bulk_products, 3); assert.equal(r.coverage, 1); assert.equal(r.gtin_lookups, 3); assert.equal(r.retired, 1);
    assert.deepEqual(r.products.map(x => [x.ean, x.price, x.in_stock, x.url]), [['3337875598767', 12.5, true, 'https://loja.pt/pt-pt/products/a']]);
    assert.deepEqual(cache, { 11: '3337875598767', 22: 'SEM' });
    assert.ok(!pedidos.some(x => x.startsWith('/es/')), 'só os mapas do mercado principal');
    // segunda corrida: a cache poupa as leituras já feitas (só o retirado volta a ser tentado)
    pedidos.length = 0; r = await recolher(opcoes({ cache }));
    assert.deepEqual(pedidos.filter(x => x.endsWith('.js')), ['/pt-pt/products/c.js']); assert.equal(r.products.length, 1);
    // limite de leituras de GTIN por corrida
    r = await recolher(opcoes({ cache: {}, maxJs: 1 }));
    assert.equal(r.gtin_lookups, 1); assert.equal(r.gtin_pending, 2);
    // ensaio parcial, mínimo, cobertura do bloco
    assert.equal((await recolher(opcoes({ cache: {}, limite: 1 }))).in_progress, true, 'um ensaio com --limite tem de sair marcado como parcial');
    await assert.rejects(recolher(opcoes({ cache: {}, minimo: 5 })), /mínimo/);
    globalThis.fetch = loja({ ...base, '/pt-pt/products.json?limit=250&page=1': [200, JSON.stringify({ products: [p('a', 11)] })] });
    await assert.rejects(recolher(opcoes({ cache: {} })), /só cobre 33%/);
    // paragens sem gravar: 429, 403, desafio, robots
    globalThis.fetch = loja({ ...base, '/pt-pt/products/b.js': [429, ''] });
    await assert.rejects(recolher(opcoes({ cache: {} })), /429/);
    globalThis.fetch = loja({ ...base, '/pt-pt/products.json?limit=250&page=1': [403, ''] });
    await assert.rejects(recolher(opcoes({ cache: {} })), /403/);
    globalThis.fetch = loja({ ...base, '/pt-pt/products/a.js': [200, '<html><title>Just a moment...</title></html>'] });
    await assert.rejects(recolher(opcoes({ cache: {} })), /desafio/);
    globalThis.fetch = loja({ ...base, '/robots.txt': [200, 'User-agent: *\nDisallow: /pt-pt/products\n'] });
    await assert.rejects(recolher(opcoes({ cache: {} })), /robots/);
  } finally { globalThis.fetch = fetchOriginal; }

  // ---------- integração só-existentes, com a configuração real de cada loja
  for (const LOJA of [SKL, ILHA]) {
    const url = LOJA.urlPrefix + 'creme-reparador';
    const seed = () => ({ stores: [], products: [
      { ean: '3282770146691', name: 'Biology A-R Creme 40ml', brand: 'A-Derma', image_url: 'x.jpg', eans_antigos: ['3282770146677'] },
      { ean: '3337875598767', name: 'CeraVe Creme de Limpeza Hidratante 1000ml', brand: 'CeraVe', image_url: null },
      { ean: '7898965420149', name: 'Lola Shampoo 250ml', brand: 'Lola', image_url: null } ], store_products: [] });
    const feed = rows => ({ in_progress: false, completed_at: new Date().toISOString(), products: rows });
    const row = { status: 'ok', ean: '3282770146691', name: 'A-Derma Biology A-R Creme 40ml', price: 22.08, in_stock: true, url };

    let s = seed(); let r = integrar(s, feed([row, { ...row, ean: '5201062007029', name: 'Youth Lab. Gel Limpeza 200ml', url: url + '-2' }]), LOJA);
    assert.equal(r.offers, 1); assert.equal(r.products_created, 0); assert.equal(s.products.length, 3); assert.equal(r.unmatched_count, 1);
    assert.deepEqual(s.stores, [{ slug: LOJA.slug, name: LOJA.name, base_url: LOJA.base_url, logo_url: null }]);
    assert.equal(s.products[0].image_url, 'x.jpg', 'imagens dos produtos não mudam');
    // EAN antigo do produto e grafia UPC-A ("0"+12) casam com o produto canónico
    s = seed(); r = integrar(s, feed([{ ...row, ean: '3282770146677', in_stock: false }]), LOJA);
    assert.equal(r.inactive_offers, 1); assert.equal(s.store_products[0].items[0].ean, '3282770146691'); assert.equal(r.matched_by_alias, 1);
    s = seed(); s.products.push({ ean: '012345678905', name: 'Produto UPC 30ml', brand: 'X' });
    r = integrar(s, feed([{ ...row, ean: '0012345678905', name: 'Produto UPC 30ml' }]), LOJA); assert.equal(r.offers, 1);
    // GTIN-14 com zero à esquerda = EAN-13 do catálogo
    s = seed(); r = integrar(s, feed([{ ...row, ean: '03282770146691' }]), LOJA); assert.equal(r.offers, 1); assert.equal(s.store_products[0].items[0].ean, '3282770146691');
    // alias documentado em data/product-aliases.json
    s = seed(); r = integrar(s, feed([{ ...row, ean: '5000000000012' }]), LOJA, { '3282770146691': { aliases: ['5000000000012'] } }); assert.equal(r.offers, 1);
    // preço barrado só quando é maior
    s = seed(); integrar(s, feed([{ ...row, previous_price: 25 }]), LOJA); assert.equal(s.store_products[0].items[0].previous_price, 25);
    s = seed(); integrar(s, feed([{ ...row, previous_price: 10 }]), LOJA); assert.equal(s.store_products[0].items[0].previous_price, undefined);
    // feeds que não se gravam
    assert.throws(() => integrar(seed(), feed([]), LOJA));
    assert.throws(() => integrar(seed(), { ...feed([row]), in_progress: true }, LOJA));
    assert.throws(() => integrar(seed(), { ...feed([row]), completed_at: '2020-01-01T00:00:00Z' }, LOJA));
    assert.throws(() => integrar(seed(), feed([{ ...row, price: -1 }]), LOJA));
    assert.throws(() => integrar(seed(), feed([{ ...row, ean: '3282770146690' }]), LOJA), /inválida/);
    assert.throws(() => integrar(seed(), feed([{ ...row, url: 'https://outra-loja.pt/products/x' }]), LOJA), /inválida/);
    assert.throws(() => integrar(seed(), feed([{ ...row, ean: '5201062007029' }]), LOJA), /Nenhum produto/);
    // conflitos: dois preços para o mesmo volume, volume ou unidade que o produto não tem
    s = seed(); r = integrar(s, feed([row, { ...row, ean: '3337875598767', name: 'CeraVe Creme de Limpeza Hidratante 1000ml', url: url + '-c' }, { ...row, price: 99, url: url + '-b' }]), LOJA);
    assert.equal(r.offers, 1); assert.equal(r.conflicts_count, 1); assert.equal(s.store_products[0].items[0].ean, '3337875598767');
    s = seed(); r = integrar(s, feed([{ ...row, ean: '3337875598767', name: 'CeraVe Creme 1000ml' }, { ...row, name: 'A-Derma Biology A-R 50ml' }]), LOJA);
    assert.equal(r.conflicts[0].motivo, 'volume que o produto ainda não tem');
    s = seed(); r = integrar(s, feed([{ ...row, ean: '3337875598767', name: 'CeraVe Creme 1000ml' }, { ...row, name: 'A-Derma Biology A-R 40g' }]), LOJA);
    assert.equal(r.conflicts[0].motivo, 'unidades diferentes (massa/volume)');
    // volume que outra loja já tem para o produto é aceite; a outra loja fica intacta
    s = seed(); s.store_products = [{ store_slug: 'outra', items: [{ ean: row.ean, price: 5, variants: [{ volume_ml: 50, price: 5 }] }] }];
    const outra = JSON.stringify(s.store_products[0]);
    r = integrar(s, feed([row, { ...row, ean: '3282770146677', name: 'A-Derma Biology A-R 50ml', price: 30, in_stock: false, url: url + '#50' }]), LOJA);
    assert.equal(r.offers, 1); assert.equal(s.store_products[1].items[0].variants.length, 2); assert.equal(s.store_products[1].items[0].price, row.price);
    assert.equal(JSON.stringify(s.store_products[0]), outra);
    // idempotência e guarda de cobertura
    s = seed(); const f2 = feed([row, { ...row, ean: '3337875598767', name: 'CeraVe Creme de Limpeza Hidratante 1000ml', url: url + '-c' }]);
    integrar(s, f2, LOJA); const uma = JSON.stringify(s); integrar(s, f2, LOJA); assert.equal(JSON.stringify(s), uma); assert.equal(s.stores.length, 1);
    assert.throws(() => integrar(s, feed([row]), LOJA), /Cobertura caiu/);
  }
  console.log('Lojas só-existentes (SkinLovers, Ilha dos Cosméticos): GTIN, robots, linhas, bloco + cache de GTIN, limite de leituras, cobertura do bloco, paragem em 403/429/desafio/robots, ensaio parcial, mínimo, sem criar produtos, EAN antigo, UPC, alias, preço barrado, feeds inválidos/velhos/vazios, URL de outra loja, conflitos de preço/volume/unidade, outras lojas intactas, idempotência e cobertura — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
