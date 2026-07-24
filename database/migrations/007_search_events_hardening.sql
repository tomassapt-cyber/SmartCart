-- ============================================================
-- Migration 007: Blindar search_events (auditoria backend 2026-07-24)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- A anon key é pública (o cliente insere eventos anónimos). Sem limites, um
-- POST em loop com arrays JSON de termos de vários MB enchia o free tier e
-- envenenava o hero "Mais procurados" (search_term ia tal e qual). Agora:
--   • CHECK: term curto, ean com formato de EAN/CNP → lixo é REJEITADO na BD;
--   • policy repete o CHECK no with check (defesa na própria escrita);
--   • purga automática dos > 180 dias via trigger leve (o comentário de dantes
--     nunca corria); a agregação usa 30 dias.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'se_term_len') then
    alter table public.search_events add constraint se_term_len check (term is null or char_length(term) <= 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'se_ean_fmt') then
    alter table public.search_events add constraint se_ean_fmt check (ean ~ '^[0-9]{7,14}$');
  end if;
end $$;

drop policy if exists "anon insert search events" on public.search_events;
create policy "anon insert search events"
  on public.search_events for insert to anon, authenticated
  with check (
    ean ~ '^[0-9]{7,14}$'
    and (term is null or char_length(term) <= 64)
  );

-- purga automática (substitui o comentário que nunca corria): a cada ~200
-- inserts, apaga o que passou dos 180 dias. Barato e sem pg_cron.
create or replace function public.se_prune() returns trigger
language plpgsql as $$
begin
  if (random() < 0.005) then
    delete from public.search_events where created_at < now() - interval '180 days';
  end if;
  return null;
end $$;

drop trigger if exists se_prune_trg on public.search_events;
create trigger se_prune_trg after insert on public.search_events
  for each row execute function public.se_prune();
