// node --test scripts/test-carrinho-guardado.test.mjs
// O carrinho fica guardado no dispositivo (cm.cart.v1): sobrevive a recarregar
// a página, esquece-se ao fim de 30 dias, ignora dados estragados e NÃO é uma
// chave da conta (não sobe para a nuvem). Corre o demo.html num Chromium real
// com um cliente Supabase falso mínimo.
// Precisa do Playwright com o Chromium (npm i --no-save playwright && npx playwright install chromium).
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DEMO = process.env.DEMO || fileURLToPath(new URL('../demo.html', import.meta.url));
const A = '5601000000011', B = '5601000000028';
const KEY = 'cm.cart.v1';

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

let srv, browser, url;
before(async () => {
  const corpo = readFileSync(DEMO);
  srv = createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(corpo); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${srv.address().port}/`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(r => srv?.close(r)); });

// localStorageInicial só na PRIMEIRA abertura (sessionStorage marca que já foi)
async function dispositivo(localStorageInicial) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());
  await ctx.addInitScript(CLIENTE);
  if (localStorageInicial) await ctx.addInitScript(v => {
    if (sessionStorage.getItem('__ini')) return;
    sessionStorage.setItem('__ini', '1');
    for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x);
  }, localStorageInicial);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  const pronto = async () => {
    await page.waitForFunction(() => typeof window.SUPABASE !== 'undefined' && window.SUPABASE, null, { timeout: 30000 });
    await page.evaluate(([a, b]) => {
      PRODUCT_BY_EAN[a] = { ean: a, name: 'Creme Teste', brand: 'Marca A' };
      PRODUCT_BY_EAN[b] = { ean: b, name: 'Sérum Teste', brand: 'Marca B' };
    }, [A, B]);
  };
  await page.goto(url); await pronto();
  return {
    page, ctx, erros,
    recarregar: async () => { await page.reload(); await pronto(); },
    carrinho: () => page.evaluate(() => ({
      itens: [...bundleState.items.entries()],
      vols: bundleState.volumes ? [...bundleState.volumes.entries()] : [],
      contador: document.getElementById('gm-cart-count')?.textContent,
    })),
    ls: k => page.evaluate(k => localStorage.getItem(k), k),
  };
}

test('o carrinho sobrevive a recarregar a página (quantidades e tamanho escolhido)', async () => {
  const d = await dispositivo();
  await d.page.evaluate(([a, b]) => { bundleSetVolume(a, 50); bundleToggle(a); bundleToggle(b); bundleSetQty(b, 3); }, [A, B]);
  assert.ok(await d.ls('cm.cart.v1'));
  await d.recarregar();
  const c = await d.carrinho();
  assert.deepEqual(c.itens, [[A, 1], [B, 3]]);
  assert.deepEqual(c.vols, [[A, 50]]);
  assert.equal(c.contador, '2');
  // com os produtos conhecidos, as linhas aparecem
  await d.page.evaluate(() => { bundleRefresh(); bundleOpen(); });
  const txt = await d.page.evaluate(() => document.getElementById('bundle-body').innerText);
  assert.match(txt, /Creme Teste/); assert.match(txt, /Sérum Teste/);
  assert.deepEqual(d.erros, []);
  await d.ctx.close();
});

test('esvaziar o carrinho apaga a chave; recarregar mostra 0', async () => {
  const d = await dispositivo();
  await d.page.evaluate(a => { bundleToggle(a); }, A);
  await d.page.evaluate(a => { bundleToggle(a); }, A);   // remove
  assert.equal(await d.ls(KEY), null);
  await d.recarregar();
  assert.deepEqual((await d.carrinho()).itens, []);
  await d.ctx.close();
});

test('um carrinho com mais de 30 dias é esquecido', async () => {
  const velho = JSON.stringify({ v: 1, ts: Date.now() - 31 * 864e5, items: [[A, 2]], volumes: [] });
  const d = await dispositivo({ [KEY]: velho });
  assert.deepEqual((await d.carrinho()).itens, []);
  assert.equal(await d.ls(KEY), null);
  assert.deepEqual(d.erros, []);
  await d.ctx.close();
});

test('dados estragados não partem a página nem entram no carrinho', async () => {
  for (const mau of ['{nao-e-json', JSON.stringify({ v: 9, ts: Date.now(), items: [[A, 1]] }),
                     JSON.stringify({ v: 1, ts: Date.now(), items: [[A, -1], [null, 2], [B, 'x']] })]) {
    const d = await dispositivo({ [KEY]: mau });
    assert.deepEqual((await d.carrinho()).itens, [], mau);
    assert.deepEqual(d.erros, [], mau);
    await d.ctx.close();
  }
});

test('o carrinho é do dispositivo, não da conta: fora das chaves que sobem para a nuvem', async () => {
  const d = await dispositivo();
  const usKeys = await d.page.evaluate(() => US_KEYS.slice());
  assert.ok(!usKeys.includes(KEY));
  await d.ctx.close();
});
