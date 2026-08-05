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
set -uo pipefail

MEM=--max-old-space-size=4096

# 1. Pedaços por produto (data/p/<versao>/) — a ficha de produto vai buscar só
#    o pedaço do produto aberto, em vez dos ficheiros completos.
node $MEM scripts/build-product-shards.js --quiet || echo 'AVISO: pedacos nao gerados'

# 2. Índice de pesquisa (data/idx/) e bloco de arranque (data/startup-block.json).
#    TEM de correr ANTES do inject: é o inject que lê os dois e os mete no
#    #hp-data da página (idx_version + arranque). Trocar a ordem faz a página
#    sair com a versão do índice vazia e o caminho novo desligado, sem erro.
node $MEM scripts/build-search-index.js || echo 'AVISO: indice nao gerado'

# 3. A página: template demo.html + seed embebido → index.html e catalogo.html.
#    Este é o único passo SEM guarda: se falhar, não há site para servir, e é
#    preferível o deploy falhar do que publicar uma página vazia.
COSMATH_DEPLOY_BUILD=1 node $MEM scripts/inject-seed-into-demo.js
