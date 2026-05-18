# Scraping standalone — sem AI tokens

Pipeline para refrescar preços sem usar o meu contexto. Corre na tua máquina (ou GitHub Actions).

## Setup uma vez

```bash
# Na raiz do projecto
npm install playwright          # ~10 MB
npx playwright install chromium # ~120 MB Chromium headless (cache global)
```

## Uso diário

```bash
# 1. Scrape — abre Playwright headless e refresca todos os URLs verificados
node scripts/scrape-prices.js

# Output:
#   data/scraped/2026-05-16/wells.json    (todos os PDPs de Wells)
#   data/scraped/2026-05-16/atida.json
#   data/scraped/2026-05-16/notino.json
#   data/scraped/2026-05-16/_summary.json (estatísticas globais)

# 2. Ingest — escreve os preços frescos nos inventories
node scripts/ingest-scraped.js

# 3. Rebuild demo.html
node scripts/build-catalog.js
```

## Flags úteis

### `scrape-prices.js`

| Flag | O que faz |
|---|---|
| `--store=wells` | Só uma loja |
| `--limit=5` | Só 5 produtos por loja (debug) |
| `--headed` | Browser visível para debug |
| `--concurrency=3` | 3 PDPs em paralelo (default 2) |
| `--delay=2000` | ms entre PDPs (default 1500) |

### `ingest-scraped.js`

| Flag | O que faz |
|---|---|
| `--date=2026-05-16` | Data específica (default hoje) |
| `--dry-run` | Mostra alterações, não escreve |

## Como funciona

1. **Lê** `data/inventory/*-verified.json` — usa os URLs canónicos que já verificámos
2. Para cada URL, abre Playwright (Chromium headless, com user-agent realista, locale pt-PT)
3. Extrai `<script type="application/ld+json">` da PDP — é onde 95% das lojas têm `Product` schema com `offers`
4. Para produtos com várias variantes (50ml/75ml…), escolhe a oferta que bate com o volume esperado
5. Detecta WAF (Cloudflare/DataDome) por inspeção do título/body — marca `blocked_waf` e continua
6. Output: JSON estruturado com preço, preço anterior, currency, stock, GTIN observado

## Cobertura esperada

Com a sessão MCP verificámos ~75 URLs distribuídos por:

| Loja | URLs disponíveis | Sucesso esperado |
|---|---|---|
| Wells | 17 | Alta (sem WAF agressivo) |
| Atida | 14 | Alta |
| Notino | 18 | Alta |
| Sephora | ~10 | Média (Akamai por vezes bloqueia) |
| Douglas | ~10 | Média |
| Druni | 13 | Alta |
| Farmácia365 | 11 | Alta |
| Bairro Saúde | 11 | Alta |
| Sweetcare | 16 | Alta |
| Easyfarma | 11 | Alta |
| Pharma2You | 10 | Alta |

Total: ~141 URLs × refresh diário = base de dados sempre actualizada.

## Automatizar

### Cron local (Windows Task Scheduler)

Cria uma tarefa que corre todos os dias às 06:00:
```
node scripts/scrape-prices.js && node scripts/ingest-scraped.js && node scripts/build-catalog.js
```

### GitHub Actions (recomendado)

Cria `.github/workflows/daily-scrape.yml`:

```yaml
name: Daily price scrape
on:
  schedule:
    - cron: '0 5 * * *'   # 06:00 Lisbon (05:00 UTC)
  workflow_dispatch:       # podes correr manualmente

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install playwright
      - run: npx playwright install chromium --with-deps
      - run: node scripts/scrape-prices.js
      - run: node scripts/ingest-scraped.js
      - run: node scripts/build-catalog.js
      - name: Commit refreshed data
        run: |
          git config user.name "smartcart-bot"
          git config user.email "bot@smartcart.pt"
          git add data/scraped data/inventory demo.html
          git commit -m "chore: daily price refresh" || echo "nothing to commit"
          git push
```

Free tier GitHub Actions: 2000 min/mês. Esta corrida ~5 min/dia = 150 min/mês. Folga grande.

## Troubleshooting

### `playwright não está instalado`
→ `npm install playwright && npx playwright install chromium`

### Muitos `blocked_waf`
Lojas com Cloudflare/DataDome em modo paranoico. Soluções:
1. Correr menos vezes (1x/dia em vez de 1x/hora)
2. Aumentar `--delay=3000`
3. Reduzir `--concurrency=1`
4. Em último caso: residential proxy (Bright Data €40/mês)

### `no_jsonld` numa loja específica
Essa loja não expõe `Product` JSON-LD. Hoje afecta:
- **Druni**: mistura JSON-LD parcial. Considerar fallback DOM selector.
- **Sweetcare**: hidrata price via JS depois de DOMContentLoaded → aumenta `await page.waitForTimeout(2000)`.

Posso adicionar selectors específicos por loja se for preciso.

### Preço 0€ ou anormal
Editar `scripts/ingest-scraped.js` para rejeitar valores abaixo do `base_price/3` ou acima de `base_price*3` antes de escrever.

## Comparação com o método anterior

| | Claude in Chrome MCP | Playwright standalone |
|---|---|---|
| Velocidade | ~30s/PDP (interactivo) | ~3-4s/PDP (headless) |
| Tokens AI | ~2000 tokens/PDP | **0** |
| Paralelizável | Não | Sim (`--concurrency`) |
| Cron-friendly | Não | Sim |
| Detecção WAF | Boa | Boa |
| Setup | 0 | ~3 min |

Para os 141 URLs, refresh completo:
- **Antes**: 1h+ interactivo, consumindo ~280k tokens AI
- **Agora**: ~5 min headless, 0 tokens
