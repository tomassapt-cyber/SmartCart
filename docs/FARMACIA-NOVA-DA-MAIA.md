# Farmácia Nova da Maia — preparação de 8/10/2026

Esta adição compara apenas produtos já existentes. O integrador nunca cria produtos, altera identificadores ou substitui nomes. GTIN direto, equivalência UPC/EAN e aliases documentados permitem reconhecer um produto mesmo quando o nome da loja difere. Artigos sem correspondência segura são revistos por marca, nome e volume e ficam fora da integração.

## Recolha e validação

- Categoria pública: https://farmacianovadamaia.pt/pt/21-dermocosmetica
- Bot declarado, pedidos sequenciais separados por 2 segundos; robots.txt verificado. 403/429 e desafios interrompem a recolha sem sobrescrever o último feed completo.
- 150 páginas, 3 588 entradas: 188 rejeitadas por identificação/variante/extração e 22 entradas de 11 GTIN com informação conflituosa colocadas em revisão. Feed: 3 378 entradas únicas elegíveis para matching.
- Preços correntes em EUR; preços riscados guardados apenas quando superiores ao corrente. Estados de stock separados. A listagem foi confrontada com 29 fichas JSON-LD e 10 preços renderizados no navegador no ensaio inicial.
- Matching final: 3 010 ofertas canónicas, 2 701 com algum tamanho disponível e 309 indisponíveis. Zero produtos novos. Tamanhos são mantidos separados nas variantes; diferenças de massa/volume e tamanhos não representados são rejeitados.
- 323 artigos sem correspondência segura, incluindo 26 possíveis equivalências por nome/volume, não foram criados nem automaticamente associados. A revisão dos rejeitados encontrou mais 16 possíveis equivalências. Também ficam fora os 33 conflitos posteriores ao matching.
- Duas imagens verificadas a 8/10: Esthederm Osmoclean 150 ml (URL anterior 404) e Hansaplast desodorizante pés 150 ml (imagem ausente). Substitutas oficiais 800×800, resposta 200 e inspeção visual. Não houve revalidação ao vivo de todas as imagens do catálogo.

## Validação local

Node 24.19.0. Testes do integrador cobrem zero criações, títulos diferentes com o mesmo GTIN, aliases, tamanhos existentes, stock, conflitos e feeds incompletos/vazios/antigos. Cinco cenários do scraper sobre HTML real guardado incluem recolha completa, 403, descoberta vazia, página repetida e robots. Oito cenários simulados do push cobrem recuperação e falhas de fetch/reset/unpack/integração/pack/staging. Não se publicam ficheiros HTML nem cookies.

Ensaio sem escrita antes da integração local e pack/unpack com identidade byte a byte. As lojas/ofertas anteriores são preservadas; os produtos anteriores só recebem as duas imagens verificadas. Workflow novo: três recolhas/dia, sem alterar as cadências das outras lojas, sem demo.html e sem chamadas ao Supabase. A execução de rede nos servidores GitHub ainda não foi validada.

## Portes — resolver antes de integrar em produção

As [condições atuais](https://farmacianovadamaia.pt/pt/content/3-termos-e-condicoes), secção 10.2, indicam portes calculados por peso para os restantes produtos. A [página de entrega](https://farmacianovadamaia.pt/pt/content/1-entrega-e-pagamento) confirma cobertura do continente, Madeira e Açores, mas não uma tarifa fixa.

O calculador público de uma ficha mostrou transportadoras grátis e CTT 1,50 € para Lisboa; o carrinho real com esse artigo avisou que os portes dependem da morada. Não se assumiu portes grátis nem se usou essa simulação como tarifa fixa. O artigo de teste foi removido e o carrinho ficou vazio; não houve checkout, conta ou dados pessoais.

**O rascunho não está pronto para merge:** falta representar estes portes variáveis sem o carrinho do site tratar os campos ausentes como zero. Nenhum valor de portes foi inventado. Não alterar demo.html sem autorização; este PR não o modifica.

## Impacto e Excel

Proposta no rascunho: +1 loja, 0 produtos novos, +3 010 ofertas e 2 imagens corrigidas. BD: zero pedidos e zero bytes escritos; crescimento físico não medido. O crescimento do JSON do seed é uma medida distinta da ocupação PostgreSQL.

O main e a produção permanecem inalterados. Avisar o Tomás para adicionar a loja ao Excel apenas depois de resolver os portes, integrar e confirmar o funcionamento. Nome: Farmácia Nova da Maia; domínio: farmacianovadamaia.pt; matching: GTIN/UPC/aliases existentes; ofertas de 8/10: 3 010, das quais 2 701 com stock.
