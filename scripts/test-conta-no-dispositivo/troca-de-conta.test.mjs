// node --test --test-concurrency=1 "scripts/test-conta-no-dispositivo/*.test.mjs"
// Corre o demo.html num Chromium real com um Supabase falso (nuvem-falsa.mjs).
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { novaNuvem, servir, abrirBrowser, dispositivo } from './nuvem-falsa.mjs';

// Por omissão, o demo.html do repositório; DEMO=<ficheiro> para outra versão
// (por exemplo, o template da parceira com a correção aplicada).
const DEMO = process.env.DEMO || fileURLToPath(new URL('../../demo.html', import.meta.url));
const DEBOUNCE = 3200;   // o usPush espera 2,5 s depois da última escrita

let srv, browser;
before(async () => { srv = await servir(DEMO); browser = await abrirBrowser(); });
after(async () => { await browser?.close(); await srv?.fechar(); });

const F = { a: '5601000000011', b: '5601000000028', c: '5601000000035', d: '5601000000042', e: '5601000000059' };
const temFav = (st, ean) => !!(st && st['cm.favoritos.v1'] && st['cm.favoritos.v1'].eans[ean] && st['cm.favoritos.v1'].eans[ean].on);
const temLapide = (st, ean) => !!(st && st['cm.shelftomb.v1'] && st['cm.shelftomb.v1'].eans[ean]);
const espera = (d, ms) => d.page.waitForTimeout(ms);
async function novo() {
  const n = novaNuvem();
  const d = await dispositivo(browser, srv.url, n);
  return { n, d };
}
const favLocal = async (d, ean) => temFav({ 'cm.favoritos.v1': await d.lsJson('cm.favoritos.v1') || { eans: {} } }, ean);
const lapideLocal = async (d, ean) => temLapide({ 'cm.shelftomb.v1': await d.lsJson('cm.shelftomb.v1') || { eans: {} } }, ean);
async function porNaPrateleira(d, ean) {
  await d.ev(ean => {
    const item = { ean, started_at: '2026-10-01', volume_ml: 50, doses_per_use: 0.5, uses_per_week: 7, added_at: new Date().toISOString() };
    PR_STATE.products.push(item); prSave();
    return prCloudUpsertProduct(item);
  }, ean);
}

test('trocar de conta sem «Terminar sessão» não leva favoritos nem remoções da prateleira para a conta nova', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await d.ev(e => favAlternar(e), F.a);
  await d.ev(e => shelfTombAdd(e), F.b);
  await espera(d, DEBOUNCE);
  assert.ok(temFav(n.user_state.A, F.a) && temLapide(n.user_state.A, F.b), 'pré-condição: A sincronizou');
  await d.ev(() => __expirar());           // sessão acabou sem o botão
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.equal(temFav(n.user_state.B, F.a), false, 'o favorito de A foi parar à conta B');
  assert.equal(temLapide(n.user_state.B, F.b), false, 'a lápide de A foi parar à conta B');
  assert.equal(await favLocal(d, F.a), false, 'o favorito de A continua visível com B');
  assert.equal(await lapideLocal(d, F.b), false);
  assert.ok(temFav(n.user_state.A, F.a), 'a conta A não pode perder nada');
  await d.ctx.close();
});

test('«Terminar sessão» com rede: sobe a última alteração (sem esperar o debounce) e limpa o dispositivo', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  await d.ev(e => favAlternar(e), F.a);
  await d.ev(e => shelfTombAdd(e), F.b);
  await d.ev(() => signOut());            // logo a seguir, antes dos 2,5 s
  assert.ok(temFav(n.user_state.A, F.a), 'a última alteração não chegou à nuvem');
  assert.ok(temLapide(n.user_state.A, F.b));
  assert.equal(await d.ev(() => __uid()), null);
  assert.equal(await favLocal(d, F.a), false, 'os favoritos ficaram à vista depois de sair');
  assert.equal(await lapideLocal(d, F.b), false);
  assert.deepEqual(d.dialogos, [], 'com rede não se pergunta nada');
  await d.ctx.close();
});

test('«Terminar sessão» sem rede e com alterações por subir: pergunta; Cancelar mantém a sessão e os dados', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  n.online = false;
  await d.ev(e => favAlternar(e), F.c);
  d.responderDialogos(false);
  await d.ev(() => signOut());
  assert.equal(d.dialogos.length, 1, 'devia perguntar antes de sair');
  assert.match(d.dialogos[0], /ainda não chegaram/);
  assert.equal(await d.ev(() => __uid()), 'A', 'Cancelar não pode terminar a sessão');
  assert.ok(await favLocal(d, F.c), 'Cancelar não pode apagar nada');
  await d.ctx.close();
});

test('«Terminar sessão» sem rede, OK: guarda à parte, não mostra à conta seguinte e devolve quando a mesma conta voltar', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  n.online = false;
  await d.ev(e => favAlternar(e), F.c);
  await d.ev(e => shelfTombAdd(e), F.d);
  d.responderDialogos(true);
  await d.ev(() => signOut());
  assert.equal(await d.ev(() => __uid()), null);
  assert.equal(await favLocal(d, F.c), false, 'ficou à vista depois de sair');
  const cofre = await d.lsJson('cm.cofre.v1');
  assert.ok(cofre && cofre.A && temFav(cofre.A.chaves, F.c) && temLapide(cofre.A.chaves, F.d), 'não ficou guardado à parte');
  assert.ok((await d.toasts()).some(t => /guardad/.test(t)), 'a pessoa não foi avisada');
  // outra pessoa entra no mesmo dispositivo
  n.online = true;
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.equal(temFav(n.user_state.B, F.c), false, 'foi para a conta B');
  assert.equal(await favLocal(d, F.c), false, 'B vê o favorito de A');
  await d.ev(() => signOut());
  // A volta
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  assert.ok(temFav(n.user_state.A, F.c), 'não subiu à conta A quando voltou');
  assert.ok(temLapide(n.user_state.A, F.d));
  assert.ok(await favLocal(d, F.c));
  const depois = await d.lsJson('cm.cofre.v1');
  assert.ok(!depois || !depois.A, 'o cofre de A devia ter sido esvaziado');
  await d.ctx.close();
});

test('troca sem «Terminar sessão» e sem rede: o que não subiu (favoritos e prateleira) fica para a conta certa', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  n.online = false;
  await d.ev(e => favAlternar(e), F.c);
  await porNaPrateleira(d, F.e);
  await d.ev(() => __expirar());
  n.online = true;
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.equal(temFav(n.user_state.B, F.c), false, 'favorito de A na conta B');
  assert.equal(Object.keys(n.routine_products.B || {}).includes(F.e), false, 'produto de A na prateleira de B');
  assert.equal(await d.ev(e => PR_STATE.products.some(x => x.ean === e), F.e), false, 'B vê a prateleira de A');
  await d.ev(() => __expirar());
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  assert.ok(temFav(n.user_state.A, F.c), 'o favorito de A perdeu-se');
  assert.ok(Object.keys(n.routine_products.A || {}).includes(F.e), 'o produto de A perdeu-se');
  await d.ctx.close();
});

test('o que se faz sem sessão depois de sair vai para a próxima conta, como no primeiro login', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await d.ev(e => favAlternar(e), F.a);
  await d.ev(() => signOut());
  await d.ev(e => favAlternar(e), F.b);    // anónimo
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.ok(temFav(n.user_state.B, F.b), 'o favorito anónimo devia juntar-se à conta que entrou');
  assert.equal(temFav(n.user_state.B, F.a), false, 'o favorito de A foi para B');
  await d.ctx.close();
});

test('apagar a conta não deixa cofre nem marcas dessa conta, e não mexe no cofre de outra', async () => {
  const { n, d } = await novo();
  await d.ev(() => localStorage.setItem('cm.cofre.v1', JSON.stringify({ Z: { ts: Date.now(), chaves: { 'cm.favoritos.v1': { v: 1, eans: { '1': { ts: 1, on: true } } } }, produtos: [] } })));
  await d.ev(() => __entrar('A'));
  await d.ev(e => favAlternar(e), F.a);
  d.page.removeAllListeners('dialog');
  d.page.on('dialog', x => x.type() === 'prompt' ? x.accept('APAGAR') : x.accept());
  await d.ev(() => apagarConta());
  const cofre = await d.lsJson('cm.cofre.v1');
  assert.ok(cofre && cofre.Z, 'apagou o cofre de outra conta');
  assert.ok(!cofre.A);
  assert.equal(await d.ls('cm.sync_pendente.v1'), null);
  assert.equal(await favLocal(d, F.a), false);
  await d.ctx.close();
});

test('medicação: nunca vai para a nuvem; sai do dispositivo quando entra outra conta (como hoje)', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await d.ev(() => localStorage.setItem('cm.meds.v1', JSON.stringify({ v: 1, items: [{ id: 'm1', name: 'x' }] })));
  await d.ev(e => favAlternar(e), F.a);
  await espera(d, DEBOUNCE);
  assert.equal(JSON.stringify(n.user_state.A).includes('cm.meds'), false);
  await d.ev(() => __expirar());
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.equal(await d.ls('cm.meds.v1'), null);
  assert.equal(JSON.stringify(n.user_state.B || {}).includes('cm.meds'), false);
  const cofre = await d.lsJson('cm.cofre.v1');
  assert.equal(JSON.stringify(cofre || {}).includes('cm.meds'), false, 'medicação no cofre');
  await d.ctx.close();
});

test('recarregar a página sem rede não esquece o que ficou por subir (pergunta ao sair)', async () => {
  const { n, d } = await novo();
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  n.online = false;
  await d.ev(e => favAlternar(e), F.c);
  await d.recarregar();
  assert.equal(await d.ev(() => __uid()), 'A', 'a sessão devia ter sido restaurada');
  d.responderDialogos(false);
  await d.ev(() => signOut());
  assert.equal(d.dialogos.length, 1, 'saiu sem perguntar e o favorito perdia-se');
  assert.ok(await favLocal(d, F.c));
  n.online = true;
  d.responderDialogos(true);
  await d.ev(() => signOut());
  assert.ok(temFav(n.user_state.A, F.c), 'com a rede de volta devia ter subido ao sair');
  assert.equal(d.dialogos.length, 1, 'com rede não volta a perguntar');
  await d.ctx.close();
});

test('a mesma conta em dois dispositivos continua a sincronizar (guardar e remover)', async () => {
  const n = novaNuvem();
  const d1 = await dispositivo(browser, srv.url, n);
  const d2 = await dispositivo(browser, srv.url, n);
  await d1.ev(() => __entrar('A'));
  await d1.ev(e => favAlternar(e), F.a);
  await espera(d1, DEBOUNCE);
  await d2.ev(() => __entrar('A'));
  await espera(d2, DEBOUNCE);
  assert.ok(await favLocal(d2, F.a), 'o 2.º dispositivo não recebeu o favorito');
  await d2.ev(e => favAlternar(e), F.a);   // remove no 2.º
  await espera(d2, DEBOUNCE);
  await d1.ev(() => usPull(true));
  assert.equal(await favLocal(d1, F.a), false, 'a remoção não chegou ao 1.º');
  await d1.ctx.close(); await d2.ctx.close();
});

test('sem erros de JavaScript na página durante os cenários', async () => {
  const { d } = await novo();
  await d.ev(() => __entrar('A'));
  await d.ev(e => favAlternar(e), F.a);
  await d.ev(() => signOut());
  assert.deepEqual(d.erros, []);
  await d.ctx.close();
});
