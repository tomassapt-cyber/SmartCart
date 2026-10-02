#!/usr/bin/env bash
# ============================================================================
# CosMath — o catálogo vive comprimido no git
# ============================================================================
#
# PORQUE EXISTE ISTO
# ------------------
# O data/seed-bundle.json chegou a 104.857.455 bytes. O limite do GitHub são
# 104.857.600. Sobravam 145 BYTES. Qualquer loja que acrescentasse mais do que
# isso via o push recusado pelo próprio GitHub:
#
#     remote: error: GH001: Large files detected
#     File data/seed-bundle.json is 100.03 MB; this exceeds GitHub's
#     file size limit of 100.00 MB
#
# E as lojas que acrescentam mais são as grandes — atida, wells, druni,
# Pharma GDD, Loja da Farmácia. Ficaram semanas sem conseguir publicar. O
# catálogo caiu de 51.281 para 13.049 produtos e 88% ficaram com UMA só loja,
# o que mata a comparação de preços, que é o que o site faz.
#
# COMO SE RESOLVE
# ---------------
# No git guarda-se só o .gz (13,3 MB — comprime 7,5×, em menos de 1s). O
# ficheiro .json continua a existir em disco durante o trabalho, exactamente
# como antes, por isso NENHUM dos 140 scripts que o lêem precisou de mudar.
#
#   unpack  .gz → .json   (a seguir ao checkout, antes de qualquer script)
#   pack    .json → .gz   (antes do commit)
#
# O .json está no .gitignore. Se um workflow se esquecer do unpack, os scripts
# falham a dizer que não encontram o seed — alto e cedo, que é como deve ser.
#
# FOLGA: 13,3 MB de 100 MB dá para o catálogo crescer ~7× (de 63.780 produtos
# para perto de meio milhão) antes de isto voltar a ser um problema.
#
# ATUALIZAÇÃO 2026-10-02 — DE .gz PARA PEDAÇOS DE TEXTO
# ------------------------------------------------------
# O .gz resolveu o limite de 100 MB, mas criou outro problema: um .gz não tem
# diferenças aproveitáveis (mudar um preço muda todos os bytes seguintes), e
# cada atualização de loja gravava 18 MB novos no histórico. ~240 por dia: o
# repositório passou de 18 GB (24/09) a 21,4 GB (02/10).
#
# Agora `data/seed-bundle.json.gz` é uma PASTA com o catálogo em linhas de
# JSON (scripts/ci/seed-shards.js): uma loja, um produto ou uma oferta por
# linha. Mudar um preço muda uma linha, e o git guarda só isso — medido com
# duas versões reais: 0,45 MB contra 18 MB.
#
# O nome ficou o mesmo DE PROPÓSITO: `git add` e `git diff` numa pasta
# funcionam igual (o add também regista ficheiros apagados), por isso os ~100
# workflows, o resilient-push.sh e o refresh-pc-only.sh não mudaram. Um
# checkout antigo com o FICHEIRO .gz continua a funcionar (unpack lê os dois
# formatos; o primeiro pack converte).
#
#   unpack  pasta → .json     (ou .gz antigo → .json)
#   pack    .json → pasta     (apaga o .gz antigo se ainda lá estiver)
#
# O pack verifica que o unpack devolve o MESMO ficheiro, byte a byte, antes
# de tocar na pasta.
# ============================================================================
set -euo pipefail

JSON=data/seed-bundle.json
GZ=data/seed-bundle.json.gz          # pasta desde 2026-10-02 (antes: ficheiro .gz)
SHARDS="node --max-old-space-size=4096 scripts/ci/seed-shards.js"

tamanho() { [ -e "$1" ] && du -sm "$1" 2>/dev/null | cut -f1 || echo "?"; }

case "${1:-}" in
  unpack)
    if [ -d "$GZ" ]; then
      $SHARDS unpack
    elif [ -f "$GZ" ]; then
      # formato antigo (checkouts de antes de 2026-10-02)
      gunzip -c "$GZ" > "$JSON"
      echo "📦 seed descomprimido (formato antigo .gz): $(tamanho "$GZ") MB → $(tamanho "$JSON") MB"
    else
      echo "✗ $GZ não existe — o repositório está incoerente." >&2
      exit 1
    fi
    ;;
  pack)
    if [ ! -f "$JSON" ]; then
      # Sem .json em disco, o que veio do checkout é que manda: não há nada
      # de novo para guardar. NÃO falhar aqui — quem chama o pack é o
      # stage_all do resilient-push, e um push de ficheiros que nada têm a ver
      # com o catálogo (histórico de preços, pesquisas populares) morreria com
      # um erro que não explica nada. Só é incoerente se faltarem os dois.
      if [ -e "$GZ" ]; then
        echo "ℹ $JSON não existe — mantenho o $GZ do checkout." >&2
        exit 0
      fi
      echo "✗ nem $JSON nem $GZ existem — o repositório está incoerente." >&2
      exit 1
    fi
    $SHARDS pack
    ;;
  *)
    echo "uso: $0 {unpack|pack}" >&2
    exit 2
    ;;
esac
