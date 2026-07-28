-- 010 — colunas em falta para a BD espelhar o que o site mostra
-- ============================================================================
-- Levantamento da migração do site para a BD (2026-07-28): estas são as
-- colunas que o site usa e que a BD não tinha. Sem elas, o catálogo servido
-- pela BD não consegue reproduzir o que o site principal mostra hoje.
--
--   offers.promo_note   — a etiqueta "🎁 +15ml grátis · Loja X" do cartão.
--                         354 ofertas (druni, easyfarma…). Não existe no seed:
--                         é criada pelo overlay promo-fold em memória.
--   offers.promo_pack   — pack multi-unidade (153 ofertas). CORREÇÃO, não
--                         cosmética: o preço de um pack de 2 distorce o
--                         "desde X€" por unidade, por isso é excluído do
--                         cálculo do melhor preço.
--   offer_variants.previous_price — o preço riscado e o "−X%" DENTRO da folha
--                         de comparação, ao volume escolhido. 22.465 variantes
--                         (19,7%) têm-no.
--   products.max_price  — o pior preço, par do min_price. É o que permite
--                         calcular a poupança ("−38%") e a ordenação por
--                         poupança sem ter de puxar todas as ofertas.
--
-- Todas ADITIVAS e idempotentes: nada é reescrito, e o sync degrada
-- graciosamente enquanto não estiverem aplicadas (probe no arranque).
-- ============================================================================

alter table public.offers         add column if not exists promo_note text;
alter table public.offers         add column if not exists promo_pack boolean not null default false;
alter table public.offer_variants add column if not exists previous_price numeric;
alter table public.products       add column if not exists max_price numeric;

-- ── verificação ──
-- select count(*) filter (where promo_note is not null) as com_nota,
--        count(*) filter (where promo_pack)             as packs
--   from public.offers;
-- select count(*) filter (where previous_price is not null) from public.offer_variants;
-- select count(*) filter (where max_price is not null) from public.products;
