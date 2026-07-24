# Registo de Lojas — CosMath

Referência de todas as lojas integradas, como cada uma é raspada, por que chave
casa, e se se actualiza sozinha na nuvem (GitHub Actions) ou precisa do PC.
Última actualização: 2026-07-23 · **71 lojas · ~169 700 ofertas** no seed
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

## As 71 lojas

Ofertas contadas no seed em 2026-07-24. Horários em UTC; "3×" = três crons
diários (regra de cadência de 2026-07-03: lojas rápidas correm 3×/dia).

| # | Loja | Ofertas | Chave | Técnica de scrape | Nuvem? |
|---|------|--------:|-------|-------------------|--------|
| 1 | Atida (Mifarma) | 11 038 | EAN | sitemap + JSON-LD | ✅ 15h |
| 2 | Druni PT | 10 430 | EAN | sitemap + JSON-LD | ✅ 06h |
| 3 | Notino | 9 977 | EAN | sitemap-categoria + JSON-LD; **via curl** | ❌ **só PC** |
| 4 | Primor | 9 912 | EAN | Magento + JSON-LD (mpn=EAN); --dermo de 37k | ✅ 3× 02h |
| 5 | SweetCare | 8 282 | EAN | sitemap + JSON-LD | ✅ 10h+22h |
| 6 | Loja da Farmácia | 6 947 | EAN | Magento + JSON-LD | ✅ 3× 19h |
| 7 | Aveiro Farma | 5 874 | EAN (gtin14) | OpenCart + JSON-LD; servidor LENTO | ✅ 3× 11h |
| 8 | Wells | 5 654 | EAN | sitemap + JSON-LD | ✅ 14h |
| 9 | Perfume's Club | 4 758 | EAN | sitemap + JSON-LD (gtin13); --dermo por marca; retry anti soft-block; **nunca raspar do PC** | ✅ 3× 00h30 |
| 10 | A Tua Farmácia | 4 328 | CNP | Shopify products.json (sku=CNP); **enrich-only por CNP directo** | ✅ 3× 06h40 |
| 11 | Power Beauty | 4 244 | EAN | PrestaShop sitemap CDATA; Product é o 4º bloco JSON-LD | ❌ **só PC** |
| 12 | Farmácia.pt | 4 098 | EAN | sitemap + JSON-LD | ✅ 3× 17h |
| 13 | Pharma Scalabis | 4 056 | EAN + CNP | WooCommerce + JSON-LD (mpn=EAN) | ✅ 3× 01h30 |
| 14 | Skin | 3 847 | CNP (+fp p/ sem-chave) | Magento + **Cloudflare Challenge**: colheita in-page no Browser pane; ProductGroup→variants por tamanho | ❌ **só-browser** (semanal) |
| 15 | Farmácia Virtual | 3 748 | CNP | WooCommerce (sku=CNP) | ✅ 3× 13h |
| 16 | Cocooncenter | 3 747 | EAN | sitemap-pt + JSON-LD; 410=descont. | ✅ 3× 15h |
| 17 | Nossa Farmácia | 3 710 | CNP | **VTEX API JSON** (productReference=CNP; paginar por subcategoria) | ✅ 3× 00h45 |
| 18 | Bairro da Saúde | 3 350 | CNP | HTML | ✅ 3× 05h |
| 19 | FastPharma | 2 567 | CNP + EAN | Magento sitemap_web flat (sku=mpn=CNP; gtin13 parcial) | ✅ 3× 01h15 |
| 20 | Dermis | 2 537 | CNP + EAN 81% | API pública api.dermis.pt (Ycommerce=bemecare; campaign_price) | ✅ 3× 06h05 |
| 21 | Love My Pharma | 2 495 | CNP+EAN | Shopify products.json + <handle>.js (barcode) | ✅ 3× 08h55 |
| 22 | FarmaToGo | 2 424 | EAN+CNP | Shopify sitemaps + JSON-LD ficha-a-ficha | ✅ 3× 05h10 |
| 23 | Pharmee | 2 407 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 06h25 |
| 24 | Pharma GDD | 2 405 | EAN | sitemap + JSON-LD | ✅ 3× 22h |
| 25 | Farmácias Progresso | 2 223 | CNP+EAN (sku/mpn flexível) | Presta; sitemap flat sem .html; filtro JSON-LD Product | ✅ 3× 07h40 |
| 26 | CosmeticFan | 2 043 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 05h50 |
| 27 | Unifarma | 2 023 | CNP | Shopify products.json (sku=CNP) | ✅ 3× 03h20 |
| 28 | Easyfarma | 1 988 | CNP | HTML (barcode=CNP) | ✅ 3× 04h |
| 29 | Poupafarma | 1 973 | CNP (+EAN) | Jumpseller ficha-a-ficha (JSON-LD sku) | ✅ 3× 04h10 |
| 30 | Farmácia do Costume | 1 933 | EAN+CNP | sitemap + JSON-LD (mpn=EAN); só fichas .html | ✅ 3× 07h05 |
| 31 | Farmácia Ideal | 1 895 | EAN + CNP | mesma plataforma da Saúde Mayor | ✅ 3× 07h |
| 32 | Saúde Mayor | 1 864 | **EAN + CNP** | JSON-LD por regex (mpn=EAN, sku=CNP; JSON partido) | ✅ 3× 09h |
| 33 | Farmácia Barreiros | 1 659 | CNP | PrestaShop; fallback URLs-conhecidos se WAF | ✅ 3× 22h30 |
| 34 | Farmácia Garcia | 1 591 | CNP | loja.farmaciagarcia.net Shopify products.json (sem barcode) | ✅ 3× 09h50 |
| 35 | GO-farma | 1 562 | EAN + CNP | Magento sitemap_products_pt (gtin13 + sku=CNP) | ✅ 3× 03h55 |
| 36 | DocMorris | 1 526 | fingerprint | enrich-only fp+loose+fuzzy; known-only diário + full semanal | ✅ 3× 05h05 + seg 04h30 |
| 37 | Farmácia 365 | 1 416 | EAN | sitemap + JSON-LD; fila ∪ URLs do seed | ✅ 3× 16h |
| 38 | WOWFARMA | 1 411 | EAN + CNP | **feed KuantoKusta** /kkfeedwowfarma.xml (1 pedido) | ✅ 3× 07h25 |
| 39 | BeMeCare | 1 339 | CNP | Nuxt vm-eval __NUXT__ (sitemap 92% morto) | ✅ 3× 03h15 |
| 40 | My Cosmetics | 1 272 | EAN (+CNP) | Shopify + JSON-LD; preços via parsePriceEU | ✅ 3× 08h |
| 41 | byFarma | 1 260 | EAN | Magento + JSON-LD | ✅ 3× 12h |
| 42 | A Sua Farmácia Online | 1 248 | EAN/CNP | HTML; urlRefreshPass | ✅ 3× 21h |
| 43 | VallisPharma | 1 246 | EAN+CNP | prop Vue :product HTML-encoded | ✅ 3× 03h45 |
| 44 | Farmácia Portugal | 1 228 | CNP + EAN parcial | loja. subdomínio; sitemap_web + JSON-LD (sku=mpn=CNP) | ✅ 3× 09h20 |
| 45 | Smart Beauty | 985 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 46 | SoBeauty | 954 | EAN + CNP | sitemaps .xml.gz + JSON-LD; rate-limit agressivo | ❌ **só PC** |
| 47 | Hiper Farma | 894 | CNP | Shopify (sku=CNP); resolveBrand (vendor=distribuidor) | ✅ 3× 06h05 |
| 48 | Beleza37 | 866 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 49 | Farmácias Portuguesas | 863 | CNP | Magento; cookie pharmacy_code + pricingData | ✅ 3× 16h |
| 50 | Farmácia Camelo | 848 | CNP | DynamoCMS (clone vidamais); CNP no filename prod-{CNP}.png | ✅ 3× 04h15 |
| 51 | Care2Me | 827 | CNP+EAN parcial | sitemap + __GA3ProductDetail (JSON embebido) | ✅ 3× 04h40 |
| 52 | Quickfarma | 772 | CNP + EAN | WooCommerce; sitemap AIOSEO com CDATA | ✅ 3× 05h50 |
| 53 | Farmácia Vida+Mais | 758 | CNP + EAN parcial | Dynamo/Selenia SEM sitemap: all-products?p=N → data-ref | ✅ 3× 10h05 |
| 54 | Farmaoli | 752 | EAN (slug+checksum) | PrestaShop CDATA sitemap; slug-EAN vence tracking | ✅ 3× 07h35 |
| 55 | MiiN Cosmetics | 734 | EAN | PrestaShop microdata gtin13; preço meta product:price:amount (COM IVA) | ✅ 3× 05h45 |
| 56 | ATCosmetics | 700 | EAN | Shopify products.json; EAN = filename da imagem (checksum) | ✅ 3× 11h05 |
| 57 | Pharma2you | 649 | fingerprint | feed Google Merchant | ✅ 3× 17h |
| 58 | StoreKBeauty | 551 | EAN | Shopify /pt-pt products.json sku=EAN-13; cookie localization=PT | ✅ 3× 05h25 |
| 59 | PharmaVida | 449 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 06h20 |
| 60 | ShopCosmetics | 393 | EAN + CNP | PrestaShop 1_index_sitemap CDATA | ✅ 3× 02h30 |
| 61 | A Farmácia Online | 373 | EAN | JSON-LD + data-ean; fallback URLs-do-seed se WAF | ✅ 3× 18h |
| 62 | Manuela Serra | 372 | EAN/fp | HTML (Shopify) | ✅ 3× 06h |
| 63 | SKPRO | 365 | EAN (12+checksum) | PrestaShop; EAN-12 no slug + dígito calculado; preço og | ✅ 3× 10h35 |
| 64 | Perfumes4you | 348 | EAN | WooCommerce (sku=EAN-13) | ✅ 3× 04h35 |
| 65 | A Minha Farmácia Online | 265 | EAN | sitemap + JSON-LD | ✅ 3× 21h30 |
| 66 | HaemiSkin | 116 | EAN | sitemap + JSON-LD | ✅ 3× 20h |
| 67 | Farmácia 2U | 108 | CNP+EAN | sitemap-cemitério (mortos dão HTTP 200 → DEAD_RE); JSON-LD sku=mpn=CNP + gtin13 | ✅ 3× 03h45 |
| 68 | Farmácias Low Cost | 86 | CNP (~50%) | ASP.NET WebForms; CNP em hidden input; preço em div.pricebox (sem hífen!) | ✅ 3× 04h35 |
| 69 | Continente | 82 | fingerprint | known-only diário + full semanal (seg 04h) | ✅ 3× 02h15 |
| 70 | Pluricosmética | 64 | fingerprint | known-only diário + full semanal (seg 04h30) | ✅ 3× 02h45 |
| 71 | Pharmia | 1 | CNP | Woo; JSON-LD sku=CNP + meta product:price (overlap marginal) | ✅ 3× 04h55 |

**65/71 actualizam sozinhas na nuvem.** As 6 restantes precisam do PC: 5
**só-PC** (Cloudflare/WAF bloqueia datacenter mas o scraper Node/curl corre do
PC): Notino, Power Beauty, SoBeauty, Smart Beauty, Beleza37 — pares
scrape+integrate; e 1 **só-browser**: Skin (nem o PC passa por Node/curl —
ver secção própria abaixo).
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

### 🌐 Skin (skin.pt) — a loja SÓ-BROWSER (loja 71)
skin.pt está atrás de **Cloudflare Managed Challenge**: curl, Node e a nuvem
caem TODOS (até do PC — TLS/JS fingerprint); só um Chromium real passa, e o
cookie `cf_clearance` é httpOnly (não exportável). Refresh manual (~semanal),
browser-driven no Browser pane do Claude:
1. Abrir https://skin.pt e esperar o Challenge passar (fica na homepage real).
2. Colher **in-page** (o fetch herda o cookie): sitemaps
   `sitemap-product-1-1.xml` + `-1-2.xml` (~10.3k fichas), workers com delay
   ~300ms e **timeout por fetch** (AbortController 20s — sem ele um fetch
   pendurado congela o worker). Fichas multi-tamanho vêm como JSON-LD
   **ProductGroup** (`hasVariant[]` com sku=CNP e oferta POR tamanho).
3. Gravar os lotes como `chunk-*.b64` = base64(gzip(JSON)) por POST para um
   servidor local (contexto seguro 127.0.0.1 → sem mixed-content), depois:
   `node scripts/build-skin-catalog.js --dir=<chunks>` →
   `node scripts/integrate-skin-catalog.js`.
⚠️ Após ~10k pedidos a skin.pt **tar-pita** (aceita conexões sem responder,
tudo dá timeout) — pausar ≥30 min e retomar só a cauda em falta.
⚠️ **NÃO criar workflow .yml com schedule** para esta loja (nuvem = Challenge).

### 🌐 Skin (skin.pt) — a loja SÓ-BROWSER (loja 71)
skin.pt está atrás de **Cloudflare Managed Challenge**: curl, Node e a nuvem
caem TODOS (até do PC — TLS/JS fingerprint); só um Chromium real passa, e o
cookie `cf_clearance` é httpOnly (não exportável). Refresh manual (~semanal),
browser-driven no Browser pane do Claude:
1. Abrir https://skin.pt e esperar o Challenge passar (fica na homepage real).
2. Colher **in-page** (o fetch herda o cookie): sitemaps
   `sitemap-product-1-1.xml` + `-1-2.xml` (~10.3k fichas), workers com delay
   ~300ms e **timeout por fetch** (AbortController 20s — sem ele um fetch
   pendurado congela o worker). Fichas multi-tamanho vêm como JSON-LD
   **ProductGroup** (`hasVariant[]` com sku=CNP e oferta POR tamanho).
3. Gravar os lotes como `chunk-*.b64` = base64(gzip(JSON)) por POST para um
   servidor local (contexto seguro 127.0.0.1 → sem mixed-content), depois:
   `node scripts/build-skin-catalog.js --dir=<chunks>` →
   `node scripts/integrate-skin-catalog.js`.
⚠️ Após ~10k pedidos a skin.pt **tar-pita** (aceita conexões sem responder,
tudo dá timeout) — pausar ≥30 min e retomar só a cauda em falta.
⚠️ **NÃO criar workflow .yml com schedule** para esta loja (nuvem = Challenge).

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
| ~~farmaciaportugal.pt~~ | RESOLVIDO 2026-07-17: a loja real é **loja.**farmaciaportugal.pt (integrada como loja 58) — o domínio raiz é só institucional |
| parafarma24.com | Site em ES por default, sem sinal de envio PT / rota /pt |

### Varrimento COMPLETO da Google Sheet (2026-07-03)
91 domínios sondados (script probe em massa): **67 mortos** (DNS nem resolve),
~15 vivos sem EAN acessível (pluricosmetica, celeiro, organii, smartbeauty…),
4 protegidos (Sephora/Douglas 400-bot-wall, farmaciagarcia products.json
bloqueado, Perfumes&Companhia timeout). **Integrados: Primor + Perfume's Club.**
Pequenas viáveis por integrar (CNP no sku; sitemaps com 301 a resolver):
pharmascalabis.com.pt (WooCommerce), farmaciaideal.pt (Magento).

## Candidatas por explorar (estado do scouting 2026-07-22 — fila anterior TODA integrada)

| Loja | ~fichas | Bloqueio / nota |
|------|--------:|------------------|
| mass-perfumarias.pt | ? | mesmo Cloudflare Challenge da skin.pt — a receita só-browser da loja 71 deve replicar |
| douglas.pt | ~8 600 | Shopware, SEM EAN/CNP extraível — precisa fonte de EAN alternativa |
| aromas.es | ~10 900 | SFCC sem gtin13 — idem, fonte de EAN alternativa |

- **Auchan / El Corte Inglés Beauty** — mass-market, requer filtro da árvore de beleza (como o Continente known-only).
- Mais parafarmácias EU com storefront PT/EAN (como Cocooncenter): Easyparapharmacie, Cocooncenter .es/.it, etc.
- Re-sondar (falharam por erro de servidor no scouting): farmacias-progresso, vilapharma, farmaciasspt.
- koreanbeautyshopeu.com = dermis.pt (mesmo dono; redireciona) — já coberta pela loja 69.
