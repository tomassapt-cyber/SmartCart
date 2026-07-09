# Registo de Lojas — CosMath

Referência de todas as lojas integradas, como cada uma é raspada, por que chave
casa, e se se actualiza sozinha na nuvem (GitHub Actions) ou precisa do PC.
Última actualização: 2026-07-09 · **47 lojas · ~128.000 ofertas** no seed
(~121.500 publicadas no render após os overlays de qualidade: fantasmas,
anti-podre, blocklist).

---

## Como funciona o matching (por ordem de força)

1. **EAN real (gtin13)** — código de barras global. A chave mais forte; a língua
   da loja é irrelevante (por isso lojas EU funcionam). Vem do JSON-LD da ficha.
2. **CNP** (Código Nacional do Produto, 7 díg) — código nacional PT. Casado via
   `apply-cnp-merge.js` (índice cnp→ean construído das lojas que expõem CNP).
3. **Fingerprint** (marca + nome + volume) — último recurso, p/ lojas SEM EAN.
   Só *enriquece* produtos que já temos; nunca cria. Guard de volume obrigatório.

Regra anti-over-merge: EAN real manda; CNP/fingerprint só resgatam sintéticos;
guard de marca; nunca fundir 2 EANs reais distintos. (ver `dedup-audit.js`)

Pipeline por loja: `scrape-<loja>-catalog.js` → `data/catalog/<loja>-full.json`
(gitignored) → `integrate-<loja>-catalog.js` (funde no seed) → `inject-seed-into-demo.js`
(regenera demo/index/catalogo) → `resilient-push.sh` (push sem conflito de seed).

---

## As 47 lojas

Ofertas contadas no seed em 2026-07-09. Horários em UTC; "3×" = três crons
diários (regra de cadência de 2026-07-03: lojas rápidas correm 3×/dia).

| # | Loja | Ofertas | Chave | Técnica de scrape | Nuvem? |
|---|------|--------:|-------|-------------------|--------|
| 1 | Atida (Mifarma) | 10 880 | EAN | sitemap + JSON-LD | ✅ 15h |
| 2 | Druni PT | 10 324 | EAN | sitemap + JSON-LD | ✅ 06h |
| 3 | Primor | 9274 | EAN | Magento + JSON-LD (mpn=EAN); --dermo de 37k | ✅ 3× 02h |
| 4 | SweetCare | 8281 | EAN | sitemap + JSON-LD | ✅ 10h+22h |
| 5 | Notino | 7446 | EAN | sitemap-categoria + JSON-LD; **via curl** | ❌ **só PC** |
| 6 | Loja da Farmácia | 6223 | EAN | Magento + JSON-LD | ✅ 3× 19h |
| 7 | Aveiro Farma | 5695 | EAN (gtin14) | OpenCart + JSON-LD; servidor LENTO | ✅ 3× 11h |
| 8 | Wells | 5552 | EAN | sitemap + JSON-LD | ✅ 14h |
| 9 | Perfume's Club | 4469 | EAN | sitemap + JSON-LD (gtin13); --dermo por marca; retry anti soft-block; **nunca raspar do PC** | ✅ 3× 00h30 |
| 10 | Power Beauty | 4196 | EAN | PrestaShop sitemap CDATA; Product é o 4º bloco JSON-LD | ❌ **só PC** |
| 11 | Farmácia.pt | 4002 | EAN | sitemap + JSON-LD | ✅ 3× 17h |
| 12 | Pharma Scalabis | 3834 | EAN + CNP | WooCommerce + JSON-LD (mpn=EAN) | ✅ 3× 01h30 |
| 13 | A Tua Farmácia | 3710 | CNP | Shopify products.json (sku=CNP); **enrich-only por CNP directo** | ✅ 3× 06h40 |
| 14 | Cocooncenter | 3665 | EAN | sitemap-pt + JSON-LD; 410=descont. | ✅ 3× 15h |
| 15 | Bairro da Saúde | 3287 | CNP | HTML | ✅ 3× 05h |
| 16 | Farmácia Virtual | 3240 | CNP | WooCommerce (sku=CNP) | ✅ 3× 13h |
| 17 | Nossa Farmácia | 3124 | CNP | **VTEX API JSON** (productReference=CNP; paginar por subcategoria) | ✅ 3× 00h45 |
| 18 | Pharma GDD | 2296 | EAN | sitemap + JSON-LD | ✅ 3× 22h |
| 19 | FastPharma | 2262 | CNP + EAN | Magento sitemap_web flat (sku=mpn=CNP; gtin13 parcial) | ✅ 3× 01h15 |
| 20 | Easyfarma | 1955 | CNP | HTML (barcode=CNP) | ✅ 3× 04h |
| 21 | Unifarma | 1813 | CNP | Shopify products.json (sku=CNP) | ✅ 3× 03h20 |
| 22 | Farmácia Ideal | 1714 | EAN + CNP | mesma plataforma da Saúde Mayor | ✅ 3× 07h |
| 23 | Saúde Mayor | 1649 | **EAN + CNP** | JSON-LD por regex (mpn=EAN, sku=CNP; JSON partido) | ✅ 3× 09h |
| 24 | Farmácia Barreiros | 1619 | CNP | PrestaShop; fallback URLs-conhecidos se WAF | ✅ 3× 22h30 |
| 25 | Poupafarma | 1599 | CNP (+EAN) | Jumpseller ficha-a-ficha (JSON-LD sku) | ✅ 3× 04h10 |
| 26 | GO-farma | 1456 | EAN + CNP | Magento sitemap_products_pt (gtin13 + sku=CNP) | ✅ 3× 03h55 |
| 27 | Farmácia 365 | 1390 | EAN | sitemap + JSON-LD; fila ∪ URLs do seed | ✅ 3× 16h |
| 28 | DocMorris | 1242 | fingerprint | enrich-only fp+loose+fuzzy; known-only diário + full semanal | ✅ 3× 05h05 + seg 04h30 |
| 29 | WOWFARMA | 1242 | EAN + CNP | **feed KuantoKusta** /kkfeedwowfarma.xml (1 pedido) | ✅ 3× 07h25 |
| 30 | My Cosmetics | 1220 | EAN (+CNP) | Shopify + JSON-LD; preços via parsePriceEU | ✅ 3× 08h |
| 31 | byFarma | 1195 | EAN | Magento + JSON-LD | ✅ 3× 12h |
| 32 | A Sua Farmácia Online | 1158 | EAN/CNP | HTML; urlRefreshPass | ✅ 3× 21h |
| 33 | SoBeauty | 902 | EAN + CNP | sitemaps .xml.gz + JSON-LD; rate-limit agressivo | ❌ **só PC** |
| 34 | Smart Beauty | 901 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 35 | Farmácias Portuguesas | 848 | CNP | Magento; cookie pharmacy_code + pricingData | ✅ 3× 16h |
| 36 | Hiper Farma | 759 | CNP | Shopify (sku=CNP); resolveBrand (vendor=distribuidor) | ✅ 3× 06h05 |
| 37 | Beleza37 | 727 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 38 | Quickfarma | 633 | CNP + EAN | WooCommerce; sitemap AIOSEO com CDATA | ✅ 3× 05h50 |
| 39 | Pharma2you | 528 | fingerprint | feed Google Merchant | ✅ 3× 17h |
| 40 | A Farmácia Online | 369 | EAN | JSON-LD + data-ean; fallback URLs-do-seed se WAF | ✅ 3× 18h |
| 41 | Manuela Serra | 369 | EAN/fp | HTML (Shopify) | ✅ 3× 06h |
| 42 | ShopCosmetics | 321 | EAN + CNP | PrestaShop 1_index_sitemap CDATA | ✅ 3× 02h30 |
| 43 | Perfumes4you | 302 | EAN | WooCommerce (sku=EAN-13) | ✅ 3× 04h35 |
| 44 | A Minha Farmácia Online | 252 | EAN | sitemap + JSON-LD | ✅ 3× 21h30 |
| 45 | HaemiSkin | 84 | EAN | sitemap + JSON-LD | ✅ 3× 20h |
| 46 | Continente | 82 | fingerprint | known-only diário + full semanal (seg 04h) | ✅ 3× 02h15 |
| 47 | Pluricosmética | 46 | fingerprint | known-only diário + full semanal (seg 04h30) | ✅ 3× 02h45 |

**42/47 actualizam sozinhas na nuvem.** As 5 restantes são **só-PC** (Cloudflare/
WAF bloqueia IPs de datacenter): Notino, Power Beauty, SoBeauty, Smart Beauty,
Beleza37 — refrescar do PC com os pares scrape+integrate (ver excepções abaixo).
Ofertas = itens no seed (a "base de dados"); o render publica menos (filtro de
visibilidade + ofertas-fantasma, ver abaixo).

### 👻 Ofertas-fantasma (produto removido da loja)
Os integradores são *enrich-only* (nunca removem) → quando uma loja tira um
produto do site, a oferta ficava no seed com o preço velho, aparecia como
"melhor preço" e o link dava 404. Solução (overlay NÃO-destrutivo no inject):
1. **Candidato** — URL da oferta ausente do catálogo raspado fresco da loja
   (`ghost-offers.js`; guardas: catálogo completo/recente/são).
2. **Confirmação HTTP** — `verify-ghost-offers.js` testa os candidatos
   (404/410 = morto) com cache em `data/ghost-check.json` (morto=30d TTL,
   vivo=7d, inconclusivo=1d; bounded a 250/inject).
Só ausente **E** confirmado morto é escondido do render; o seed preserva tudo
(se o produto voltar à loja, reaparece sozinho). ⚠️ O sinal do catálogo SOZINHO
não chega: os scrapers só guardam produtos extraídos com sucesso (cocooncenter
tinha 747 "ausentes" e >50% estavam vivos).

### ⚠️ As 5 lojas só-PC (Cloudflare/WAF bloqueia datacenter)
Notino, Power Beauty, SoBeauty, Smart Beauty e Beleza37 bloqueiam IPs de
datacenter (GitHub Actions) — Notino/Power Beauty via Cloudflare (fetch do Node
também cai por TLS fingerprint; contornado com **curl**, mas o IP da nuvem cai
na mesma), SoBeauty/Smart Beauty/Beleza37 pela plataforma partilhada (.xml.gz,
socket morto na nuvem). Os workflows têm o `schedule` comentado (só
`workflow_dispatch`). Para refrescar, correr **do PC** o par de cada uma:
```
node scripts/scrape-<loja>-catalog.js --resume   # notino/powerbeauty: juntar --full nos re-scans
node scripts/integrate-<loja>-catalog.js
```
(lojas: notino, powerbeauty, sobeauty, smartbeauty, beleza37)
Reactivar na nuvem exigiria um proxy residencial / serviço (ScraperAPI, etc.).

---

## Como adicionar uma loja nova (checklist)

1. **Sondar viabilidade** (sempre com `curl` + UA de browser, NÃO WebFetch):
   - `curl -A "<UA>" https://loja/robots.txt` → tem sitemap?
   - Abrir uma ficha de produto → tem `gtin13`/JSON-LD? (ideal) ou CNP no URL/sku?
   - Confirma envio PT + preços em € no HTML estático (não via JS/login).
2. **Clonar** o scraper+integrador mais parecido:
   - tem EAN/JSON-LD → clonar `cocooncenter` ou `pharma-gdd`.
   - sem EAN mas tem feed → clonar `pharma2you`.
   - sem EAN, sku=CNP → clonar `farmaciasportuguesas`.
3. **Testar** `--limit=30` (extração + taxa de erro).
4. **Workflow** `.github/workflows/<loja>-catalog.yml` (clonar um existente; cron
   a uma hora livre; `resilient-push.sh`).
5. **Verificar na nuvem**: `gh workflow run <loja>-catalog.yml -f limit=40`
   depois `gh run view --log --job=<id>` — confirma que NÃO dá 403 do datacenter.

### Bugs/armadilhas já encontrados (não repetir)
- **Cloudflare bloqueia node-fetch mas deixa curl** (Notino) — usar curl spawn.
- **Cloudflare bloqueia IPs de datacenter** (GitHub Actions) — testar na nuvem.
- Header **`Accept: text/html` faz alguns Magento devolver 500** (Farm. Portuguesas).
- **ECONNRESET** se não consumir/cancelar `r.body` em respostas não-ok.
- `/tmp` no Windows: node escreve `C:\tmp`, git-bash usa outro → backups no dir do projeto.
- **Workflows "verdes" com scrape VAZIO (hollow success)** — 3 variantes apanhadas
  em 2026-07-02: (a) WAF serve sitemap vazio a IPs de datacenter mas nao ao PC
  (afarmaciaonline 27d stale, barreiros 3d) -> fallback do sitemap via curl +
  guarda anti-vazio (0 produtos -> exit 1 SEM escrever o catalogo) em TODOS os
  scrapers; (b) workflow SEM steps Integrate/Commit -> resilient-push ve
  HEAD==origin e diz "up-to-date" exit 0 (manuelaserra 15d); (c) --limit de
  smoke-test sobrescrevia o catalogo de producao -> agora --limit nunca escreve.
  O freshness-monitor (13h UTC, --strict --ignore=notino) e a rede de seguranca.

---

## Candidatas SONDADAS e REJEITADAS (não voltar a tentar)

| Loja | Motivo |
|------|--------|
| farmaciaonline.pt | Morta — redirect p/ Farmácias Portuguesas |
| chicfarmacia.pt / querofarmacia.pt | Rede inalcançável (curl 000) |
| Farmácias Holon | Não é loja (site institucional, sem carrinho) |
| farmaciasaude.pt | WordPress sem sitemap de produtos |
| caretobeauty.com/pt | Magento PT mas SEM gtin13 |
| farmaciasoler.com (ES) | 12k produtos mas SEM EAN/JSON-LD |
| dosfarma.com (ES) | Cloudflare 403 (bloqueia produto) |
| shop-apotheke.com | Só envia DE |
| newpharma.com | Inalcançável (curl 000) |
| farmaciaportugal.pt | WordPress institucional; product-sitemap parado desde 2020 (catálogo morto) |
| parafarma24.com | Site em ES por default, sem sinal de envio PT / rota /pt |

### Varrimento COMPLETO da Google Sheet (2026-07-03)
91 domínios sondados (script probe em massa): **67 mortos** (DNS nem resolve),
~15 vivos sem EAN acessível (pluricosmetica, celeiro, organii, smartbeauty…),
4 protegidos (Sephora/Douglas 400-bot-wall, farmaciagarcia products.json
bloqueado, Perfumes&Companhia timeout). **Integrados: Primor + Perfume's Club.**
Pequenas viáveis por integrar (CNP no sku; sitemaps com 301 a resolver):
pharmascalabis.com.pt (WooCommerce), farmaciaideal.pt (Magento).

## Candidatas VIÁVEIS por explorar (futuro)
- **Continente Online** — tem EAN+JSON-LD e é acessível, MAS catálogo dominado por
  mercearia (~120k); precisa de filtrar a árvore de categorias de beleza. Alto valor
  (preços de massa: Nivea, Garnier, CeraVe baratos) mas trabalhoso.
- **Auchan / El Corte Inglés Beauty** — idem (mass-market).
- Mais parafarmácias EU com storefront PT/EAN (como Cocooncenter): Easyparapharmacie,
  Cocooncenter .es/.it, etc.
