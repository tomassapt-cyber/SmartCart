# Mercado PT de Cosmética Online — Catálogo de Lojas

> Análise do panorama de e-commerce de cosmética em Portugal.
> Versão: 2026-05-07. Fonte: análise de mercado público + observação directa.
>
> **Estratégia**: tracking automático em ~20 lojas tier-1/tier-2 cobre
> >90 % do mercado consumidor PT. As tier-3+ entram conforme procura específica.

---

## Categorização das áreas de produto

| Área | Subcategoria | Marcas-tipo |
|---|---|---|
| **Perfumaria** | EDP/EDT/Colónia, Eau Fraîche | Chanel, Dior, YSL, Versace, Armani |
| **Skincare** | Sérum, Creme, Limpeza, Tónico, Máscara, Protector solar | Lancôme, Estée Lauder, Vichy, La Roche-Posay, CeraVe, Caudalie, Nuxe |
| **Maquilhagem** | Base, Corretor, Pó, Blush, Sombra, Eyeliner, Mascara, Batom | Maybelline, NARS, Charlotte Tilbury, MAC, Fenty, NYX, KIKO |
| **Cabelo** | Champô, Condicionador, Máscara, Óleo, Coloração, Stylers | L'Oréal, Kérastase, Redken, Olaplex, Moroccanoil, Schwarzkopf |
| **Corpo** | Hidratante, Esfoliante, Óleo, Solar, Auto-bronzeador | Rituals, Nivea, Bioderma, Caudalie, Nuxe |
| **Higiene** | Desodorizante, Champô íntimo, Saúde oral | Sanex, Dove, Rexona, Listerine |
| **Masculinos** | Barbear, After-shave, Hidratantes ele | Gillette, Nivea Men, Bulldog, L'Oréal Men |
| **Unhas** | Verniz, Tratamentos, Acessórios | OPI, Essie, KIKO, Sephora Collection |
| **Solar** | Protectores faciais, corporais, after-sun | La Roche-Posay Anthelios, Avène, ISDIN, Eucerin Sun |
| **Bebé / família** | Cremes, óleos, fraldas hipoalergénicas | Mustela, Klorane, Bübchen |

---

## Lojas de cosmética em Portugal — por tier

### TIER 1 — Especialistas em beleza puro-players (prioridade máxima do scraper)

| Loja | URL | Cobertura | Notas técnicas |
|---|---|---|---|
| **Notino PT** | notino.pt | Toda a perfumaria + skincare + makeup, descontos agressivos | SPA React, requer Playwright. Stock em tempo real. |
| **Sephora PT** | sephora.pt | Beleza premium, exclusivos LVMH | SPA React + lazy load. APIs internas em /api/v3/ |
| **Douglas PT** | douglas.pt | Pan-europeu, perfumaria + skincare | SSR Next.js, JSON-LD bem estruturado |
| **Druni PT** | druni.pt | Origem ES, cresceu PT desde 2022 | Magento 2, scraping mais simples |
| **Perfumes & Companhia** | perfumesecompanhia.pt | Cadeia portuguesa, lojas físicas + online | OpenCart, parsing Cheerio possível |
| **KIKO Milano PT** | kikocosmetics.com/pt-pt | Marca própria mass-market | SPA, requer Playwright |
| **Marionnaud PT** | marionnaud.pt | Perfumaria, presença reduzida em PT | Magento, frequente fora-de-stock |
| **Parfois Beauty** | parfois.com/pt | Linha beauty da Parfois | Salesforce Commerce, JSON-LD |

### TIER 2 — Generalistas e marketplaces com forte secção beauty

| Loja | URL | Notas |
|---|---|---|
| **El Corte Inglés Beauty** | elcorteingles.pt/beleza | Premium + marcas exclusivas; envia para PT continental |
| **Worten** | worten.pt/beleza-saude | Sonae, secção beauty crescente |
| **Continente Online** | continente.pt | Mass-market, marcas drugstore |
| **Auchan** | auchan.pt | Hipermercado, gama cosmética básica |
| **Pingo Doce Online** | mercadao.pt (via Mercadão) | Limitado mas presente |
| **Wook** | wook.pt | Foco em livros, mas tem ~200 SKUs cosmética |

### TIER 3 — Farmácias / parafarmácias online (foco dermo-cosmética)

| Loja | URL | Especialidade |
|---|---|---|
| **Wells** | wells.pt | Sonae, dermo-cosmética + perfumaria essencial |
| **Farmácia Online** | farmaciaonline.pt | Maior parafarmácia online PT |
| **Pharma2u** | pharma2u.pt | Farmácia 100 % online |
| **Bei.pt** | bei.pt | Beleza + saúde |
| **Farmácia Lemos** | farmacialemos.pt | Marcas de nicho, dermocosmética |
| **Farmácias Holon** | farmaciasholon.pt | Rede de farmácias com loja online |
| **Pharmacie de Mont Blanc PT** | montblanc-pt.pt | Importador, marcas francesas |

### TIER 4 — Lojas mono-marca (donas da marca, exclusivos)

| Loja | URL | Marca |
|---|---|---|
| **The Body Shop** | thebodyshop.com/pt-pt | The Body Shop |
| **Lush PT** | lush.com/pt | Lush |
| **Yves Rocher PT** | yves-rocher.pt | Yves Rocher |
| **L'Occitane PT** | pt.loccitane.com | L'Occitane |
| **Rituals PT** | rituals.com/pt-pt | Rituals |
| **MAC Cosmetics PT** | maccosmetics.pt | MAC |
| **Nivea Shop PT** | nivea.pt/loja | Nivea |
| **Avon PT** | avon.pt | Avon (modelo MLM mas tem e-commerce) |
| **Oriflame PT** | pt.oriflame.com | Oriflame |
| **Mary Kay PT** | marykay.pt | Mary Kay |

### TIER 5 — Especialistas em perfumaria

| Loja | URL | Notas |
|---|---|---|
| **Loja do Perfume** | lojadoperfume.com | Só perfumaria, preços competitivos |
| **iperfumes.pt** | iperfumes.pt | Perfumaria niche e mass |
| **Brasty.pt** | brasty.pt | Pan-europeu, preços baixos, fake-friendly via revisões |
| **Perfumes24** | perfumes24h.com | Cadeia espanhola, envia PT |
| **Perfumes Club PT** | perfumesclub.pt | Mass-market perfumes |
| **Fragrancenet PT** | fragrancenet.com | EUA mas envia PT, tarifas alfandegárias possíveis |

### TIER 6 — Sites internacionais que enviam para PT

| Loja | URL | Notas |
|---|---|---|
| **Lookfantastic PT** | lookfantastic.pt | THG, marcas premium + asiáticas |
| **Cult Beauty** | cultbeauty.co.uk | Envia PT, gama indie/niche |
| **Feelunique** | feelunique.com | THG, semelhante a Lookfantastic |
| **Beauty Bay** | beautybay.com | UK, makeup + skincare niche |
| **StyleKorean** | stylekorean.com | K-beauty, envio internacional |
| **YesStyle** | yesstyle.com | Asiático, K/J-beauty |
| **Maquillalia PT** | maquillalia.com | ES, gama indie |

### TIER 7 — Especialistas / outros

| Loja | URL | Notas |
|---|---|---|
| **Action PT** | action.com/pt-pt | Lojas físicas mass — sem e-commerce ainda |
| **Primor** | primor.eu | Cadeia ES, 1ª loja PT em 2024, online activo |
| **Beleza na Web** | belezanaweb.com.br | Brasil, envia PT para alguns SKUs |
| **Glamour PT** | glamour.pt | Pequeno e-commerce nacional |

---

## Estratégia de tracking — fases recomendadas

### Fase A — MVP (~6 lojas, já implementado no seed actual)
**Cobertura**: 80 % do volume — Notino + Sephora + Douglas + Druni + Parfois + Wook.
**Razão**: tier-1 puro-players + um drugstore + um generalista.

### Fase B — Expansão a 12 lojas (próximo deliverable)
Adicionar:
- **Wells** (drugstore #1)
- **Perfumes & Companhia** (cadeia PT histórica)
- **El Corte Inglés Beauty** (premium)
- **KIKO Milano** (mass-market próprio)
- **Loja do Perfume** (especialista perfumaria)
- **Pharma2u** (dermo-cosmética)

→ Cobertura estimada: **>92 %** do mercado consumidor PT.

### Fase C — Long-tail (15-20 lojas)
Sites mono-marca para utilizadores fiéis (Body Shop, Lush, Rituals, L'Occitane) +
sites internacionais (Lookfantastic) para K-beauty / niche.

### Fase D — Lojas físicas (parking, futuro)
Action, Primor, Yves Rocher (lojas) — quando arrancar a integração in-store
via app móvel com geofencing.

---

## Considerações técnicas para o scraper

### Sites SPA (precisam Playwright)
Notino, Sephora, KIKO, Lookfantastic, Cult Beauty, Beauty Bay.

### Sites SSR/MPA (basta HTTP + Cheerio na maioria das páginas)
Druni, Wells, Farmácia Online, Continente, ECI, Worten, Wook.

### Sites com APIs internas exploráveis
- **Sephora**: `/api/v3/products/{id}` retorna JSON limpo (mais rápido que renderizar página)
- **Lookfantastic**: GraphQL endpoint público em `/graphql`
- **El Corte Inglés**: API REST em `/api/sgfm/services/`

→ Worth investigar — pode reduzir tempo de scraping de 60min para 5min.

### Anti-bot / Rate limiting
| Loja | Política observada |
|---|---|
| Notino | Tolera 1 req/2 s; 1 req/s leva a 429 |
| Sephora | Cloudflare; precisa user-agent + Accept-Language realistas |
| Douglas | DataDome; rotation IP útil acima de 100 prods |
| Lookfantastic | Tolera bem requests sequenciais |
| Druni | Sem WAF agressivo |
| Wells | Sem WAF |

### GDPR / robots.txt
Todas as lojas têm `robots.txt` que **permite crawl de páginas de produto**
mas desencoraja `/checkout/`, `/conta/`, `/api/`. O scraper apenas visita
páginas públicas de produto — compliant.

---

## Roadmap de produtos no catálogo

### Estado actual (seed): 20 SKUs
- 5 perfumes, 7 skincare, 3 makeup, 2 hair, 2 body, 1 makeup-skincare híbrido

### Plano de expansão

| Categoria | Actual | Próximos +20 SKUs |
|---|---:|---|
| Perfumaria | 5 | +Bleu de Chanel, +Coco Mademoiselle, +Acqua di Giò, +La Vie Est Belle, +Light Blue D&G, +Sì Passione, +Bvlgari Aqva, +Paco Rabanne 1 Million |
| Skincare | 7 | +Drunk Elephant TLC Sukari, +The Ordinary Niacinamide, +Pixi Glow Tonic, +Avène Cleanance, +Eucerin Hyaluron-Filler, +ISDIN Fotoprotector |
| Makeup | 3 | +Fenty Pro Filt'r, +NYX Butter Gloss, +KIKO 3D Hydra Lipgloss, +MAC Ruby Woo |
| Cabelo | 2 | +Olaplex No.3, +Moroccanoil Treatment, +Pantene Pro-V, +Schwarzkopf BC |
| Solar | 0 | +La Roche-Posay Anthelios UVMune, +Avène SPF50+, +ISDIN Fusion Water |
| Masculinos | 0 | +Gillette Fusion ProGlide, +Nivea Men Sensitive, +Bulldog Original |
| Higiene | 0 | +Sanex Zero%, +Dove Original |

→ Total final: **~60 SKUs** distribuídos pelas categorias.
   Com 12 lojas × 60 produtos = ~720 entradas em `prices` (snapshot diário).

---

## Política de actualização de preços (princípio)

> **"Produtos persistem, preços actualizam"**

A arquitectura da BD já implementa este princípio:

1. Tabela `products` é estável — só cresce quando se adiciona um SKU novo.
2. Tabela `prices` é **append-only** com `scraped_at` — cada scraping insere
   uma nova linha, mantendo histórico completo.
3. View `latest_prices` resolve `DISTINCT ON (product_id, store_id) ORDER BY scraped_at DESC`
   para servir sempre a leitura mais recente.
4. Cache Redis com TTL 23 h é invalidado pelo job das 06h00 — garante que
   o "preço de hoje" reflecte o último scraping.
5. `price_alerts` regista variações ≥ 5 % para o dashboard admin.

Resultado: **adicionar uma loja nova ou um produto novo não muda o esquema** —
basta inserir registos. O scraper descobre os novos targets automaticamente
ao consultar `latest_prices` na sua função `fetchTargets()`.
