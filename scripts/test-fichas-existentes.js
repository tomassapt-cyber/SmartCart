'use strict';
// Testes offline da recolha "só existentes" por fichas JSON-LD (scripts/lib/fichas-existentes.js,
// usada pela Glammy) e da integração com a configuração real da loja. Sem rede.
// Uso: node scripts/test-fichas-existentes.js
const assert = require('node:assert/strict');
const { recolher, linhaDaFicha, crawlDelay, charsetDe } = require('./lib/fichas-existentes');
const { integrar } = require('./lib/integrar-existentes');
const { LOJA } = require('./integrate-glammy-catalog');

const ficha = (nome, gtin, preco, extra = '') => `<html><head><title>${nome}</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"${nome}","sku":"6944132"${gtin ? `,"gtin":"${gtin}"` : ''},
"brand":{"@type":"Brand","name":"Endocare"},"offers":{"@type":"Offer","price":"${preco}","priceCurrency":"EUR",
"availability":"https://schema.org/InStock"${extra}}}</script></head><body></body></html>`;
// windows-1252: "é" = 0xE9 (em UTF-8 seria inválido e dava "�")
const latin1 = s => Uint8Array.from([...s].map(c => c.charCodeAt(0) & 0xff));

(async () => {
  // ---------- peças
  assert.equal(crawlDelay('User-agent: *\nCrawl-delay: 1\nDisallow: /api/\n'), 1);
  assert.equal(crawlDelay('User-agent: Bingbot\nCrawl-delay: 9\n\nUser-agent: *\nDisallow: /x\n'), null);
  assert.equal(charsetDe('text/html; charset=ISO-8859-1'), 'windows-1252');
  assert.equal(charsetDe('text/html'), 'utf-8');
  const riscado = ',"priceSpecification":[{"@type":"UnitPriceSpecification","price":"46.95","priceCurrency":"EUR","priceType":"https://schema.org/StrikethroughPrice"}]';
  const { linha } = linhaDaFicha('https://loja.pt/pt/a_p1.html', JSON.parse(ficha('Gel Creme 50ml', '8437002567996', '32.87', riscado).match(/\{"@context":"https:\/\/schema.org","@type":"Product"[\s\S]*?\}\}(?=<\/script>)/)[0]));
  assert.deepEqual(linha, { status: 'ok', ean: '8437002567996', name: 'Gel Creme 50ml', brand: 'Endocare', price: 32.87, in_stock: true, url: 'https://loja.pt/pt/a_p1.html', previous_price: 46.95 });

  // ---------- recolha com fetch simulado
  const fetchOriginal = globalThis.fetch;
  const pedidos = [];
  const loja = rotas => async url => {
    const u = new URL(url); pedidos.push(u.pathname);
    const r = rotas[u.pathname];
    const [estado, corpo, tipo] = typeof r === 'function' ? r() : (r || [404, '', 'text/html']);
    const bytes = corpo instanceof Uint8Array ? corpo : new TextEncoder().encode(corpo);
    return { status: estado, url, headers: { get: () => tipo || 'text/html; charset=utf-8' }, arrayBuffer: async () => bytes.buffer };
  };
  const base = {
    '/robots.txt': [200, 'User-agent: *\nCrawl-delay: 0.001\nDisallow: /api/\n', 'text/plain'],
    '/sitemap.xml': [200, '<sitemapindex><sitemap><loc>https://loja.pt/mapa_pt.xml</loc></sitemap></sitemapindex>', 'text/xml'],
    '/mapa_pt.xml': [200, '<urlset><url><loc>https://loja.pt/pt/a_p1.html</loc></url><url><loc>https://loja.pt/pt/b_p2.html</loc></url><url><loc>https://loja.pt/pt/c_p3.html</loc></url><url><loc>https://loja.pt/pt/d_p4.html</loc></url><url><loc>https://loja.pt/pt/marca_123.html</loc></url></urlset>', 'text/xml'],
    '/pt/a_p1.html': [200, latin1(ficha('Loção Hidratante 400ml', '8437002567996', '13.95')), 'text/html; charset=ISO-8859-1'],
    '/pt/b_p2.html': [200, ficha('Sem código 50ml', null, '9.90')],
    '/pt/c_p3.html': [404, ''],
    '/pt/d_p4.html': [200, ficha('Código interno', '2005199096351', '13.67')],
  };
  const opcoes = (extra = {}) => ({ origem: 'https://loja.pt', mapa: 'https://loja.pt/sitemap.xml', filtroFicha: /_p\d+\.html$/, pausaMs: 0, minimo: 1, ...extra });
  try {
    globalThis.fetch = loja(base);
    let r = await recolher(opcoes());
    assert.equal(r.in_progress, false); assert.equal(r.sitemap_products, 4, 'só as fichas (_pNNN) contam');
    assert.equal(r.read, 4); assert.equal(r.retired, 1); assert.equal(r.counts.sem_gtin, 1); assert.equal(r.pause_ms, 201, 'Crawl-delay do robots.txt manda na pausa');
    assert.equal(r.products[0].name, 'Loção Hidratante 400ml', 'página windows-1252 descodificada pelo charset do cabeçalho');
    assert.deepEqual(r.products.map(x => x.ean), ['8437002567996', '2005199096351']);
    assert.ok(!pedidos.includes('/pt/marca_123.html'));
    // ensaio parcial, mínimo
    assert.equal((await recolher(opcoes({ limite: 1 }))).in_progress, true);
    await assert.rejects(recolher(opcoes({ minimo: 50 })), /mínimo/);
    // paragens sem gravar: 429, 403, desafio, robots
    globalThis.fetch = loja({ ...base, '/pt/b_p2.html': [429, ''] }); await assert.rejects(recolher(opcoes()), /429/);
    globalThis.fetch = loja({ ...base, '/mapa_pt.xml': [403, ''] }); await assert.rejects(recolher(opcoes()), /403/);
    globalThis.fetch = loja({ ...base, '/pt/a_p1.html': [200, '<html><title>Just a moment...</title></html>'] }); await assert.rejects(recolher(opcoes()), /desafio/);
    globalThis.fetch = loja({ ...base, '/robots.txt': [200, 'User-agent: *\nDisallow: /pt/\n', 'text/plain'] }); await assert.rejects(recolher(opcoes()), /robots/);
    // muitas falhas (5xx) → não grava
    globalThis.fetch = loja({ ...base, '/pt/a_p1.html': [500, ''], '/pt/b_p2.html': [500, ''] }); await assert.rejects(recolher(opcoes()), /falharam/);
  } finally { globalThis.fetch = fetchOriginal; }

  // ---------- integração com a configuração real da Glammy
  const seed = () => ({ stores: [], products: [
    { ean: '8437002567996', name: 'Endocare Cellage Gel Creme 50ml', brand: 'Endocare', image_url: 'x.jpg' },
    { ean: '2005199096351', name: 'Folyoben 56 Comprimidos', brand: 'Folyoben' } ], store_products: [] });
  const feed = rows => ({ in_progress: false, completed_at: new Date().toISOString(), products: rows });
  const row = { status: 'ok', ean: '8437002567996', name: 'Endocare Cellage Gel Creme 50ml', price: 32.87, previous_price: 46.95, in_stock: true, url: LOJA.urlPrefix + 'endocare/x_p2003.html' };
  const s = seed();
  const r = integrar(s, feed([row, { ...row, ean: '2005199096351', name: 'Folyoben 56 Comprimidos', url: LOJA.urlPrefix + 'f_p7232.html' }]), LOJA);
  assert.equal(r.offers, 1); assert.equal(r.products_created, 0); assert.equal(s.products.length, 2);
  assert.match(r.conflicts[0].motivo, /circulação restrita/, 'códigos internos (prefixo 2) recusados');
  assert.equal(s.store_products[0].items[0].previous_price, 46.95);
  assert.throws(() => integrar(seed(), feed([{ ...row, url: 'https://www.glammy.pt/en/x_p1.html' }]), LOJA), /inválida/, 'só fichas em português');
  console.log('Fichas só-existentes (Glammy): Crawl-delay, charset windows-1252, JSON-LD com preço riscado, só fichas do mapa, 404, sem GTIN, ensaio parcial, mínimo, paragem em 403/429/desafio/robots, falhas, integração sem criar produtos, códigos internos recusados, URL fora de /pt/ — tudo passou');
})().catch(e => { console.error(e); process.exit(1); });
