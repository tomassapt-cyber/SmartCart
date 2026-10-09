// node --test database/tests/pontos-017.test.mjs
// (precisa de: npm i --no-save @electric-sql/pglite)
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, montar, aplicar, criarUtilizador, como, erro } from './supabase-simulado.mjs';

const M017 = join(REPO, 'database', 'migrations', '017_pontos_data_canonica.sql');

async function hojeLisboa(db, deslocamento = 0) {
  return (await db.query(`select to_char((now() at time zone 'Europe/Lisbon')::date + $1::int, 'YYYY-MM-DD') d`,
    [deslocamento])).rows[0].d;
}
const ganhar = async (db, uid, motivo, chave) =>
  (await como(db, uid, tx => tx.query('select public.ganhar_pontos($1, $2) r', [motivo, chave]))).rows[0].r;

// Grafias da data de hoje que o Postgres converte para a mesma data.
function grafias(hoje) {
  const v = new Set([hoje.replace(/-/g, ''), hoje.replace(/-/g, '/'), 'today']);
  for (let i = 1; i <= 8; i++) { v.add(' '.repeat(i) + hoje); v.add(hoje + ' '.repeat(i)); }
  return [...v];
}
async function pontosComGrafias(db, uid, hoje) {
  let total = 0;
  for (const g of grafias(hoje)) {
    try { total += (await ganhar(db, uid, 'rotina_dia', g)).ganhos; }
    catch (e) { if (e.code !== '22023') throw e; }
  }
  return total;
}

test('sem a 017 (só até à 016): a mesma data com outra grafia volta a dar pontos', async () => {
  const db = await montar({ ate: '016' });
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  const hoje = await hojeLisboa(db);
  assert.equal((await ganhar(db, a, 'rotina_dia', hoje)).ganhos, 5);
  const extra = await pontosComGrafias(db, a, hoje);
  assert.ok(extra > 0, `esperava reproduzir o defeito; deu ${extra}`);
  const seq = (await db.query(`select count(*)::int n from public.points_ledger where user_id = $1 and motivo = 'sequencia7'`, [a])).rows[0].n;
  assert.equal(seq, 1, 'na 016 a sequência de 7 dias sai num só dia');
});

test('com a 017: um dia conta uma vez, seja qual for a grafia', async () => {
  const db = await montar();
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  const hoje = await hojeLisboa(db);
  assert.equal((await ganhar(db, a, 'rotina_dia', hoje)).ganhos, 5);
  assert.equal((await ganhar(db, a, 'rotina_dia', hoje)).ganhos, 0);
  assert.equal(await pontosComGrafias(db, a, hoje), 0);
  const l = await db.query(`select motivo, count(*)::int n from public.points_ledger where user_id = $1 group by 1`, [a]);
  assert.deepEqual(l.rows, [{ motivo: 'rotina_dia', n: 1 }]);
});

test('com a 017: grafias não canónicas e datas impossíveis dão 22023', async () => {
  const db = await montar();
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  const hoje = await hojeLisboa(db);
  for (const g of [' ' + hoje, hoje.replace(/-/g, ''), 'today', 'tomorrow', '2026-02-30', '2026-13-01', '', 'x'])
    assert.equal(await erro(ganhar(db, a, 'rotina_dia', g)), '22023', `«${g}»`);
});

test('com a 017: ontem e amanhã contam (fusos), anteontem não', async () => {
  const db = await montar();
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  assert.equal((await ganhar(db, a, 'rotina_dia', await hojeLisboa(db, -1))).ganhos, 5);
  assert.equal((await ganhar(db, a, 'rotina_dia', await hojeLisboa(db, 1))).ganhos, 5);
  const r = await ganhar(db, a, 'rotina_dia', await hojeLisboa(db, -2));
  assert.equal(r.ganhos, 0);
  assert.equal(r.motivo, 'só se ganham pontos pelo dia de hoje');
});

test('com a 017: 7 dias seguidos dão +50 uma vez; linhas antigas estranhas não contam nem rebentam', async () => {
  const db = await montar();
  const b = await criarUtilizador(db, 'b@exemplo.pt');
  // Seis dias anteriores, como teriam entrado (um por dia), mais lixo de antes da 017.
  for (let i = 1; i <= 6; i++)
    await db.query(`insert into public.points_ledger (user_id, motivo, chave, pontos) values ($1, 'rotina_dia', $2, 5)`,
      [b, await hojeLisboa(db, -i)]);
  await db.query(`insert into public.points_ledger (user_id, motivo, chave, pontos) values ($1, 'rotina_dia', $2, 5), ($1, 'rotina_dia', 'today', 5)`,
    [b, ' ' + await hojeLisboa(db, -1)]);
  const r = await ganhar(db, b, 'rotina_dia', await hojeLisboa(db));
  assert.equal(r.ganhos, 55);
  // amanhã: 7 dias seguidos outra vez, mas já houve sequência nos 6 anteriores
  assert.equal((await ganhar(db, b, 'rotina_dia', await hojeLisboa(db, 1))).ganhos, 5);
  const seq = await db.query(`select chave from public.points_ledger where user_id = $1 and motivo = 'sequencia7'`, [b]);
  assert.deepEqual(seq.rows, [{ chave: await hojeLisboa(db) }]);
});

test('com a 017: 6 grafias + 1 dia verdadeiro não fazem uma sequência', async () => {
  const db = await montar();
  const c = await criarUtilizador(db, 'c@exemplo.pt');
  const ontem = await hojeLisboa(db, -1);
  for (const g of [' ' + ontem, '  ' + ontem, ontem + ' ', ontem.replace(/-/g, ''), ontem.replace(/-/g, '/'), 'yesterday'])
    await db.query(`insert into public.points_ledger (user_id, motivo, chave, pontos) values ($1, 'rotina_dia', $2, 5)`, [c, g]);
  assert.equal((await ganhar(db, c, 'rotina_dia', await hojeLisboa(db))).ganhos, 5);
});

test('com a 017: a chave da sequência não depende do DateStyle da sessão', async () => {
  const db = await montar();
  const d = await criarUtilizador(db, 'd@exemplo.pt');
  for (let i = 1; i <= 6; i++)
    await db.query(`insert into public.points_ledger (user_id, motivo, chave, pontos) values ($1, 'rotina_dia', $2, 5)`,
      [d, await hojeLisboa(db, -i)]);
  const hoje = await hojeLisboa(db);
  await db.transaction(async tx => {
    await tx.exec(`set local datestyle = 'SQL, DMY'; set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [d]);
    await tx.query(`select public.ganhar_pontos('rotina_dia', $1)`, [hoje]);
  });
  const seq = await db.query(`select chave from public.points_ledger where user_id = $1 and motivo = 'sequencia7'`, [d]);
  assert.deepEqual(seq.rows, [{ chave: hoje }]);
});

test('com a 017: perfil, prateleira, total e privilégios ficam como na 016', async () => {
  const db = await montar();
  const a = await criarUtilizador(db, 'ana@exemplo.pt');
  assert.equal((await ganhar(db, a, 'perfil', 'display_name')).ganhos, 10);   // o registo preenche-o
  assert.equal((await ganhar(db, a, 'perfil', 'gender')).ganhos, 0);          // vazio
  assert.equal(await erro(ganhar(db, a, 'perfil', 'points')), '22023');
  assert.equal((await ganhar(db, a, 'prateleira', '5601234567890')).ganhos, 0);
  await como(db, a, tx => tx.query(`insert into public.routine_products (user_id, ean, volume_ml, doses_per_use, uses_per_week)
                                    values ($1, '5601234567890', 50, 1, 7)`, [a]));
  assert.equal((await ganhar(db, a, 'prateleira', '5601234567890')).ganhos, 20);
  assert.equal(await erro(ganhar(db, a, 'outra', 'x')), '22023');
  assert.equal(await erro(como(db, null, tx => tx.query(`select public.ganhar_pontos('rotina_dia', '2026-10-09')`))), '42501');
  assert.equal(await erro(como(db, a, tx => tx.query('update public.profiles set points = 9999 where id = $1', [a]))), '42501');
  const r = (await db.query(`select points, points_lifetime, (select sum(pontos)::int from public.points_ledger where user_id = $1) s
                             from public.profiles where id = $1`, [a])).rows[0];
  assert.equal(r.points, 30);
  assert.equal(r.points_lifetime, 30);
  assert.equal(r.s, 30);
});

test('a 017 pode correr duas vezes', async () => {
  const db = await montar();
  await aplicar(db, M017);
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  assert.equal((await ganhar(db, a, 'rotina_dia', await hojeLisboa(db))).ganhos, 5);
});

test('a limpeza opcional (comentada na 017) tira as grafias falsas e acerta os totais', async () => {
  const db = await montar({ ate: '016' });
  const a = await criarUtilizador(db, 'a@exemplo.pt');
  const b = await criarUtilizador(db, 'b@exemplo.pt');
  const hoje = await hojeLisboa(db);
  await ganhar(db, a, 'rotina_dia', hoje);
  await pontosComGrafias(db, a, hoje);                 // abuso na 016
  await ganhar(db, b, 'rotina_dia', hoje);             // uso normal
  await aplicar(db, M017);
  const sql = readFileSync(M017, 'utf8');
  const bloco = sql.slice(sql.indexOf('-- begin;'), sql.indexOf('-- commit;') + '-- commit;'.length)
    .split(/\r?\n/).map(l => l.replace(/^-- ?/, '')).join('\n');
  await db.exec(bloco);
  const r = await db.query(`select p.id, p.points, (select count(*)::int from public.points_ledger l where l.user_id = p.id) n
                            from public.profiles p order by p.points`);
  assert.deepEqual(r.rows.map(x => [x.points, x.n]), [[5, 1], [5, 1]]);
});
