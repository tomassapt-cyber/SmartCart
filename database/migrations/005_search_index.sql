-- ============================================================
-- Migration 005: Pesquisa rápida + popularidade (Fase 2)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- 1) Índices trigram: o ILIKE da pesquisa (app.html) cai de ~1s para ~ms.
-- 2) Colunas de popularidade em products (n_stores, min_price,
--    min_price_store): preenchidas pelo sync (push-catalog-to-db.js) a cada
--    corrida — permitem ordenar o catálogo por "mais comparados" e mostrar
--    o "desde X€" sem embeber as ofertas (queries mais leves).
create extension if not exists pg_trgm;
create index if not exists products_name_trgm  on public.products using gin (name  gin_trgm_ops);
create index if not exists products_brand_trgm on public.products using gin (brand gin_trgm_ops);

alter table public.products add column if not exists n_stores        integer;
alter table public.products add column if not exists min_price       numeric;
alter table public.products add column if not exists min_price_store text;

create index if not exists products_nstores_idx on public.products (n_stores desc nulls last);
create index if not exists products_minprice_idx on public.products (min_price);
