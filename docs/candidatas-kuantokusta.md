# Candidatas do KuantoKusta — lojas de cosmética que NÃO temos

Fonte: `kuantokusta.pt/lojas?areas=Saúde e Beleza` (lido via browser — o site tem
desafio anti-bot que bloqueia curl). Cruzado com as nossas 32 lojas.

**Estado: COMPLETO** — recolhidas **todas as letras A–Z** (~450 lojas na área
"Saúde e Beleza" → ~115 candidatas cosmética/farmácia/natural depois de filtrar
electrónica, brinquedos, pet, sex-shop, salões, etc.).

## ⚠️ Nota de método
O *slug* do KK (ex.: `farmacia2u`) **não é** o domínio real. Adivinhar
`<slug>.pt` acerta pouco (muitos deram "morto" por ser domínio errado, não por
estarem mortos). Resolver o domínio real via página `/lojas/<slug>` do KK OU
conhecimento do utilizador é o passo fiável antes de sondar/construir.

## ✓ Viável confirmada (por sondagem de domínio-palpite)
- **fastpharma.pt** — CNP (matchável via apply-cnp-merge). Sitemap em `/pt-pt/` —
  resolver caminho antes de construir.

## ~ Vivas, chave a confirmar (domínio-palpite acertou, mas EAN/CNP não detetado
no palpite — pode ter chave noutro caminho)
poupafarma · atuafarmacia (Shopify) · atcosmetics (Shopify) · all2skin (Shopify) ·
perfumes4you (Woo) · care2me · pharmavida (Presta) · shopcosmetics (Presta) ·
farmaoli (Presta) · skpro (Presta) · beleza37 · sobeauty · farmahome · dbcosmetic ·
farmacentral · pharmia

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
