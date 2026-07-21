-- ============================================================
-- Migration 003: Popularidade por pesquisa (eventos anónimos)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- Objectivo: alimentar o HERO "Mais procurados" com as pesquisas REAIS do
-- site. Enquanto não houver tráfego suficiente, o hero é semeado pelo Google
-- Suggest (scripts/build-popular-searches.js); assim que esta tabela tiver
-- volume, scripts/aggregate-search-popularity.js passa a mandar.
--
-- PRIVACIDADE: totalmente anónimo — SEM user_id, SEM sessão, SEM IP. Só o
-- termo pesquisado (truncado, minúsculas), o EAN do produto aberto e o
-- instante. Serve só para contar popularidade agregada.
-- ============================================================

create table if not exists public.search_events (
  id          bigserial primary key,
  term        text,                                   -- termo pesquisado (pode ser null: abertura sem pesquisa)
  ean         text not null,                          -- produto aberto
  created_at  timestamptz not null default now()
);

create index if not exists search_events_created_idx on public.search_events (created_at desc);
create index if not exists search_events_ean_idx     on public.search_events (ean);

-- RLS: visitantes (anon) só podem INSERIR. Ninguém lê pelo cliente —
-- a agregação corre no CI com a service key.
alter table public.search_events enable row level security;

drop policy if exists "anon insert search events" on public.search_events;
create policy "anon insert search events"
  on public.search_events for insert
  to anon, authenticated
  with check (true);

-- (deliberadamente SEM policy de SELECT/UPDATE/DELETE para anon)

-- Higiene: manter só os últimos 180 dias (a agregação usa 30).
-- Correr manualmente ou por pg_cron se disponível:
--   delete from public.search_events where created_at < now() - interval '180 days';
