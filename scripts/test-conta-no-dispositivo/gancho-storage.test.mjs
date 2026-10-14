// node --test --test-concurrency=1 "scripts/test-conta-no-dispositivo/*.test.mjs"
// O gancho que agenda a subida para a nuvem (favoritos, rotina…) tem de correr
// mesmo num browser que siga a norma do Storage à letra: aí `localStorage.setItem
// = function…` NÃO substitui o método (o Firefox grava um item «setItem»; no
// Safari do iPhone não estava provado). Emula-se esse comportamento no Chromium.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { novaNuvem, servir, abrirBrowser, dispositivo } from './nuvem-falsa.mjs';

const DEMO = process.env.DEMO || fileURLToPath(new URL('../../demo.html', import.meta.url));
const DEBOUNCE = 3200;   // o usPush espera 2,5 s depois da última escrita
const EAN = '5601000000011';

// Atribuir a localStorage.setItem não substitui o método (como manda a norma).
const NORMA = () => {
  Object.defineProperty(localStorage, 'setItem', {
    get() { return Object.getPrototypeOf(localStorage).setItem; },
    set() { /* a norma grava um item; aqui basta não substituir o método */ },
    configurable: true,
  });
};

let srv, browser;
before(async () => { srv = await servir(DEMO); browser = await abrirBrowser(); });
after(async () => { await browser?.close(); await srv?.fechar(); });

const favNaNuvem = n => !!n.user_state.A?.['cm.favoritos.v1']?.eans?.[EAN]?.on;

for (const [nome, scriptInicial] of [['Chromium', null], ['browser que segue a norma (Firefox/Safari)', NORMA]]) {
  test(`${nome}: um favorito marcado sobe para a nuvem sozinho`, async () => {
    const n = novaNuvem();
    const d = await dispositivo(browser, srv.url, n, { scriptInicial });
    if (scriptInicial) {
      // a emulação está mesmo ativa: atribuir não substitui
      assert.equal(await d.ev(() => { const a = localStorage.setItem; localStorage.setItem = () => {}; return localStorage.setItem === a; }), true);
    }
    await d.ev(() => __entrar('A'));
    await d.page.waitForTimeout(DEBOUNCE);           // assenta o pull inicial
    await d.ev(e => favAlternar(e), EAN);
    await d.page.waitForTimeout(DEBOUNCE);
    assert.ok(favNaNuvem(n), 'o favorito chegou à nuvem');
    assert.deepEqual(d.erros, []);
    await d.ctx.close();
  });
}

test('o gancho não deixa um item «setItem» no localStorage e ignora o sessionStorage', async () => {
  const n = novaNuvem();
  const d = await dispositivo(browser, srv.url, n);
  assert.equal(await d.ev(() => Object.getOwnPropertyNames(localStorage).includes('setItem')), false);
  assert.equal(await d.ev(() => localStorage.getItem('setItem')), null);
  await d.ev(() => __entrar('A'));
  await d.page.waitForTimeout(DEBOUNCE);
  const antes = n.pedidos.length;
  await d.ev(() => sessionStorage.setItem('cm.favoritos.v1', '{}'));   // mesma chave, outro armazenamento
  await d.page.waitForTimeout(DEBOUNCE);
  assert.equal(n.pedidos.length, antes, 'escrever no sessionStorage não agenda subidas');
  await d.ctx.close();
});
