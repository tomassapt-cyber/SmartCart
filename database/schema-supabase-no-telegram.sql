-- ============================================================
-- SmartCartCosmetics — Supabase schema (sem notificação)
-- ============================================================
-- Cria as tabelas + segurança para auth funcionar.
-- Sem trigger Telegram (pode ser adicionado depois).
--
-- COMO USAR:
--   1. Supabase dashboard → SQL Editor → New query
--   2. Copia este ficheiro TODO → cola → Run (canto inferior direito)
--   3. Verifica em Table Editor que aparecem: profiles, routine_products, routine_actions
-- ============================================================

-- ============================================================
-- 1) profiles — perfil de skincare por user
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
-- 2) routine_products — produtos que o user usa
-- ============================================================
create table if not exists public.routine_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ean text not null,
  product_name text,
  product_brand text,
  started_at date not null default current_date,
  volume_ml numeric(8,2) not null,
  doses_per_use numeric(6,2) not null,
  uses_per_week numeric(4,1) not null,
  repurchased_at timestamptz,
  replaced_by_ean text,
  added_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, ean)
);

create index if not exists routine_products_user_idx on public.routine_products(user_id);

-- ============================================================
-- 3) routine_actions — log de eventos
-- ============================================================
create table if not exists public.routine_actions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  ean text,
  metadata jsonb default '{}',
  ts timestamptz default now()
);

create index if not exists routine_actions_user_ts_idx on public.routine_actions(user_id, ts desc);

-- ============================================================
-- 4) Row Level Security — cada user só vê os seus dados
-- ============================================================
alter table public.profiles enable row level security;
alter table public.routine_products enable row level security;
alter table public.routine_actions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

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

drop policy if exists "actions_select_own" on public.routine_actions;
create policy "actions_select_own" on public.routine_actions
  for select using (auth.uid() = user_id);

drop policy if exists "actions_insert_own" on public.routine_actions;
create policy "actions_insert_own" on public.routine_actions
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 5) updated_at automático
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
-- 6) View útil: rotina com days_left calculado
-- ============================================================
create or replace view public.routine_with_status as
select
  rp.*,
  (started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date as est_ends_at,
  ((started_at + (volume_ml / nullif(doses_per_use,0) / nullif(uses_per_week,0) * 7) * interval '1 day')::date - current_date) as days_left
from public.routine_products rp;

-- ============================================================
-- ✓ Pronto. Vê em Table Editor que tens:
--   - profiles
--   - routine_products
--   - routine_actions
-- ============================================================
