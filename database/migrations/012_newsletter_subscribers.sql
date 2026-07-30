-- 012 — Guardar mesmo os emails dos alertas de preço
-- ============================================================================
-- SINTOMA (encontrado a 2026-07-30): a secção "As descidas de preço no teu
--   email" (demo.html:7544) tem um formulário que responde
--   "✓ Subscrito! Vais receber alertas das maiores descidas de preço."
--   ...e a função subscribeNewsletter() (demo.html:9695) só faz isto:
--       localStorage.setItem('cosmath_newsletter', ...)
--   Ou seja: o email fica guardado NO BROWSER DA PRÓPRIA PESSOA e não sai de
--   lá. Nunca chega ao site. Toda a gente que subscreveu desde sempre está
--   perdida, e a mensagem de confirmação promete uma coisa que não acontece.
--   A promessa aparece em quatro sítios: barra de anúncios (demo.html:7131),
--   cartão de vantagens (:7479), secção de brindes (:7519) e o formulário.
--
-- CAUSA RAIZ: nunca houve onde os pôr — não existe tabela de subscritores em
--   nenhum ficheiro de esquema nem migração.
--
-- O QUE ESTA MIGRAÇÃO FAZ: cria essa tabela, com o mesmo desenho de segurança
--   que já está provado na search_events (a única outra escrita anónima do
--   site): o visitante pode INSERIR o seu email e mais nada. Não pode LER a
--   lista, não pode alterá-la, não pode apagá-la.
--
-- PORQUE ISSO IMPORTA: uma lista de emails legível pelo anónimo seria uma fuga
--   de dados pessoais — exactamente a classe de problema da migração 011. Aqui
--   a defesa é dupla: RLS *sem* policy de SELECT (o Postgres devolve 0 linhas)
--   E revoke explícito do SELECT (o PostgREST nem chega a tentar).
--
-- ORDEM EM RELAÇÃO À 011: indiferente, mas com um cuidado. A 011 secção 9 põe
--   as "default privileges" a NEGAR escrita ao anon em tabelas novas. Por isso
--   esta migração faz um `grant insert` EXPLÍCITO — assim funciona quer corra
--   antes quer depois da 011.
--
-- Idempotente: podes corrê-la as vezes que quiseres.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id          bigint generated always as identity primary key,
  email       text        not null,
  -- de onde veio (secção da homepage, rodapé, …): ajuda a perceber o que
  -- converte, sem guardar nada mais sobre a pessoa
  source      text,
  created_at  timestamptz not null default now(),

  -- validação mínima de formato, do lado do servidor. O cliente já valida,
  -- mas o cliente é o browser de outra pessoa: nunca é uma garantia.
  constraint newsletter_email_formato check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint newsletter_email_tamanho check (char_length(email) between 5 and 254)
);

-- Um email só entra uma vez. Guardado em minúsculas para "A@x.pt" e "a@x.pt"
-- não passarem por duas pessoas diferentes.
create unique index if not exists newsletter_subscribers_email_uk
  on public.newsletter_subscribers (lower(email));

comment on table public.newsletter_subscribers is
  'Emails para os alertas de descida de preço. Escrita anónima (só INSERT); a lista NAO e legivel pelo anon. Ver migração 012.';


-- ── Segurança ───────────────────────────────────────────────────────────────
alter table public.newsletter_subscribers enable row level security;

-- INSERT: qualquer visitante pode subscrever-se. O `with check (true)` é
-- deliberado — não há utilizador autenticado a quem prender a linha.
drop policy if exists newsletter_insert_anon on public.newsletter_subscribers;
create policy newsletter_insert_anon on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

-- DELIBERADAMENTE SEM policy de SELECT/UPDATE/DELETE. Em Postgres, RLS ligada
-- sem policy para uma operação bloqueia essa operação (devolve 0 linhas, sem
-- erro). Quem precisa de ler a lista é o dono, com a service key — e essa
-- ignora a RLS.

-- Privilégio mínimo, por baixo da RLS. O `grant insert` é explícito de
-- propósito (ver a nota sobre a ordem, no cabeçalho).
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;

-- A coluna `id` é `generated always as identity`, portanto o INSERT não toca
-- na sequência e não é preciso dar-lhe privilégios. (Ao contrário de uma
-- coluna `serial`, que precisaria de `grant usage on sequence`.)


-- ── Nota que fica por resolver, de propósito ────────────────────────────────
-- Tal como a search_events, este ponto de escrita anónima não tem limite de
-- ritmo: alguém em ciclo pode encher a tabela de emails inventados. O índice
-- único trava repetições do MESMO email, não endereços diferentes. Mitigações
-- possíveis, se algum dia fizer falta: um captcha, ou passar o INSERT por uma
-- Edge Function com limite por IP. Não se faz agora porque o volume real é
-- praticamente nulo e a complexidade não se justifica — mas fica escrito para
-- não ser uma surpresa.


-- ── VERIFICAÇÃO (corre depois, uma de cada vez) ─────────────────────────────

-- 12.1 — a tabela existe e está fechada à leitura anónima?
--   ESPERADO: rls_ligada = true, e privilégios do anon = só INSERT
-- select c.relrowsecurity as rls_ligada,
--        (select string_agg(privilege_type, ', ' order by privilege_type)
--           from information_schema.role_table_grants
--          where table_schema='public' and table_name='newsletter_subscribers'
--            and grantee='anon') as anon_pode
--   from pg_class c join pg_namespace n on n.oid=c.relnamespace
--  where n.nspname='public' and c.relname='newsletter_subscribers';

-- 12.2 — quantos subscritores há (corre como dono, no SQL Editor)
-- select count(*) as subscritores, min(created_at) as primeiro, max(created_at) as ultimo
--   from public.newsletter_subscribers;

-- 12.3 — a lista, para quando quiseres enviar
-- select email, source, created_at from public.newsletter_subscribers order by created_at desc;
