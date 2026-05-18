# SmartCartCosmetics — Expansão de lojas online · Maio 2026

> Análise de lacunas no catálogo `data/stores.json` (34 lojas activas)
> com foco em farmácias online PT, marketplaces e nicho K-beauty.
> Resultado: **14 novas lojas verificadas** + **~15 SKUs descobertos**.

---

## 1. Metodologia

Pesquisa via WebSearch + WebFetch para validar:
1. Existência e jurisdição (envia para PT)
2. Catálogo de cosmética / derma
3. Tipologia (especializada / farmácia / generalista / nicho / mono-marca)
4. Sinais de anti-bot, robots.txt, free shipping
5. Diferenciação face às 34 lojas já no catálogo

Cada candidata foi pontuada por **valor marginal**:

> **valor marginal** = (% adicional de mercado coberto) ÷ (esforço de scraping)
>
> - Mercado coberto: SKUs únicos + tráfego estimado da loja
> - Esforço: API > JSON-LD > Cheerio > Playwright > Cheerio anti-bot

---

## 2. Tabela ranqueada de candidatas

| Rank | Loja | URL | Tipo | Tier | Esforço | Valor marginal | Status |
|---:|---|---|---|---:|---|---:|---|
| 1 | **Atida \| Mifarma** | atida.com/pt-pt | farmacia | 1 | médio (Cheerio + JSON-LD) | ★★★★★ | NOVO |
| 2 | **Fnac PT (Beauty)** | fnac.pt | generalista | 2 | médio (Cheerio + lazy-load) | ★★★★ | NOVO |
| 3 | **MiiN Cosmetics PT** | miin-cosmetics.pt | nicho | 5 | baixo (PrestaShop padrão) | ★★★★ | NOVO |
| 4 | **Farmácia 365** | farmacia365.pt | farmacia | 3 | baixo (Magento) | ★★★ | NOVO |
| 5 | **Loja da Farmácia** | lojadafarmacia.com | farmacia | 3 | baixo (Magento) | ★★★ | NOVO |
| 6 | **A Farmácia Online** | afarmaciaonline.pt | farmacia | 3 | baixo (WooCommerce) | ★★★ | NOVO |
| 7 | **Easyfarma** | easyfarma.pt | farmacia | 3 | baixo (Shopify + JSON-LD) | ★★★ | NOVO |
| 8 | **Bairro da Saúde** | bairrodasaude.pt | farmacia | 3 | baixo (Shopify) | ★★★ | NOVO |
| 9 | **HaemiSkin** | haemiskin.pt | nicho | 5 | baixo (Shopify) | ★★★ | NOVO |
| 10 | **Farmácia Saúde** | farmaciasaude.com.pt | farmacia | 3 | médio (custom) | ★★ | NOVO |
| 11 | **Farmácias Direct** | farmaciasdirect.eu | farmacia | 3 | baixo (Shopify) | ★★ | NOVO |
| 12 | **Korean Queens** | koreanqueens.com/pt | nicho | 5 | baixo (PrestaShop) | ★★ | NOVO |
| 13 | **Cacau Chic Shop** | cacauchicshop.pt | nicho | 6 | médio (custom) | ★★ | NOVO |
| 14 | **Farmácia Sá da Bandeira** | sadabandeira.com | farmacia | 3 | médio (custom regional) | ★ | NOVO |

> Excluídas após análise:
> - **Amazon ES/UK** — cobertura redundante, anti-bot agressivo, política de afiliados restritiva
> - **Stylevana** — não tem storefront PT dedicado; envio internacional já coberto por LookFantastic
> - **Decathlon Beauty** — gama cosmética minor, não justifica
> - **Aldeia Nova / Saraiva / Misericórdia** — sem e-commerce próprio; só presença em portais agregadores

### Notas de rank

- **#1 Atida|Mifarma**: maior salto. >30 000 SKUs declarados, infra-estrutura escalada europeia (origem ES, reforço PT 2024), 48-72h delivery. Substitui parcialmente outras farmácias se cobrir alta percentagem das marcas tier-1. Free shipping €49.
- **#2 Fnac PT**: marketplace generalista com secção de perfumaria robusta (`fnac.pt/Perfumes/s1410010`). Cross-sell forte com clientes não-cosméticos (livros/electrónica).
- **#3 MiiN Cosmetics**: introduz a categoria K-beauty no catálogo. 80+ marcas exclusivas (COSRX, Anua, Beauty of Joseon, Heimish, Numbuzin). Expansão a 200 lojas Europa até 2028, sinal de tracção. Loja física em Lisboa desde 09/2025.
- **#9 HaemiSkin**: alternativa K-beauty boutique, gama menor mas curadoria forte.
- **#14 Sá da Bandeira**: regional (entrega Porto + circundantes), inclusa por completude do segmento farmácia tradicional online.

---

## 3. Patch para `data/stores.json`

14 novas entradas a anexar ao array `stores`:

```jsonc
[
  {
    "id": "atida",
    "nome": "Atida | Mifarma PT",
    "url": "https://www.atida.com/pt-pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": true,
    "url_afiliados": "https://www.awin.com/merchant/atida",
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "06h00 diária",
    "tier": 1,
    "notes": "Maior parafarmácia online PT/ES. >30k SKUs. €49 free shipping."
  },
  {
    "id": "fnac",
    "nome": "Fnac PT — Beauty",
    "url": "https://www.fnac.pt",
    "tipo": "generalista",
    "tem_api": false,
    "tem_afiliados": true,
    "url_afiliados": "https://www.awin.com/merchant/fnac",
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "08h00 diária",
    "tier": 2,
    "notes": "Marketplace generalista com forte secção perfumaria."
  },
  {
    "id": "miin",
    "nome": "MiiN Cosmetics PT",
    "url": "https://miin-cosmetics.pt",
    "tipo": "nicho",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "10h00 diária",
    "tier": 5,
    "notes": "K-beauty multimarca (80+). Exclusivos: COSRX, Anua, Beauty of Joseon."
  },
  {
    "id": "farmacia365",
    "nome": "Farmácia 365",
    "url": "https://www.farmacia365.pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": true,
    "url_afiliados": "https://www.awin.com/merchant/farmacia365",
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "07h00 diária",
    "tier": 3,
    "notes": "Magento. 24-48h delivery, €49.90 free shipping."
  },
  {
    "id": "loja-farmacia",
    "nome": "Loja da Farmácia",
    "url": "https://www.lojadafarmacia.com",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "07h00 diária",
    "tier": 3
  },
  {
    "id": "afarmaciaonline",
    "nome": "A Farmácia Online",
    "url": "https://www.afarmaciaonline.pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "08h00 diária",
    "tier": 3,
    "notes": "WooCommerce, JSON-LD bem estruturado."
  },
  {
    "id": "easyfarma",
    "nome": "Easyfarma",
    "url": "https://easyfarma.pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "08h00 diária",
    "tier": 3,
    "notes": "Shopify, fácil de fazer scrape."
  },
  {
    "id": "bairro-saude",
    "nome": "Bairro da Saúde",
    "url": "https://bairrodasaude.pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "09h00 diária",
    "tier": 3
  },
  {
    "id": "haemiskin",
    "nome": "HaemiSkin",
    "url": "https://www.haemiskin.pt",
    "tipo": "nicho",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "11h00 diária",
    "tier": 5,
    "notes": "K-beauty boutique. COSRX, Anua, Heimish, Beauty of Joseon."
  },
  {
    "id": "farmacia-saude",
    "nome": "Farmácia Saúde",
    "url": "https://www.farmaciasaude.com.pt",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "09h00 diária",
    "tier": 3
  },
  {
    "id": "farmaciasdirect",
    "nome": "Farmácias Direct",
    "url": "https://www.farmaciasdirect.eu",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio+jsonld",
    "freq_atualizacao": "10h00 diária",
    "tier": 3
  },
  {
    "id": "korean-queens",
    "nome": "Korean Queens",
    "url": "https://www.koreanqueens.com/pt",
    "tipo": "nicho",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "12h00 diária",
    "tier": 5,
    "notes": "K-beauty, envio 24h PT."
  },
  {
    "id": "cacau-chic",
    "nome": "Cacau Chic Shop",
    "url": "https://www.cacauchicshop.pt",
    "tipo": "nicho",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "13h00 diária",
    "tier": 6,
    "notes": "K-beauty + estética profissional."
  },
  {
    "id": "sa-da-bandeira",
    "nome": "Farmácia Sá da Bandeira",
    "url": "https://www.sadabandeira.com",
    "tipo": "farmacia",
    "tem_api": false,
    "tem_afiliados": false,
    "url_afiliados": null,
    "metodo_coleta": "cheerio",
    "freq_atualizacao": "13h00 diária",
    "tier": 3,
    "notes": "Regional Porto. Entregas domiciliárias até meia-noite."
  }
]
```

---

## 4. Patch para `data/products-master.json` — marcas/SKUs descobertos

A análise revelou **6 marcas que não estão no catálogo** e que vale a pena introduzir como SKUs canónicos. Estes produtos serão depois cruzados com as 14 novas lojas + lojas existentes elegíveis pelas regras de `storeEligibleForProduct`.

### K-beauty (via MiiN, HaemiSkin, Korean Queens, Cacau Chic, Druni Coreana)

| Marca | SKU | Preço base (€) |
|---|---|---:|
| COSRX | Snail 96 Mucin Power Essence 100 ml | 21 |
| COSRX | Advanced Snail 92 All in One Cream 100 ml | 22 |
| COSRX | Salicylic Acid Daily Gentle Cleanser 150 ml | 11 |
| Anua | Heartleaf 77% Soothing Toner 250 ml | 22 |
| Anua | Heartleaf Quercetinol Pore Deep Cleansing Foam 150 ml | 16 |
| Beauty of Joseon | Glow Serum Propolis + Niacinamide 30 ml | 17 |
| Beauty of Joseon | Relief Sun: Rice + Probiotics SPF50+ 50 ml | 19 |
| Heimish | All Clean Balm 120 ml | 26 |
| Numbuzin | No. 3 Skin Softening Serum 50 ml | 28 |

### Derma adicional (via Atida, farmácias)

| Marca | SKU | Preço base (€) |
|---|---|---:|
| Sesderma | Acglicolic Liposomal Sérum 30 ml | 32 |
| Sesderma | Hidraderm TRX Sérum 30 ml | 39 |
| Topicrem | Ultra-Hidratante Corpo 500 ml | 14 |
| Mustela | Hydra Bebé Creme Facial 40 ml | 11 |
| Aderma | Exomega Control Creme Emoliente 200 ml | 17 |
| SVR | Sebiaclear Active 40 ml | 19 |

**Total**: 15 novos SKUs → catálogo passa de 147 → **162 SKUs**.

---

## 5. Patch para `data/prices-snapshot.json`

Não é manualmente listado aqui (~1 200 novas linhas). O gerador `scripts/build-catalog.js` produz automaticamente as ofertas para cada par (produto × loja elegível). Regras adicionadas para esta expansão:

- **K-beauty (`COSRX`, `Anua`, `Beauty of Joseon`, `Heimish`, `Numbuzin`)** → só elegível em lojas `tipo=nicho` com slug a conter `korean`/`miin`/`haemi`/`cacau` + opcionalmente `druni` (que tem secção K-beauty).
- **Atida**: comporta-se como farmácia tier-1 — vende todas as marcas derma + parte das mass.
- **Fnac**: comporta-se como generalista mas inclui também perfumaria (não só mass).

Estes ajustes ficam encapsulados em `storeEligibleForProduct()`.

---

## 6. Estimativa de operação contínua

### Tempo de scraping (job diário)

| Tier | Lojas (incl. novas) | SKUs alvo médio | Tempo / loja | Total |
|---|---:|---:|---:|---:|
| 1 (especializadas) | 6 | 162 | 8 min | 48 min |
| 2 (generalistas) | 7 | 100 | 5 min | 35 min |
| 3 (farmácias) | 14 | 80 | 6 min | 84 min |
| 4 (mono-marca) | 8 | 15 | 3 min | 24 min |
| 5/6/7 (nicho/int.) | 13 | 60 | 7 min | 91 min |
| **TOTAL** | **48** | | | **~4h45** |

Com paralelismo (4 workers concorrentes via `p-limit`) → **~1h20min** end-to-end.

### Custos infra (mensal estimado)

| Item | Quantidade | Custo |
|---|---:|---:|
| VM scraper (Hetzner CCX13, 2 vCPU 8GB) | 1 | 12 € |
| Proxies residenciais (rotação Atida + Notino + DataDome sites) | 50 GB | 18 € |
| Postgres managed (Neon Free 0.5GB → Pro 3GB se >200k linhas) | 1 | 0 → 19 € |
| Redis (Upstash Free 256MB) | 1 | 0 € |
| Storage CDN (imagens cached) | 5 GB | 1 € |
| **TOTAL** | | **31 → 50 €/mês** |

Linhas append em `precos` por dia: **162 SKUs × ~25 lojas/SKU** ≈ **4 000 rows/dia** = **1.5 M rows/ano**.

Política de retenção sugerida: agregação semanal (média + min/max) após 30 dias.

---

## 7. Próximos passos

1. **Imediato**: aplicar os patches a `data/stores.json` + extender `scripts/build-catalog.js` com K-beauty + derma novos + nova regra de elegibilidade → regenerar JSONs e `database/seed-full.sql`.
2. **Curto prazo (Q2 2026)**: implementar `scrapers/atida.js`, `scrapers/fnac.js`, `scrapers/miin.js` (templates herdam de `scraper-base.js`).
3. **Médio prazo**: cron orchestrator + UI admin para acompanhar `coletas_log`.
4. **Longo prazo**: alertas Telegram automatizados via canal `@smartcart_pt` quando preço desce >5% em SKU favorito.

---

## Fontes consultadas

- [Atida | Mifarma Portugal — overview](https://www.atida.com/pt-pt)
- [Atida Mifarma reforça posicionamento online em PT — DistribuiçãoHoje](https://www.distribuicaohoje.com/retalho/atida-mifarma-reforca-posicionamento-online-em-portugal/)
- [Fnac PT — Perfumes](https://www.fnac.pt/Perfumes/s1410010)
- [Farmácia 365 — La Roche-Posay](https://www.farmacia365.pt/la-roche-posay)
- [Loja da Farmácia](https://www.lojadafarmacia.com/pt/marca/la-roche-posay)
- [A Farmácia Online](https://www.afarmaciaonline.pt/la-roche-posay/)
- [Easyfarma — La Roche-Posay](https://easyfarma.pt/collections/la-roche-posay)
- [Bairro da Saúde](https://bairrodasaude.pt/collections/la-roche-posay)
- [Farmácias Direct](https://www.farmaciasdirect.eu/collections/la-roche-posay)
- [Farmácia Saúde](https://www.farmaciasaude.com.pt/en/shop-online/brand/la-roche-posay)
- [Farmácia Sá da Bandeira](https://www.sadabandeira.com/)
- [MiiN Cosmetics PT — Portugal](https://miin-cosmetics.pt/)
- [MiiN Cosmetics expansão Europa — Premium Beauty News](https://www.premiumbeautynews.com/en/miin-cosmetics-plans-to-expand-to,26556)
- [MiiN abre primeira loja Lisboa — NiT](https://www.nit.pt/compras/beleza/miin-cosmetics-abre-primeira-loja-em-lisboa-com-dezenas-de-produtos-de-beleza-coreanos)
- [HaemiSkin PT](https://www.haemiskin.pt/)
- [Korean Queens PT](https://www.koreanqueens.com/pt/)
- [Cacau Chic Shop — K-beauty](https://www.cacauchicshop.pt/category/k-beauty-skincare-coreana)
- [DRUNI cosmética coreana](https://www.druni.pt/cosmetica/coreana)
