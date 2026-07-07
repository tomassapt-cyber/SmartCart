# Candidatas do KuantoKusta — lojas de cosmética que NÃO temos

Fonte: `kuantokusta.pt/lojas?areas=Saúde e Beleza` (lido via browser — o site tem
desafio anti-bot que bloqueia curl). Cruzado com as nossas 32 lojas.

**Estado: PARCIAL** — recolhidas as letras **A–D, F, P, S** (~200 lojas → 73
candidatas cosmética/farmácia). Faltam E, G–O, Q, R, T–Z.

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

## Lista completa de candidatas (A–D, F, P, S) — 73
### Farmácias PT
365farma, a-farmacia-portuguesa, a-tua-farmacia, aminhafarmaciapt(≈temos?), consigo-na-saude,
cuidapt, fahma, farmacentral, farmacia2u, farmacia-alves, farmacia-aquemtejo, farmacia-camelo,
farmacia-carvalho, farmacia-da-liga, farmacia-darrabida, farmacia-do-costume, farmacia-do-fluvial,
farmacia-fronteira, farmacia-mirafoz, farmacia-nova-da-maia, farmacia-num-clique,
farmacia-perto-de-mim, farmacia-santa-marta, farmacias-low-cost, farmacias-progresso, farmaciasspt,
farmacia-termal, farmacia-vida-mais, farma-home, farmaoli, farma-to-go, farmavalley, fastpharma,
pharma-to-heal, pharmavida, pharmee, pharmia, poupafarma, bemecare

### Cosmética / parafarmácia / beleza
all2skin, a-perfumaria-portuguesa, atcosmetics, aurox-health, balsamica-natural-cosmetics,
beauty-atelier, beautyon, beauty-skin-and-makeup, beauty-to-purity, beleza37, bellishopping,
blend-beauty, care2me, conceal-fiber, coserty-beauty-shop, cosmeticfan, cs-cosmeticos, db-cosmetic,
dermis, perfumario, perfumes4you, perfumes-arabes, powerbeauty, shopcosmetics, skin, skpro,
smartbeauty, sobeauty, sweetlife

### Natural / bio / suplementos
area-bio, celeiro-da-vila, celeiro-de-miraflores

## Já temos (referência)
365farma≈farmacia365, atida, aveiro-farma, byfarma, farmacia-virtual, perfumes-club,
pharma-scalabis, saude-mayor, sweetcare, aminhafarmaciapt≈aminhafarmaciaonline

## Próximos passos
1. Completar as letras em falta (E, G–O, Q, R, T–Z).
2. Resolver domínios reais (via KK) das candidatas prioritárias.
3. Sondar EAN/CNP + envio PT; construir as viáveis (scraper+integrador+workflow).
