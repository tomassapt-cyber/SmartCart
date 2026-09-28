-- ============================================================================
-- 016 — Pontos contados no servidor
-- ============================================================================
-- CORRER NO PROJETO oghtbdcfvtgryouwsdae (confirmar no URL do dashboard).
--
-- PORQUÊ: até aqui o site calculava os pontos no telemóvel de quem os ganhava e
--   gravava o total em profiles.points com um UPDATE normal. Qualquer pessoa
--   podia escrever ali o número que quisesse. E só o questionário dava pontos,
--   por isso os escalões anunciados (1.000 e 2.000) eram inalcançáveis.
--
-- AGORA: um livro de pontos (points_ledger) em que cada linha é UMA conquista,
--   única por (utilizador, motivo, chave). Só a função ganhar_pontos() escreve
--   nele, e só depois de VERIFICAR na base de dados que a conquista é real. O
--   utilizador deixa de poder escrever points, points_lifetime e
--   quiz_rewarded_steps.
--
-- REGRAS (aprovadas pelo dono do site a 2026-09-28):
--   perfil          10  por campo preenchido (os 10 do questionário + avatar +
--                       dia de anos); a função confirma que o campo tem valor
--   perfil_completo 40  uma vez, quando os 10 campos do questionário contaram
--   prateleira      20  por produto na prateleira, até 10 produtos; confirma
--                       que o produto está mesmo em routine_products
--   rotina_dia       5  por dia com a rotina marcada, só o dia de HOJE (±1 dia
--                       por causa dos fusos): não se ganham dias passados
--   sequencia7      50  automático, ao 7.º dia seguido com rotina_dia; no
--                       máximo uma vez em cada 7 dias
--
-- ESCALÕES (só estatuto — um distintivo no perfil, sem valor em dinheiro):
--   Bloom 0 · Bud 300 · Petal 1.000. Vivem no site (demo.html, PONTOS_ESCALOES).
--
-- IDEMPOTENTE: pode correr mais do que uma vez.

-- ── 1. O livro ──────────────────────────────────────────────────────────────
create table if not exists public.points_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  motivo      text        not null,
  chave       text        not null,
  pontos      int         not null,
  created_at  timestamptz not null default now(),
  unique (user_id, motivo, chave)
);
comment on table public.points_ledger is
  'Uma linha por conquista de pontos. Só a função ganhar_pontos() escreve aqui. Ver migração 016.';
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, motivo, created_at);

alter table public.points_ledger enable row level security;
drop policy if exists points_ledger_select_own on public.points_ledger;
create policy points_ledger_select_own on public.points_ledger
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.points_ledger from anon, authenticated;
grant select on public.points_ledger to authenticated;      -- o histórico de cada um

-- ── 2. A função que dá pontos ───────────────────────────────────────────────
create or replace function public.ganhar_pontos(p_motivo text, p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid      uuid := auth.uid();
  prof     jsonb;
  coluna   text;
  valor    jsonb;
  pts      int := 0;
  ganhos   int := 0;
  hoje     date := (now() at time zone 'Europe/Lisbon')::date;
  dia      date;
  n        int;
  quiz     text[] := array['display_name','gender','birth_year','district','skin_type',
                           'skin_concerns','skin_allergies','routine_steps','skincare_goal','hair_type'];
  inserido boolean;
begin
  if uid is null then
    raise exception 'sem sessão iniciada' using errcode = '42501';
  end if;
  p_chave := left(coalesce(p_chave, ''), 60);

  if p_motivo = 'perfil' then
    coluna := case p_chave
      when 'birth_year' then 'birth_date'
      when 'birthday'   then 'birth_date'
      when 'avatar'     then 'avatar_url'
      else p_chave end;
    if not (p_chave = any(quiz) or p_chave in ('avatar', 'birthday')) then
      raise exception 'campo desconhecido: %', p_chave using errcode = '22023';
    end if;
    select to_jsonb(p) into prof from public.profiles p where p.id = uid;
    valor := prof -> coluna;
    if valor is null or valor = 'null'::jsonb or valor = '""'::jsonb or valor = '[]'::jsonb then
      return jsonb_build_object('ganhos', 0, 'total', (select coalesce(sum(pontos), 0) from public.points_ledger where user_id = uid)::int, 'motivo', 'campo vazio');
    end if;
    pts := 10;

  elsif p_motivo = 'prateleira' then
    if not exists (select 1 from public.routine_products where user_id = uid and ean = p_chave) then
      return jsonb_build_object('ganhos', 0, 'total', (select coalesce(sum(pontos), 0) from public.points_ledger where user_id = uid)::int, 'motivo', 'produto não está na prateleira');
    end if;
    select count(*) into n from public.points_ledger where user_id = uid and motivo = 'prateleira';
    if n >= 10 then
      return jsonb_build_object('ganhos', 0, 'total', (select coalesce(sum(pontos), 0) from public.points_ledger where user_id = uid)::int, 'motivo', 'limite de 10 produtos');
    end if;
    pts := 20;

  elsif p_motivo = 'rotina_dia' then
    begin
      dia := p_chave::date;
    exception when others then
      raise exception 'data inválida: %', p_chave using errcode = '22023';
    end;
    if dia < hoje - 1 or dia > hoje + 1 then
      return jsonb_build_object('ganhos', 0, 'total', (select coalesce(sum(pontos), 0) from public.points_ledger where user_id = uid)::int, 'motivo', 'só se ganham pontos pelo dia de hoje');
    end if;
    pts := 5;

  else
    raise exception 'motivo desconhecido: %', p_motivo using errcode = '22023';
  end if;

  insert into public.points_ledger (user_id, motivo, chave, pontos)
  values (uid, p_motivo, p_chave, pts)
  on conflict (user_id, motivo, chave) do nothing;
  get diagnostics n = row_count;
  inserido := n > 0;
  if inserido then ganhos := pts; end if;

  -- Consequências automáticas (também idempotentes)
  if inserido and p_motivo = 'perfil' and p_chave = any(quiz) then
    update public.profiles
       set quiz_rewarded_steps = (select array_agg(distinct x) from unnest(coalesce(quiz_rewarded_steps, '{}') || array[p_chave]) x)
     where id = uid;
    select count(*) into n from public.points_ledger
     where user_id = uid and motivo = 'perfil' and chave = any(quiz);
    if n >= array_length(quiz, 1) then
      insert into public.points_ledger (user_id, motivo, chave, pontos)
      values (uid, 'perfil_completo', 'quiz', 40)
      on conflict (user_id, motivo, chave) do nothing;
      get diagnostics n = row_count;
      if n > 0 then ganhos := ganhos + 40; end if;
    end if;
  elsif inserido and p_motivo = 'perfil' then
    update public.profiles
       set quiz_rewarded_steps = (select array_agg(distinct x) from unnest(coalesce(quiz_rewarded_steps, '{}') || array[p_chave]) x)
     where id = uid;
  end if;

  if inserido and p_motivo = 'rotina_dia' then
    -- 7 dias seguidos a acabar HOJE (dia), e nenhuma sequência premiada nos 6 anteriores
    select count(*) into n from public.points_ledger
     where user_id = uid and motivo = 'rotina_dia'
       and chave::date between dia - 6 and dia;
    if n >= 7 and not exists (
      select 1 from public.points_ledger
       where user_id = uid and motivo = 'sequencia7' and chave::date between dia - 6 and dia
    ) then
      insert into public.points_ledger (user_id, motivo, chave, pontos)
      values (uid, 'sequencia7', dia::text, 50)
      on conflict (user_id, motivo, chave) do nothing;
      get diagnostics n = row_count;
      if n > 0 then ganhos := ganhos + 50; end if;
    end if;
  end if;

  -- O total é SEMPRE a soma do livro: nunca pode divergir dele.
  update public.profiles p
     set points          = s.total,
         points_lifetime = s.total
    from (select coalesce(sum(pontos), 0)::int as total from public.points_ledger where user_id = uid) s
   where p.id = uid;

  return jsonb_build_object('ganhos', ganhos,
    'total', (select coalesce(sum(pontos), 0) from public.points_ledger where user_id = uid)::int);
end $$;

comment on function public.ganhar_pontos(text, text) is
  'Única forma de ganhar pontos. Verifica a conquista, escreve no points_ledger e recalcula profiles.points. Ver migração 016.';
revoke all on function public.ganhar_pontos(text, text) from public, anon;
grant execute on function public.ganhar_pontos(text, text) to authenticated;

-- ── 3. O utilizador deixa de poder escrever os próprios pontos ──────────────
-- Privilégios por COLUNA: tira-se o INSERT/UPDATE da tabela inteira e devolve-se
-- coluna a coluna, menos as três protegidas. Calculado a partir das colunas que
-- existirem, para não deixar de fora nenhuma criada à mão no dashboard.
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'
     and column_name not in ('points', 'points_lifetime', 'quiz_rewarded_steps');
  execute 'revoke insert, update on public.profiles from anon, authenticated';   -- o anon nunca devia escrever perfis
  execute format('grant insert (%s), update (%s) on public.profiles to authenticated', cols, cols);
end $$;

-- ── 4. Passar o que já existia para o livro ─────────────────────────────────
-- Os campos que já tinham contado (quiz_rewarded_steps) entram como conquistas,
-- e o bónus para quem já tinha os 10. Depois recalcula-se o total de todos —
-- os pontos passam a ser exactamente o que o livro justifica.
insert into public.points_ledger (user_id, motivo, chave, pontos)
select p.id, 'perfil', k, 10
  from public.profiles p, unnest(coalesce(p.quiz_rewarded_steps, '{}')) k
 where k in ('display_name','gender','birth_year','district','skin_type','skin_concerns',
             'skin_allergies','routine_steps','skincare_goal','hair_type','avatar','birthday')
on conflict (user_id, motivo, chave) do nothing;

insert into public.points_ledger (user_id, motivo, chave, pontos)
select p.id, 'perfil_completo', 'quiz', 40
  from public.profiles p
 where (select count(*) from unnest(coalesce(p.quiz_rewarded_steps, '{}')) k
         where k in ('display_name','gender','birth_year','district','skin_type','skin_concerns',
                     'skin_allergies','routine_steps','skincare_goal','hair_type')) >= 10
on conflict (user_id, motivo, chave) do nothing;

update public.profiles p
   set points = coalesce(s.total, 0), points_lifetime = coalesce(s.total, 0)
  from (select pr.id, (select sum(pontos) from public.points_ledger l where l.user_id = pr.id)::int as total
          from public.profiles pr) s
 where s.id = p.id;

do $do$
begin
  raise notice '016: points_ledger + ganhar_pontos(); points/points_lifetime/quiz_rewarded_steps fechados ao utilizador; totais recalculados a partir do livro.';
end
$do$;
