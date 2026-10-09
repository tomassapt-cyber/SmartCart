// Supabase simulado para testar migrações SEM tocar no Supabase real.
//
// Postgres em PGlite (WASM, local, sem rede) com o que as migrações precisam do
// Supabase: os papéis anon/authenticated, auth.users, auth.uid() lido do "JWT"
// e os GRANTs por omissão do Supabase em `public` (tudo ao anon/authenticated —
// é contra isso que as migrações se defendem). Não há PostgREST, vault nem
// pg_net: prova a lógica SQL e as regras de acesso, não o estado da BD real.
//
// Precisa do PGlite, que o repositório não instala:
//   npm i --no-save @electric-sql/pglite
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGR = join(REPO, 'database', 'migrations');

const ARRANQUE = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz default now(),
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
-- search_events (003/007), na forma mínima de que a 011 e a 015 precisam
create table public.search_events (id bigserial primary key, term text, ean text not null, created_at timestamptz default now());
alter table public.search_events enable row level security;
`;

// A parte de contas do schema-supabase.sql: profiles, routine_products,
// routine_actions e as policies (sem pg_net nem o Telegram).
function esquemaBase() {
  const l = readFileSync(join(REPO, 'database', 'schema-supabase.sql'), 'utf8').split(/\r?\n/);
  const ini = l.findIndex(x => x.startsWith('create table if not exists public.profiles'));
  const fim = l.findIndex(x => x.includes('6) Trigger updated_at'));
  if (ini < 0 || fim < 0) throw new Error('schema-supabase.sql mudou: não encontrei a secção de contas');
  return l.slice(ini, fim - 1).join('\n');
}

// As migrações de contas/privacidade, por ordem. As de catálogo (003–010) não
// entram: não mexem nestas tabelas e precisam de extensões que aqui não há.
const CONTAS = /^(001|002|01[1-9]|0[2-9][0-9])_/;
export function migracoesDeContas({ ate } = {}) {
  return readdirSync(MIGR)
    .filter(f => f.endsWith('.sql') && CONTAS.test(f))
    .filter(f => !ate || f.slice(0, 3) <= ate)
    .sort();
}

export async function montar({ ate } = {}) {
  const db = new PGlite();
  await db.exec(ARRANQUE);
  await db.exec(esquemaBase());
  for (const f of migracoesDeContas({ ate })) await aplicar(db, join(MIGR, f));
  return db;
}

export async function aplicar(db, ficheiro) {
  try { await db.exec(readFileSync(ficheiro, 'utf8')); }
  catch (e) { throw new Error(`${ficheiro}: ${e.message}`); }
}

export async function criarUtilizador(db, email) {
  return (await db.query('insert into auth.users (email) values ($1) returning id', [email])).rows[0].id;
}

// Como um pedido do PostgREST: papel authenticated com o sub do JWT, ou anon
// quando uid é null. Tudo numa transação.
export function como(db, uid, fn) {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
    return fn(tx);
  });
}

// Código SQLSTATE do erro, ou null se correu bem.
export async function erro(p) {
  try { await p; return null; } catch (e) { return e.code || e.message; }
}
