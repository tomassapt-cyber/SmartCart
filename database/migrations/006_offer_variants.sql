-- ============================================================
-- Migration 006: Variantes de volume (Fase 2)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- O mesmo produto vende-se em vários volumes (50/100/200ml) com preços
-- próprios por loja. Esta tabela guarda o MELHOR preço por (loja, ean,
-- volume) — deduplicado no sync — e permite à app comparar por volume
-- (o coração do refVolumeFor/offerPriceAtVol do site principal).
create table if not exists public.offer_variants (
  store_slug  text not null,
  ean         text not null references public.products(ean) on delete cascade,
  volume_ml   numeric not null,
  price       numeric not null,
  url         text,
  in_stock    boolean not null default true,
  synced_at   timestamptz not null default now(),
  primary key (store_slug, ean, volume_ml),
  foreign key (store_slug, ean) references public.offers(store_slug, ean) on delete cascade
);

create index if not exists ovar_ean_vol_idx on public.offer_variants (ean, volume_ml, price);
create index if not exists ovar_synced_idx  on public.offer_variants (synced_at);

alter table public.offer_variants enable row level security;
drop policy if exists "public read offer_variants" on public.offer_variants;
create policy "public read offer_variants"
  on public.offer_variants for select to anon, authenticated using (true);
