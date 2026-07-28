-- 009 — pesquisa insensível a acentos
-- ============================================================================
-- PROBLEMA MEDIDO (2026-07-28): o `ilike` do PostgREST NÃO ignora acentos, por
-- isso quem escreve sem acentos — que é como se escreve no telemóvel — perde a
-- maior parte dos resultados:
--     champo    →    44 resultados   (champô:    1.126)
--     mascara   →    99              (máscara:   1.646)
--     oleo      →   373              (óleo:      1.216)
--     serum     → 1.724              (sérum:     2.609)
--     locao     →    23              (loção:       857)
--     protecao  →     0              (proteção:    244)
-- Só nestes termos, ~6.000 resultados ficavam escondidos.
--
-- SOLUÇÃO: uma coluna `search_norm` com nome+marca em minúsculas e SEM acentos,
-- preenchida pelo sync (a normalização é feita em JS, com a mesma função que o
-- cliente usa para normalizar o que o utilizador escreve — assim os dois lados
-- concordam sempre). Índice trigram para o ilike continuar rápido.
--
-- Porquê preencher no sync e não com uma coluna gerada por `unaccent()`: a
-- extensão unaccent pode não estar disponível, e uma coluna GENERATED obriga a
-- reescrever a tabela toda. Assim é aditivo e reversível.
--
-- Idempotente.
-- ============================================================================

alter table public.products add column if not exists search_norm text;

-- pg_trgm já é usado pela 005; garantir que existe
create extension if not exists pg_trgm;

create index if not exists products_search_norm_trgm
  on public.products using gin (search_norm gin_trgm_ops);

-- ── verificação ──
-- select count(*) filter (where search_norm is not null) as preenchidos,
--        count(*) as total
--   from public.products;
-- select name, search_norm from public.products
--  where search_norm like '%champo%' limit 5;
