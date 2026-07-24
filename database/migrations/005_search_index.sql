-- ============================================================
-- Migration 005: Índice de pesquisa (Fase 2)
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
-- Acelera o ILIKE da pesquisa do catálogo-BD (app.html) de ~1s para ~ms:
-- índices trigram GIN em products.name e products.brand.
create extension if not exists pg_trgm;
create index if not exists products_name_trgm  on public.products using gin (name  gin_trgm_ops);
create index if not exists products_brand_trgm on public.products using gin (brand gin_trgm_ops);
