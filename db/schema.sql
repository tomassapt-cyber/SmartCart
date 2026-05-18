-- ============================================================
-- SmartCart Cosmetics — Schema PostgreSQL
-- ============================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para pesquisa full-text por nome/marca

-- ------------------------------------------------------------
-- 1. PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  brand        VARCHAR(100)  NOT NULL,
  category     VARCHAR(100)  NOT NULL,       -- perfume | skincare | makeup | body | hair
  ean          VARCHAR(20)   UNIQUE NOT NULL, -- código de barras EAN-13
  image_url    TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand    ON products (brand);
CREATE INDEX idx_products_category ON products (category);
-- índice trigram para autocomplete ("lanc" → "Lancôme")
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- ------------------------------------------------------------
-- 2. STORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(100)  NOT NULL,
  slug                    VARCHAR(50)   UNIQUE NOT NULL, -- notino, sephora, …
  base_url                VARCHAR(255)  NOT NULL,
  logo_url                TEXT,
  -- JSONB com mapeamento de zonas opcionais (usado pela lógica de portes)
  shipping_zones          JSONB         NOT NULL DEFAULT '{}',
  free_shipping_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  active                  BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- 3. PRICES  (uma linha por produto × loja × scraping)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prices (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id    INTEGER       NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  price       DECIMAL(10,2) NOT NULL,
  in_stock    BOOLEAN       NOT NULL DEFAULT TRUE,
  url         TEXT,                          -- URL directa do produto na loja
  scraped_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- índices para a query mais frequente: "últimos preços de produto X por loja"
CREATE INDEX idx_prices_product_store  ON prices (product_id, store_id, scraped_at DESC);
CREATE INDEX idx_prices_scraped_at     ON prices (scraped_at DESC);

-- view auxiliar: preço mais recente por (produto, loja)
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (product_id, store_id)
  p.id,
  p.product_id,
  p.store_id,
  p.price,
  p.in_stock,
  p.url,
  p.scraped_at
FROM prices p
ORDER BY p.product_id, p.store_id, p.scraped_at DESC;

-- ------------------------------------------------------------
-- 4. SHIPPING_RULES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_rules (
  id        SERIAL PRIMARY KEY,
  store_id  INTEGER       NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  district  VARCHAR(100)  NOT NULL,   -- "Lisboa", "Porto", "Açores", "Madeira", "nacional"
  price     DECIMAL(10,2) NOT NULL,
  min_days  SMALLINT      NOT NULL DEFAULT 1,
  max_days  SMALLINT      NOT NULL DEFAULT 3,
  UNIQUE (store_id, district)
);

CREATE INDEX idx_shipping_store_district ON shipping_rules (store_id, district);

-- ------------------------------------------------------------
-- 5. PRICE_ALERTS  (variações > 5 % entre dois scrapings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alerts (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER       NOT NULL REFERENCES products(id),
  store_id       INTEGER       NOT NULL REFERENCES stores(id),
  old_price      DECIMAL(10,2) NOT NULL,
  new_price      DECIMAL(10,2) NOT NULL,
  variation_pct  DECIMAL(6,2)  NOT NULL,   -- positivo = subida, negativo = descida
  alerted_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_product  ON price_alerts (product_id, alerted_at DESC);
CREATE INDEX idx_alerts_store    ON price_alerts (store_id,   alerted_at DESC);

-- ------------------------------------------------------------
-- 6. SCRAPING_LOGS  (estado de cada job diário por loja)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scraping_logs (
  id            SERIAL PRIMARY KEY,
  store_id      INTEGER     NOT NULL REFERENCES stores(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'running', -- running | success | partial | failed
  products_ok   SMALLINT    NOT NULL DEFAULT 0,
  products_fail SMALLINT    NOT NULL DEFAULT 0,
  error_msg     TEXT
);

CREATE INDEX idx_logs_store_started ON scraping_logs (store_id, started_at DESC);
