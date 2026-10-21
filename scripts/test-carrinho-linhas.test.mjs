// node --test scripts/test-carrinho-linhas.test.mjs
// Corre o demo.html num Chromium real com um cliente Supabase falso que devolve
// as ofertas com atraso — como acontece quando o carrinho abre antes de elas
// chegarem («Adicionar tudo» do quiz). As linhas do carrinho têm de passar a
// mostrar o preço quando as ofertas chegam, e não ficar em «sem stock».
// Precisa do Playwright com o Chromium (npm i --no-save playwright && npx playwright install chromium).
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DEMO = process.env.DEMO || fileURLToPath(new URL('../demo.html', import.meta.url));
const A = '5601000000011', B = '5601000000028';

// cliente Supabase falso: só o que o carrinho usa (products + offers + variantes)
const CLIENTE = `
(() => {
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const agora = new Date().toISOString();
  const consulta = tabela => {
    const q = {
      select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; },
      async in(col, eans) {
        window.__chamadas = (window.__chamadas || 0) + 1;
        await espera(window.__atraso ?? 300);
        if (window.__bdEmBaixo) return { data: null, error: { message: 'Service restricted (402 simulado)' } };
        if (tabela !== 'products') return { data: [], error: null };
        window.__pedidos = (window.__pedidos || 0) + 1;
        return { data: eans.map(ean => ({
          ean, image_url: null,
          offers: [{ store_slug: 'lojax', price: 10, previous_price: null, discount_pct: null, in_stock: true,
                     url: 'https://example.invalid/' + ean, verified_at: agora, promo_note: null, promo_pack: null }],
          offer_variants: [],
        })), error: null };
      },
      then(res) { return Promise.resolve({ data: [], error: null }).then(res); },
    };
    return q;
  };
  const client = {
    from: consulta,
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => ({ error: null }),
    },
  };
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

async function pagina({ bdEmBaixo = false } = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());
  await ctx.addInitScript(CLIENTE);
  if (bdEmBaixo) await ctx.addInitScript(() => { window.__bdEmBaixo = true; });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => typeof window.SUPABASE !== 'undefined' && window.SUPABASE, null, { timeout: 30000 });
  // dois produtos conhecidos e uma loja com portes conhecidos
  await page.evaluate(([a, b]) => {
    PRODUCT_BY_EAN[a] = { ean: a, name: 'Creme Teste', brand: 'Marca A' };
    PRODUCT_BY_EAN[b] = { ean: b, name: 'Sérum Teste', brand: 'Marca B' };
    STORE_BY_SLUG.lojax = { slug: 'lojax', name: 'Loja X', shipping_zones: { mainland: 3, madeira: 3, acores: 3 }, free_shipping_threshold: 50 };
  }, [A, B]);
  return { page, ctx, erros };
}
const linhas = page => page.evaluate(() => document.getElementById('bundle-body').innerText);

test('carrinho aberto antes das ofertas: as linhas passam a mostrar o preço quando elas chegam', async () => {
  const { page, ctx, erros } = await pagina();
  // o mesmo caminho do «Adicionar tudo» do quiz: juntar e abrir logo
  await page.evaluate(([a, b]) => { bundleToggle(a); bundleToggle(b); bundleOpen(); }, [A, B]);
  assert.match(await linhas(page), /sem stock/);            // desenhado antes de as ofertas chegarem
  await page.waitForFunction(() => /desde/.test(document.getElementById('bundle-body').innerText), null, { timeout: 5000 });
  const txt = await linhas(page);
  assert.doesNotMatch(txt, /sem stock/);
  assert.equal((txt.match(/desde 10\.00€ · Loja X/g) || []).length, 2);
  // e o resumo vivo também ficou calculado
  await page.waitForFunction(() => /total 23\.00€/.test(document.getElementById('bundle-live').innerText), null, { timeout: 5000 });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('BD em baixo (402): não entra em ciclo de pedidos e o carrinho continua a responder', async () => {
  const { page, ctx, erros } = await pagina({ bdEmBaixo: true });
  await page.evaluate(([a, b]) => { bundleToggle(a); bundleToggle(b); bundleOpen(); }, [A, B]);
  await page.waitForTimeout(2500);
  // sem ofertas, a linha diz «sem stock» e o resumo mostra o estado de falha da BD.
  assert.match(await linhas(page), /sem stock/);
  assert.match(await page.evaluate(() => document.getElementById('bundle-live').innerText), /sem stock|não é possível|não estão disponíveis/i);
  // nenhum ciclo: depois de assentar, não continua a pedir
  const n1 = await page.evaluate(() => window.__chamadas || 0);
  assert.ok(n1 >= 1 && n1 <= 3, `pedidos: ${n1}`);
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => window.__chamadas || 0), n1);
  assert.deepEqual(erros, []);
  await ctx.close();
});
