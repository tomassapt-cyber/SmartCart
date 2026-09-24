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
# ============================================================================
set -euo pipefail

JSON=data/seed-bundle.json
GZ=data/seed-bundle.json.gz

tamanho() { [ -f "$1" ] && du -m "$1" 2>/dev/null | cut -f1 || echo "?"; }

case "${1:-}" in
  unpack)
    if [ ! -f "$GZ" ]; then
      echo "✗ $GZ não existe — o repositório está incoerente." >&2
      exit 1
    fi
    gunzip -c "$GZ" > "$JSON"
    echo "📦 seed descomprimido: $(tamanho "$GZ") MB → $(tamanho "$JSON") MB"
    ;;
  pack)
    if [ ! -f "$JSON" ]; then
      # Sem .json em disco, o .gz que veio do checkout é que manda: não há
      # nada de novo para comprimir. NÃO falhar aqui — quem chama o pack é o
      # stage_all do resilient-push, e um push de ficheiros que nada têm a ver
      # com o catálogo (histórico de preços, pesquisas populares) morreria com
      # um erro do gzip que não explica nada. Só é incoerente se faltarem os
      # dois.
      if [ -f "$GZ" ]; then
        echo "ℹ $JSON não existe — mantenho o $GZ do checkout." >&2
        exit 0
      fi
      echo "✗ nem $JSON nem $GZ existem — o repositório está incoerente." >&2
      exit 1
    fi
    # -6 e não -9: medido, a diferença é 0,3 MB e o -9 demora 50% mais.
    gzip -6 -c "$JSON" > "$GZ"
    local_mb=$(tamanho "$GZ")
    echo "📦 seed comprimido: $(tamanho "$JSON") MB → ${local_mb} MB"
    # Guarda: se algum dia voltar a aproximar-se dos 100 MB, avisar ANTES de o
    # push ser recusado — o sintoma sem aviso custou semanas de catálogo.
    bytes=$(wc -c < "$GZ")
    if [ "$bytes" -gt 94371840 ]; then   # 90 MiB
      echo "⚠️  ATENÇÃO: o seed comprimido está a ${local_mb} MB, perto do limite de 100 MB do GitHub." >&2
      echo "   Ver scripts/ci/seed.sh para o historial deste problema." >&2
    fi
    ;;
  *)
    echo "uso: $0 {unpack|pack}" >&2
    exit 2
    ;;
esac
