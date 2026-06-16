# GirlMath / SmartCart — Backlog (itens "para mais tarde")

> Lista de melhorias adiadas, para retomar quando fizer sentido. Não-urgentes.

## Frescura de preços
- [ ] **Scraping 2×/dia** nas lojas com promoções voláteis (pedido do utilizador, 2026-06-11).
      Como: mudar o `cron` dos workflows de 1× para 2× (ex: `0 8,20 * * *`).
      Cuidados: carga/politeness nos sites; minutos de GitHub Actions; escolher
      quais lojas (as grandes — druni/sweetcare/wells/pharma-gdd — são pesadas).
      Alternativa: 2× só nas lojas leves/rápidas + manter 1× nas pesadas.
- [ ] **Capturar descontos (11 lojas a 0%)** — secção Promoções + % poupança.
      Já capturam: wells, easyfarma, sweetcare, bairro, farmaciapt.
      Estado por loja (investigado 2026-06-15):
      - **barreiros**: ✅ FEITO (price_without_reduction, aditivo) — ativa quando houver promo.
      - **druni / atida**: têm preço antigo no DOM mas o selector mudou
        (`.text-product-price-old` já não bate / Magento). Precisa inspeção LIVE
        com Playwright para achar o selector atual.
      - **pharma-gdd / loja-farmacia**: o JSON-LD só expõe o preço de venda
        (sem listPrice/priceSpecification original). Preciso doutra fonte na página.
      - **byFarma**: Next.js, classes CSS geradas — sem strikethrough detetável.
      - **afarmaciaonline / asua / aminha / farmacia365**: têm marcador de desconto
        mas falta localizar o VALOR do preço antigo (data-layer/JS).
      NOTA: não forçar — descontos falsos destroem confiança. Só capturar quando
      o preço original é fiável e claramente > preço atual.

## Portes / comparação
- [ ] **Custos de ilhas (Madeira/Açores) reais** para as lojas que ficaram com
      placeholder 1,50€. Já reais: bairro (23,05€), afarmaciaonline (11,55€),
      haemiskin, pharma-gdd. Continente está 100%.
- [ ] **Zona "Grande Lisboa"** como opção (algumas lojas têm tarifa/grátis local
      diferente: afarmaciaonline grátis, bairro/wells/sweetcare valores próprios).
- [ ] Confirmar custo PT real da **pharma-gdd** (atualmente estimativa ~12,90€).

## Mais lojas
### Vertical de cabelo (iniciada 2026-06-16)
- [x] **Manuela Serra** (manuelaserra.com) — FEITO, 17ª loja. Shopify, 412
      produtos, cabelo salão (Redken/Milk Shake/Truss). 101 pares comparáveis.
- [ ] **cabelos.pt / beautyshop.pt** — DIFERIDA. Magento, 100% cabelo, mas o
      sitemap só lista categorias (não produtos) e NÃO há EAN em dados
      estruturados → precisa crawl de categorias + Playwright/DOM. Reavaliar se
      valer a pena (irmã 100%-cabelo da manuelaserra).
- [ ] **lojadocabeleireiro.com** — WooCommerce, sem sitemap de produtos
      acessível (Yoast 404); descoberta de URLs trabalhosa. A reavaliar.
- [ ] **perfumesecompanhia.pt** — Magento, 1306 produtos, beleza geral (não só
      cabelo); EAN não está no JSON-LD (ver DOM). Grande mas esforço médio-alto.
- [ ] **Manuela Serra — portes de ilhas** (Madeira/Açores): placeholder 3,40€
      (= Continente). A política só publica Continente; confirmar valor real.
- [ ] **Douglas PT** — precisa de ScrapingBee (DataDome). Em hold por custo.
- [ ] Candidatos EU maiores (Promofarma, Dosfarma, Atida.es, Newpharma) —
      bloqueiam HTTP simples (403). Precisariam de browser/ScrapingBee.
- [ ] Re-tentar nicho K-beauty/Shopify (korean-queens, cacau-chic) com
      descoberta de sitemap melhorada.

## Qualidade
- [ ] Melhorar tradução PT de nomes (deferido há várias sessões).
- [ ] v2 dos integradores parciais (asua/aminha): criar produtos NOVOS com
      categoria (a aminha traz breadcrumb fiável) em vez de só enriquecer.
- [ ] **Over-merge legado (limpo 2026-06-16, vigiar recorrência)**: o fuzzy
      matching antigo fundiu produtos distintos sob um EAN; ofertas erradas
      ficaram congeladas no seed. Purgados 10 produtos via
      `scripts/purge-corrupt-merges.js` (deteta ofertas com >=2 marcas
      distintas nos URLs). RE-CORRER esse script de vez em quando (--dry-run
      primeiro) para apanhar novos casos. O próximo scrape recria os purgados
      corretos (fuzzy está off).
- [ ] **`isRealEan` aceita 8 dígitos** (`/^\d{8,14}$/`) nos integradores — um
      EAN curto/placeholder (ex.: 42398110) pode agir como íman e ser
      sobrescrito pelo side-effect EAN-overwrite. Avaliar exigir >=12 dígitos
      (GTIN-12/13/14) com cuidado (afeta matching de todas as lojas). NÃO
      mudado ainda por risco; só documentado.
- [ ] **Variantes contaminadas (druni FEITO)**: druni agora só aceita variante
      cujo URL aponta p/ o MESMO produto. wells/sweetcare deixados como estão
      (URL próprio por tamanho; 0% contaminação medida — filtro same-path
      partiria variantes legítimas). Se aparecer contaminação lá, usar
      overlap-de-tokens em vez de same-path.
