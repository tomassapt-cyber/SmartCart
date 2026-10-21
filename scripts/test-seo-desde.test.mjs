// O «desde» dos metadados das fichas (seo-meta/, lido pela função sem JS) é o
// MESMO que a página calcula no browser a partir do índice — 2026-10-16.
// Fichas difíceis primeiro: todas as que têm o mínimo absoluto acima do mínimo
// ao volume de referência, fichas com variantes, packs/kits e uma amostra fixa.
// Precisa do build local (índice, inject, build-seo-meta, prepare-pages).
// Uso: node --test scripts/test-seo-desde.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = createRequire(path.join(root, '..', 'package.json'))('playwright');
const { bucket } = await import(new URL('../frontend/product-page.mjs', import.meta.url));
const idxDir = path.join(root, 'data', 'idx');
const idx = JSON.parse(readFileSync(path.join(idxDir, `search-${readFileSync(path.join(idxDir, 'versao.txt'), 'utf8').trim()}.json`), 'utf8'));
const manifest = JSON.parse(readFileSync(path.join(root, 'seo-meta', 'manifest.json'), 'utf8'));
const meta = id => JSON.parse(readFileSync(path.join(root, 'seo-meta', manifest.version, `${bucket(id)}.json`), 'utf8'))[id];

// a amostra
const noIndice = new Set(idx.e.map(String));
const abAcima = idx.e.filter((e, i) => idx.ab[i] > 0 && idx.mn[i] > 0 && idx.ab[i] > idx.mn[i]).map(String);
const seed = JSON.parse(readFileSync(path.join(root, 'data', 'seed-bundle.json'), 'utf8'));
const comVariantes = new Set();
for (const g of seed.store_products) for (const it of g.items) if ((it.variants || []).length >= 2 && noIndice.has(String(it.ean))) comVariantes.add(String(it.ean));
const variantes = [...comVariantes].slice(0, 80);
const packs = idx.e.filter((e, i) => /\b(pack|kit|coffret|duo|trio|conjunto)\b|\b\d+\s?x\s?\d+|\bx\s?\d+\b/i.test(idx.nm[i])).map(String).slice(0, 80);
let r = 7; const rnd = n => (r = (r * 1103515245 + 12345) % 2147483648) % n;
const aoAcaso = Array.from({ length: 300 }, () => String(idx.e[rnd(idx.e.length)]));
const amostra = [...new Set([...abAcima, ...variantes, ...packs, ...aoAcaso])];

let srv, browser, base;
before(async () => {
  srv = createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://local');
      const f = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1));
      const p = path.join(root, f);
      if (!p.startsWith(root) || !existsSync(p)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' });
      res.end(readFileSync(p));
    } catch { res.writeHead(500); res.end(); }
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  base = 'http://cosmath.localhost:' + srv.address().port;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(ok => srv.close(ok)); });

function stub() {
  const q = { select() { return q }, eq() { return q }, in() { return q }, order() { return q }, limit() { return q }, then(res) { return Promise.resolve({ data: [], error: null }).then(res) } };
  window.supabase = { createClient: () => ({ from: () => q, rpc: async () => ({ data: null, error: null }), auth: { getSession: async () => ({ data: { session: null }, error: null }), getUser: async () => ({ data: { user: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } }) };
}

test(`«desde» e nº de lojas dos metadados = página com JS (${amostra.length} fichas: ${abAcima.length} ab>mn, ${variantes.length} com variantes, ${packs.length} packs/kits)`, async () => {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(base), x => x.abort());
  await ctx.addInitScript(stub);
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  await page.goto(base + '/');
  await page.waitForFunction(() => typeof garantirIndice === 'function' && typeof statsByEanMap === 'function');
  await page.evaluate(() => garantirIndice());
  const ui = await page.evaluate(ids => {
    const m = statsByEanMap(); const out = {};
    for (const e of ids) { const s = m[e]; out[e] = s ? { desde: Math.round((s.absBest ?? s.bestPrice) * 100), lojas: s.storeCount, chaves: Object.keys(s) } : null; }
    return out;
  }, amostra);
  const dif = [];
  for (const e of amostra) {
    const p = meta(e), u = ui[e];
    assert.ok(p, `${e} sem metadados`); assert.ok(u, `${e} sem estatística na página`);
    if (p.lo !== u.desde) dif.push(`${e}: «desde» nos metadados ${p.lo} vs página ${u.desde}`);
    if (p.s !== u.lojas) dif.push(`${e}: lojas nos metadados ${p.s} vs página ${u.lojas}`);
  }
  assert.deepEqual(dif, [], dif.slice(0, 10).join('\n'));
  assert.deepEqual(erros, []);
  console.log(JSON.stringify({ fichas: amostra.length, abAcima: abAcima.length, variantes: variantes.length, packs: packs.length, chavesDaPagina: ui[amostra[0]].chaves }));
  await ctx.close();
});
