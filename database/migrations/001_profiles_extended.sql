-- ============================================================
-- GirlMath — Migration 001: Extend profiles + profile_events
-- ============================================================
-- Aplica no Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotente: pode-se correr várias vezes sem dar erro.
--
-- Adiciona:
--   * Campos novos na public.profiles (identity, skincare, preferences,
--     notifications, points, quiz meta)
--   * Tabela public.profile_events para audit trail
--   * Trigger on_auth_user_created (cria row em profiles ao sign-up)
--
-- NOTA: a tabela `profiles` já existe da schema-supabase.sql original com
-- os campos {name, skin_type, skin_concerns, age_range}. Esta migration é
-- *aditiva* — não toca nos campos existentes.
-- ============================================================

-- 1) Identity
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists district text;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='profiles' and constraint_name='profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('feminino','masculino','outro','nao_dizer'));
  end if;
end $$;

-- 2) Skincare profile (estende skin_type/skin_concerns que já existem)
alter table public.profiles
  add column if not exists skin_allergies text[] default '{}',
  add column if not exists routine_steps int,
  add column if not exists skincare_goal text,
  add column if not exists hair_type text;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='profiles' and constraint_name='profiles_routine_steps_check'
  ) then
    alter table public.profiles
      add constraint profiles_routine_steps_check
      check (routine_steps is null or (routine_steps between 0 and 10));
  end if;
end $$;

-- 3) Lifestyle / preferences
alter table public.profiles
  add column if not exists budget_monthly_eur int,
  add column if not exists preferences text[] default '{}';

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='profiles' and constraint_name='profiles_budget_check'
  ) then
    alter table public.profiles
      add constraint profiles_budget_check
      check (budget_monthly_eur is null or (budget_monthly_eur between 0 and 1000));
  end if;
end $$;

-- 4) Notifications (subscritas — Telegram parqueado, só toggle por agora)
alter table public.profiles
  add column if not exists notify_brands text[] default '{}',
  add column if not exists notify_discount_threshold_pct int default 20,
  add column if not exists notify_telegram boolean default false;

-- 5) Points / Quiz meta
alter table public.profiles
  add column if not exists points int default 0,
  add column if not exists points_lifetime int default 0,
  add column if not exists last_quiz_at timestamptz,
  add column if not exists quiz_skipped_count int default 0;

-- 6) Trigger: cria row em profiles quando user é criado em auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Eu'),
    coalesce(split_part(new.email, '@', 1), 'Eu')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7) Audit trail — events do user (quiz_step_done, points_earned, avatar_changed, ...)
create table if not exists public.profile_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists profile_events_user_created_idx
  on public.profile_events (user_id, created_at desc);

alter table public.profile_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_events' and policyname='Users read own events'
  ) then
    create policy "Users read own events" on public.profile_events
      for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_events' and policyname='Users insert own events'
  ) then
    create policy "Users insert own events" on public.profile_events
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- Fim da migration 001
-- ============================================================
