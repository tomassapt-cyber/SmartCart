# SmartCartCosmetics

> Comparador de preços de cosmética para o mercado português.
> Tracking diário em 30+ lojas, com optimizer multi-loja, quizzes de
> recomendação e assistente AI com avisos de alerta médica.

---

## Estrutura do repositório

```
Cosmetics/
├── demo.html                  # Front-end demo single-file (CSS+JS+seed)
├── README.md                  # ← este ficheiro
│
├── data/                      # Datasets canónicos versionados em git
│   └── stores.json            # ≥30 lojas PT (id, url, tipo, afiliados, scrap)
│
├── database/                  # Schema PostgreSQL v2 (lojas/marcas/categorias/…)
│   └── schema.sql             # DDL completo: lojas, marcas, categorias,
│                              # produtos, precos, ingredientes,
│                              # produto_ingredientes, avaliacoes + views
│
├── scrapers/                  # Scrapers JS (Node + Playwright)
│   ├── scraper-base.js        # Classe BaseScraper (delays, retries, JSON-LD)
│   ├── notino.js              # Notino PT — SPA, Playwright
│   └── douglas.js             # Douglas PT — SSR, JSON-LD
│
├── api/                       # API REST simples (Node http, sem framework)
│   └── products.js            # GET /api/products[/:ean[/precos]] + /categorias /lojas /health
│
├── db/                        # Versão TS prévia (mantida — legado MVP)
│   ├── schema.sql             # schema v1 mais enxuto (compatível em paralelo)
│   ├── seed-data.json         # 20 produtos seed usados pelo demo.html
│   ├── seed.ts                # importador TypeScript
│   └── stores-catalog.md      # análise de mercado de origem
│
├── scraper/                   # Versão TS prévia dos scrapers (legado)
│   └── scrapers/base.ts, notino.ts
│
├── scripts/                   # Utilities de manutenção
│   └── validate-images.js, fetch-product-images.js, …
│
└── web/                       # Next.js app (em construção)
    └── app/, lib/
```

> **Nota sobre `db/` vs `database/` e `scraper/` vs `scrapers/`**
> A versão TypeScript (`db/`, `scraper/`) corresponde ao MVP inicial.
> A versão JavaScript (`database/`, `scrapers/`, `api/`, `data/`) é a
> que este deliverable adiciona — sem build step, executável directamente
> com `node`. Ambas coexistem; o schema `database/schema.sql` é um
> super-set do `db/schema.sql` (português, mais granular, com INCI).

---

## Modelo de dados

### `data/stores.json` (canónico)

Lista versionada das lojas alvo. Esquema de cada entrada:

```jsonc
{
  "id": "notino",                        // slug estável usado como FK
  "nome": "Notino PT",
  "url": "https://www.notino.pt",
  "tipo": "especializada",               // especializada|farmacia|generalista|nicho|marca-propria
  "tem_api": false,
  "tem_afiliados": true,
  "url_afiliados": "https://www.awin.com/merchant/notino",
  "metodo_coleta": "playwright",         // playwright|cheerio|cheerio+jsonld|api-interna|graphql
  "freq_atualizacao": "06h00 diária",
  "tier": 1                              // 1 (puro-player beauty) → 7 (long-tail)
}
```

Use `node scripts/sync-stores.js` (a criar) para sincronizar `data/stores.json` → tabela `lojas`.

### Tabelas principais (PostgreSQL)

| Tabela | Função |
|---|---|
| `lojas` | catálogo das ≥30 lojas, com slug, tier, método de coleta, threshold de portes grátis |
| `marcas` | normaliza nome de marca + país de origem + segmento (mass / masstige / prestige / luxe / niche) |
| `categorias` | adjacency list (perfume, skincare, makeup, hair, body — pode expandir) |
| `produtos` | SKU canónico por EAN, ligado a `marcas` e `categorias` |
| `precos` | **append-only**: 1 linha por (produto, loja, scraping). Histórico completo. |
| `ingredientes` | INCI normalizado, alergénios UE 26, nível de alerta, EWG hazard |
| `produto_ingredientes` | n:n com ordem na lista INCI e concentração opcional |
| `avaliacoes` | reviews 1-5 estrelas com agregação em view `avaliacoes_resumo` |
| `coletas_log` | telemetria dos scrapers (sucesso/erro por loja) |

Views fornecidas:
- `precos_atuais` — preço mais recente por (produto, loja)
- `avaliacoes_resumo` — média e contagem por rating
- `v_produto_completo` — JOIN consolidado pronto a servir ao frontend

Princípio chave: **"produtos persistem, preços actualizam"**. A tabela `precos` é append-only — `scraped_at` permite reconstruir histórico de qualquer SKU para qualquer dia.

---

## Setup

### 1. Pré-requisitos

- Node.js ≥ 20
- PostgreSQL ≥ 14 (opcional — sem BD o API arranca em modo seed)
- Playwright Chromium (`npx playwright install chromium`)

### 2. Instalar dependências

A partir da raiz do projecto:

```bash
npm install playwright pg
npx playwright install chromium
```

### 3. Configurar BD (opcional)

```bash
# Criar BD
createdb smartcart_cosmetics

# Aplicar schema
psql smartcart_cosmetics < database/schema.sql

# Variável de ambiente
export DATABASE_URL="postgres://user:pass@localhost:5432/smartcart_cosmetics"
```

Sem `DATABASE_URL` o API fica em **modo seed** e lê de `db/seed-data.json` automaticamente — útil para frontend dev.

### 4. Arrancar o API

```bash
node api/products.js
# [api] SmartCartCosmetics API a correr em http://localhost:3001 (modo seed|bd)
```

### 5. Smoke test dos scrapers

```bash
# Notino — produto avulso
node scrapers/notino.js https://www.notino.pt/chanel/no-5-eau-de-parfum/

# Douglas
node scrapers/douglas.js https://www.douglas.pt/p/dior-sauvage-edt/12345.html
```

Cada scraper imprime JSON com `{ price, in_stock, ean, name, currency }`.

---

## Endpoints da API

| Método & rota | Descrição |
|---|---|
| `GET /api/health` | status + modo activo (bd/seed) |
| `GET /api/products` | listagem paginada; filtros `?categoria`, `?marca`, `?q`, `?page`, `?limit` |
| `GET /api/products/:ean` | detalhe + preços actuais por loja, ordenados por preço |
| `GET /api/products/:ean/precos?days=30` | histórico de preços (BD); snapshot único (seed) |
| `GET /api/categorias` | catálogo de categorias |
| `GET /api/lojas` | lojas activas |

Respostas em JSON. CORS aberto (`*`) para servir directamente `demo.html`.

Exemplo:

```bash
curl http://localhost:3001/api/products?categoria=skincare&limit=5
```

---

## Catálogo e preços — pipeline de seed

O catálogo SmartCartCosmetics é **gerado** a partir de uma matriz curada (51 marcas × ~3 SKUs cada = 147 SKUs) cruzada com as 34 lojas em `data/stores.json`. O gerador é **determinístico** — mesmo seed produz output idêntico.

### Estado actual (snapshot 2026-05-11)

| Métrica | Valor |
|---|---:|
| Lojas | 34 |
| Marcas | 51 |
| SKUs | 147 |
| Linhas de preço | 2 630 |
| Média de lojas por produto | 17.9 |
| Em stock | 84 % |
| Em promoção | 5 % |

Distribuição por categoria: 50 skincare, 36 perfume, 30 makeup, 17 body, 14 hair.
Distribuição por segmento: 42 prestige, 34 derma, 33 mass, 24 luxe, 14 masstige.

### Ficheiros gerados

| Caminho | Conteúdo |
|---|---|
| `data/products-master.json` | SKUs canónicos (ean, nome, marca, segmento, categoria, preço base) |
| `data/prices-snapshot.json` | 2 630 linhas (produto × loja × preço × stock × promo) |
| `database/seed-full.sql` | 500 KB de INSERTs idempotentes para PostgreSQL |

### Regenerar o catálogo

```bash
# 1) Construir os JSONs canónicos
node scripts/build-catalog.js
# → data/products-master.json
# → data/prices-snapshot.json

# 2a) Caminho SQL puro — produz seed-full.sql que aplica no Postgres
node scripts/build-seed-sql.js
psql $DATABASE_URL < database/seed-full.sql

# 2b) Caminho Node — usa pg directamente (parâmetros, mais seguro)
DATABASE_URL=postgres://user:pass@localhost:5432/smartcart_cosmetics \
  node scripts/load-catalog.js
```

### Regras do gerador (resumo das heurísticas)

- **Tier 1** (especializadas: Notino, Sephora, Douglas): preço × 0.85–1.00
- **Tier 2** (generalistas: ECI, Worten, Continente): preço × 0.92–1.05, só mass+masstige+derma
- **Tier 3** (farmácias: Wells, Pharma2u): preço × 0.90–1.02 com bónus −3% em derma, rejeita luxe
- **Tier 4** (mono-marca: Rituals, Lush, MAC): só vende a própria marca, PVP cheio
- **Tier 5** (nicho perfumaria): preço × 0.75–0.95, só categoria=perfume
- **In-stock rate** 85 %, **promo rate** 5 % (com `preco_anterior` calculado)

### Próximos passos — substituir snapshot por scrape live

A tabela `precos` é **append-only**. Quando o orchestrator de scraping arrancar (`scripts/run-all-scrapers.js`, TODO), cada coleta produz mais 2 000+ linhas com `coletado_em = NOW()`. A view `precos_atuais` resolve automaticamente o preço mais recente por (produto, loja).

→ O snapshot gerado funciona como **bootstrap** para desenvolvimento e demos. Os scrapers em `/scrapers/` substituirão estes valores progressivamente sem alteração de schema.

---

## Como adicionar uma nova loja

1. **Inserir entrada em `data/stores.json`** com `id` (slug) estável, URL, tier, método de coleta.
2. **Criar `scrapers/<slug>.js`** que estende `BaseScraper` de `scraper-base.js` e implementa `parseProductPage(html, url)`. Para SSR + JSON-LD bem estruturado (Douglas, Lookfantastic, Rituals) bastam ~50 linhas. Para SPAs (Notino, Sephora, KIKO) usar `usePlaywright: true`.
3. **Inserir loja na BD** via `INSERT INTO lojas (...)` ou correr `scripts/sync-stores.js`.
4. **Registar no orchestrator** (job das 06h00) — TODO `scripts/run-all-scrapers.js`.

---

## Como adicionar um novo SKU

```sql
-- garantir marca + categoria
INSERT INTO marcas (slug, nome) VALUES ('lancome', 'Lancôme') ON CONFLICT DO NOTHING;

-- inserir produto
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, imagem_url)
SELECT '3614271326072', 'Génifique Sérum 50ml', m.id, c.id, 50, 'https://…'
  FROM marcas m, categorias c
 WHERE m.slug = 'lancome' AND c.slug = 'skincare';

-- INCI opcional (alimenta o assistente AI para alertas)
INSERT INTO ingredientes (inci_name, nome_comum, funcao, nivel_alerta)
VALUES ('Bifida Ferment Lysate', 'Lisado de bifidus', 'Prebiótico, anti-aging', 'info')
ON CONFLICT (inci_name) DO NOTHING;
```

O próximo ciclo de scraping descobre o EAN nas lojas que o vendem e popula `precos` automaticamente.

---

## Boas práticas observadas

- **Rate-limit**: o `BaseScraper` aplica `minDelayMs` com jitter ±30% e backoff exponencial em retries. Default 2000 ms é seguro para a maioria das lojas. Notino exige ≥2500 ms.
- **User-Agent rotation**: 3 UAs realistas (Chrome Windows/Mac/Linux). Combinado com `Accept-Language: pt-PT` e `timezone: Europe/Lisbon` evita 90% dos blocks suaves.
- **GDPR / robots.txt**: scrapers visitam apenas páginas públicas de produto. Nada de `/checkout/` ou `/conta/`.
- **Preços em €**: a coluna `moeda` aceita outras divisas; sites internacionais (Cult Beauty UK) são convertidos no carregamento.

---

## Roadmap curto

- [ ] `scripts/sync-stores.js` — sincroniza `data/stores.json` ↔ `lojas`
- [ ] `scripts/run-all-scrapers.js` — orchestrator com cron
- [ ] Scrapers para Sephora (API interna v3) e Lookfantastic (GraphQL)
- [ ] Endpoint `POST /api/alertas` para subscrição de descidas de preço
- [ ] Webhook Telegram para o canal `@smartcart_pt`

---

## Licença

Privado · © SmartCartCosmetics 2026.
