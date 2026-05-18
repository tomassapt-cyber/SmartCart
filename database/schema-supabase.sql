-- ============================================================
-- SmartCartCosmetics — Supabase schema
-- ============================================================
-- Corre este SQL no SQL Editor do Supabase (https://supabase.com/dashboard
-- → projecto → SQL Editor → New query → cola tudo → Run).
--
-- Cria:
--   public.profiles            — perfil do user (1:1 com auth.users)
--   public.routine_products    — produtos na rotina (N:1)
--   public.routine_actions     — log de eventos (added/removed/repurchased)
--   RLS policies               — cada user só vê os seus dados
--   trigger on_auth_user_created — chama webhook Telegram com http extension
-- ============================================================

-- 1) Extension necessária para chamar APIs externas a partir de triggers
create extension if not exists "pg_net" with schema extensions;

-- ============================================================
-- 2) profiles — perfil de skincare por user
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Eu',
  skin_type text check (skin_type in ('oily','dry','combination','normal','sensitive')),
  skin_concerns text[] default '{}',
  age_range text check (age_range in ('<20','20-29','30-39','40-49','50+')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3) routine_products — produtos que o user usa
-- ============================================================
create table if not exists public.routine_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ean text not null,
  product_name text,            -- snapshot p/ não depender do catálogo
  product_brand text,
  started_at date not null default current_date,
  volume_ml numeric(8,2) not null,
  doses_per_use numeric(6,2) not null,
  uses_per_week numeric(4,1) not null,
  repurchased_at timestamptz,
  replaced_by_ean text,
  added_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, ean)         -- 1 SKU por user (re-comprar faz reset, não duplica)
);

create index if not exists routine_products_user_idx on public.routine_products(user_id);

-- ============================================================
-- 4) routine_actions — audit log p/ analytics futuros
-- ============================================================
create table if not exists public.routine_actions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,         -- 'profile_created','added','edited','removed','repurchased','repurchase_clicked'
  ean text,
  metadata jsonb default '{}',
  ts timestamptz default now()
);

create index if not exists routine_actions_user_ts_idx on public.routine_actions(user_id, ts desc);

-- ============================================================
-- 5) Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.routine_products enable row level security;
alter table public.routine_actions enable row level security;

-- profiles: user só lê/escreve o seu
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- routine_products: user só vê/edita os seus
drop policy if exists "routine_select_own" on public.routine_products;
create policy "routine_select_own" on public.routine_products
  for select using (auth.uid() = user_id);

drop policy if exists "routine_insert_own" on public.routine_products;
create policy "routine_insert_own" on public.routine_products
  for insert with check (auth.uid() = user_id);

drop policy if exists "routine_update_own" on public.routine_products;
create policy "routine_update_own" on public.routine_products
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine_delete_own" on public.routine_products;
create policy "routine_delete_own" on public.routine_products
  for delete using (auth.uid() = user_id);

-- routine_actions: user só vê/insere os seus
drop policy if exists "actions_select_own" on public.routine_actions;
create policy "actions_select_own" on public.routine_actions
  for select using (auth.uid() = user_id);

drop policy if exists "actions_insert_own" on public.routine_actions;
create policy "actions_insert_own" on public.routine_actions
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 6) Trigger updated_at automatico
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists routine_products_touch on public.routine_products;
create trigger routine_products_touch before update on public.routine_products
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 7) Notificação Telegram quando alguém se regista
-- ============================================================
-- IMPORTANTE: substitui {{TELEGRAM_BOT_TOKEN}} e {{TELEGRAM_CHAT_ID}}
-- pelos teus valores reais antes de correr esta secção.
--
-- Para encontrar o tutorial completo, ver SETUP.md.
-- ============================================================
create or replace function public.notify_telegram_on_signup()
returns trigger
language plpgsql
security definer
as $$
declare
  bot_token text := '{{TELEGRAM_BOT_TOKEN}}';
  chat_id   text := '{{TELEGRAM_CHAT_ID}}';
  msg       text;
  url       text;
begin
  msg := format(
    E'🌸 *Novo registo no SmartCart!*\n\n' ||
    E'📧 Email: `%s`\n' ||
    E'🆔 ID: `%s`\n' ||
    E'⏰ Quando: %s\n\n' ||
    E'_(Confirmação de email %s)_',
    new.email,
    new.id,
    to_char(new.created_at at time zone 'Europe/Lisbon', 'DD/MM HH24:MI'),
    case when new.email_confirmed_at is null then 'pendente' else 'confirmada' end
  );
  url := format('https://api.telegram.org/bot%s/sendMessage', bot_token);

  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'chat_id', chat_id,
      'text', msg,
      'parse_mode', 'Markdown'
    ),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );

  return new;
exception when others then
  -- não bloqueia o signup se o Telegram falhar
  raise warning 'Telegram notify failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notify_telegram_on_signup();

-- ============================================================
-- 8) Helper view: routine_with_status (calcula daysLeft no servidor)
-- ============================================================
create or replace view public.routine_with_status as
select
  rp.*,
  (started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date as est_ends_at,
  ((started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date - current_date) as days_left
from public.routine_products rp;

-- pronto. Verifica em Table Editor que vês profiles + routine_products + routine_actions.
