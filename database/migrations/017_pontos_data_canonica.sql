-- ============================================================================
-- 017 — Pontos: um dia de rotina conta uma vez, escreva-se a data como se escrever
-- ============================================================================
-- CORRER NO PROJETO oghtbdcfvtgryouwsdae (confirmar no URL do dashboard), e só
-- depois da 016 (que esta substitui em parte). Só quando o Supabase deixar de
-- devolver 402: até lá não há pressa, os pontos são só estatuto.
--
-- SINTOMA (reproduzido offline a 2026-10-09, Postgres 18 em PGlite com as
--   migrações 001–016): com sessão iniciada, chamar
--     ganhar_pontos('rotina_dia', '2026-10-09')     → +5
--     ganhar_pontos('rotina_dia', ' 2026-10-09')    → +5 outra vez
--     ganhar_pontos('rotina_dia', '20261009')       → +5 outra vez
--     ganhar_pontos('rotina_dia', 'today')          → +5 outra vez  …
--   55 grafias da data de hoje deram 325 pontos num só dia, incluindo os +50 da
--   sequência de 7 dias — que saiu ao fim de 7 chamadas no mesmo dia. Chega-se
--   ao escalão Bud (300) num dia e ao Petal (1.000) em três. A 016 existe
--   precisamente para que os pontos não se possam inventar.
--
-- CAUSA: a 016 guarda a chave tal como chega (`chave = p_chave`) e a unicidade
--   (user_id, motivo, chave) compara TEXTO. Só depois converte para data com
--   `p_chave::date`, e o Postgres aceita muitas grafias da mesma data (espaços,
--   sem hífenes, barras, 'today', 'tomorrow'…). Texto diferente → linha nova →
--   pontos outra vez. A sequência conta LINHAS (`count(*)`) e não dias, por isso
--   sete grafias de hoje valem «7 dias seguidos».
--
-- CORREÇÃO:
--   1. rotina_dia só aceita a forma canónica AAAA-MM-DD (é a única que o site
--      manda: trkDayKey() no demo.html). Qualquer outra → erro 22023, como já
--      acontecia com uma data impossível. Assim, um dia = uma chave = uma linha.
--   2. A sequência conta DIAS distintos e só olha para chaves canónicas — fica
--      certa mesmo que já existam linhas antigas com outras grafias.
--   3. As chaves de sequencia7 passam a ser escritas com to_char (não dependem
--      do DateStyle da sessão).
--   Tudo o resto da função é igual à 016 (perfil, prateleira, totais).
--
-- NÃO PARTE NADA: o site manda sempre AAAA-MM-DD; as chamadas legítimas dão os
--   mesmos pontos que antes (testado: 5 por dia, +55 ao 7.º dia seguido, nada
--   repetido). A assinatura e os privilégios da função não mudam.
--
-- O QUE NÃO FAZ: não apaga linhas que já estejam no livro com grafias estranhas.
--   Se a consulta da secção 3 encontrar alguma, a limpeza é uma decisão do dono
--   do site (o bloco está escrito, comentado).
--
-- IDEMPOTENTE: pode correr mais do que uma vez.

-- ── 1. A função, igual à 016 menos a rotina_dia e a sequência ───────────────
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
    -- 017: só a forma canónica. A chave guardada é a data, e a mesma data tem
    -- de dar sempre a mesma chave — senão a unicidade do livro não serve de nada.
    if p_chave !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'data inválida (esperado AAAA-MM-DD): %', p_chave using errcode = '22023';
    end if;
    begin
      dia := to_date(p_chave, 'YYYY-MM-DD');
    exception when others then
      raise exception 'data inválida: %', p_chave using errcode = '22023';
    end;
    if to_char(dia, 'YYYY-MM-DD') <> p_chave then      -- ex.: 2026-02-30 → 2026-03-02
      raise exception 'data inválida: %', p_chave using errcode = '22023';
    end if;
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
    -- 7 DIAS distintos seguidos a acabar em `dia`, e nenhuma sequência premiada
    -- nos 6 anteriores. 017: conta dias, não linhas, e só chaves canónicas (as
    -- outras, se existirem de antes, não entram nem rebentam o cast).
    select count(distinct chave) into n from public.points_ledger
     where user_id = uid and motivo = 'rotina_dia'
       and chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       and chave between to_char(dia - 6, 'YYYY-MM-DD') and to_char(dia, 'YYYY-MM-DD');
    if n >= 7 and not exists (
      select 1 from public.points_ledger
       where user_id = uid and motivo = 'sequencia7'
         and chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         and chave between to_char(dia - 6, 'YYYY-MM-DD') and to_char(dia, 'YYYY-MM-DD')
    ) then
      insert into public.points_ledger (user_id, motivo, chave, pontos)
      values (uid, 'sequencia7', to_char(dia, 'YYYY-MM-DD'), 50)
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
  'Única forma de ganhar pontos. Verifica a conquista, escreve no points_ledger e recalcula profiles.points. rotina_dia só aceita AAAA-MM-DD. Ver migrações 016 e 017.';
revoke all on function public.ganhar_pontos(text, text) from public, anon;
grant execute on function public.ganhar_pontos(text, text) to authenticated;

do $do$
begin
  raise notice '017: ganhar_pontos() — rotina_dia só com AAAA-MM-DD; sequencia7 conta dias distintos.';
end
$do$;

-- ============================================================================
-- 2. VERIFICAÇÃO — correr depois, uma a uma, no SQL Editor
-- ============================================================================
-- 2.1 — a função nova está lá (ESPERADO: true)
-- select pg_get_functiondef('public.ganhar_pontos(text,text)'::regprocedure) like '%AAAA-MM-DD%';
--
-- 2.2 — o anon continua sem a poder chamar (ESPERADO: false)
-- select has_function_privilege('anon', 'public.ganhar_pontos(text,text)', 'execute');

-- ============================================================================
-- 3. Já houve abuso? (só leitura) — ESPERADO: 0 linhas
-- ============================================================================
-- Linhas do livro que a 017 já não deixaria entrar: rotina_dia/sequencia7 com
-- chave fora de AAAA-MM-DD, e sequencia7 sem 7 dias reais (distintos e
-- canónicos) a justificá-la.
--
-- select l.id, l.user_id, l.motivo, l.chave, l.pontos, l.created_at
--   from public.points_ledger l
--  where (l.motivo in ('rotina_dia', 'sequencia7') and l.chave !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
--     or (l.motivo = 'sequencia7' and l.chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--         and (select count(distinct r.chave) from public.points_ledger r
--               where r.user_id = l.user_id and r.motivo = 'rotina_dia'
--                 and r.chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--                 and r.chave between to_char(to_date(l.chave, 'YYYY-MM-DD') - 6, 'YYYY-MM-DD') and l.chave) < 7)
--  order by l.user_id, l.created_at;
--
-- Se aparecerem linhas, a limpeza abaixo tira exatamente essas e recalcula o
-- total de quem foi afetado. APAGA DADOS: só com decisão do dono do site.
-- (Comandos separados e não um CTE com delete: dentro do mesmo comando, o
-- update ainda veria o livro antes do delete e gravava os totais antigos.)
--
-- begin;
-- create temp table pontos_a_tirar on commit drop as
--   select l.id, l.user_id
--     from public.points_ledger l
--    where (l.motivo in ('rotina_dia', 'sequencia7') and l.chave !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
--       or (l.motivo = 'sequencia7' and l.chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--           and (select count(distinct r.chave) from public.points_ledger r
--                 where r.user_id = l.user_id and r.motivo = 'rotina_dia'
--                   and r.chave ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--                   and r.chave between to_char(to_date(l.chave, 'YYYY-MM-DD') - 6, 'YYYY-MM-DD') and l.chave) < 7);
-- delete from public.points_ledger where id in (select id from pontos_a_tirar);
-- update public.profiles p
--    set points = s.total, points_lifetime = s.total
--   from (select u.user_id, coalesce((select sum(pontos) from public.points_ledger l where l.user_id = u.user_id), 0)::int as total
--           from (select distinct user_id from pontos_a_tirar) u) s
--  where p.id = s.user_id;
-- commit;
