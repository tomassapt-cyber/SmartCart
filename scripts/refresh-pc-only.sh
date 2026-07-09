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
# scrape+integrate (continua se uma falhar) → commit único → resilient-push
# (re-integra sobre origin em caso de corrida com os bots).
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
  if ${SCRAPE[$loja]}; then
    echo "════════ ${loja} — integrate ════════"
    if node "scripts/integrate-${loja}-catalog.js"; then
      OK+=("$loja")
    else
      FAIL+=("${loja} (integrate)")
    fi
  else
    FAIL+=("${loja} (scrape)")
  fi
done

if [ ${#OK[@]} -eq 0 ]; then
  echo "❌ Nenhuma loja integrada — nada a publicar. Falhas: ${FAIL[*]}"
  exit 1
fi

# resilient-push re-integra SÓ as lojas que correram (idempotente)
REINT=""
RAW=()
for loja in "${OK[@]}"; do
  REINT+="node scripts/integrate-${loja}-catalog.js && "
  RAW+=("data/catalog/${loja}-full.json")
done
REINT="${REINT% && }"
MSG="chore: refresh PC-only (${OK[*]}) ($(date -u +%F))"

git add data/seed-bundle.json demo.html index.html catalogo.html
for f in "${RAW[@]}"; do git add -f "$f" 2>/dev/null || true; done
if git diff --staged --quiet; then
  echo "ℹ Nada mudou após integrar — terminado."
else
  git commit -m "$MSG"
  bash scripts/ci/resilient-push.sh "$REINT" "$MSG" "${RAW[@]}"
fi

echo; echo "──────── Resumo ────────"
echo "OK:     ${OK[*]:-nenhuma}"
echo "Falhas: ${FAIL[*]:-nenhuma}"
[ ${#FAIL[@]} -gt 0 ] && exit 1
exit 0
