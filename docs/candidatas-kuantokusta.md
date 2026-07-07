# Candidatas do KuantoKusta — lojas de cosmética que NÃO temos

Fonte: `kuantokusta.pt/lojas?areas=Saúde e Beleza` (lido via browser — o site tem
desafio anti-bot que bloqueia curl). Cruzado com as nossas 32 lojas.

**Estado: COMPLETO** — recolhidas **todas as letras A–Z** (~450 lojas na área
"Saúde e Beleza" → ~115 candidatas cosmética/farmácia/natural depois de filtrar
electrónica, brinquedos, pet, sex-shop, salões, etc.).

## ⚠️ Nota de método
O *slug* do KK (ex.: `farmacia2u`) **não é** o domínio real. Mas a página
`/lojas/<slug>` do KK dá, no botão "Mais informação": **nome legal + NIF +
morada + país de expedição** e, na barra lateral, a **contagem de produtos em
"Saúde e Beleza"** = métrica direta de *poder de comparação* da loja.
(Recolhido via browser — o KK bloqueia curl 403.)

---

## ⭐ SHORTLIST SONDADA AO VIVO (2026-07-07) — contagem cosmética + chave de matching

Ordenado por nº de produtos de cosmética no KK. Chave sondada no domínio real
(products.json / JSON-LD da ficha). **Todas estas são farmácias/parafarmácias PT
que carregam as MESMAS marcas dermo que já temos (LRP, Uriage, Isdin, Bioderma,
Eucerin, Avène) → comparação cross-store real por CNP/EAN.**

| Loja (domínio) | Cosm. no KK | Plataforma | Chave sondada | Veredicto |
|---|---:|---|---|---|
| **a-tua-farmacia** (atuafarmacia.pt) | **8095** | Shopify | CNP no `sku` (10113/10482) + EAN nalguns | ✅ **CONSTRUÍDA (33ª loja)** — 3343 ofertas por CNP |
| **poupafarma.pt** | **2802** | slug/custom | **EAN-13** no `sku` do JSON-LD | ⭐ CONSTRUIR |
| **farmacentral.pt** | **2686** | custom `/pt/` | JSON-LD não server-side (JS?) | ~ viável, + trabalho |
| **unifarma.pt** | **1936** | Shopify | **CNP** no `sku` do JSON-LD | ✓ CONSTRUIR |
| **fastpharma.pt** | **1295** | Magento | **CNP** (confirmada antes) | ✓ CONSTRUIR |
| **farmavalley.com** (Salus2Be) | 1089 | Presta | sitemap difícil (sem robots) | ~ + trabalho |
| **quickfarma.pt** | 990 | Woo | **CNP** no `sku` do JSON-LD | ✓ CONSTRUIR |
| **shopcosmetics.pt** (Farm. Brito Martins) | 905 | Presta | **EAN-13 + CNP** no JSON-LD | ⭐ CONSTRUIR — chaves ótimas |
| atcosmetics.pt (Fun Fashion) | 932 | Shopify | products.json SEM barcode (makeup) | enrich-only por fingerprint |

**Descartadas na sondagem** (contagem baixa ou sem overlap de comparação):
all2skin (46, só marca-nicho Schrammek) · mccm-medical-cosmetics (196, marca
própria — 0 overlap) · global-cosmetics (97, nicho Cocosolis/Geomar) ·
magicpharma (15, material clínico, não cosmética).

**Prioridade de construção recomendada** (chave forte + catálogo grande, padrão
enrich-only por CNP/EAN como as farmácias que já temos):
1. ✅ **a-tua-farmacia** (8095, CNP) — FEITA (33ª loja). products.json com sku=CNP;
   match CNP directo contra o seed (guarda de marca+volume), enrich-only, 0
   produtos novos. 3343 ofertas, 0 outliers de preço. **Lição: o rate-limit do
   products.json (429 após ~12 páginas) era só cooldown do meu burst local — a
   nuvem (IP fresco, pacing 1.5s) apanhou as 10482 páginas de uma vez.**
2. ✅ **unifarma** (1936, CNP) — FEITA (34ª): Shopify products.json sku=CNP, clone
   directo do padrão; 1750 CNP → 1631 ofertas, 0 outliers.
3. ✅ **poupafarma** (2802, CNP+EAN) — FEITA (35ª): Jumpseller, ficha-a-ficha
   (JSON-LD sku=CNP; sem products.json); 1486 CNP → 1456 ofertas. **Apanhou o bug
   do filtro não-cosmética** (plurais: comprimidos/cápsulas escapavam ao \b) →
   novo `isNonCosmetic` partilhado em product-fingerprint.js, aplicado às 4.
4. ✅ **quickfarma** (990, CNP+EAN) — FEITA (36ª): WooCommerce/All-in-One-SEO
   (sitemap com <loc> em CDATA → locs() adaptado); 470 CNP + 112 EAN → 571 ofertas.
5. ⏳ **shopcosmetics** (905, EAN+CNP) — EM CURSO: PrestaShop, /1_index_sitemap.xml
   CDATA, fichas /<cat>/<id>-slug.html, gtin13+sku=CNP.
6. **fastpharma** (1295, CNP) — Magento, próxima.
7. Depois: farmacentral / farmavalley (precisam resolver render JS / sitemap).

**Padrão reutilizável (farmácia CNP enrich-only)** — para as próximas: scraper
lê products.json (ou JSON-LD) e guarda `cnp`/`ean`; integrador constrói índice
CNP→produto dos catálogos (como apply-cnp-merge, join por URL) e casa por CNP +
guarda de marca + guarda de volume; NUNCA cria. Ver
`scrape-atuafarmacia-catalog.js` + `integrate-atuafarmacia-catalog.js`.

## Candidatas por sondar (não visitadas ao vivo ainda)
Farmácias: farmacia-camelo, farmacia-do-costume, nossa-farmacia, wow-farma,
go-farma, hiper-farma, ia-farma, 365farma, farmacias-low-cost, poupafarma-afins.
Parafarmácia/beleza: care2me, powerbeauty, smartbeauty, perfumes4you, cosmeticfan,
beleza37, sobeauty, skpro, sweetlife. (Verificar contagem + chave pelo mesmo método.)

---

## Lista completa de candidatas por categoria (A–Z)

### Farmácias PT (~55)
365farma, a-farmacia-portuguesa, a-tua-farmacia, aminhafarmaciapt(≈temos),
consigo-na-saude, cuidapt, fahma, farmacentral, farmacia2u, farmacia-alves,
farmacia-aquemtejo, farmacia-camelo, farmacia-carvalho, farmacia-da-liga,
farmacia-darrabida, farmacia-do-costume, farmacia-do-fluvial, farmacia-fronteira,
farmacia-mirafoz, farmacia-nova-da-maia, farmacia-num-clique, farmacia-perto-de-mim,
farmacia-santa-marta, farmacias-low-cost, farmacias-progresso, farmaciasspt,
farmacia-termal, farmacia-vida-mais, farma-home, farmaoli, farma-to-go, farmavalley,
fastpharma, go-farma, hiper-farma, ia-farma, loja-da-farmacia, love-my-pharma,
magicpharma, nossa-farmacia, pharma-to-heal, pharmavida, pharmee, pharmia, poupafarma,
quickfarma, unifarma, vallispharma, vilapharma, wow-farma, bemecare, healtsy, zincomed

### Cosmética / parafarmácia / beleza / perfumaria (~45)
all2skin, a-perfumaria-portuguesa, atcosmetics, aurox-health, balsamica-natural-cosmetics,
beauty-atelier, beautyon, beauty-skin-and-makeup, beauty-to-purity, beleza37, bellishopping,
blend-beauty, care2me, conceal-fiber, coserty-beauty-shop, cosmeticfan, cs-cosmeticos,
db-cosmetic, dermis, ecoaura, glammy, global-cosmetics, glowin, glowup, hicoscal,
humanus-store, lisbon-glam, likesun, lovewithsugar, lowell-europe, mabeauty, makeupstuff,
mccm-medical-cosmetics, miss-shampoo, mr-vanitysoul, my-skin-zone, newglow,
new-scent-perfumaria, orabem, perfumario, perfumes4you, perfumes-arabes, powerbeauty,
rosmarinus, royalbeards, shopcosmetics, skin, skpro, smartbeauty, sobeauty, sweetlife,
the-beauty-corner, thinkinbeauty, tons-purpura, total-care, vegas-cosmetics, villa-mentha

### Natural / bio / ervanária / suplementos (~20)
area-bio, celeiro-da-vila, celeiro-de-miraflores, energia-em-equilibrio, enetural,
ervanaria-natura, girassol, im-nat, lifenatura, mais-nutricao, my-true-bio, naturafeet,
naturalmente, naturalmente-aromas, natura-shop, naturibio, naturvidapt, nutribem, nutribio,
terra-pura-ecoloja, vitanutri, viva-bem, zumub

## Já temos (referência — não recandidatar)
365farma≈farmacia365, atida, aveiro-farma, byfarma, easyfarma, farmacia-virtual,
manuela-serra, my-cosmetics, notino, perfumes-club, pharma-scalabis, saude-mayor,
sweetcare, wells, aminhafarmaciapt≈aminhafarmaciaonline

## Fora de âmbito (recolhidas mas descartadas)
Electrónica/gaming/info (iservices, xiaomi-store, jovitronica, klack, kontrolsat…),
brinquedos (kika-toys), pet (wepet, hortanimal), sex-shop (vipsex, ea-sexshop),
salões/serviços (japan-head-spa, jean-louis-david — não são e-commerce de produto),
ortopedia/ajudas técnicas, vestuário, livros.

## Próximos passos (decisão do utilizador antes de construir)
1. ✅ Lista completa A–Z — **feito**.
2. Priorizar ~10-15 candidatas com mais potencial de *comparação* (farmácias grandes
   com EAN: farmacia2u, poupafarma, farmavalley, unifarma, quickfarma; parafarmácias
   com marcas de dermo: atcosmetics, shopcosmetics, all2skin, mccm-medical-cosmetics).
3. Resolver domínios reais (via página `/lojas/<slug>` do KK) das prioritárias.
4. Sondar EAN/CNP + envio PT; construir as viáveis (scraper+integrador+workflow),
   sempre no padrão enrich-only (mais comparação, não produtos novos) salvo indicação.
