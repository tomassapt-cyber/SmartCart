# Glammy — loja «só produtos existentes» por fichas JSON-LD (preparada a 14/10/2026)

**Loja:** glammy.pt, ou seja, a Farmácia de Gualtar (Farmácia Amado Braga Unipessoal Lda, NIPC 506489760, Braga). Os [termos](https://www.glammy.pt/pt/informacao-legal/termos-e-condicoes_404.html) dizem que os preços incluem IVA.

**Regra:** a loja acrescenta **apenas ofertas a produtos que o catálogo já tem** (`scripts/lib/integrar-existentes.js`, com `semCodigosInternos`).

## Recolha (`scripts/lib/fichas-existentes.js`)

A loja não tem API. A recolha segue estes passos:

1. Lê o mapa do site em português (`sitemaps/sitemap_products_pt_1.xml`, ~3 600 fichas `_pNNNN.html`).
2. Lê o JSON-LD `Product` de cada ficha: `gtin`, `offers.price`, o preço riscado (`priceSpecification` com `StrikethroughPrice`) e `availability`.
3. Cumpre as mesmas regras da recolha das lojas Shopify:
   - bot declarado;
   - `robots.txt` cumprido;
   - **`Crawl-delay` cumprido** (a loja pede 1 s; usamos 1,5 s);
   - paragem sem gravar ao primeiro 403/429, página de desafio ou redireção para outro domínio;
   - não grava se mais de 10% das fichas falharem.
4. Descodifica as páginas pelo charset do cabeçalho: a Glammy serve **windows-1252**, e a `fichas-jsonld.js` antiga leria tudo como UTF-8 e estragaria os acentos.

Uma corrida leva **~105 min** (3 636 fichas a 1,5 s), por isso o workflow `glammy-catalog.yml` corre **1×/dia** (03:11 UTC) com 150 min de limite.

## Ensaio (14/10, recolha completa no PC, `--dry-run` sobre `e300edf`)

**Recolha:** 3 636 fichas lidas sem falhas nem bloqueios; 3 027 com GTIN e preço, 606 sem GTIN, 3 sem JSON-LD.

**Integração:**
- **2 451 ofertas** em produtos existentes, das quais **1 568 em stock**;
- **0 produtos novos**;
- seed +1,0 MB;
- nível de preço **0,93×** a mediana das outras lojas, a mais barata em 13%.

**Conflitos (158; ficam no relatório e não entram):**
- 112 códigos internos (prefixo 2): 31 deles existem no catálogo, quase sempre o mesmo suplemento ou medicamento;
- 21 casos com dois preços para o mesmo volume;
- 17 unidades diferentes;
- 8 volumes que o produto ainda não tem.

## Portes (`store-shipping.json`)

Continente:
- casa 3,95 € abaixo de 45 €, grátis a partir de 45 € (exceto leites);
- pickup 2,50 € abaixo de 30 €, grátis a partir de 30 €.

Ilhas: 14 €, grátis acima de 150 €.

O formato só tem um limiar de portes grátis. Por isso o grátis do pickup a partir de 30 € e o grátis nas ilhas acima de 150 € ficam só no texto do ponto e nesta nota. Nas ilhas, o site pode mostrar portes grátis acima de 45 €, quando na verdade não há.

## Testes

`node scripts/test-fichas-existentes.js`, sem rede, cobre:
- o `Crawl-delay` e o charset windows-1252;
- o JSON-LD com preço riscado, os 404, as fichas sem GTIN e os ensaios parciais;
- as paragens em 403, 429, desafio e `robots.txt`, e o limite de falhas;
- a integração com a configuração real da loja, incluindo a recusa dos códigos internos e das fichas fora de `/pt/`.
