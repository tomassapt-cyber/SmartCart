# Registo de Lojas — CosMath

Referência de todas as lojas integradas, como cada uma é raspada, por que chave
casa, e se se actualiza sozinha na nuvem (GitHub Actions) ou precisa do PC.
Última actualização: 2026-06-29 · **21 lojas · ~49.000 ofertas**.

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

## As 21 lojas

| # | Loja | Ofertas | Chave | Técnica de scrape | Nuvem? |
|---|------|--------:|-------|-------------------|--------|
| 1 | Druni PT | 9.759 | EAN | sitemap + JSON-LD | ✅ 06h |
| 2 | SweetCare | 6.964 | EAN | sitemap + JSON-LD | ✅ 10h |
| 3 | Wells | 5.329 | EAN | sitemap + JSON-LD | ✅ 14h |
| 4 | Atida \| Mifarma | 4.212 | EAN | sitemap + JSON-LD | ✅ 15h |
| 5 | Loja da Farmácia | 4.165 | EAN | Magento + JSON-LD | ✅ 19h |
| 6 | Farmácia.pt | 3.349 | EAN | sitemap + JSON-LD | ✅ 17h |
| 7 | Bairro da Saúde | 2.922 | CNP | HTML | ✅ 05h |
| 8 | Easyfarma | 1.875 | CNP | HTML (barcode=CNP) | ✅ 04h |
| 9 | **Cocooncenter** 🆕 | 1.565 | EAN | sitemap-pt + JSON-LD; 410=descont. | ✅ 15h |
| 10 | Pharma GDD (FR) | 1.523 | EAN | sitemap + JSON-LD | ✅ 22h |
| 11 | Farmácia Barreiros | 1.410 | CNP | PrestaShop | ✅ 22h30 |
| 12 | Farmácia 365 | 1.271 | EAN | sitemap + JSON-LD | ✅ 16h |
| 13 | byFarma | 973 | EAN | Magento + JSON-LD | ✅ 12h |
| 14 | A Sua Farmácia Online | 945 | EAN/fp | HTML | ✅ 21h |
| 15 | **Farmácias Portuguesas** 🆕 | 704 | CNP | Magento; preço via cookie `pharmacy_code=09881` + JSON `pricingData` | ✅ 16h |
| 16 | **Notino** 🆕 | 703 | EAN | sitemap-categoria + JSON-LD; **via curl** | ❌ **só PC** |
| 17 | **Pharma2you** 🆕 | 362 | fingerprint | feed Google Merchant (sem EAN) | ✅ 17h |
| 18 | Manuela Serra | 360 | EAN/fp | HTML | ✅ 06h |
| 19 | A Farmácia Online | 353 | EAN | sitemap + JSON-LD | ✅ 18h |
| 20 | A Minha Farmácia Online | 219 | EAN | sitemap + JSON-LD | ✅ 21h30 |
| 21 | HaemiSkin | 72 | EAN | sitemap + JSON-LD | ✅ 20h |

🆕 = adicionadas em Jun 2026. Horários em UTC. **20/21 actualizam sozinhas na nuvem.**

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

## Candidatas VIÁVEIS por explorar (futuro)
- **Continente Online** — tem EAN+JSON-LD e é acessível, MAS catálogo dominado por
  mercearia (~120k); precisa de filtrar a árvore de categorias de beleza. Alto valor
  (preços de massa: Nivea, Garnier, CeraVe baratos) mas trabalhoso.
- **Auchan / El Corte Inglés Beauty** — idem (mass-market).
- Mais parafarmácias EU com storefront PT/EAN (como Cocooncenter): Easyparapharmacie,
  Cocooncenter .es/.it, etc.
