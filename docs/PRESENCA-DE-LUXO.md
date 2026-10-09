# Presença de Luxo — proposta de integração

## Estado
Proposta em rascunho. Não integrada no `main` nem em produção; ainda não deve ser acrescentada ao Excel como concluída. Nenhuma chamada ou escrita no Supabase.

Base revalidada: `4f913ae83196cc8ca6f3b1ff3ab0f0560d93c475`. Os 823 ficheiros da base foram verificados contra os hashes Git oficiais. Preservados todos os produtos, lojas e ofertas anteriores.

## Contagens verificadas
- Produtos existentes antes/depois: 85105 / 85105; **zero produtos novos**.
- Lojas antes/depois da proposta: 99 / 100.
- Ofertas acrescentadas na proposta: **1047**, 1047 ativas e 0 inativas.
- Ofertas totais antes/depois: 286477 / 287524.
- Imagens alteradas: 0. A auditoria disponível não sinalizou imagens ausentes, placeholders ou erros nos produtos correspondentes; não se afirma uma verificação HTTP nova de todas as imagens.
- Crescimento do JSON compacto: 470265 bytes. Escritas na BD: **0**; não representa crescimento físico do Postgres.

## Recolha e identidade
Recolha pública entre 2026-10-09T01:57:04.584413+00:00 e 2026-10-09T02:50:59.190539+00:00: 1198 URLs alvo, 1070 linhas válidas com IVA, 124 exclusões na extração. Motivos: `{"visible product data disagree with schema": 75, "stock/order contradiction": 34, "unverified price/currency/URL": 10, "ambiguous/missing Product schema": 1, "conflicting duplicate GTIN": 4}`.

Revalidação contra a base atual: 0 identificadores sem correspondência, 23 conflitos excluídos na integração. O sitemap inclui 7076 identificadores não encontrados e 113 códigos inválidos. Não se criam produtos por falta de correspondência.

O índice verifica EAN exato, UPC normalizado, identificadores antigos e aliases documentados; nomes alternativos são avaliados pela impressão marca/nome/quantidade. Candidatos incertos ficam em `presencadeluxo-revisao-identidade.json`. O gel Inocos `5600355751449` é candidato ao existente `5600355736804`; a [fonte oficial](https://www.inocos.com/product/builder-gel-classic-inocos-transparente-de-media-viscosidade-50g) confirma nome/quantidade e referência 81.01.077, mas não a equivalência dos dois códigos. Foi excluído, sem criar outro produto.

Os preços principais do JSON-LD desta loja são sem IVA. O scraper utiliza exclusivamente o valor explícito «com IVA», confrontando EAN, URL, preço líquido e dados da ficha. Exemplo verificado: Rickiparodi B39 `5600482307885`, 3,88 € líquidos / **4,77 € com IVA**. Dez fichas foram confirmadas no browser. Artigos com variantes de atributo não validadas, portes suplementares ou contradições ficam excluídos.

Comparação de preços: 476 produtos ativos com identidade, quantidade e unidade iguais a outras ofertas. Rácio mediano da loja face à mediana das outras lojas: 1.020537132149628; 149 abaixo do menor preço comparável. Valores incluem IVA e excluem portes.

## Portes — custo desconhecido, sem valor inventado
A [página oficial de envios](https://presencadeluxo.pt/content/21--condicoes-de-envios-e-recolhas) declara 3,05 € **mais IVA** abaixo de 39 € no continente, com exceções para peso acrescido. Não publica um valor final inequívoco nem a tabela por peso para as ilhas. Os portes adicionais por artigo permanecem aplicáveis acima do limiar. Não se inventa uma tarifa com IVA nem se transforma esta regra numa taxa única.

O `robots.txt` proíbe carrinho/checkout. A recolha usa apenas sitemap e fichas permitidas, com intervalo de dois segundos, sem conta, morada ou checkout. A base atual já inclui a correção #36: portes desconhecidos são representados por `null`, excluídos dos totais entregues do otimizador e assinalados como calculados no checkout. Não se repete o antigo erro de os interpretar como grátis. O template `demo.html` foi apenas lido; esta proposta não o altera.

## Validação
Passaram os testes Node de descoberta e integração apenas de existentes, as verificações reais de extração com IVA e os casos negativos de preço/stock/atributo/portes. Passaram quatro guardas do scraper (completo, 403, seleção vazia e robots) e oito casos do helper de publicação/recuperação. Feed completo, produtos anteriores preservados integralmente, roundtrip pack/unpack byte a byte.

Passaram os quatro passos de geração usados pelo build de produção: `build-product-shards.js, build-search-index.js, build-sitemap.js, inject-seed-into-demo.js`. Seed e template preservados. A limpeza final de fontes não foi executada na área local; não foi usado o build legado que gera produtos/preços sintéticos. Workflow cloud ainda não executado. Cadência proposta: três recolhas diárias, sem aumento das rotinas existentes.
