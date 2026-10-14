# Lojas Shopify «só produtos existentes»: SkinLovers e Ilha dos Cosméticos (#43, 9/10/2026), Farmácia Cuida e Lisbon Glam (14/10/2026)

Lojas portuguesas em Shopify, com código de barras por variante, preparadas segundo a regra de 8/10/2026: **acrescentam apenas ofertas a produtos que o catálogo já tem**. Não criam produtos, não mudam nomes nem imagens e não tocam nas ofertas das outras lojas. SkinLovers e Ilha: integradas no `main` pelo #43. Farmácia Cuida e Lisbon Glam: secção própria mais abaixo.

| | SkinLovers | Ilha dos Cosméticos |
|---|---|---|
| Domínio | `skinlovers.com/pt-pt` (mercado Portugal) | `ilhadoscosmeticos.pt` |
| Empresa | Skinlovers Lda — Largo da Estação 11, Nine, 4775-446 Braga ([aviso legal](https://www.skinlovers.com/pt-pt/policies/legal-notice)) | Sugestão Bronzeada Lda, NIF 519 166 167 — Azeitão ([termos](https://ilhadoscosmeticos.pt/policies/terms-of-service)) |
| Ramo | dermocosmética (CeraVe, Bioderma, Avène, Isdin…) | cabelo e cosmética, muitas marcas brasileiras (Lola, Salon Line, Widi Care…) |
| Produtos (`/products.json`, 9/10 às 12h) | 4 491 produtos, 4 491 variantes; cobertura do mapa do site 100% | 2 651 produtos, 3 628 variantes; cobertura 100% |
| Amostra de 9/10 contra o `main` | 90% dos GTIN casam com produtos existentes; **1,11×** a mediana; a mais barata em 3% | 22% casam; **0,91×** a mediana; a mais barata em 38% |
| Portes ([SkinLovers](https://www.skinlovers.com/pt-pt/policies/shipping-policy), [Ilha](https://ilhadoscosmeticos.pt/policies/shipping-policy)) | continente: grátis acima de 50 €, abaixo «a partir de 3,50 €» | «calculado no checkout, pelo peso da encomenda e destino» |
| Acesso dos runners (`sondar-acesso.yml`, corrida 37878515263) | 200 em `robots.txt` e `.js` | 200 em `robots.txt` e `.js` |
| Ensaio sobre o `main` `f1f0f43` (9/10, 14h) | cache com 1 875 de 4 491 produtos → 1 302 variantes com GTIN → **796 ofertas, só 220 em stock**; 29 conflitos; 0 produtos novos; seed +338 KB. Em stock: **1,13×** a mediana, a mais barata em 2% | cache completa (3 628 variantes) → 3 528 com GTIN → **1 051 ofertas, 725 em stock**; 63 conflitos (52 de unidade ml/g); 0 produtos novos; seed +472 KB. Em stock: **0,95×** a mediana, a mais barata em 39% (710 comparáveis) |

## Como recolhe

`scripts/lib/shopify-existentes.js`:

1. Lê o `robots.txt` e cumpre-o. O bot identifica-se (`GirlMath-Catalog-Bot/1.0`), como a recolha da Farmácia Nova da Maia.
2. Lê o mapa do site (só os `sitemap_products_*` da raiz) para medir a cobertura.
3. Lê preço, preço barrado e stock **em bloco** pelo `/products.json?limit=250&page=N` (um pedido a cada 2,5 s). Na SkinLovers usa o prefixo `/pt-pt`: são os preços que a loja mostra a quem compra de Portugal. A 9/10, os preços e o stock do bloco coincidiram com os das fichas `.js` em 90 de 90 produtos (SkinLovers) e 113 de 113 (Ilha).
4. O `/products.json` público não traz o código de barras. O GTIN de cada variante lê-se **uma vez** no `/products/<handle>.js` e fica em `data/catalog/<loja>-gtin.json` (id da variante → código; uma linha por variante). Cada corrida lê no máximo 600 produtos com variantes novas (`--max-gtin=N` muda o limite), a um pedido a cada 2 s. A cache grava-se de forma atómica (temporário + renomear) e também quando a recolha para a meio.
5. Só passam variantes com GTIN-12/13/14 de dígito de controlo certo. Pára sem gravar ao primeiro 403/429, página de desafio, redireção para outro domínio ou caminho proibido pelo `robots.txt`. Também não grava se o bloco cobrir menos de 90% do mapa do site, se houver menos variantes do que o mínimo ou se mais de 10% das leituras de GTIN falharem.

**Porque não `scripts/lib/shopify-loja.js`:** essa biblioteca lê o `.js` de todos os produtos em todas as corridas. A 9/10, a 2 pedidos/s, as duas lojas responderam 429 antes dos 200 produtos. A 1 pedido a cada 2 s seriam ~2 h por corrida e ~9 000 pedidos/dia à SkinLovers. Com o bloco e a cache: ~25 pedidos por corrida, mais as variantes novas.

## Como integra

`scripts/lib/integrar-existentes.js` generaliza o integrador da Maia (#40):

- identidade por GTIN exato, EAN antigo do produto, alias documentado em `data/product-aliases.json` ou grafia UPC-A/EAN-13, só quando aponta para **um** produto;
- recusa volume ou unidade que o produto ainda não tem e GTIN com duas ofertas diferentes para o mesmo volume;
- não grava com feed incompleto, parcial (`--limite`), vazio ou com mais de 24 h, nem se a cobertura cair mais de 20% face à integração anterior;
- idempotente (o `resilient-push.sh` pode re-integrar sobre o `main` mais recente);
- relatório em `data/catalog/<loja>-integration-report.json`, com os GTIN sem par seguro e os candidatos por impressão digital e volume, para rever aliases à mão (nunca se juntam automaticamente).

## Workflows

`.github/workflows/skinlovers-catalog.yml` (05:41 e 17:41 UTC) e `ilhadoscosmeticos-catalog.yml` (07:53 e 19:53 UTC): **2×/dia**, abaixo da cadência-padrão. Node 24, testes offline antes da recolha, ensaio (`--dry-run`) antes da integração, `seed.sh pack`, `resilient-push.sh` com o feed e a cache como ficheiros a preservar. Um `workflow_dispatch` com `limite` faz só a recolha (não publica).

## Testes

`node scripts/test-integrar-existentes.js` (sem rede): robots, GTIN, linhas a partir do bloco e da cache, a cache poupa leituras, limite de leituras por corrida, cobertura do bloco, paragem em 403/429/desafio/robots, ensaio parcial, mínimo; e, com a configuração real de cada loja: sem criar produtos, EAN antigo, UPC, alias, preço barrado, feeds inválidos/velhos/vazios/parciais, URL de outra loja, conflitos de preço/volume/unidade, outras lojas intactas, idempotência e cobertura.

## Notas dos ensaios

- **Caches.** Ilha: completa (lida do PC a 9/10). SkinLovers: 1 875 de 4 491 produtos; os runners leem os restantes 2 616 a 600 por corrida (~5 corridas, ~2,5 dias a 2×/dia). As ofertas da SkinLovers crescem a cada corrida; a guarda de cobertura só trava descidas.
- **SkinLovers:** os produtos criados em agosto de 2026 vêm sem código de barras na Shopify, mas todos têm SKU de 7 dígitos (CNP provável). O catálogo não guarda CNP, por isso ficam de fora; casar por CNP exigiria o mapa CNP→EAN, que tem conflitos.
- **Ilha:** a coloração L'Oréal iNOA vem como «60 ml» na loja e «60 g» no catálogo, com o mesmo GTIN. O integrador recusa-a como conflito de unidade (35 casos) e deixa-a no relatório para revisão; pode entrar depois por regra ou alias, se se confirmar que é o mesmo artigo.

## Portes

- `skinlovers`: `{"gratis": 50}` em `data/store-shipping.json` (só acrescenta 3 linhas). O «a partir de 3,50 €» não é uma tarifa fixa: a `casa` fica vazia e o carrinho mostra «Portes calculados no checkout» (#36), com o limiar de grátis a 50 €.
- `ilhadoscosmeticos`: nenhuma entrada (peso e destino só no checkout) → custo desconhecido.

## Farmácia Cuida e Lisbon Glam (preparadas a 14/10/2026, mesmo modelo)

Escolhidas na prospeção de 9/10 (relatório local `Desktop\duo\prospecao-lojas-2026-10-09\RELATORIO.md`). As duas têm acesso confirmado a partir dos runners: `robots.txt`, `products.json`, `.js` com `barcode` e `sitemap.xml` deram 200 nas corridas 37944661809 e 37944881266 do `sondar-acesso.yml`.

| | Farmácia Cuida | Lisbon Glam |
|---|---|---|
| Domínio | `farmaciacuida.com` (raiz = mercado PT) | `lisbonglam.com` (raiz = PT; o `/es` tem mapas próprios, ignorados) |
| Empresa | Farmácia Cuida (empresa e morada não encontradas nas páginas lidas) | Mredis III, Lda ([termos](https://lisbonglam.com/policies/terms-of-service)) |
| Produtos no mapa (9/10) | 5 762 | 1 212 |
| Amostra de 9/10 | 50 fichas: 66% com EAN (as restantes só têm CNP no `sku`); 16 casam com GTIN + marca + tamanho e 10 são prováveis; **0,99×** a mediana; 82% em stock | 51 fichas: EAN em 100%; 17 confirmadas e 12 prováveis; 0,83× (só 6 comparáveis); **só 33% em stock** |
| Portes (`store-shipping.json`) | casa 4,20 €, ponto DPD 2,59 €, grátis ≥47 € (faixa do site; o carrinho confirmou entre 42,75 € e 57 €), ilhas 7,50 € | casa 2,98 €, grátis ≥39,50 €, ilhas 6,99 € ([política de envios](https://lisbonglam.com/policies/shipping-policy)) |
| Workflow | `farmaciacuida-catalog.yml` (06:23 e 18:23 UTC) | `lisbonglam-catalog.yml` (08:47 e 20:47 UTC) |

- **Ensaio de 14/10** (recolha completa no PC, integração `--dry-run` sobre o `main` `3cbe050`): Farmácia Cuida **3 297 ofertas (2 873 em stock)**, 0,93× a mediana, a mais barata em 8%, 57 conflitos, seed +1,3 MB; Lisbon Glam **786 ofertas (262 em stock)**, 0,89×, a mais barata em 16%, 5 conflitos, seed +0,35 MB. 0 produtos novos nas duas.
- **Códigos internos (prefixo 2):** as duas lojas recusam-nos (`semCodigosInternos`). Na Cuida são 16 linhas; 10 existem no catálogo e quase todas são o mesmo produto, mas há coffrets SVR que casam com conjuntos diferentes. Por isso a regra é recusar e deixar no relatório.
- **Limite do formato dos portes:** nas ilhas, a Cuida nunca dá portes grátis e a Lisbon Glam só a partir de 99,50 €, mas o `store-shipping.json` tem um único limiar `gratis`. Nas ilhas o site pode mostrar portes grátis acima de 47 € / 39,50 €, quando na verdade não há.
- **Cache gravada a cada 100 leituras:** os dois scrapers gravam a cache de GTIN ao longo da recolha, não só no fim. A 9/10 o PC fechou a sessão a meio e perderam-se ~1 000 leituras de cada loja, porque o `finally` não corre quando o processo é morto.

## Depois do merge

1. `gh workflow run skinlovers-catalog.yml` e `gh workflow run ilhadoscosmeticos-catalog.yml` (ou esperar pelo cron) e ler o resumo da integração no log.
2. Confirmar no `main` o commit «daily refresh» de cada loja, `data/seed-bundle.json.gz/ofertas/<loja>.jsonl` e a loja em `lojas.jsonl`.
3. Quando o Supabase sair da restrição: contar as ofertas de cada loja na BD (`Prefer: count=exact`) antes de as dar como operacionais.
4. Só então avisar o Tomás para as acrescentar ao Excel.
