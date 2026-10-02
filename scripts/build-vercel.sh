#!/usr/bin/env bash
# O build do site no Vercel.
#
# PORQUE É QUE ISTO É UM FICHEIRO E NÃO UMA STRING NO vercel.json:
# o campo `buildCommand` do vercel.json tem um limite de 256 caracteres. Passar
# desse limite faz a Vercel RECUSAR o deploy no mesmo segundo em que o recebe,
# sem correr o build e sem dizer porquê. Aconteceu em 2026-08-05: o comando
# passou de 199 para 300 caracteres ao ganhar mais um passo, e os deploys
# ficaram a falhar. Ver docs/BUILD-VERCEL.md.
#
# Aqui não há limite, e cabem comentários.
# ⚠️ O `-e` é essencial: sem ele, um passo que falha NÃO pára o script, e o
# build acabava a verde com o site por gerar. Os passos que podem falhar sem
# consequência trazem o seu próprio `|| echo`.
set -euo pipefail

MEM=--max-old-space-size=4096

# 0. O catalogo vem comprimido do git (o .json passava o limite de 100 MB
#    do GitHub). Descomprimir ANTES de tudo -- todos os passos a seguir
#    leem data/seed-bundle.json como sempre leram.
bash scripts/ci/seed.sh unpack


# 1. Pedaços por produto (data/p/<versao>/) — a ficha de produto vai buscar só
#    o pedaço do produto aberto, em vez dos ficheiros completos.
node $MEM scripts/build-product-shards.js --quiet || echo 'AVISO: pedacos nao gerados'

# 2. Índice de pesquisa (data/idx/) e bloco de arranque (data/startup-block.json).
#    TEM de correr ANTES do inject: é o inject que lê os dois e os mete no
#    #hp-data da página (idx_version + arranque). Trocar a ordem faz a página
#    sair com a versão do índice vazia e o caminho novo desligado, sem erro.
#
#    ⚠️ SEM GUARDA `||`, de propósito. Desde que o catálogo saiu da página, o
#    índice é a ÚNICA fonte de produtos — e data/idx/ está no .gitignore, logo
#    não há cópia committada para servir de rede. Com a guarda, uma falha aqui
#    dava um deploy VERDE com um site sem catálogo, que é o pior desfecho
#    possível. Sem ela, o deploy fica vermelho e o site anterior continua no ar.
node $MEM scripts/build-search-index.js

# 2b. O mapa do site, a partir do índice que acabou de ser gerado. TEM de vir
#     depois: a fonte é o data/idx/search-<hash>.json, exactamente o conjunto
#     que o site serve. Sem guarda `||`, de propósito: se falhar, o deploy fica
#     vermelho e o site anterior continua no ar -- melhor do que publicar um
#     site que o Google volta a não conseguir ler. O script recusa escrever com
#     menos de 1.000 produtos.
node $MEM scripts/build-sitemap.js

# 3. A página: template demo.html + seed embebido → index.html e catalogo.html.
#    Também sem guarda: se falhar, não há site para servir, e é preferível o
#    deploy falhar do que publicar uma página vazia.
COSMATH_DEPLOY_BUILD=1 node $MEM scripts/inject-seed-into-demo.js

# 4. Tirar do que fica PUBLICADO o que o site nunca lê (2026-10-02). O
#    `outputDirectory` é a raiz do repositório, logo tudo o que está aqui era
#    servido como ficheiro público: o catálogo inteiro (data/seed-bundle.json,
#    132 MB — cada descarga gastava 132 MB da quota de tráfego da Vercel), os
#    catálogos crus das lojas (data/catalog/, 267 MB), os scripts, os
#    workflows e o esquema da base de dados. Nenhum é pedido pelo site
#    (verificado: os fetch() do demo/app/account só pedem data/idx, data/p,
#    descriptions, scan-index, recommendations, price-history e
#    preview-arranque). Fica como ÚLTIMO passo: tudo o que está acima precisa
#    deles.
rm -rf data/seed-bundle.json data/seed-bundle.json.gz data/catalog scripts database .github
