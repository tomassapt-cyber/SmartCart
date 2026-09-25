-- ============================================================================
-- 013 — public.user_state: a tabela que faltava, agora em controlo de versões
-- ============================================================================
-- SINTOMA (2026-09-25): "O meu espaço" não sincroniza entre dispositivos. Quem
--   monta a rotina no telemóvel não a vê no computador. Não há erro visível: o
--   site guarda tudo em localStorage e só escreve um aviso na consola —
--   `[sync] pull user_state falhou: ...`. Degrada em silêncio.
--
-- CAUSA RAIZ: a tabela nunca existiu em SQL. Foi criada à mão no dashboard, e a
--   migração 011 avisou disso por escrito:
--
--     "Fica por fazer (fora do âmbito de uma migração): acrescentar ao
--      repositório o `create table if not exists public.user_state (...)` real,
--      para a tabela passar a estar em controlo de versões como todas as outras."
--
--   A secção 2 da 011 apenas LIGA a RLS e cria a policy **se a tabela já
--   existir** — começa com `if to_regclass('public.user_state') is null then
--   raise notice '... seccao 2 ignorada'`. Quando o projeto Supabase foi apagado
--   e recriado a partir do SQL (Set/2026), a tabela não voltou: nenhum ficheiro
--   a criava. A 011 correu, viu que não existia, e ignorou a secção — como estava
--   desenhada para fazer.
--
--   É a armadilha que o comentário previu, concretizada. Uma tabela fora do
--   controlo de versões não sobrevive a uma recriação da base de dados.
--
-- A FORMA vem do que o site escreve e lê (demo.html, usPull/usPush):
--     .from('user_state').select('state').eq('user_id', <id>).maybeSingle()
--     .from('user_state').upsert({ user_id: <id>, state })
--   O `upsert` sem `onConflict` explícito conta com a chave primária em user_id.
--   O `state` é um objeto único que junta rotina, medicação, dias marcados,
--   conquistas e feedback, com um `_ts` lá dentro que o cliente usa para decidir
--   quem ganha na fusão — por isso o carimbo de tempo da fusão é do cliente, e o
--   `updated_at` daqui serve só para diagnóstico.
--
-- SEGURANÇA: a mesma que a 011 aplicaria. RLS ligada e uma policy `for all` que
--   restringe cada utilizador às suas linhas — `using` para ler/apagar e
--   `with check` para escrever, porque o upsert precisa dos dois. O `anon` não
--   escreve: o pull e o push só correm com sessão (`if (!SUPABASE ||
--   !CURRENT_USER) return;`), logo o pedido chega sempre como `authenticated`.
--
-- IDEMPOTENTE: pode correr sobre uma base que já tenha a tabela.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table  public.user_state is
  'Sincronização entre dispositivos de "O meu espaço": rotina, medicação, dias marcados, conquistas e feedback. Uma linha por utilizador. Ver migração 013.';
comment on column public.user_state.state is
  'Blob único com as chaves cm.routine.v1, cm.meds.v1 e acumuladores. Traz um _ts do cliente, que é quem resolve a fusão.';

-- updated_at só é útil se se mantiver: o site faz upsert de {user_id, state} e
-- nunca envia a data, por isso sem isto ficava congelada na criação da linha.
create or replace function public.user_state_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before update on public.user_state
  for each row execute function public.user_state_touch();

alter table public.user_state enable row level security;

drop policy if exists user_state_rw_own on public.user_state;
create policy user_state_rw_own on public.user_state
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- O anon não toca nisto. A leitura fica de fora de propósito: sem sessão não há
-- estado nenhum para ler, e conceder select ao anon só abriria superfície.
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

do $do$
begin
  raise notice '013: public.user_state criada (ou já existia), RLS ligada, policy user_state_rw_own, anon sem acesso.';
end
$do$;
