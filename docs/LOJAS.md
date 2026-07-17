# Registo de Lojas — CosMath

Referência de todas as lojas integradas, como cada uma é raspada, por que chave
casa, e se se actualiza sozinha na nuvem (GitHub Actions) ou precisa do PC.
Última actualização: 2026-07-17 · **52 lojas · ~140 600 ofertas** no seed
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

## As 52 lojas

Ofertas contadas no seed em 2026-07-09. Horários em UTC; "3×" = três crons
diários (regra de cadência de 2026-07-03: lojas rápidas correm 3×/dia).

| # | Loja | Ofertas | Chave | Técnica de scrape | Nuvem? |
|---|------|--------:|-------|-------------------|--------|
| 1 | Atida (Mifarma) | 10 962 | EAN | sitemap + JSON-LD | ✅ 15h |
| 2 | Druni PT | 10 399 | EAN | sitemap + JSON-LD | ✅ 06h |
| 3 | Primor | 9 721 | EAN | Magento + JSON-LD (mpn=EAN); --dermo de 37k | ✅ 3× 02h |
| 4 | Notino | 9 221 | EAN | sitemap-categoria + JSON-LD; **via curl** | ❌ **só PC** |
| 5 | SweetCare | 8 283 | EAN | sitemap + JSON-LD | ✅ 10h+22h |
| 6 | Loja da Farmácia | 6 568 | EAN | Magento + JSON-LD | ✅ 3× 19h |
| 7 | Aveiro Farma | 5 796 | EAN (gtin14) | OpenCart + JSON-LD; servidor LENTO | ✅ 3× 11h |
| 8 | Wells | 5 614 | EAN | sitemap + JSON-LD | ✅ 14h |
| 9 | Perfume's Club | 4 656 | EAN | sitemap + JSON-LD (gtin13); --dermo por marca; retry anti soft-block; **nunca raspar do PC** | ✅ 3× 00h30 |
| 10 | Power Beauty | 4 241 | EAN | PrestaShop sitemap CDATA; Product é o 4º bloco JSON-LD | ❌ **só PC** |
| 11 | Farmácia.pt | 4 067 | EAN | sitemap + JSON-LD | ✅ 3× 17h |
| 12 | A Tua Farmácia | 3 927 | CNP | Shopify products.json (sku=CNP); **enrich-only por CNP directo** | ✅ 3× 06h40 |
| 13 | Pharma Scalabis | 3 873 | EAN + CNP | WooCommerce + JSON-LD (mpn=EAN) | ✅ 3× 01h30 |
| 14 | Cocooncenter | 3 724 | EAN | sitemap-pt + JSON-LD; 410=descont. | ✅ 3× 15h |
| 15 | Farmácia Virtual | 3 373 | CNP | WooCommerce (sku=CNP) | ✅ 3× 13h |
| 16 | Bairro da Saúde | 3 328 | CNP | HTML | ✅ 3× 05h |
| 17 | Nossa Farmácia | 3 308 | CNP | **VTEX API JSON** (productReference=CNP; paginar por subcategoria) | ✅ 3× 00h45 |
| 18 | Pharma GDD | 2 367 | EAN | sitemap + JSON-LD | ✅ 3× 22h |
| 19 | FastPharma | 2 292 | CNP + EAN | Magento sitemap_web flat (sku=mpn=CNP; gtin13 parcial) | ✅ 3× 01h15 |
| 20 | Pharmee | 2 287 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 06h25 |
| 21 | FarmaToGo | 2 192 | EAN+CNP | Shopify sitemaps + JSON-LD ficha-a-ficha | ✅ 3× 05h10 |
| 22 | Easyfarma | 1 976 | CNP | HTML (barcode=CNP) | ✅ 3× 04h |
| 23 | CosmeticFan | 1 950 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 05h50 |
| 24 | Unifarma | 1 863 | CNP | Shopify products.json (sku=CNP) | ✅ 3× 03h20 |
| 25 | Farmácia Ideal | 1 804 | EAN + CNP | mesma plataforma da Saúde Mayor | ✅ 3× 07h |
| 26 | Poupafarma | 1 695 | CNP (+EAN) | Jumpseller ficha-a-ficha (JSON-LD sku) | ✅ 3× 04h10 |
| 27 | Saúde Mayor | 1 693 | **EAN + CNP** | JSON-LD por regex (mpn=EAN, sku=CNP; JSON partido) | ✅ 3× 09h |
| 28 | Farmácia Barreiros | 1 639 | CNP | PrestaShop; fallback URLs-conhecidos se WAF | ✅ 3× 22h30 |
| 29 | GO-farma | 1 497 | EAN + CNP | Magento sitemap_products_pt (gtin13 + sku=CNP) | ✅ 3× 03h55 |
| 30 | Farmácia 365 | 1 404 | EAN | sitemap + JSON-LD; fila ∪ URLs do seed | ✅ 3× 16h |
| 31 | DocMorris | 1 371 | fingerprint | enrich-only fp+loose+fuzzy; known-only diário + full semanal | ✅ 3× 05h05 + seg 04h30 |
| 32 | WOWFARMA | 1 331 | EAN + CNP | **feed KuantoKusta** /kkfeedwowfarma.xml (1 pedido) | ✅ 3× 07h25 |
| 33 | My Cosmetics | 1 241 | EAN (+CNP) | Shopify + JSON-LD; preços via parsePriceEU | ✅ 3× 08h |
| 34 | byFarma | 1 217 | EAN | Magento + JSON-LD | ✅ 3× 12h |
| 35 | A Sua Farmácia Online | 1 187 | EAN/CNP | HTML; urlRefreshPass | ✅ 3× 21h |
| 36 | Smart Beauty | 946 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 37 | SoBeauty | 907 | EAN + CNP | sitemaps .xml.gz + JSON-LD; rate-limit agressivo | ❌ **só PC** |
| 38 | Farmácias Portuguesas | 855 | CNP | Magento; cookie pharmacy_code + pricingData | ✅ 3× 16h |
| 39 | Hiper Farma | 804 | CNP | Shopify (sku=CNP); resolveBrand (vendor=distribuidor) | ✅ 3× 06h05 |
| 40 | Beleza37 | 761 | EAN | plataforma SoBeauty (.xml.gz) | ❌ **só PC** |
| 41 | Care2Me | 732 | CNP+EAN parcial | sitemap + __GA3ProductDetail (JSON embebido) | ✅ 3× 04h40 |
| 42 | Quickfarma | 672 | CNP + EAN | WooCommerce; sitemap AIOSEO com CDATA | ✅ 3× 05h50 |
| 43 | Pharma2you | 582 | fingerprint | feed Google Merchant | ✅ 3× 17h |
| 44 | PharmaVida | 386 | EAN+CNP | sitemap + JSON-LD | ✅ 3× 06h20 |
| 45 | Manuela Serra | 371 | EAN/fp | HTML (Shopify) | ✅ 3× 06h |
| 46 | A Farmácia Online | 370 | EAN | JSON-LD + data-ean; fallback URLs-do-seed se WAF | ✅ 3× 18h |
| 47 | Perfumes4you | 346 | EAN | WooCommerce (sku=EAN-13) | ✅ 3× 04h35 |
| 48 | ShopCosmetics | 343 | EAN + CNP | PrestaShop 1_index_sitemap CDATA | ✅ 3× 02h30 |
| 49 | A Minha Farmácia Online | 257 | EAN | sitemap + JSON-LD | ✅ 3× 21h30 |
| 50 | HaemiSkin | 106 | EAN | sitemap + JSON-LD | ✅ 3× 20h |
| 51 | Continente | 82 | fingerprint | known-only diário + full semanal (seg 04h) | ✅ 3× 02h15 |
| 52 | Pluricosmética | 59 | fingerprint | known-only diário + full semanal (seg 04h30) | ✅ 3× 02h45 |

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

## Candidatas VIÁVEIS por explorar (fila do scouting 2026-07-16, por dimensão)

| Loja | ~fichas | Nota de extração |
|------|--------:|------------------|
| bemecare.pt | 2 400 | Nuxt: payload posicional — precisa vm-eval do JS, não é JSON direto |
| vidamais.pt | 2 000 | JSON-LD standard |
| lovemypharma.pt | 1 800 | JSON-LD standard |
| vallispharma.pt | 1 600 | JSON-LD standard |
| costume.pt | 1 500 | JSON-LD standard |
| skpro.pt | 1 100 | expõe EAN-12 → calcular dígito de controlo p/ EAN-13 |
| farmaoli.pt | 950 | EAN embutido nos slugs do sitemap (81% cobertura) |
| atcosmetics.pt | 900 | EAN nos nomes de ficheiro das imagens |
| farmacia2u.pt | 650 | JSON-LD standard |
| farmaciacamelo.pt | 600 | JSON-LD standard |
| lowcostfarma.pt | 487 | JSON-LD standard |
| pharmia.pt | 100 | JSON-LD standard |

- **Auchan / El Corte Inglés Beauty** — mass-market, requer filtro da árvore de beleza (como o Continente known-only).
- Mais parafarmácias EU com storefront PT/EAN (como Cocooncenter): Easyparapharmacie, Cocooncenter .es/.it, etc.
- Re-sondar (falharam por erro de servidor no scouting): farmacias-progresso, vilapharma, farmaciasspt.
