-- Migração de schema v1 (db/schema.sql) → schema unificado (database/schema-unified.sql). Aplicar uma vez via psql.
-- ============================================================
-- SmartCartCosmetics — Migração para schema unificado
-- ============================================================
-- Para BDs que já têm o schema v1 (db/schema.sql) aplicado.
-- Adiciona colunas em falta, cria a view store_catalog, recria
-- latest_prices com colunas extra. Não destrói dados existentes.
--
-- Uso: psql $DATABASE_URL < scripts/migrate-to-unified.sql
-- ============================================================

BEGIN;

-- ─── 1. products: adicionar segment, volume_ml, volume_unit, brand_slug, base_price, ean_source, updated_at ───
ALTER TABLE products ADD COLUMN IF NOT EXISTS segment      VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_ml    INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_unit  VARCHAR(10);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_slug   VARCHAR(80);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price   DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean_source   VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS active       BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_products_segment ON products (segment);

-- ─── 2. stores: adicionar tier, tipo, last_scraped_at ───
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tier            SMALLINT    NOT NULL DEFAULT 3;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tipo            VARCHAR(30) NOT NULL DEFAULT 'especializada';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_stores_tier ON stores (tier);
CREATE INDEX IF NOT EXISTS idx_stores_tipo ON stores (tipo);

-- ─── 3. prices: adicionar previous_price, discount_pct, currency, verified, source ───
ALTER TABLE prices ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);
ALTER TABLE prices ADD COLUMN IF NOT EXISTS discount_pct   NUMERIC(5,2);
ALTER TABLE prices ADD COLUMN IF NOT EXISTS currency       CHAR(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE prices ADD COLUMN IF NOT EXISTS verified       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS source         VARCHAR(20) NOT NULL DEFAULT 'estimated';
-- (id permanece SERIAL — nova tabela em schema-unified usa BIGSERIAL, mas migração não recria tabela existente)

-- ─── 4. recriar latest_prices com colunas novas ───
DROP VIEW IF EXISTS latest_prices CASCADE;
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (p.product_id, p.store_id)
  p.id,
  p.product_id,
  p.store_id,
  p.price,
  p.previous_price,
  p.discount_pct,
  p.currency,
  p.in_stock,
  p.url,
  p.verified,
  p.source,
  p.scraped_at
FROM prices p
ORDER BY p.product_id, p.store_id, p.scraped_at DESC;

-- ─── 5. store_catalog: nova view, dita o universo a scrapar ───
CREATE OR REPLACE VIEW store_catalog AS
SELECT
  p.id            AS product_id,
  p.ean           AS product_ean,
  p.name          AS product_name,
  p.brand         AS product_brand,
  p.brand_slug    AS product_brand_slug,
  p.category      AS product_category,
  p.segment       AS product_segment,
  s.id            AS store_id,
  s.slug          AS store_slug,
  s.name          AS store_name,
  s.tier          AS store_tier,
  s.tipo          AS store_tipo,
  lp.url          AS last_url,
  lp.scraped_at   AS last_scraped_at
FROM products p
CROSS JOIN stores s
LEFT JOIN latest_prices lp ON lp.product_id = p.id AND lp.store_id = s.id
WHERE p.active = TRUE
  AND s.active = TRUE
  AND (
    s.tier = 1
    OR (s.tier = 2 AND p.segment IN ('mass', 'masstige', 'derma'))
    OR (s.tier = 3 AND p.segment IN ('derma', 'mass', 'masstige'))
    OR (s.tier = 4 AND p.brand_slug IS NOT NULL
        AND (s.slug ILIKE '%' || p.brand_slug || '%'
          OR p.brand_slug ILIKE '%' || s.slug || '%'))
    OR (s.tier = 5 AND p.category = 'perfume' AND s.slug ILIKE '%perfume%')
    OR (s.tier = 5 AND s.slug NOT ILIKE '%perfume%')
    OR s.tier >= 6
  );

COMMIT;

-- Para confirmar: SELECT COUNT(*) FROM store_catalog;
