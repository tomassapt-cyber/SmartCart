# SmartCartCosmetics — URL Resolver

> Pipeline de resolução de URLs canónicos para cada par (loja × produto).
> Pré-requisito para o cron diário de preços (Fase B).

---

## TL;DR

```bash
node scripts/resolve-urls.js --sample --dry-run    # 1. validar pipeline
node scripts/resolve-urls.js --sample              # 2. demo real (3 SKUs × 5 lojas)
node scripts/resolve-urls.js --store=notino        # 3. uma loja completa
node scripts/resolve-urls.js                       # 4. universo completo (3 770 pares)
```

Output: `data/url-resolution.json` (+ sample em `data/url-resolution-sample.json`).
Logs: `logs/url-resolution-YYYY-MM-DD.log`.

---

## Arquitectura

### Estratégias (em ordem de preferência)

1. **EAN search** — `loja.pt/search?q=EAN` se a loja aceita códigos de barras
2. **Nome search** — `loja.pt/search?q=marca+nome` + Levenshtein fuzzy match no título
3. **Sitemap** — `loja.pt/sitemap.xml` filtrado por tokens (não implementado neste release)
4. **Google site:** — `site:loja.pt "marca nome"` (não implementado, opcional)

### Schema de cada loja em `data/stores.json`

```jsonc
{
  "id": "notino",
  "search_strategy": {
    "type": "url-template",                                    // ou: graphql, sitemap, manual, auto-discover
    "template": "https://www.notino.pt/?q={q}",                // {q} = EAN ou nome
    "result_link_selector": "a[data-testid='product-tile-link']", // CSS p/ 1º resultado
    "title_selector": "h1[itemprop='name']",                   // CSS p/ confirmar título PDP
    "supports_ean": true,                                       // search aceita EAN?
    "needs_playwright": true                                    // SPA?
  }
}
```

**Estado actual**: 28/48 lojas têm `search_strategy` explícita; 20 marcadas como `auto-discover` (a investigar).

### Validação por par

```
1. fetchHTML(search_url)              ← 1 request com rate-limit + jitter
2. extractFirstResult(html)           ← CSS selector / heurística regex
3. fetchHTML(candidate_pdp_url)       ← 1 request adicional
4. extractTitle(pdp_html)             ← title_selector ou <title>
5. confidence = 1 - levenshtein(title, product.nome) / max_len
6. needs_review = confidence < CONFIDENCE_THRESHOLD (default 0.85)
```

---

## Output schema (`data/url-resolution.json`)

```jsonc
{
  "version": "1.0",
  "resolved_at": "ISO timestamp",
  "stats": { "ok": N, "fail": N, "skipped": N, "low_confidence": N, "total": N, "pct_ok": "..." },
  "confidence_threshold": 0.85,
  "results": [
    {
      "ean": "2000216165027",
      "store_slug": "notino",
      "canonical_url": "https://www.notino.pt/lancome/genifique-advanced-...",
      "resolution_method": "ean-search | name-search | sitemap | manual | google-site-search | failed | skipped",
      "confidence": 0.91,                       // 0..1
      "title_observed": "Lancôme Génifique Advanced sérum rejuvenescedor",
      "resolved_at": "ISO timestamp",
      "needs_review": false,
      "fail_reason": null                        // só presente em fail/skipped
    }
  ]
}
```

---

## Demo (sample real) — `data/url-resolution-sample.json`

Demonstrative run para 3 SKUs × 5 lojas = 15 pares. Executado via **WebSearch** (Google index) como proxy ao resolver — porque o `WebFetch` directo bate em WAFs (Cloudflare 403 em Notino/Atida/Druni; DataDome 406 em outros).

### Estatísticas

| Métrica | Valor |
|---|---:|
| Total | 15 |
| ✓ OK (confidence ≥ 0.85) | 3 |
| ⚠ Low confidence | 5 |
| ✗ Failed | 7 |
| Taxa de cobertura | 53.3 % |

### Aprendizagens chave do sample

1. **Loja × Marca filtering é real**: Atida e Wells não vendem Lancôme (focam derma). Para 60% dos pares, a falha é "not stocked" e não "resolver bug" — esperado e correcto.
2. **Variantes do mesmo SKU canónico complicam confidence**: La Roche-Posay tem Effaclar Duo+, Duo+M, Duo+ Unifiant Light/Medium. O resolver dá `confidence: 0.83` para Duo+M onde o canónico é Duo+ — needs_review é o handling certo.
3. **Tamanhos diferentes (250ml vs 454g vs 473ml)**: CeraVe sells in múltiplos formatos. Quando o EAN é sintético, não há ground truth — precisa ground truth real de EANs para escolher o SKU certo.
4. **Pharma2u sem indexação Google**: 0 resultados em todas as 3 searches. Fica para resolver via fetch directo + Playwright.

---

## Limitações conhecidas (estado actual)

### A. EANs sintéticos no catálogo
Os 162 SKUs em `data/products-master.json` têm EANs gerados pelo gerador determinístico (prefixo `200…`). Nenhuma loja real reconhece estes EANs.

**Impacto**: Strategy 1 (EAN search) falha sempre → resolver cai sempre para Strategy 2 (nome search).

**Path forward** (fase pré-resolver):
1. Substituir EANs sintéticos por EANs reais da base GS1/GEPIR para os SKUs no catálogo
2. OU correr scrape inicial em sites como Open Beauty Facts / GS1 para discovery automática

### B. WAFs bloqueiam fetch directo
Notino (Cloudflare), Atida (Cloudflare), Druni (custom 406) bloqueiam HTTP requests do ambiente actual. Funciona em:
- VM com IP residencial / proxy pool
- Playwright stealth com fingerprint realista
- Acesso via Google index (workaround, mas com latência e quota)

### C. SPAs precisam Playwright instalado
`scrapers/scraper-base.js` faz lazy-require de `playwright`. Para `needs_playwright: true` corre:
```bash
npm install playwright
npx playwright install chromium
```

### D. Strategy 3 e 4 não implementadas
Sitemap parser e Google site: fallback ficam como TODOs no `_searchByQuery`.

---

## Configuração via env

| Variável | Default | Função |
|---|---|---|
| `RESOLVER_OUT` | `data/url-resolution.json` | Path do output |
| `RESOLVER_LOG` | `logs/url-resolution-{date}.log` | Path do log |
| `RESOLVER_CONFIDENCE_THRESHOLD` | `0.85` | Score abaixo do qual `needs_review: true` |
| `RESOLVER_HEADLESS` | `true` | Playwright headless on/off |
| `RESOLVER_CONCURRENCY` | `3` | Lojas em paralelo |

---

## Roadmap

### Curto prazo
- [ ] Implementar Strategy 3 (sitemap.xml + token match)
- [ ] Switch para `cheerio` em vez de regex no `_extractFirstResult` / `_extractTitle`
- [ ] Investigar e configurar as 20 lojas `auto-discover`

### Médio prazo
- [ ] **Pré-fase**: importar EANs reais do GS1/GEPIR para os 162 SKUs
- [ ] Setup VM scraper com proxies residenciais para corrida full
- [ ] Métrica `coverage_per_store` no output

### Longo prazo
- [ ] Integração com `scripts/run-daily-prices.js` (Fase B) — consumir `url-resolution.json` como input
- [ ] Re-validação trimestral automática de URLs (sites mudam estrutura)

---

## Como testar localmente sem playwright/proxies

```bash
# 1. Pipeline check (sem rede)
node scripts/resolve-urls.js --sample --dry-run

# 2. Apenas uma loja com fetch HTTP simples (sites SSR)
RESOLVER_CONCURRENCY=1 node scripts/resolve-urls.js --store=easyfarma --max-per-store=5

# 3. Verificar output gerado
cat data/url-resolution.json | python -m json.tool | head -50
```
