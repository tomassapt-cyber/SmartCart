-- Schema canónico SmartCartCosmetics (v1 estendido). Usado por scripts/build-catalog.js, scraper/* e api/products.js.
-- ============================================================
-- SmartCartCosmetics — Schema unificado v1.1
-- ============================================================
-- Baseado em db/schema.sql (tabelas em inglês — usado pelo scraper TS).
-- Estende com colunas necessárias ao pipeline JS (tier, segment, volume)
-- e adiciona view `store_catalog` que dita o universo a scrapar por loja.
--
-- Tabelas:
--   products, stores, prices (snapshot append-only), shipping_rules,
--   price_alerts, scraping_logs
-- Views:
--   latest_prices (mantido)
--   store_catalog (NOVO — pares product×store elegíveis por tier)
--
-- Idempotente: tudo IF NOT EXISTS / OR REPLACE / DO BLOCK guards.
-- Para BDs já com schema v1 instalado, ver scripts/migrate-to-unified.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------
-- 1. PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  ean          VARCHAR(20)   UNIQUE NOT NULL,
  name         VARCHAR(255)  NOT NULL,
  brand        VARCHAR(100)  NOT NULL,
  brand_slug   VARCHAR(80),
  category     VARCHAR(40)   NOT NULL,                     -- perfume | skincare | makeup | body | hair
  segment      VARCHAR(30),                                 -- luxe | prestige | masstige | mass | derma | kbeauty
  volume_ml    INTEGER,
  volume_unit  VARCHAR(10),                                 -- ml | g | un
  base_price   DECIMAL(10,2),
  image_url    TEXT,
  ean_source   VARCHAR(20)   NOT NULL DEFAULT 'pending',   -- 'real' (GS1 confirmado) | 'pending' (sintético, prefixo 200)
  active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_brand     ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_category  ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_segment   ON products (segment);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- ------------------------------------------------------------
-- 2. STORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id                      SERIAL PRIMARY KEY,
  slug                    VARCHAR(50)   UNIQUE NOT NULL,
  name                    VARCHAR(100)  NOT NULL,
  base_url                VARCHAR(255)  NOT NULL,
  logo_url                TEXT,
  tier                    SMALLINT      NOT NULL DEFAULT 3,    -- 1=especialistas premium ... 7=long-tail
  tipo                    VARCHAR(30)   NOT NULL DEFAULT 'especializada',  -- especializada | farmacia | generalista | nicho | marca-propria
  shipping_zones          JSONB         NOT NULL DEFAULT '{}',
  free_shipping_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  active                  BOOLEAN       NOT NULL DEFAULT TRUE,
  last_scraped_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_tier  ON stores (tier);
CREATE INDEX IF NOT EXISTS idx_stores_tipo  ON stores (tipo);

-- ------------------------------------------------------------
-- 3. PRICES (append-only snapshot por scraping)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prices (
  id              BIGSERIAL PRIMARY KEY,
  product_id      INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id        INTEGER       NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  price           DECIMAL(10,2) NOT NULL,
  previous_price  DECIMAL(10,2),
  discount_pct    NUMERIC(5,2),
  currency        CHAR(3)       NOT NULL DEFAULT 'EUR',
  in_stock        BOOLEAN       NOT NULL DEFAULT TRUE,
  url             TEXT,
  -- verified = true → preço veio de um scrape real da loja com URL canónica validada
  -- verified = false → preço foi gerado deterministicamente (estimativa de referência)
  verified        BOOLEAN       NOT NULL DEFAULT FALSE,
  source          VARCHAR(20)   NOT NULL DEFAULT 'estimated',  -- 'estimated' | 'scraped' | 'manual'
  scraped_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prices_product_store ON prices (product_id, store_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_scraped_at    ON prices (scraped_at DESC);

-- ------------------------------------------------------------
-- 4. SHIPPING_RULES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_rules (
  id        SERIAL PRIMARY KEY,
  store_id  INTEGER       NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  district  VARCHAR(100)  NOT NULL,
  price     DECIMAL(10,2) NOT NULL,
  min_days  SMALLINT      NOT NULL DEFAULT 1,
  max_days  SMALLINT      NOT NULL DEFAULT 3,
  UNIQUE (store_id, district)
);

CREATE INDEX IF NOT EXISTS idx_shipping_store_district ON shipping_rules (store_id, district);

-- ------------------------------------------------------------
-- 5. PRICE_ALERTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alerts (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER       NOT NULL REFERENCES products(id),
  store_id       INTEGER       NOT NULL REFERENCES stores(id),
  old_price      DECIMAL(10,2) NOT NULL,
  new_price      DECIMAL(10,2) NOT NULL,
  variation_pct  DECIMAL(6,2)  NOT NULL,
  alerted_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_product ON price_alerts (product_id, alerted_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_store   ON price_alerts (store_id,   alerted_at DESC);

-- ------------------------------------------------------------
-- 6. SCRAPING_LOGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scraping_logs (
  id            SERIAL PRIMARY KEY,
  store_id      INTEGER     NOT NULL REFERENCES stores(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'running',
  products_ok   SMALLINT    NOT NULL DEFAULT 0,
  products_fail SMALLINT    NOT NULL DEFAULT 0,
  error_msg     TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_store_started ON scraping_logs (store_id, started_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- latest_prices: preço mais recente por (produto, loja)
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

-- store_catalog: dita o universo de (product, store) que o scraper deve cobrir.
-- Combina as regras de elegibilidade por tier/segment/categoria:
--   T1 (especialistas) → tudo
--   T2 (generalistas) → mass, masstige, derma
--   T3 (farmácias)    → derma, mass, masstige
--   T4 (mono-marca)   → só produtos da própria marca (slug da loja == slug da marca)
--   T5/6/7 (nicho)    → especialidade implícita
-- O scraper lê desta view para saber o que ir buscar a cada loja.
-- O URL inicial vem de latest_prices se já houver histórico, senão NULL
-- (a primeira corrida tem de usar o resolver/discovery).
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
    -- Tier 1: especialistas premium — tudo
    s.tier = 1
    -- Tier 2: generalistas — mass + masstige + derma
    OR (s.tier = 2 AND p.segment IN ('mass', 'masstige', 'derma'))
    -- Tier 3: farmácias — derma + mass + masstige
    OR (s.tier = 3 AND p.segment IN ('derma', 'mass', 'masstige'))
    -- Tier 4: mono-marca — só a própria marca (heurística por slug)
    OR (s.tier = 4 AND p.brand_slug IS NOT NULL
        AND (s.slug ILIKE '%' || p.brand_slug || '%'
          OR p.brand_slug ILIKE '%' || s.slug || '%'))
    -- Tier 5: nicho perfumaria — só perfumes (se slug indicar)
    OR (s.tier = 5 AND p.category = 'perfume' AND s.slug ILIKE '%perfume%')
    -- Tier 5 outras (k-beauty etc.) — tudo
    OR (s.tier = 5 AND s.slug NOT ILIKE '%perfume%')
    -- Tier 6/7 — internacional/long-tail, sem restrição forte
    OR s.tier >= 6
  );

-- ============================================================
-- FIM
-- ============================================================
