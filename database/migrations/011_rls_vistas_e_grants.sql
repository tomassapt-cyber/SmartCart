-- 011 — RLS, vistas e privilégios: fechar a fuga da rotina e endurecer o resto
-- ============================================================================
-- Auditoria adversarial ao esquema (2026-07-29). Idempotente: podes correr
-- este ficheiro as vezes que quiseres, no Supabase Dashboard → SQL Editor →
-- New query → cola tudo → Run.
--
-- Antes de mais, três ideias de base (em português de quem não vive dentro de
-- uma base de dados):
--
--   • RLS ("row level security", segurança ao nível da linha) é o cadeado que
--     faz cada utilizador ver SÓ as suas linhas. Liga-se por tabela e as
--     regras chamam-se "policies".
--   • GRANT é um cadeado diferente e anterior: diz se o papel `anon` (o
--     visitante anónimo — a chave que está publicada dentro do app.html) pode
--     sequer tentar ler/escrever numa tabela. O Supabase, por omissão, dá
--     GRANT ALL ao `anon` em tudo o que nasce no schema `public`. Ou seja: hoje
--     a RLS é a ÚNICA barreira. Se alguém desligar a RLS numa tabela (por
--     exemplo a depurar no dashboard), fica tudo aberto. Esta migração põe uma
--     segunda barreira por baixo.
--   • Uma VISTA (view) é uma consulta guardada com nome. Em Postgres, por
--     omissão, uma vista corre com os privilégios de QUEM A CRIOU e não de quem
--     a consulta. Consequência: se a vista lê uma tabela com RLS, a RLS da
--     tabela **não se aplica** a quem passa pela vista. É exactamente isso que
--     estava a acontecer aqui.
--
-- O QUE ESTA MIGRAÇÃO CORRIGE (detalhe em cada secção):
--   1. public.routine_with_status — CRÍTICO. Fuga real de dados pessoais.
--   2. public.user_state          — tabela viva que nunca esteve em código.
--   3. public.profiles            — faltava a policy de DELETE.
--   4. tabelas pessoais           — tirar ao `anon` os GRANTs de escrita.
--   5. catálogo                   — idem (só o CI com service key escreve).
--   6. public.search_events       — privilégio mínimo: só INSERT.
--   7. public.handle_new_user()   — `security definer` sem `search_path`.
--   8. aviso de novo registo   — sai o Telegram (com o token em texto limpo
--                                 no corpo da função), entra email pelo Resend.
--   9. default privileges         — travão para tudo o que nascer no futuro.
--  10. o que NÃO se mexe, e porquê.
--  11. bloco de VERIFICAÇÃO (queries para correres depois).
--
-- NOTA IMPORTANTE SOBRE OS FICHEIROS DE ESQUEMA: esta migração corrige a BASE
-- DE DADOS. Os ficheiros database/schema-supabase.sql (linha 188) e
-- database/schema-supabase-no-telegram.sql (linha 126) continuam a conter a
-- vista insegura. Se algum dia voltares a correr um desses ficheiros no
-- Supabase, o problema volta. Corrige-os no repositório (ou apaga a secção da
-- vista) numa alteração à parte.
-- ============================================================================


-- ============================================================================
-- 1) public.routine_with_status — CRÍTICO: rotina de skincare de qualquer
--    utilizador exposta ao visitante anónimo (leitura E escrita)
-- ============================================================================
-- SINTOMA (medido ao vivo a 2026-07-29 com a chave pública do site, só GETs):
--     GET /rest/v1/routine_products      → HTTP 200, 0 linhas   (RLS a funcionar)
--     GET /rest/v1/routine_with_status   → HTTP 206, 2 linhas   (a mesma informação!)
--   A vista devolvia as 15 colunas da tabela — user_id, ean, product_name,
--   product_brand, started_at, volume_ml, doses_per_use, uses_per_week... — ou
--   seja, a rotina completa de outra pessoa. Filtrar por ?user_id=eq.<id>
--   também funcionava, portanto dava para ir buscar a rotina de um utilizador
--   à escolha. E um PATCH pela vista devolveu 204 (escrita aceite).
--
-- CAUSA RAIZ: a vista foi criada assim (schema-supabase.sql:188)
--     create or replace view public.routine_with_status as
--       select rp.*, ... from public.routine_products rp;
--   Falta-lhe `with (security_invoker = on)`. Sem essa opção, o Postgres corre
--   a vista com os privilégios do DONO da vista — e o dono não está sujeito às
--   policies da tabela. A policy `routine_select_own` (auth.uid() = user_id)
--   nunca chega a ser avaliada. Pior: como a vista é "simples" (um único FROM,
--   sem GROUP BY, sem DISTINCT, sem agregados), o Postgres torna-a
--   automaticamente actualizável — INSERT/UPDATE/DELETE pela vista chegam à
--   tabela, com um user_id à escolha de quem escreve, porque a coluna vem no
--   `rp.*` e não há `with check option`.
--
-- ESCOLHA (as duas opções em cima da mesa):
--   (a) alter view ... set (security_invoker = on) — a vista passa a correr com
--       os privilégios de quem consulta e a RLS volta a aplicar-se. Mantém a
--       vista viva. Requer Postgres 15+ (o Supabase corre 15 ou superior;
--       confirma-se com a query da secção 11.0, ou em Dashboard → Settings →
--       Infrastructure → Postgres version).
--   (b) drop view — remove o problema pela raiz.
--
--   ESCOLHIDA: (b) drop view. Porquê:
--     • A vista está órfã: `routine_with_status` não aparece em app.html,
--       index.html, catalogo.html, demo.html nem account.html — 0 ocorrências
--       em todo o repositório fora dos 2 ficheiros de esquema que a criam.
--       Nenhuma funcionalidade do site a lê. O `days_left` que ela calculava
--       já é calculado no cliente.
--     • O que não existe não pode ser mal configurado outra vez. A opção (a)
--       deixava de pé um objecto que continua a precisar dos GRANTs certos e
--       que qualquer `create or replace view` futuro sem a cláusula `with`
--       voltaria a pôr inseguro (o Postgres apaga as opções da vista quando a
--       substitui sem as repetir).
--     • Reverter é trivial: a versão SEGURA está aqui em baixo, comentada.
--
-- PORQUE RESOLVE: sem vista, o único caminho para public.routine_products é a
-- própria tabela — e essa tem RLS ligada com as quatro policies "own"
-- (schema-supabase.sql:88-102), como o GET a 0 linhas comprova.
--
-- NÃO PARTE NADA: 0 referências no código do site (verificado por grep).

drop view if exists public.routine_with_status;

-- Se algum dia a vista fizer mesmo falta, a versão segura é esta (descomenta):
--
-- create or replace view public.routine_with_status
--   with (security_invoker = on) as
-- select
--   rp.*,
--   (started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date as est_ends_at,
--   ((started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date - current_date) as days_left
-- from public.routine_products rp;
-- revoke all on public.routine_with_status from anon, authenticated;
-- grant select on public.routine_with_status to authenticated;


-- ============================================================================
-- 2) public.user_state — tabela viva em produção que nunca esteve no repositório
-- ============================================================================
-- SINTOMA: a tabela existe na base de dados (GET devolve HTTP 200) e o site
--   escreve nela — index.html:13211/13267, catalogo.html:13211/13267 e
--   demo.html:12911/12967 fazem o sync cross-device de "O meu espaço"
--   (`.from('user_state').select(...)` e `.upsert({ user_id, state })`). Mas
--   `user_state` não aparece em NENHUM ficheiro .sql do repositório: as suas
--   policies nunca foram revistas em código e não são reproduzíveis.
--
-- CAUSA RAIZ: foi criada à mão no dashboard. Uma tabela criada à mão nasce com
--   a RLS DESLIGADA e com os GRANTs por omissão do Supabase (tudo ao `anon`).
--   A leitura anónima devolve 0 linhas hoje, o que é bom sinal, mas não prova
--   nada sobre a escrita — e esta auditoria era só-leitura, por isso não se
--   testou.
--
-- PORQUE RESOLVE: liga a RLS (se estiver desligada, passa a valer o cadeado) e
--   cria a policy que diz "cada utilizador autenticado só toca nas linhas cujo
--   user_id é o dele" — `using` para ler/apagar, `with check` para escrever;
--   o upsert precisa dos dois. Depois tira ao `anon` a escrita.
--
-- NÃO PARTE NADA: o pull e o push só correm com sessão iniciada — as duas
--   funções começam com `if (!SUPABASE || !CURRENT_USER) return;` — logo o
--   pedido chega sempre como `authenticated`, nunca como `anon`. Tudo é feito
--   dentro de um guard: se a tabela não existir, esta secção não faz nada.

do $do$
begin
  if to_regclass('public.user_state') is null then
    raise notice '011: public.user_state nao existe — seccao 2 ignorada.';
  elsif not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'user_state' and column_name = 'user_id'
  ) then
    raise warning '011: public.user_state existe mas NAO tem coluna user_id — verifica a tabela a mao antes de continuar.';
  else
    execute 'alter table public.user_state enable row level security';
    execute 'drop policy if exists user_state_rw_own on public.user_state';
    execute $p$
      create policy user_state_rw_own on public.user_state
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $p$;
    execute 'revoke insert, update, delete, truncate on public.user_state from anon';
    raise notice '011: public.user_state — RLS ligada, policy user_state_rw_own criada, escrita anonima revogada.';
  end if;
end
$do$;

-- Fica por fazer (fora do âmbito de uma migração): acrescentar ao repositório o
-- `create table if not exists public.user_state (...)` real, para a tabela
-- passar a estar em controlo de versões como todas as outras. Tira a definição
-- com: Dashboard → Table Editor → user_state → Definition.


-- ============================================================================
-- 3) public.profiles — faltava a policy de DELETE
-- ============================================================================
-- SINTOMA: nenhum hoje. É uma armadilha adiada.
-- CAUSA RAIZ: schema-supabase.sql:75-85 cria profiles_select_own,
--   profiles_insert_own e profiles_update_own — e mais nenhuma. Com a RLS
--   ligada, uma operação sem policy correspondente **não dá erro: apaga zero
--   linhas em silêncio** (foi exactamente esta a armadilha que a migração 008
--   apanhou na purga do search_events). No dia em que houver um botão "apagar
--   a minha conta", ele parecia funcionar e não apagava nada.
-- PORQUE RESOLVE: acrescenta a policy em falta, restrita ao próprio dono.
-- NÃO PARTE NADA: é puramente aditivo — hoje não há um único `.delete()` sobre
--   profiles no código do site. Também é o que o RGPD pede (direito ao apagamento).

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (auth.uid() = id);


-- ============================================================================
-- 4) Tabelas pessoais — tirar ao `anon` os GRANTs de escrita (defesa em profundidade)
-- ============================================================================
-- SINTOMA: nenhum hoje — a RLS está a fazer o seu trabalho nas cinco tabelas.
-- CAUSA RAIZ: não existe um único GRANT/REVOKE em todo o repositório, por isso
--   vale o default do Supabase: o `anon` tem INSERT/UPDATE/DELETE em tudo o que
--   está em `public`. A RLS é a única coisa que o trava. Isto é uma barreira só.
-- PORQUE RESOLVE: sem o GRANT, o pedido é recusado ANTES de se chegar sequer à
--   RLS. Passam a ser duas barreiras independentes — se um dia alguém desligar
--   a RLS numa destas tabelas a depurar, o visitante anónimo continua sem poder
--   escrever.
-- NÃO PARTE NADA: todas as escritas do site nestas tabelas acontecem com sessão
--   iniciada (papel `authenticated`) — cada função começa por
--   `if (!SUPABASE || !CURRENT_USER) return;` (ver index.html:13311, :13333,
--   :13340 e account.html:928, :937). A linha inicial de `profiles` é criada
--   pelo trigger handle_new_user, que é `security definer` e corre como dono,
--   não como `anon`. A leitura não é tocada.

-- ENDURECIDO (revisão manual, 2026-07-29): um REVOKE em lista é ATÓMICO — se
-- UMA das tabelas não existir, o comando falha e aborta a migração inteira, e
-- as secções seguintes nunca chegam a correr. public.profile_events vem da
-- migração 001 e pode nunca ter sido aplicada nesta base de dados. O ciclo
-- abaixo trata cada tabela à parte e ignora as que não existirem.

do $do$
declare
  t text;
  em_falta text[] := '{}';
begin
  foreach t in array array[
    'profiles', 'routine_products', 'routine_actions', 'profile_events'
  ] loop
    if to_regclass('public.' || t) is null then
      em_falta := em_falta || t;
    else
      execute format(
        'revoke insert, update, delete, truncate on public.%I from anon', t);
    end if;
  end loop;

  if array_length(em_falta, 1) is not null then
    raise notice '011: escrita anonima revogada; tabelas inexistentes ignoradas: %',
      array_to_string(em_falta, ', ');
  else
    raise notice '011: escrita anonima revogada nas 4 tabelas pessoais.';
  end if;
end
$do$;


-- ============================================================================
-- 5) Catálogo (stores, products, offers, offer_variants) — só o CI escreve
-- ============================================================================
-- SINTOMA: nenhum hoje. As migrações 004 e 006 dizem, em comentário,
--   "deliberadamente SEM policies de insert/update/delete — só a service key
--   escreve" (004_catalog_core.sql:72), mas nenhum REVOKE acompanha o
--   comentário: a intenção está escrita em prosa e não em privilégios.
-- CAUSA RAIZ: a mesma da secção 4 — os GRANTs implícitos do Supabase.
-- PORQUE RESOLVE: 303.262 linhas de catálogo (71 lojas + 50.237 produtos +
--   149.607 ofertas + 103.347 variantes) deixam de depender só da RLS.
-- NÃO PARTE NADA: o site só LÊ o catálogo (0 insert/update/delete sobre estas
--   tabelas em qualquer .html) e a leitura mantém-se pública. Quem escreve é o
--   CI, com a SUPABASE_SERVICE_KEY (scripts/push-catalog-to-db.js:37,
--   .github/workflows/db-sync.yml:44) — e a service key ignora tanto a RLS como
--   estes GRANTs.

-- ENDURECIDO (revisão manual): mesma razão da secção 4 — tabela a tabela, para
-- que uma ausência não aborte tudo o que vem a seguir.

do $do$
declare
  t text;
begin
  foreach t in array array[
    'stores', 'products', 'offers', 'offer_variants'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    else
      raise notice '011: public.% nao existe — ignorada.', t;
    end if;
  end loop;
  raise notice '011: catalogo — escrita revogada a anon/authenticated (a service key do CI nao e afectada).';
end
$do$;


-- ============================================================================
-- 6) public.search_events — privilégio mínimo: só INSERT
-- ============================================================================
-- SINTOMA: nenhum hoje. É o único ponto onde o visitante anónimo escreve por
--   desenho (contador de "Mais procurados"). A leitura já está fechada (não há
--   policy de SELECT — 003_search_events.sql:36) mas o GRANT de leitura e de
--   escrita continua lá, implícito.
-- CAUSA RAIZ: idem — defaults do Supabase.
-- PORQUE RESOLVE: alinha os privilégios com a intenção. Fica INSERT e mais
--   nada: ninguém lê, actualiza ou apaga eventos com a chave pública. A purga
--   dos > 180 dias continua a funcionar porque a se_prune() é `security
--   definer` desde a migração 008 (corre como dono, não como `anon`).
-- NÃO PARTE NADA: o cliente insere sem pedir a linha de volta —
--   app.html:246-251 manda `Prefer: return=minimal` explicitamente, e o
--   `.insert()` do supabase-js (index/catalogo/demo.html:12341) também não pede
--   representação, por isso não precisa de SELECT. O GRANT na sequência do `id`
--   é preciso para o `bigserial` poder gerar o próximo número. Quem LÊ os
--   eventos é o CI (scripts/aggregate-search-popularity.js:38), com a
--   SUPABASE_SERVICE_KEY — que ignora RLS e GRANTs. Uma tabela só-de-INSERT é,
--   aliás, um padrão documentado do PostgREST: continua exposta e insertável.

revoke all on public.search_events from anon, authenticated;
grant insert on public.search_events to anon, authenticated;

do $do$
declare
  seq text := pg_get_serial_sequence('public.search_events', 'id');
begin
  if seq is not null then
    execute format('grant usage, select on sequence %s to anon, authenticated', seq);
  end if;
end
$do$;

-- NÃO INCLUÍDO DE PROPÓSITO — limite de VOLUME nos eventos de pesquisa.
-- A policy da 007 valida o FORMATO de cada linha (EAN com 7-14 dígitos, termo
-- até 64 caracteres) mas não o número de linhas: com a chave pública, um POST
-- em ciclo enche a tabela. A defesa barata seria deduplicar por (termo, ean,
-- dia):
--
--   create unique index if not exists se_dedup_dia
--     on public.search_events (coalesce(term,''), ean, (created_at::date));
--
-- MAS isto PARTE o tracking tal como está: a segunda pesquisa igual no mesmo
-- dia passa a devolver 409. Só aplicar DEPOIS de o cliente passar a mandar
-- `Prefer: resolution=ignore-duplicates` nos 4 sítios que inserem
-- (app.html:246, index/catalogo/demo.html:12341). Nota: também muda o
-- significado do hero — cada termo passa a contar 1x por dia em vez de N.


-- ============================================================================
-- 7) public.handle_new_user() — `security definer` sem `set search_path`
-- ============================================================================
-- SINTOMA: nenhum visível. É o aviso `function_search_path_mutable` do linter
--   do Supabase, a família do CVE-2018-1058.
-- CAUSA RAIZ: 001_profiles_extended.sql:85-97 cria a função com `security
--   definer` (corre com os privilégios do dono, na prática o `postgres`) mas
--   sem fixar o `search_path`. O search_path é a lista de "pastas" onde o
--   Postgres procura tabelas e funções cujo nome não vem qualificado. Como a
--   função herda o search_path de quem a dispara, alguém que consiga criar um
--   schema mais à frente na lista pode lá pôr um objecto com o mesmo nome e a
--   função — que corre como dono — vai usar o objecto do atacante.
-- PORQUE RESOLVE: `set search_path = public, pg_temp` prega a lista à função,
--   independentemente de quem a chama. `pg_temp` vai em último para que uma
--   tabela temporária nunca ganhe a um objecto real (é a mesma forma usada na
--   migração 008, linha 28).
-- NÃO PARTE NADA: o corpo é rigorosamente o mesmo da 001; só se acrescenta a
--   cláusula SET. O `create or replace` mantém o trigger on_auth_user_created
--   a apontar para a função. Não é invocável por RPC (devolve `trigger`).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Eu'),
    coalesce(split_part(new.email, '@', 1), 'Eu')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- OPCIONAL, decisão consciente (deixado por aplicar): esta função não tem bloco
-- `exception`, ao contrário da notify_telegram_on_signup. Se um dia o INSERT em
-- public.profiles falhar (um CHECK novo com default incompatível, por exemplo —
-- a 001 já acrescentou profiles_gender_check, profiles_routine_steps_check e
-- profiles_budget_check), a transacção inteira do registo é abortada e NINGUÉM
-- se consegue registar. Para o registo nunca partir por causa do perfil,
-- acrescenta ao corpo, antes do `end $$`:
--
--   exception when others then
--     raise warning 'handle_new_user failed: %', sqlerrm;
--     return new;
--
-- CONTRAPARTIDA: passa a poder existir utilizador em auth.users sem linha em
-- public.profiles. Neste site isso é tolerável — index.html:13297 faz
-- `.from('profiles').upsert(...)`, portanto o perfil auto-repara-se no primeiro
-- sync. Fica como escolha tua: falhar alto (como está) ou nunca bloquear o registo.


-- ============================================================================
-- 8) Aviso de novo registo: FORA o Telegram, DENTRO o email (Resend)
-- ============================================================================
-- DECISÃO (2026-07-29, pedido do dono do site): não se quer Telegram. O aviso
-- de "alguém registou-se" passa a chegar por email.
--
-- Havia aqui dois problemas a resolver ao mesmo tempo:
--   (a) a função public.notify_telegram_on_signup() guardava o token do bot e o
--       chat_id EM TEXTO LIMPO dentro do próprio corpo (schema-supabase.sql:
--       145-146, via os placeholders que o SETUP-AUTH.md manda substituir pelos
--       valores reais). O corpo de uma função lê-se em pg_proc.prosrc, aparece
--       no dashboard, em qualquer backup/dump e pode ir parar aos logs;
--   (b) era `security definer` sem `set search_path` — a mesma lacuna da
--       secção 7 (classe CVE-2018-1058).
-- Como a função desaparece, os dois problemas desaparecem com ela.
--
-- PORQUÊ UM SERVIÇO DE EMAIL E NÃO "MANDAR UM EMAIL DIRECTO": o Postgres não
-- fala SMTP. O que a base de dados sabe fazer é pedidos HTTP (extensão pg_net,
-- já instalada — schema-supabase.sql:16). Por isso o aviso sai por uma API de
-- email. Escolhido o Resend: conta gratuita com 3.000 emails/mês e, muito
-- prático, deixa enviar para o endereço com que te registaste sem teres de
-- verificar domínio nenhum (usando o remetente onboarding@resend.dev).
--
-- ANTES DE CORRER ESTA MIGRAÇÃO — dois passos, uma vez só:
--
--   1) Se alguma vez colaste o token real do Telegram nesta base de dados, vai
--      ao @BotFather e faz /revoke. Ele esteve legível em claro; apagar a
--      função não desfaz isso. Se nunca configuraste o Telegram, salta este
--      passo (a secção detecta e ignora).
--
--   2) Cria conta em resend.com (grátis), gera uma API key em "API Keys", e
--      guarda os segredos no cofre do Supabase — SQL Editor, uma vez:
--
--        select vault.create_secret('re_xxxxxxxxxxxx', 'resend_api_key');
--        select vault.create_secret('tomas.sa.pt@gmail.com', 'signup_notify_email');
--
--      (o email tem de ser o MESMO com que criaste a conta Resend, enquanto
--      não verificares um domínio teu — é a regra deles para o remetente de
--      teste). Se um dia verificares um domínio, acrescenta um terceiro
--      segredo e o remetente passa a ser esse, sem mexer em SQL:
--
--        select vault.create_secret('CosMath <avisos@ocositio.pt>', 'signup_notify_from');
--
-- SE SALTARES O PASSO 2, NADA REBENTA: a função sai logo no início e o aviso
-- fica simplesmente desligado até criares os segredos. E, aconteça o que
-- acontecer dentro dela, o registo do utilizador NUNCA falha por causa disto —
-- o `exception when others` devolve `new` na mesma. Um aviso é um extra, não
-- pode ser um ponto de falha do registo.

-- 8.1 — remover o Telegram (trigger primeiro, depois a função)
drop trigger if exists on_auth_user_created_notify on auth.users;
drop function if exists public.notify_telegram_on_signup();

-- 8.2 — a função nova: lê os segredos do cofre e faz um POST ao Resend
create or replace function public.notify_email_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $body$
declare
  api_key   text;
  para      text;
  remetente text;
begin
  -- O cofre pode não estar acessível (permissões, extensão não activada).
  -- Isso não pode derrubar um registo, por isso vai em bloco próprio.
  begin
    select decrypted_secret into api_key
      from vault.decrypted_secrets where name = 'resend_api_key';
    select decrypted_secret into para
      from vault.decrypted_secrets where name = 'signup_notify_email';
    select decrypted_secret into remetente
      from vault.decrypted_secrets where name = 'signup_notify_from';
  exception when others then
    raise warning 'aviso de registo: nao consegui ler o Vault (%)', sqlerrm;
    return new;
  end;

  -- ainda não configurado — segue em silêncio
  if api_key is null or para is null then
    return new;
  end if;
  remetente := coalesce(remetente, 'CosMath <onboarding@resend.dev>');

  -- Texto simples de propósito: sem HTML não há nada para escapar, e o email
  -- do utilizador vai aqui dentro. O destino é só o dono do site.
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body    := jsonb_build_object(
      'from',    remetente,
      'to',      jsonb_build_array(para),
      'subject', 'CosMath — novo registo: ' || coalesce(new.email, '(sem email)'),
      -- ATENÇÃO: um só literal com prefixo E. Literais adjacentes em SQL são
      -- concatenados, MAS o `E` só vale para o primeiro — nos seguintes o \n
      -- sairia como barra-e-n em texto, não como mudança de linha.
      'text',    format(
        E'Alguem registou-se no CosMath.\n\nEmail: %s\nID:    %s\nHora:  %s (Lisboa)\nEmail confirmado: %s\n',
        coalesce(new.email, '(sem email)'),
        new.id,
        to_char(new.created_at at time zone 'Europe/Lisbon', 'DD/MM/YYYY HH24:MI'),
        case when new.email_confirmed_at is null then 'ainda nao' else 'sim' end
      )
    )
  );
  return new;

exception when others then
  -- rede em baixo, Resend a devolver erro, o que for: o registo segue.
  raise warning 'aviso de registo por email falhou: %', sqlerrm;
  return new;
end $body$;

-- 8.3 — ligar ao registo de novos utilizadores
drop trigger if exists on_auth_user_created_email on auth.users;
create trigger on_auth_user_created_email
  after insert on auth.users
  for each row execute function public.notify_email_on_signup();

-- 8.4 — ninguém de fora precisa de poder chamar isto
revoke all on function public.notify_email_on_signup() from anon, authenticated;

-- COMO TESTAR sem esperar por um registo a sério: cria um utilizador de teste
-- em Authentication → Users → Add user (com "Auto Confirm User"), confirma que
-- o email chega, e apaga-o a seguir. Se não chegar, vê Database → Logs (a
-- função escreve lá um `warning` a dizer porquê) e o painel do Resend em
-- "Emails", que mostra as entregas e as recusas.

-- Se um dia não quiseres aviso nenhum, é só desligar (o registo continua a
-- funcionar exactamente na mesma):
--   drop trigger if exists on_auth_user_created_email on auth.users;
--   drop function if exists public.notify_email_on_signup();


-- ============================================================================
-- 9) Default privileges — o travão para o que nascer no futuro
-- ============================================================================
-- SINTOMA: nenhum hoje. É prevenção.
-- CAUSA RAIZ: no Supabase, tudo o que nasce em `public` recebe GRANT ALL ao
--   `anon`. Isto é, cada tabela nova é escrivível pelo visitante anónimo até
--   alguém se lembrar de ligar a RLS. Foi assim que a fuga da secção 1 pôde
--   ser também de ESCRITA.
-- PORQUE RESOLVE: as "default privileges" são o molde com que os objectos
--   nascem. A partir daqui, uma tabela nova em `public` nasce sem escrita para
--   o `anon` — a leitura pública continua a poder ser dada à mão quando fizer
--   sentido (catálogo).
--
-- DOIS AVISOS IMPORTANTES:
--   • Isto SÓ afecta objectos criados DEPOIS desta linha, e só os criados pelo
--     papel que corre este comando (no SQL Editor do Supabase é o `postgres`,
--     que é quem cria tudo nas migrações). Objectos já existentes não são
--     tocados — daí os REVOKE explícitos das secções 4, 5 e 6.
--   • NÃO se mexe no `authenticated`: as tabelas de dados pessoais precisam de
--     que o utilizador com sessão escreva as SUAS linhas, e é a RLS que trata
--     de o limitar às linhas dele.

alter default privileges in schema public
  revoke insert, update, delete, truncate on tables from anon;


-- ============================================================================
-- 10) O que esta migração NÃO mexe — e porquê (para não haver dúvidas depois)
-- ============================================================================
-- • public.se_prune() (migração 008): está correcta — `security definer` COM
--   `set search_path = public, pg_temp`. Confirmado ao vivo que a nota das
--   linhas 38-41 da 008 também está certa: uma função que devolve `trigger` não
--   entra sequer no catálogo do PostgREST (o pedido devolve PGRST202), logo
--   revogar-lhe o EXECUTE não traria ganho nenhum e podia partir os inserts.
-- • public.touch_updated_at(): correctamente NÃO é `security definer`, portanto
--   corre como quem faz o UPDATE e não há privilégios de dono para sequestrar.
--   A ausência de `search_path` é inofensiva aqui.
-- • public.routine_actions e public.profile_events só têm policies de SELECT e
--   INSERT (sem UPDATE/DELETE). Fica registado que o "append-only" (só se
--   acrescenta, não se altera nem apaga) é INTENCIONAL e bate certo com o uso
--   real: o cliente só faz `.insert()`.
-- • database/schema.sql, database/schema-unified.sql, db/schema.sql e
--   scripts/migrate-to-unified.sql definem 13 tabelas e 5 vistas SEM uma única
--   linha de RLS (precos_atuais, avaliacoes_resumo, v_produto_completo,
--   latest_prices, store_catalog...). Verificado ao vivo que NENHUMA existe
--   neste projecto Supabase (todas devolvem 404). São o esquema de um Postgres
--   separado, falado por DATABASE_URL (api/products.js, scraper/, web/app/api/).
--   NÃO os apliques ao Supabase. Se algum dia for preciso, cada `create table`
--   tem de vir com o par obrigatório `enable row level security` + policy, e
--   cada `create view` com `with (security_invoker = on)`.
-- • REGRA DE ESTILO daqui para a frente: toda a vista criada em `public` nasce
--   com `with (security_invoker = on)`. Hoje há 8 declarações de vista no
--   repositório e nenhuma a tem (grep de "security_invoker": 0 ocorrências).
--
-- Descartado pelos céticos da auditoria (fica escrito para não se voltar a
-- investigar do zero):
--   – pg_trgm instalada em `public` (migrações 005/009): as funções da extensão
--     não são um problema explorável aqui;
--   – o PostgREST revelar nomes de tabelas na mensagem de erro 404 ("Perhaps
--     you meant..."): os nomes não são segredo, o que protege os dados é a RLS;
--   – o cabeçalho `Allow` do OPTIONS não serve de prova de privilégios: devolve
--     sempre "GET, HEAD, POST, OPTIONS", mesmo onde o PATCH funcionava.


-- ============================================================================
-- 11) VERIFICAÇÃO — corre estas queries DEPOIS, uma a uma, no SQL Editor
-- ============================================================================
-- (estão comentadas de propósito: o SQL Editor só mostra o resultado da última
-- instrução, por isso copia a que queres, cola numa query nova e corre)

-- 11.0 — versão do Postgres (o `security_invoker` das vistas precisa de 15+)
--   ESPERADO: suporta_security_invoker = true
-- select current_setting('server_version') as versao,
--        current_setting('server_version_num')::int >= 150000 as suporta_security_invoker;

-- 11.1 — vistas em `public` que ainda corram com os privilégios do dono
--   ESPERADO: 0 linhas (a routine_with_status deixou de existir)
-- select c.relname as vista,
--        coalesce((select option_value from pg_options_to_table(c.reloptions)
--                   where option_name = 'security_invoker'), 'off') as security_invoker
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public'
--    and c.relkind in ('v','m')     -- v = vista, m = vista materializada
--    and coalesce((select option_value from pg_options_to_table(c.reloptions)
--                   where option_name = 'security_invoker'), 'off') <> 'on'
--  order by 1;

-- 11.2 — funções `security definer` sem search_path fixo
--   ESPERADO: 0 linhas
-- select p.proname as funcao, p.proconfig
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.prosecdef
--    and (p.proconfig is null
--         or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
--  order by 1;

-- 11.3 — tabelas em `public` sem RLS ligada
--   ESPERADO: 0 linhas
-- select c.relname as tabela
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
--  order by 1;

-- 11.4 — o que o visitante anónimo ainda pode ESCREVER
--   ESPERADO: exactamente uma linha — search_events / INSERT
-- select table_name, privilege_type
--   from information_schema.role_table_grants
--  where grantee = 'anon' and table_schema = 'public'
--    and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
--  order by 1, 2;

-- 11.5 — mapa completo das policies (uma leitura de sanidade)
--   ESPERADO: profiles com select/insert/update/delete "own"; routine_products
--   com as quatro; routine_actions e profile_events só select+insert;
--   user_state com user_state_rw_own (ALL); catálogo só select; search_events
--   só insert.
-- select tablename, policyname, cmd, roles
--   from pg_policies where schemaname = 'public'
--  order by tablename, cmd, policyname;

-- 11.6 — o molde dos objectos futuros (default privileges)
--   ESPERADO: uma entrada em `public` onde o `anon` já não tem a,w,d
-- select defaclrole::regrole as criado_por,
--        defaclnamespace::regnamespace as schema,
--        defaclacl as privilegios_por_omissao
--   from pg_default_acl;

-- 11.7 — já não há tokens em texto limpo dentro de funções
--   ESPERADO: 0 linhas
-- select p.proname as funcao
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.prosrc ~ '[0-9]{8,10}:[A-Za-z0-9_-]{35}'
--  order by 1;

-- 11.8 — prova final, do lado de fora (correr no terminal, com a chave PÚBLICA
--   que está no app.html; não precisa de service key):
--     curl -sS -o /dev/null -w '%{http_code}\n' \
--       -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--       'https://sqjtkwtoaudmfmexreqk.supabase.co/rest/v1/routine_with_status?select=*&limit=1'
--   ESPERADO: 404 (antes desta migração devolvia 206 com a rotina de outra pessoa).

-- ============================================================================
-- Fim da migration 011
-- ============================================================================