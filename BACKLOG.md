# GirlMath / SmartCart — Backlog (itens "para mais tarde")

> Lista de melhorias adiadas, para retomar quando fizer sentido. Não-urgentes.

## Frescura de preços
- [ ] **Scraping 2×/dia** nas lojas com promoções voláteis (pedido do utilizador, 2026-06-11).
      Como: mudar o `cron` dos workflows de 1× para 2× (ex: `0 8,20 * * *`).
      Cuidados: carga/politeness nos sites; minutos de GitHub Actions; escolher
      quais lojas (as grandes — druni/sweetcare/wells/pharma-gdd — são pesadas).
      Alternativa: 2× só nas lojas leves/rápidas + manter 1× nas pesadas.
- [ ] **Capturar desconto da byFarma** — o scraper põe `previous_price=null`
      (Next.js com classes CSS geradas; não deteta strikethrough). Extrair o
      preço antigo por outro campo → mostrar "−30%" deles nas Promoções.

## Portes / comparação
- [ ] **Custos de ilhas (Madeira/Açores) reais** para as lojas que ficaram com
      placeholder 1,50€. Já reais: bairro (23,05€), afarmaciaonline (11,55€),
      haemiskin, pharma-gdd. Continente está 100%.
- [ ] **Zona "Grande Lisboa"** como opção (algumas lojas têm tarifa/grátis local
      diferente: afarmaciaonline grátis, bairro/wells/sweetcare valores próprios).
- [ ] Confirmar custo PT real da **pharma-gdd** (atualmente estimativa ~12,90€).

## Mais lojas
- [ ] **Douglas PT** — precisa de ScrapingBee (DataDome). Em hold por custo.
- [ ] Candidatos EU maiores (Promofarma, Dosfarma, Atida.es, Newpharma) —
      bloqueiam HTTP simples (403). Precisariam de browser/ScrapingBee.
- [ ] Re-tentar nicho K-beauty/Shopify (korean-queens, cacau-chic) com
      descoberta de sitemap melhorada.

## Qualidade
- [ ] Melhorar tradução PT de nomes (deferido há várias sessões).
- [ ] v2 dos integradores parciais (asua/aminha): criar produtos NOVOS com
      categoria (a aminha traz breadcrumb fiável) em vez de só enriquecer.
