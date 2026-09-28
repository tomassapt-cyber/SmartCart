-- ============================================================================
-- 015 — «Apagar conta» e o registo de pesquisas que recusava 27% do catálogo
-- ============================================================================
-- CORRER NO PROJETO oghtbdcfvtgryouwsdae (o do site; confirmar no URL do
-- dashboard). A 013/014 foram, da primeira vez, para outro projeto.
--
-- ── 1. APAGAR CONTA ─────────────────────────────────────────────────────────
-- PORQUÊ: o RGPD (art. 17.º) dá o direito a apagar os dados, e até aqui só se
--   conseguia por email. O perfil passa a ter um botão «Apagar conta» que chama
--   esta função.
--
-- COMO: apagar a linha em auth.users chega para tudo o resto, porque todas as
--   tabelas com dados da pessoa estão ligadas a ela com ON DELETE CASCADE:
--   profiles, routine_products, routine_actions, profile_events e user_state.
--   A excepção é newsletter_subscribers, que guarda o email e não o id (a
--   subscrição pode ser feita sem conta) — por isso apaga-se à parte, pelo email
--   da conta. As estatísticas (analytics_events) não se ligam à conta, por
--   desenho, e não há nada a apagar lá.
--
-- ⚠️ Uma tabela nova com dados de utilizador TEM de ter `references
--   auth.users(id) on delete cascade`, ou esta função deixa-a para trás.
--
-- SEGURANÇA: SECURITY DEFINER (o utilizador não pode apagar em auth.users), mas
--   só apaga a conta de quem chama — auth.uid() —, nunca a de outro. Sem sessão,
--   recusa. O anon não a pode executar.

create or replace function public.apagar_a_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid  uuid := auth.uid();
  mail text;
begin
  if uid is null then
    raise exception 'sem sessão iniciada' using errcode = '42501';
  end if;
  select email into mail from auth.users where id = uid;
  if mail is not null then
    delete from public.newsletter_subscribers where lower(email) = lower(mail);
  end if;
  delete from auth.users where id = uid;
end $$;

comment on function public.apagar_a_minha_conta() is
  'Apaga a conta de quem chama (auth.uid()) e, em cascata, todos os seus dados; mais a subscrição de alertas com o mesmo email. Ver migração 015.';

revoke all on function public.apagar_a_minha_conta() from public, anon;
grant execute on function public.apagar_a_minha_conta() to authenticated;

-- ── 2. search_events: aceitar os códigos sintéticos ─────────────────────────
-- SINTOMA: abrir a ficha de ~27% dos produtos não ficava registado, sem erro
--   nenhum (o insert falha em silêncio, de propósito, para não partir a
--   navegação). Os "Mais procurados" contavam só os produtos com EAN numérico.
-- CAUSA: a 007 exigia `ean ~ '^[0-9]{7,14}$'`, mas 27% do catálogo tem códigos
--   sintéticos com letras e hífen (ex.: wells-8760922) — produtos que as lojas
--   vendem sem EAN. E o termo estava limitado a 64 caracteres, quando o site
--   manda até 80: as pesquisas longas também se perdiam.

alter table public.search_events drop constraint if exists se_ean_fmt;
alter table public.search_events add constraint se_ean_fmt
  check (ean ~ '^[A-Za-z0-9._-]{1,40}$');

alter table public.search_events drop constraint if exists se_term_len;
alter table public.search_events add constraint se_term_len
  check (term is null or char_length(term) <= 80);

drop policy if exists "anon insert search events" on public.search_events;
create policy "anon insert search events"
  on public.search_events for insert to anon, authenticated
  with check (
    ean ~ '^[A-Za-z0-9._-]{1,40}$'
    and (term is null or char_length(term) <= 80)
  );

do $do$
begin
  raise notice '015: apagar_a_minha_conta() criada (só authenticated); search_events aceita EAN sintéticos e termos até 80.';
end
$do$;
