-- ============================================================
-- SmartCartCosmetics — Schema PostgreSQL v2
-- ============================================================
-- Schema completo com lojas, marcas, categorias, produtos,
-- preços, ingredientes e avaliações. Estende o schema base
-- em /db/schema.sql adicionando metadata cosmética detalhada
-- (INCI, alertas alergénicos, reviews agregadas).
--
-- Convenção: nomes de tabelas em português conforme spec do
-- produto (lojas, marcas, categorias, produtos, precos,
-- ingredientes, produto_ingredientes, avaliacoes).
-- ============================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- pesquisa fuzzy (autocomplete de nomes)
CREATE EXTENSION IF NOT EXISTS "citext";        -- emails / slugs case-insensitive

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_loja AS ENUM (
    'especializada',
    'farmacia',
    'generalista',
    'nicho',
    'marca-propria'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE metodo_coleta AS ENUM (
    'api-interna',
    'graphql',
    'playwright',
    'cheerio',
    'cheerio+jsonld',
    'rss',
    'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nivel_alerta AS ENUM ('info', 'aviso', 'critico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. LOJAS
-- ============================================================
CREATE TABLE IF NOT EXISTS lojas (
  id                      SERIAL PRIMARY KEY,
  slug                    CITEXT        UNIQUE NOT NULL,
  nome                    VARCHAR(120)  NOT NULL,
  url                     VARCHAR(255)  NOT NULL,
  tipo                    tipo_loja     NOT NULL,
  tier                    SMALLINT      NOT NULL DEFAULT 3,
  tem_api                 BOOLEAN       NOT NULL DEFAULT FALSE,
  tem_afiliados           BOOLEAN       NOT NULL DEFAULT FALSE,
  url_afiliados           VARCHAR(255),
  metodo_coleta           metodo_coleta NOT NULL DEFAULT 'cheerio',
  freq_atualizacao        VARCHAR(50)   NOT NULL DEFAULT '06h00 diária',
  free_shipping_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_zones          JSONB         NOT NULL DEFAULT '{}',
  logo_url                TEXT,
  ativa                   BOOLEAN       NOT NULL DEFAULT TRUE,
  ultima_coleta           TIMESTAMPTZ,
  criada_em               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lojas_tipo   ON lojas (tipo);
CREATE INDEX IF NOT EXISTS idx_lojas_ativa  ON lojas (ativa);
CREATE INDEX IF NOT EXISTS idx_lojas_tier   ON lojas (tier);

-- ============================================================
-- 2. MARCAS
-- ============================================================
CREATE TABLE IF NOT EXISTS marcas (
  id              SERIAL PRIMARY KEY,
  slug            CITEXT        UNIQUE NOT NULL,
  nome            VARCHAR(120)  NOT NULL,
  pais_origem     VARCHAR(80),
  segmento        VARCHAR(40),                       -- mass | masstige | prestige | luxe | niche
  website         VARCHAR(255),
  descricao       TEXT,
  criada_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marcas_nome_trgm ON marcas USING GIN (nome gin_trgm_ops);

-- ============================================================
-- 3. CATEGORIAS (hierarquia simples adjacency list)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id          SERIAL PRIMARY KEY,
  slug        CITEXT        UNIQUE NOT NULL,
  nome        VARCHAR(80)   NOT NULL,
  parent_id   INTEGER       REFERENCES categorias(id) ON DELETE SET NULL,
  ordem       SMALLINT      NOT NULL DEFAULT 100,
  icon        VARCHAR(40),
  cor_hex     CHAR(7)
);

CREATE INDEX IF NOT EXISTS idx_categorias_parent ON categorias (parent_id);

-- Seed mínimo das 5 categorias top-level
INSERT INTO categorias (slug, nome, ordem, icon, cor_hex) VALUES
  ('perfume',  'Perfumaria',  10, '🌸', '#d4af37'),
  ('skincare', 'Skincare',    20, '🧴', '#a7d4d4'),
  ('makeup',   'Maquilhagem', 30, '💄', '#f0a4b8'),
  ('hair',     'Cabelo',      40, '💇', '#c9a98e'),
  ('body',     'Corpo',       50, '🌿', '#a8c9a8')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id              SERIAL PRIMARY KEY,
  ean             VARCHAR(20)   UNIQUE NOT NULL,
  nome            VARCHAR(255)  NOT NULL,
  marca_id        INTEGER       NOT NULL REFERENCES marcas(id)      ON DELETE RESTRICT,
  categoria_id   INTEGER       NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  volume_ml       INTEGER,                                              -- 50, 100, 200…
  volume_unit     VARCHAR(10)   NOT NULL DEFAULT 'ml',                  -- ml | g | un
  descricao       TEXT,
  imagem_url      TEXT,
  ativa           BOOLEAN       NOT NULL DEFAULT TRUE,
  criada_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_marca       ON produtos (marca_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria   ON produtos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm   ON produtos USING GIN (nome gin_trgm_ops);

-- ============================================================
-- 5. PRECOS (append-only, snapshot por scraping)
-- ============================================================
CREATE TABLE IF NOT EXISTS precos (
  id              BIGSERIAL PRIMARY KEY,
  produto_id      INTEGER       NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  loja_id         INTEGER       NOT NULL REFERENCES lojas(id)    ON DELETE CASCADE,
  preco           DECIMAL(10,2) NOT NULL,
  preco_anterior  DECIMAL(10,2),                                          -- pré-desconto, opcional
  desconto_pct    NUMERIC(5,2),
  moeda           CHAR(3)       NOT NULL DEFAULT 'EUR',
  em_stock        BOOLEAN       NOT NULL DEFAULT TRUE,
  url_produto     TEXT          NOT NULL,
  coletado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precos_produto_loja   ON precos (produto_id, loja_id, coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_precos_coletado_em    ON precos (coletado_em DESC);

-- View: preço mais recente por (produto, loja)
CREATE OR REPLACE VIEW precos_atuais AS
SELECT DISTINCT ON (p.produto_id, p.loja_id)
  p.produto_id,
  p.loja_id,
  p.preco,
  p.preco_anterior,
  p.desconto_pct,
  p.em_stock,
  p.url_produto,
  p.coletado_em
FROM precos p
ORDER BY p.produto_id, p.loja_id, p.coletado_em DESC;

-- ============================================================
-- 6. INGREDIENTES (INCI + alertas)
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredientes (
  id              SERIAL PRIMARY KEY,
  inci_name       CITEXT        UNIQUE NOT NULL,            -- ex.: "Niacinamide", "Retinol"
  nome_comum      VARCHAR(120),                              -- "Vitamina B3"
  funcao          VARCHAR(120),                              -- "Anti-inflamatório, regula sebo"
  alergeno_ue     BOOLEAN       NOT NULL DEFAULT FALSE,      -- consta lista 26 alergénios UE
  nivel_alerta    nivel_alerta  NOT NULL DEFAULT 'info',
  notas_seguranca TEXT,                                       -- ex.: "Evitar gravidez (retinol)"
  ewg_hazard      SMALLINT      CHECK (ewg_hazard BETWEEN 1 AND 10),
  criado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ing_alergeno ON ingredientes (alergeno_ue);
CREATE INDEX IF NOT EXISTS idx_ing_alerta   ON ingredientes (nivel_alerta);

-- ============================================================
-- 7. PRODUTO_INGREDIENTES (n:n com ordem na lista INCI)
-- ============================================================
CREATE TABLE IF NOT EXISTS produto_ingredientes (
  produto_id      INTEGER       NOT NULL REFERENCES produtos(id)     ON DELETE CASCADE,
  ingrediente_id  INTEGER       NOT NULL REFERENCES ingredientes(id) ON DELETE RESTRICT,
  ordem           SMALLINT      NOT NULL,                              -- posição na lista INCI (1 = mais concentrado)
  concentracao_pct NUMERIC(5,2),                                       -- se disponível
  PRIMARY KEY (produto_id, ingrediente_id)
);

CREATE INDEX IF NOT EXISTS idx_pi_ingrediente ON produto_ingredientes (ingrediente_id);

-- ============================================================
-- 8. AVALIACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id              BIGSERIAL PRIMARY KEY,
  produto_id      INTEGER       NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  loja_id         INTEGER       REFERENCES lojas(id) ON DELETE SET NULL,  -- review da loja onde foi comprada (opcional)
  rating          SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  titulo          VARCHAR(180),
  corpo           TEXT,
  verificada      BOOLEAN       NOT NULL DEFAULT FALSE,
  util_count      INTEGER       NOT NULL DEFAULT 0,
  autor_hash      VARCHAR(64),                                            -- SHA-256 do email/IP, sem PII
  criada_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aval_produto ON avaliacoes (produto_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_aval_rating  ON avaliacoes (produto_id, rating);

-- View: agregação por produto
CREATE OR REPLACE VIEW avaliacoes_resumo AS
SELECT
  produto_id,
  COUNT(*)                AS total,
  ROUND(AVG(rating)::numeric, 2) AS media_rating,
  COUNT(*) FILTER (WHERE rating = 5) AS qtd_5,
  COUNT(*) FILTER (WHERE rating = 4) AS qtd_4,
  COUNT(*) FILTER (WHERE rating = 3) AS qtd_3,
  COUNT(*) FILTER (WHERE rating = 2) AS qtd_2,
  COUNT(*) FILTER (WHERE rating = 1) AS qtd_1
FROM avaliacoes
GROUP BY produto_id;

-- ============================================================
-- 9. UTIL — view consolidada para o frontend
-- ============================================================
CREATE OR REPLACE VIEW v_produto_completo AS
SELECT
  p.id,
  p.ean,
  p.nome,
  m.nome  AS marca,
  c.slug  AS categoria,
  p.volume_ml,
  p.volume_unit,
  p.imagem_url,
  p.descricao,
  ar.media_rating,
  ar.total AS total_avaliacoes,
  -- preço mínimo actual entre todas as lojas com stock
  (SELECT MIN(preco) FROM precos_atuais pa
     WHERE pa.produto_id = p.id AND pa.em_stock = TRUE) AS preco_minimo_atual,
  -- # lojas com stock
  (SELECT COUNT(*) FROM precos_atuais pa
     WHERE pa.produto_id = p.id AND pa.em_stock = TRUE) AS qtd_lojas_em_stock
FROM produtos p
JOIN marcas     m ON m.id = p.marca_id
JOIN categorias c ON c.id = p.categoria_id
LEFT JOIN avaliacoes_resumo ar ON ar.produto_id = p.id
WHERE p.ativa = TRUE;

-- ============================================================
-- 10. AUDIT — log de scraping
-- ============================================================
CREATE TABLE IF NOT EXISTS coletas_log (
  id              BIGSERIAL PRIMARY KEY,
  loja_id         INTEGER       NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  iniciada_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  terminada_em    TIMESTAMPTZ,
  produtos_ok     INTEGER       NOT NULL DEFAULT 0,
  produtos_fail   INTEGER       NOT NULL DEFAULT 0,
  erro            TEXT
);

CREATE INDEX IF NOT EXISTS idx_coletas_loja ON coletas_log (loja_id, iniciada_em DESC);

-- ============================================================
-- FIM
-- ============================================================
