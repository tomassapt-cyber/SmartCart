// Casos da revisão do Codex (REVISAO-C1-CODEX.md) e vizinhos:
//   1. o cofre não se consegue gravar (armazenamento cheio/bloqueado);
//   2. perfil editado sem rede antes de terminar sessão.
// node --test --test-concurrency=1 "scripts/test-conta-no-dispositivo/*.test.mjs"
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { novaNuvem, servir, abrirBrowser, dispositivo } from './nuvem-falsa.mjs';

// Por omissão, o demo.html do repositório; DEMO=<ficheiro> para outra versão
// (por exemplo, o template da parceira com a correção aplicada).
const DEMO = process.env.DEMO || fileURLToPath(new URL('../../demo.html', import.meta.url));
const DEBOUNCE = 3200;
const COFRE = 'cm.cofre.v1';
const MARCA = 'cm.sync_pendente.v1';

let srv, browser;
before(async () => { srv = await servir(DEMO); browser = await abrirBrowser(); });
after(async () => { await browser?.close(); await srv?.fechar(); });

const F = '5601000000035';
const temFav = (st, ean) => !!(st && st['cm.favoritos.v1'] && st['cm.favoritos.v1'].eans[ean] && st['cm.favoritos.v1'].eans[ean].on);
const espera = (d, ms) => d.page.waitForTimeout(ms);
const favLocal = async d => temFav({ 'cm.favoritos.v1': await d.lsJson('cm.favoritos.v1') || { eans: {} } }, F);
const ANTIGO = '2026-10-01T10:00:00.000Z';

async function comA(n) {
  n.profiles.A = { id: 'A', name: 'Ana', skin_type: 'dry', skin_concerns: [], age_range: '20-29', updated_at: ANTIGO };
  const d = await dispositivo(browser, srv.url, n);
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  return d;
}
// O que o botão «Guardar» do perfil faz (pr-save-profile): grava local e tenta subir.
async function editarPerfil(d, skin) {
  await d.ev(async skin => {
    PR_STATE.profile = Object.assign({}, PR_STATE.profile, { skin_type: skin, updated_at: new Date().toISOString() });
    prSave();
    await prCloudUpsertProfile();
  }, skin);
}
const perfilLocal = d => d.ev(() => PR_STATE.profile && PR_STATE.profile.skin_type);

// ── 1. o cofre não grava ───────────────────────────────────────────────────
test('cofre impossível de gravar + «Terminar sessão» sem rede: fica com sessão e dados, avisa, e sobrevive a recarregar', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.ev(e => favAlternar(e), F);
  await d.falhar(COFRE, -1);
  d.responderDialogos(true);                           // OK à pergunta
  await d.ev(() => signOut());
  assert.equal(await d.ev(() => __uid()), 'A', 'saiu da sessão sem ter onde guardar');
  assert.ok(await favLocal(d), 'o favorito desapareceu');
  assert.equal(await d.ls(COFRE), null);
  assert.ok(d.dialogos.some(x => /Não consegui guardar/.test(x)), 'não avisou que não conseguiu guardar');
  await d.recarregar();                                // a falha continua depois de recarregar
  assert.equal(await d.ev(() => __uid()), 'A');
  assert.ok(await favLocal(d));
  const antes = d.dialogos.length;
  await d.ev(() => signOut());
  assert.equal(await d.ev(() => __uid()), 'A', 'depois de recarregar saiu na mesma');
  assert.ok(d.dialogos.length > antes, 'depois de recarregar já não perguntou');
  n.online = true;                                     // a rede volta
  const antes2 = d.dialogos.length;
  await d.ev(() => signOut());
  assert.equal(await d.ev(() => __uid()), null);
  assert.equal(d.dialogos.length, antes2, 'com rede não devia perguntar');
  assert.ok(temFav(n.user_state.A, F), 'não subiu quando a rede voltou');
  await d.ctx.close();
});

test('cofre impossível de gravar + sessão que expira sem rede: os dados ficam no dispositivo e sobem quando a conta volta', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.ev(e => favAlternar(e), F);
  await d.falhar(COFRE, -1);
  await d.ev(() => __expirar());
  assert.ok(await favLocal(d), 'apagou sem ter guardado');
  assert.ok((await d.toasts()).some(t => /não consegui guardar à parte/.test(t)), 'não avisou');
  n.online = true;
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  assert.ok(temFav(n.user_state.A, F), 'não subiu quando a conta voltou');
  await d.ctx.close();
});

test('cofre falha uma vez na troca de conta: liberta espaço, volta a tentar e guarda; B não recebe nada', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.ev(e => favAlternar(e), F);
  await d.falhar(COFRE, 1);
  await d.ev(() => __expirar());                       // falha 1.ª vez → mantém
  assert.ok(await favLocal(d));
  n.online = true;
  await d.ev(() => __entrar('B'));                     // 2.ª tentativa já grava
  await espera(d, DEBOUNCE);
  assert.equal(temFav(n.user_state.B, F), false, 'foi para B');
  assert.equal(await favLocal(d), false, 'B vê o favorito de A');
  const cofre = await d.lsJson(COFRE);
  assert.ok(cofre && cofre.A && temFav(cofre.A.chaves, F), 'não ficou guardado para A');
  await d.ctx.close();
});

test('cofre falha sempre na troca de conta: B não recebe nada e há aviso explícito (nunca em silêncio)', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.ev(e => favAlternar(e), F);
  await d.falhar(COFRE, -1);
  await d.ev(() => __expirar());
  n.online = true;
  await d.ev(() => __entrar('B'));
  await espera(d, DEBOUNCE);
  assert.equal(temFav(n.user_state.B, F), false, 'foi para B');
  assert.equal(await favLocal(d), false);
  assert.ok(d.dialogos.some(x => /não houve espaço/.test(x)), 'retirou sem aviso explícito');
  await d.ctx.close();
});

test('cofre que «grava» sem erro mas não fica gravado: só a leitura de volta o apanha — a sessão continua', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.ev(e => favAlternar(e), F);
  await d.falhar(COFRE, 'mudo');
  d.responderDialogos(true);
  await d.ev(() => signOut());
  assert.equal(await d.ev(() => __uid()), 'A', 'deu por guardado sem confirmar');
  assert.ok(await favLocal(d));
  assert.ok(d.dialogos.some(x => /Não consegui guardar/.test(x)));
  await d.ctx.close();
});

test('a marca «por subir» não se consegue gravar: mesmo assim pergunta antes de sair', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await d.falhar(MARCA, -1);
  await d.ev(e => favAlternar(e), F);
  d.responderDialogos(false);
  await d.ev(() => signOut());
  assert.equal(d.dialogos.length, 1, 'saiu sem perguntar');
  assert.ok(await favLocal(d));
  await d.ctx.close();
});

// ── 2. perfil editado sem rede ─────────────────────────────────────────────
test('perfil editado sem rede + «Terminar sessão» com a rede de volta: sobe sem perguntar', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await editarPerfil(d, 'oily');
  n.online = true;
  await d.ev(() => signOut());
  assert.deepEqual(d.dialogos, []);
  assert.equal(n.profiles.A.skin_type, 'oily', 'a edição do perfil perdeu-se ao sair');
  await d.ctx.close();
});

test('perfil editado sem rede + «Terminar sessão» sem rede: pergunta, guarda, recarrega e sobe quando a conta volta', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await editarPerfil(d, 'oily');
  d.responderDialogos(true);
  await d.ev(() => signOut());
  assert.equal(d.dialogos.length, 1, 'não perguntou: só o perfil estava por subir');
  assert.match(d.dialogos[0], /perfil/);
  assert.equal(await d.ev(() => __uid()), null);
  assert.equal(await perfilLocal(d), null, 'o perfil ficou à vista depois de sair');
  const cofre = await d.lsJson(COFRE);
  assert.equal(cofre && cofre.A && cofre.A.perfil && cofre.A.perfil.skin_type, 'oily', 'o perfil não ficou guardado');
  await d.recarregar();
  n.online = true;
  await d.ev(() => __entrar('A'));
  await espera(d, DEBOUNCE);
  assert.equal(n.profiles.A.skin_type, 'oily', 'a edição não subiu quando a conta voltou');
  assert.equal(await perfilLocal(d), 'oily');
  assert.equal(await d.ls(COFRE), null, 'o cofre devia ter ficado vazio');
  await d.ctx.close();
});

test('perfil editado sem rede + recarregar a página com rede: a nuvem não pisa a edição', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await editarPerfil(d, 'oily');
  n.online = true;
  await d.recarregar();
  await espera(d, 500);
  assert.equal(await perfilLocal(d), 'oily', 'o pull do arranque substituiu a edição pela versão da nuvem');
  assert.equal(n.profiles.A.skin_type, 'oily', 'a edição não subiu');
  await d.ctx.close();
});

test('perfil editado sem rede, mas alterado DEPOIS noutro dispositivo: fica o mais recente e avisa', async () => {
  const n = novaNuvem();
  const d = await comA(n);
  n.online = false;
  await editarPerfil(d, 'oily');
  d.responderDialogos(true);
  await d.ev(() => signOut());
  await espera(d, 50);
  n.online = true;
  const d2 = await dispositivo(browser, srv.url, n);  // outro dispositivo, mais tarde
  await d2.ev(() => __entrar('A'));
  await espera(d2, DEBOUNCE);
  await editarPerfil(d2, 'normal');
  assert.equal(n.profiles.A.skin_type, 'normal');
  await d.ev(() => __entrar('A'));                     // o 1.º volta
  await espera(d, DEBOUNCE);
  assert.equal(n.profiles.A.skin_type, 'normal', 'uma edição mais antiga pisou a mais recente');
  assert.equal(await perfilLocal(d), 'normal');
  assert.ok((await d.toasts()).some(t => /noutro dispositivo/.test(t)), 'descartou a edição antiga sem avisar');
  await d.ctx.close(); await d2.ctx.close();
});
