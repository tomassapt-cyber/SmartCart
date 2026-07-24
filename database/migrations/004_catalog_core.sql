-- ============================================================
-- Migration 004: Catálogo core na BD (Fase 1 do backend)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- FASE 1 (2026-07-23): a BD nasce AO LADO do site estático — o pipeline
-- passa a escrever aqui (scripts/push-catalog-to-db.js via CI db-sync.yml)
-- além do HTML. O site ainda não lê daqui; quando a BD provar (Fase 2),
-- o catálogo passa a vir por API paginada e os HTML de 73MB reformam-se.
--
-- Desenho:
--   • products: 1 linha por EAN (inclui chaves sintéticas de loja única,
--     ex. "easyfarma-daktarin-…" — PK textual).
--   • offers: headline por (loja, ean) — variantes ficam para a Fase 2.
--   • synced_at: carimbo da última sincronização; ofertas que saem do seed
--     são apagadas no fim de cada sync (delete where synced_at < run).
--   • RLS: leitura pública (anon) — é um catálogo público; escrita SÓ via
--     service key (o CI). Nunca expor a service key no cliente.
-- ============================================================

create table if not exists public.stores (
  slug                    text primary key,
  name                    text not null,
  base_url                text,
  free_shipping_threshold numeric,
  shipping_mainland       numeric,
  shipping_madeira        numeric,
  shipping_acores         numeric,
  pickup_cost             numeric,
  pickup_note             text,
  updated_at              timestamptz not null default now()
);

create table if not exists public.products (
  ean         text primary key,
  name        text not null,
  brand       text,
  category    text,
  image_url   text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.offers (
  store_slug     text not null references public.stores(slug) on delete cascade,
  ean            text not null references public.products(ean) on delete cascade,
  price          numeric not null,
  previous_price numeric,
  discount_pct   integer,
  in_stock       boolean not null default true,
  url            text,
  verified_at    timestamptz,
  synced_at      timestamptz not null default now(),
  primary key (store_slug, ean)
);

create index if not exists offers_ean_idx        on public.offers (ean);
create index if not exists offers_synced_idx     on public.offers (synced_at);
create index if not exists offers_price_idx      on public.offers (ean, price);
create index if not exists products_brand_idx    on public.products (brand);

-- RLS: catálogo é público em leitura; escrita só com service key (bypassa RLS)
alter table public.stores   enable row level security;
alter table public.products enable row level security;
alter table public.offers   enable row level security;

drop policy if exists "public read stores"   on public.stores;
drop policy if exists "public read products" on public.products;
drop policy if exists "public read offers"   on public.offers;
create policy "public read stores"   on public.stores   for select to anon, authenticated using (true);
create policy "public read products" on public.products for select to anon, authenticated using (true);
create policy "public read offers"   on public.offers   for select to anon, authenticated using (true);
-- (deliberadamente SEM policies de insert/update/delete — só a service key escreve)
