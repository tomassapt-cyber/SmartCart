// node --test scripts/test-pesquisa-endereco.test.mjs
// A pesquisa fica no endereço (?q=…): uma ligação com ?q= abre com a pesquisa
// feita, escrever no campo atualiza o endereço sem encher o histórico, e limpar
// tira o ?q=. Corre o demo.html num Chromium real com um Supabase falso mínimo.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DEMO = process.env.DEMO || fileURLToPath(new URL('../demo.html', import.meta.url));
const CLIENTE = `
(() => {
  const q = { select() { return q; }, eq() { return q; }, in: async () => ({ data: [], error: null }),
              order() { return q; }, limit() { return q; }, then(r) { return Promise.resolve({ data: [], error: null }).then(r); } };
  const client = { from: () => q, rpc: async () => ({ data: null, error: null }),
    auth: { getSession: async () => ({ data: { session: null }, error: null }), getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }, signOut: async () => ({ error: null }) } };
  window.supabase = { createClient: () => client };
})();
`;

let srv, browser, base;
before(async () => {
  const corpo = readFileSync(DEMO);
  srv = createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(corpo); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}/`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(r => srv?.close(r)); });

async function abrir(caminho) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  await ctx.addInitScript(CLIENTE);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(base + caminho);
  await page.waitForFunction(() => typeof window.SUPABASE !== 'undefined' && window.SUPABASE, null, { timeout: 30000 });
  return { page, ctx, erros };
}
const valores = page => page.evaluate(() => ({
  hero: document.getElementById('search').value,
  catalogo: document.getElementById('catalog-search-input')?.value,
  titulo: document.getElementById('catalog-title')?.textContent,
  endereco: location.pathname + location.search,
}));

test('uma ligação com ?q= abre com a pesquisa feita', async () => {
  const { page, ctx, erros } = await abrir('?q=niacinamida');
  await page.waitForFunction(() => document.getElementById('search').value === 'niacinamida', null, { timeout: 10000 });
  const v = await valores(page);
  assert.equal(v.catalogo, 'niacinamida');
  assert.equal(v.titulo, 'Resultados para "niacinamida"');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('escrever no campo atualiza o endereço sem encher o histórico; limpar tira o ?q=', async () => {
  const { page, ctx, erros } = await abrir('');
  const hist0 = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    const el = document.getElementById('catalog-search-input');
    for (const parcial of ['c', 'ce', 'cer', 'cerave']) { el.value = parcial; el.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  let v = await valores(page);
  assert.equal(v.endereco, '/?q=cerave');
  assert.equal(await page.evaluate(() => history.length), hist0);
  await page.evaluate(() => document.getElementById('catalog-search-clear')?.click() ?? setSearchQuery('', null));
  v = await valores(page);
  assert.equal(v.endereco, '/');
  assert.equal(v.hero, '');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('outros parâmetros do endereço ficam (ex.: ?quiz=1 não é apagado pela pesquisa)', async () => {
  const { page, ctx } = await abrir('?x=1');
  await page.evaluate(() => setSearchQuery('spf 50', null));
  assert.equal((await valores(page)).endereco, '/?x=1&q=spf+50');
  await ctx.close();
});
