-- ============================================================================
-- 014 — Estatísticas de utilização e registo de consentimentos
-- ============================================================================
-- PORQUÊ: o dono do site quer conhecer o tráfego (e, mais tarde, rentabilizá-lo
--   de forma legal: afiliação e estudos agregados). Até aqui só havia o
--   search_events, anónimo e sem nada guardado no dispositivo. Medir visitas,
--   visitantes e cliques para as lojas precisa de um identificador guardado no
--   navegador — e isso, pela Lei 41/2004 (art. 5.º), SÓ com consentimento.
--
-- DUAS TABELAS:
--   consent_log       — prova do consentimento (RGPD art. 7.º, n.º 1: o
--                       responsável tem de o conseguir DEMONSTRAR). Uma linha
--                       por decisão: aceitar, recusar ou mudar de ideias.
--   analytics_events  — os eventos de quem ACEITOU as estatísticas. O site não
--                       envia nada para aqui sem consentimento (ver o módulo
--                       CONSENTIMENTO no demo.html).
--
-- O QUE NÃO SE GUARDA, de propósito: endereço IP, email, user_id da conta,
--   nome, user agent completo. O visitor_id é um número aleatório gerado no
--   navegador, que não se liga à conta — nem com sessão iniciada. Assim, uma
--   base de dados roubada não diz quem visitou o quê.
--
-- SEGURANÇA: o site (anon/authenticated) só INSERE, e com limites de tamanho e
--   de valores; ninguém lê pela API. Ler é no dashboard (postgres) ou pelas
--   vistas agregadas, que também estão fechadas à API.
--
-- CONSERVAÇÃO: eventos 25 meses, consentimentos 5 anos (prazo prudente para
--   poder provar um consentimento numa reclamação). Apagados pelo mesmo truque
--   do search_events (008): um trigger que, em ~0,5% dos inserts, apaga o que
--   passou do prazo. Sem pg_cron.
--
-- IDEMPOTENTE: pode correr mais do que uma vez.

-- ── 1. Prova do consentimento ───────────────────────────────────────────────
create table if not exists public.consent_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  consent_id   uuid        not null,          -- aleatório, guardado no navegador com a escolha
  estatistica  boolean     not null,
  versao       text        not null,          -- versão do texto do aviso mostrado
  origem       text        not null           -- 'aviso' (primeira vez) ou 'preferencias'
);
comment on table public.consent_log is
  'Prova dos consentimentos para estatísticas (RGPD art. 7.º/1). Sem IP nem conta: só o id aleatório do navegador, a escolha e a versão do aviso. Ver migração 014.';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cl_versao_len') then
    alter table public.consent_log add constraint cl_versao_len check (char_length(versao) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cl_origem_val') then
    alter table public.consent_log add constraint cl_origem_val check (origem in ('aviso', 'preferencias'));
  end if;
end $$;

create index if not exists consent_log_consent_id_idx on public.consent_log (consent_id);

alter table public.consent_log enable row level security;
drop policy if exists consent_log_insert on public.consent_log;
create policy consent_log_insert on public.consent_log
  for insert to anon, authenticated
  with check (char_length(versao) <= 20 and origem in ('aviso', 'preferencias'));
revoke all on public.consent_log from anon, authenticated;
grant insert on public.consent_log to anon, authenticated;

-- ── 2. Eventos de utilização ────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  visitor_id    uuid        not null,         -- aleatório; renovado a cada 13 meses no navegador
  session_id    uuid        not null,         -- aleatório; morre ao fechar o separador
  evento        text        not null,
  caminho       text,                         -- /, /produto/<ean>/<slug>, ...
  ean           text,
  loja          text,                         -- domínio da loja, nos cliques de saída
  termo         text,                         -- texto pesquisado
  origem_host   text,                         -- só o DOMÍNIO de onde veio (google.com), nunca o URL
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  dispositivo   text,                         -- 'telemovel' | 'tablet' | 'computador'
  props         jsonb       not null default '{}'::jsonb
);
comment on table public.analytics_events is
  'Estatísticas de utilização, SÓ de quem consentiu. Sem IP, sem conta, sem user agent. Ver migração 014.';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ae_evento_val') then
    alter table public.analytics_events add constraint ae_evento_val
      check (evento in ('pagina', 'produto', 'pesquisa', 'saida_loja', 'leitor'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ae_tamanhos') then
    alter table public.analytics_events add constraint ae_tamanhos check (
          coalesce(char_length(caminho), 0)      <= 200
      and coalesce(char_length(ean), 0)          <= 40
      and coalesce(char_length(loja), 0)         <= 80
      and coalesce(char_length(termo), 0)        <= 80
      and coalesce(char_length(origem_host), 0)  <= 80
      and coalesce(char_length(utm_source), 0)   <= 60
      and coalesce(char_length(utm_medium), 0)   <= 60
      and coalesce(char_length(utm_campaign), 0) <= 60
      and pg_column_size(props) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ae_dispositivo_val') then
    alter table public.analytics_events add constraint ae_dispositivo_val
      check (dispositivo is null or dispositivo in ('telemovel', 'tablet', 'computador'));
  end if;
end $$;

create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_evento_idx  on public.analytics_events (evento, created_at);

alter table public.analytics_events enable row level security;
drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert to anon, authenticated
  with check (true);                          -- os limites estão nas constraints acima
revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;

-- ── 3. Prazos de conservação ────────────────────────────────────────────────
create or replace function public.estatisticas_prune() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (random() < 0.005) then
    delete from public.analytics_events where created_at < now() - interval '25 months';
    delete from public.consent_log      where created_at < now() - interval '5 years';
  end if;
  return null;
end $$;

drop trigger if exists analytics_events_prune on public.analytics_events;
create trigger analytics_events_prune after insert on public.analytics_events
  for each row execute function public.estatisticas_prune();

-- ── 4. Resumos (para ti, no dashboard; e a base de um relatório para parceiros) ─
-- Fechados à API. Os que um dia se mostrarem a terceiros têm de ser AGREGADOS e
-- com mínimos (nunca uma linha que corresponda a meia dúzia de pessoas).
create or replace view public.estatisticas_diarias
with (security_invoker = true) as
select
  (created_at at time zone 'Europe/Lisbon')::date                      as dia,
  count(distinct visitor_id)                                           as visitantes,
  count(distinct session_id)                                           as visitas,
  count(*) filter (where evento = 'pagina')                            as paginas_vistas,
  count(*) filter (where evento = 'produto')                           as fichas_abertas,
  count(*) filter (where evento = 'pesquisa')                          as pesquisas,
  count(*) filter (where evento = 'saida_loja')                        as cliques_para_lojas,
  count(distinct session_id) filter (where dispositivo = 'telemovel')  as visitas_telemovel
from public.analytics_events
group by 1;

create or replace view public.cliques_por_loja
with (security_invoker = true) as
select
  date_trunc('month', created_at at time zone 'Europe/Lisbon')::date   as mes,
  loja,
  count(*)                                                             as cliques,
  count(distinct visitor_id)                                           as visitantes
from public.analytics_events
where evento = 'saida_loja' and loja is not null
group by 1, 2;

create or replace view public.consentimento_resumo
with (security_invoker = true) as
select
  (created_at at time zone 'Europe/Lisbon')::date                      as dia,
  count(*) filter (where estatistica)                                  as aceitaram,
  count(*) filter (where not estatistica)                              as recusaram
from public.consent_log
where origem = 'aviso'
group by 1;

revoke all on public.estatisticas_diarias, public.cliques_por_loja, public.consentimento_resumo
  from anon, authenticated;

do $do$
begin
  raise notice '014: consent_log e analytics_events criadas (só insert pela API), prazos de 25 meses / 5 anos, vistas de resumo fechadas.';
end
$do$;
