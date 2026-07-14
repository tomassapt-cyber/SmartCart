#!/usr/bin/env bash
# ============================================================================
# CosMath — refresh das 5 lojas SÓ-PC em sequência (correr do PC, git-bash)
# ============================================================================
# Notino, Power Beauty, SoBeauty, Smart Beauty e Beleza37 bloqueiam IPs de
# datacenter (Cloudflare/WAF) → os workflows têm o schedule desligado e o
# refresh tem de vir de um IP residencial (este PC).
#
# USO (da raiz do repo ou de qualquer lado):
#   bash scripts/refresh-pc-only.sh            # refresh normal (known/resume)
#   bash scripts/refresh-pc-only.sh --full     # powerbeauty faz re-scan completo
#
# O que faz: valida tree limpo → reset a origin/main → para cada loja
# scrape+integrate → commit+push DESSA loja (resilient-push individual).
#
# ⚠ PUSH POR LOJA, NUNCA batch: o retry do resilient-push re-corre só o
# integrate da loja (~10-15min de janela) e aterra à 1ª-2ª tentativa. A versão
# antiga fazia UM commit das 5 lojas — o retry re-integrava as 5 (~70min de
# janela) e perdeu TODAS as 10 tentativas contra os bots (2026-07-14). Além
# disso o resilient-push só preserva os RAW files entre resets: um commit
# batch com patches de código perdia-os silenciosamente a partir do 2º retry.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

FULL=0
for a in "$@"; do [ "$a" = "--full" ] && FULL=1; done

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠ Working tree sujo — commita/limpa primeiro (a automação local pode ter deixado output):"
  git status --porcelain | head
  exit 1
fi
git fetch origin main && git reset --hard origin/main

declare -A SCRAPE=(
  [notino]="node scripts/scrape-notino-catalog.js --resume --match-seed"
  [powerbeauty]="node scripts/scrape-powerbeauty-catalog.js --known-only"
  [sobeauty]="node scripts/scrape-sobeauty-catalog.js --resume"
  [smartbeauty]="node scripts/scrape-smartbeauty-catalog.js --resume"
  [beleza37]="node scripts/scrape-beleza37-catalog.js --resume"
)
[ "$FULL" = "1" ] && SCRAPE[powerbeauty]="node scripts/scrape-powerbeauty-catalog.js --full --resume"

ORDER=(notino powerbeauty sobeauty smartbeauty beleza37)
OK=(); FAIL=()
for loja in "${ORDER[@]}"; do
  echo; echo "════════ ${loja} — scrape ════════"
  if ! ${SCRAPE[$loja]}; then
    FAIL+=("${loja} (scrape)")
    continue
  fi
  echo "════════ ${loja} — integrate ════════"
  if ! node "scripts/integrate-${loja}-catalog.js"; then
    FAIL+=("${loja} (integrate)")
    continue
  fi
  # commit + push DESTA loja já — janela de corrida mínima
  RAW="data/catalog/${loja}-full.json"
  MSG="chore: ${loja} refresh do PC ($(date -u +%F))"
  git add data/seed-bundle.json demo.html index.html catalogo.html data/ghost-check.json data/homepage-data.json 2>/dev/null || true
  git add -f "$RAW" 2>/dev/null || true
  if git diff --staged --quiet; then
    echo "ℹ Nada mudou (${loja})."
    OK+=("$loja")
    continue
  fi
  git commit -m "$MSG"
  if bash scripts/ci/resilient-push.sh "node scripts/integrate-${loja}-catalog.js" "$MSG" "$RAW"; then
    OK+=("$loja")
  else
    # dados ficam no tree; a próxima loja commit-a por cima (aterram juntos)
    FAIL+=("${loja} (push)")
  fi
done

if [ ${#OK[@]} -eq 0 ] && [ ${#FAIL[@]} -gt 0 ]; then
  echo "❌ Nenhuma loja publicada. Falhas: ${FAIL[*]}"
  exit 1
fi

echo; echo "──────── Resumo ────────"
echo "OK:     ${OK[*]:-nenhuma}"
echo "Falhas: ${FAIL[*]:-nenhuma}"
[ ${#FAIL[@]} -gt 0 ] && exit 1
exit 0
