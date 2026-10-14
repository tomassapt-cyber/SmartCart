// node --test scripts/test-carrossel-preco.test.mjs
// O carrossel «Mais procurados» do topo mostra um preço mesmo quando as ofertas
// não chegam da base de dados (402 em outubro de 2026): o «desde» do índice,
// como os cartões do catálogo. Com ofertas, mantém o preço e a loja.
// Corre o demo.html num Chromium real com um cliente Supabase falso.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DEMO = process.env.DEMO || fileURLToPath(new URL('../demo.html', import.meta.url));
const A = '3337875863377', B = '3401395614172';   // dois dos EANs de recurso do carrossel

const CLIENTE = `
(() => {
  const agora = new Date().toISOString();
  const consulta = tabela => {
    const q = {
      select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; },
      async in(col, eans) {
        if (window.__bdEmBaixo) return { data: null, error: { message: 'Service restricted (402 simulado)' } };
        if (tabela !== 'products') return { data: [], error: null };
        return { data: eans.map(ean => ({ ean, image_url: null, offer_variants: [],
          offers: [{ store_slug: 'lojax', price: 9.5, previous_price: null, discount_pct: null, in_stock: true,
                     url: 'https://example.invalid/' + ean, verified_at: agora, promo_note: null, promo_pack: null }] })), error: null };
      },
      then(r) { return Promise.resolve({ data: [], error: null }).then(r); },
    };
    return q;
  };
  const client = { from: consulta, rpc: async () => ({ data: null, error: null }),
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

async function carrossel({ bdEmBaixo }) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());
  await ctx.addInitScript(CLIENTE);
  if (bdEmBaixo) await ctx.addInitScript(() => { window.__bdEmBaixo = true; });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => typeof window.SUPABASE !== 'undefined' && window.SUPABASE, null, { timeout: 30000 });
  const slides = await page.evaluate(async ([a, b]) => {
    document.getElementById('hp-data').textContent = '{}';          // usa a lista de recurso
    PRODUCT_BY_EAN[a] = { ean: a, name: 'Effaclar Duo +M', brand: 'La Roche-Posay' };
    PRODUCT_BY_EAN[b] = { ean: b, name: 'Sensibio H2O', brand: 'Bioderma' };
    STORE_BY_SLUG.lojax = { slug: 'lojax', name: 'Loja X', shipping_zones: { mainland: 3, madeira: 3, acores: 3 }, free_shipping_threshold: 50 };
    PRODUCT_STATS.push({ ean: a, storeCount: 40, bestPrice: 12.99, worstPrice: 20, absBest: 11.99 },
                       { ean: b, storeCount: 30, bestPrice: 3.32, worstPrice: 9, absBest: null });
    statsByEanMap._m = null;
    await renderSponsoredCarousel();
    return [...document.querySelectorAll('#sponsored-slides .sponsored-slide')]
      .map(s => s.querySelector('.sponsored-slide-meta').innerText.replace(/\s+/g, ' ').trim());
  }, [A, B]);
  await ctx.close();
  return { slides, erros };
}

test('BD em baixo: os slides mostram o «desde» do índice em vez de «—»', async () => {
  const { slides, erros } = await carrossel({ bdEmBaixo: true });
  assert.equal(slides.length, 2);
  assert.match(slides[0], /11\.99€/);   // absBest
  assert.match(slides[1], /3\.32€/);    // sem absBest → bestPrice
  assert.ok(slides.every(t => !t.includes('—')), slides.join(' | '));
  assert.deepEqual(erros, []);
});

test('com ofertas: preço e loja da melhor oferta, como antes', async () => {
  const { slides, erros } = await carrossel({ bdEmBaixo: false });
  assert.equal(slides.length, 2);
  for (const t of slides) { assert.match(t, /9\.50€/); assert.match(t, /Loja X/); }
  assert.deepEqual(erros, []);
});
