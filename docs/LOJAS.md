# Registo de Lojas — CosMath

Referência de todas as lojas integradas, como cada uma é raspada, por que chave
casa, e se se actualiza sozinha na nuvem (GitHub Actions) ou precisa do PC.
Última actualização: 2026-07-02 · **25 lojas · ~71.000 ofertas** (seed).

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

## As 25 lojas

| # | Loja | Ofertas | Chave | Técnica de scrape | Nuvem? |
|---|------|--------:|-------|-------------------|--------|
| 1 | Atida \| Mifarma | 10.375 | EAN | sitemap + JSON-LD | ✅ 15h |
| 2 | Druni PT | 9.849 | EAN | sitemap + JSON-LD | ✅ 06h |
| 3 | SweetCare | 8.250 | EAN | sitemap + JSON-LD | ✅ 10h |
| 4 | Wells | 5.475 | EAN | sitemap + JSON-LD | ✅ 14h |
| 5 | **Aveiro Farma** 🆕 | 4.821 | EAN | OpenCart + JSON-LD (gtin14); servidor LENTO (PHP 5.6, ~15s/pedido) — timeouts generosos | ✅ 11h |
| 6 | Loja da Farmácia | 4.284 | EAN | Magento + JSON-LD | ✅ 19h |
| 7 | Farmácia.pt | 3.716 | EAN | sitemap + JSON-LD | ✅ 17h |
| 8 | Notino | 3.647 | EAN | sitemap-categoria + JSON-LD; **via curl** | ❌ **só PC** |
| 9 | Cocooncenter | 3.272 | EAN | sitemap-pt + JSON-LD; 410=descont. | ✅ 15h |
| 10 | Bairro da Saúde | 3.020 | CNP | HTML | ✅ 05h |
| 11 | **Farmácia Virtual** 🆕 | 2.092 | CNP | sitemap + JSON-LD | ✅ 13h |
| 12 | Pharma GDD (FR) | 2.040 | EAN | sitemap + JSON-LD | ✅ 22h |
| 13 | Easyfarma | 1.899 | CNP | HTML (barcode=CNP) | ✅ 04h |
| 14 | Farmácia Barreiros | 1.399 | CNP | PrestaShop | ✅ 22h30 |
| 15 | Farmácia 365 | 1.286 | EAN | sitemap + JSON-LD | ✅ 16h |
| 16 | byFarma | 1.067 | EAN | Magento + JSON-LD | ✅ 12h |
| 17 | A Sua Farmácia Online | 963 | EAN/fp | HTML | ✅ 21h |
| 18 | **Saúde Mayor** 🆕 | 920 | **EAN + CNP** | plataforma própria + JSON-LD (`mpn`=EAN, `sku`=CNP — chave dupla) | ✅ 09h |
| 19 | **My Cosmetics** 🆕 | 820 | EAN (+CNP) | Shopify + JSON-LD (gtin13; `sku`=CNP em ~99%) | ✅ 08h |
| 20 | Farmácias Portuguesas | 701 | CNP | Magento; preço via cookie `pharmacy_code=09881` + JSON `pricingData` | ✅ 16h |
| 21 | Pharma2you | 384 | fingerprint | feed Google Merchant (sem EAN) | ✅ 17h |
| 22 | Manuela Serra | 366 | EAN/fp | HTML | ✅ 06h |
| 23 | A Farmácia Online | 351 | EAN | sitemap + JSON-LD | ✅ 18h |
| 24 | A Minha Farmácia Online | 221 | EAN | sitemap + JSON-LD | ✅ 21h30 |
| 25 | HaemiSkin | 75 | EAN | sitemap + JSON-LD | ✅ 20h |

🆕 = adicionadas em Jul 2026. Horários em UTC. **24/25 actualizam sozinhas na nuvem.**
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

### ⚠️ Notino — a excepção (snapshot manual)
A Notino tem **Cloudflare** que bloqueia o **fetch do Node** (TLS fingerprint do
undici → 403); o scraper contorna via **curl**. MAS o Cloudflare também bloqueia
o **IP de datacenter do GitHub Actions** → não corre na nuvem. Foi publicada como
**snapshot** (preços congelados). Para refrescar, correr **do PC**:
```
node scripts/scrape-notino-catalog.js --resume
node scripts/integrate-notino-catalog.js
```
O `notino-catalog.yml` tem o `schedule` comentado (só `workflow_dispatch`).
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

## Candidatas VIÁVEIS por explorar (futuro)
- **Continente Online** — tem EAN+JSON-LD e é acessível, MAS catálogo dominado por
  mercearia (~120k); precisa de filtrar a árvore de categorias de beleza. Alto valor
  (preços de massa: Nivea, Garnier, CeraVe baratos) mas trabalhoso.
- **Auchan / El Corte Inglés Beauty** — idem (mass-market).
- Mais parafarmácias EU com storefront PT/EAN (como Cocooncenter): Easyparapharmacie,
  Cocooncenter .es/.it, etc.
