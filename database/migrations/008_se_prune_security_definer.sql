-- 008 — a purga automática de search_events nunca apagava nada
-- ============================================================================
-- ACHADO da auditoria adversarial (2026-07-25, confirmado por 3 céticos).
--
-- A função public.se_prune() criada na 007 é `language plpgsql` SEM
-- `security definer`, portanto corre com o papel de quem faz o INSERT — que
-- é o `anon` (o PostgREST faz SET ROLE anon). A tabela tem RLS ligada e a 003
-- diz explicitamente na linha 36: "deliberadamente SEM policy de
-- SELECT/UPDATE/DELETE para anon".
--
-- Em Postgres, um DELETE sob RLS sem policy permissiva **não apaga linha
-- nenhuma e não dá erro**. Ou seja: a purga era um no-op silencioso — que era
-- exactamente o problema que a 007 dizia estar a resolver ("substitui o
-- comentário que nunca corria"). A tabela cresceria sem limite, e a chave anon
-- é pública (está no app.html), por isso é também uma superfície de abuso.
--
-- CORREÇÃO: `security definer` faz a função correr com os privilégios do dono
-- (que não está sujeito às policies), e o `set search_path` é obrigatório numa
-- função security definer — sem ele, um schema malicioso no search_path do
-- chamador poderia sequestrar as referências não qualificadas.
--
-- Idempotente: pode ser corrida as vezes que forem precisas.
-- ============================================================================

create or replace function public.se_prune() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- ~0,5% dos inserts: barato e sem precisar de pg_cron
  if (random() < 0.005) then
    delete from public.search_events where created_at < now() - interval '180 days';
  end if;
  return null;
end $$;

-- NOTA: deliberadamente NÃO se faz `revoke execute ... from anon`. O ganho
-- seria nulo — uma função que devolve `trigger` não é invocável pelo PostgREST
-- — e o risco é real: se o Postgres verificar o privilégio de EXECUTE ao
-- disparar o trigger, TODOS os inserts de tracking da app passariam a falhar.
-- O dono da função passa a ser quem corre este script (o papel do SQL editor
-- do Supabase), que tem privilégio de DELETE na tabela.

drop trigger if exists se_prune_trg on public.search_events;
create trigger se_prune_trg after insert on public.search_events
  for each row execute function public.se_prune();

-- ── verificação (o resultado deve ser: prosecdef = true) ──
-- select proname, prosecdef, proconfig
--   from pg_proc where proname = 'se_prune';
