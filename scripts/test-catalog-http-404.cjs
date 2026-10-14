'use strict';
// Guarda HTTP (scripts/lib/catalog-http.js): sitemap com HTTP 404.
// A farmaciavirtual.pt serve as páginas 2–6 do sitemap com 404 mas com o XML
// completo (2026-10-14). Aceite SÓ com XML de sitemap e pelo menos um <loc>;
// tudo o resto continua a parar a recolha. Sem rede.
// Uso: node scripts/test-catalog-http-404.cjs
const assert = require('node:assert/strict');
const { createCatalogClient } = require('./lib/catalog-http');

const resposta = (status, body, type = 'application/xml') => async url => ({
  status, ok: status >= 200 && status < 300, url,
  headers: { get: () => type },
  text: async () => body,
  body: { cancel: async () => {} },
});
const XML = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://loja.test/produto/a</loc></url></urlset>';
const SITEMAP = 'https://loja.test/wp-sitemap-posts-product-2.xml';

async function com(fetchFalso, fn) {
  const antes = globalThis.fetch, log = console.log, linhas = [];
  globalThis.fetch = fetchFalso; console.log = (...a) => linhas.push(a.join(' '));
  try { return await fn(createCatalogClient(), linhas); } finally { globalThis.fetch = antes; console.log = log; }
}
const parou = async (p, msg) => { await assert.rejects(p, e => e.catalogFatal === true && msg.test(e.message)); };

(async () => {
  // 404 com XML de sitemap e <loc> → aceite, com o corpo inteiro
  await com(resposta(404, XML), async (c, linhas) => {
    const r = await c.fetch(SITEMAP);
    assert.equal(r.status, 404);
    assert.ok((await r.text()).includes('<loc>https://loja.test/produto/a</loc>'));
    assert.ok(linhas.some(l => l.includes('404 mas XML válido — aceite')), 'fica registado no log');
  });
  // 404 com página de erro → pára (e o cliente fica parado)
  await com(resposta(404, '<html><title>Página não encontrada</title></html>', 'text/html'), async c => {
    await parou(c.fetch(SITEMAP), /Sitemap recusado: HTTP 404/);
    await parou(c.fetch('https://loja.test/produto/a'), /Sitemap recusado/);
  });
  // 404 com urlset vazio → pára (não há nada que recolher)
  await com(resposta(404, '<urlset></urlset>'), async c => { await parou(c.fetch(SITEMAP), /Sitemap recusado: HTTP 404/); });
  // o resto não muda: 403/429 param, 410 num sitemap pára, 200 passa
  await com(resposta(403, XML), async c => { await parou(c.fetch(SITEMAP), /Recolha interrompida: HTTP 403/); });
  await com(resposta(429, XML), async c => { await parou(c.fetch(SITEMAP), /Recolha interrompida: HTTP 429/); });
  await com(resposta(410, XML), async c => { await parou(c.fetch(SITEMAP), /Sitemap recusado: HTTP 410/); });
  await com(resposta(200, XML), async c => { assert.equal((await c.fetch(SITEMAP)).status, 200); });
  // ficha de produto com 404 continua a passar (o scraper conta-a como «not_found»)
  await com(resposta(404, '<html>não existe</html>', 'text/html'), async c => { assert.equal((await c.fetch('https://loja.test/produto/x')).status, 404); });
  console.log('catalog-http 404: XML com <loc> aceite; página de erro, urlset vazio, 403, 429 e 410 param; 200 e fichas 404 como antes — tudo passou');
})().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1; });
