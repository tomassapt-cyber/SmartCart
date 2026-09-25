#!/usr/bin/env bash
# ============================================================================
# CosMath — refresh das lojas SÓ-PC em sequência (correr do PC, git-bash)
# ============================================================================
# Estas lojas bloqueiam IPs de datacenter → os workflows têm o schedule
# desligado e o refresh tem de vir de um IP residencial (este PC).
#
# A lista passou de 5 para 9 a 2026-09-25, depois de medir o que cada uma
# devolve aos runners do GitHub:
#
#   HTTP 000 (nem liga)      sobeauty, smartbeauty, beleza37
#   403 "Just a moment..."   notino, powerbeauty, care2me, afarmaciaonline
#   403 Forbidden (Apache)   fastpharma
#   200 "Client Challenge"   docmorris   ← desafio do F5 que vinha com 200 e
#                                          por isso passava por página boa
#
# Falta a skin.pt: tem integrate-skin-catalog.js mas NÃO tem scraper nenhum —
# as 3.834 ofertas dela nunca foram automatizadas. Enquanto não houver scraper,
# não entra aqui.
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

# OBRIGATORIO depois do reset. O catálogo vive no git comprimido
# (data/seed-bundle.json.gz) e o .json está no .gitignore — o reset traz o .gz
# novo e não toca no .json, que fica o de antes. Sem este unpack os integradores
# corriam sobre o seed VELHO e o commit desfazia o trabalho das outras lojas.
bash scripts/ci/seed.sh unpack

# ⚠️ SEM --resume: este script faz REFRESH DE PRECOS, nao retoma um scrape.
# Com --resume o scraper via o catalogo do refresh anterior, dava todos os URLs
# como "ja feitos" e nao raspava NADA — os precos ficavam congelados enquanto o
# script reportava sucesso. Foi assim que estas lojas passaram 6-12 dias
# desactualizadas (beleza37: 1 produto re-raspado em 6.365). Se um scrape for
# mesmo interrompido, correr o scraper a mao com --resume.
declare -A SCRAPE=(
  [sobeauty]="node scripts/scrape-sobeauty-catalog.js"
  [smartbeauty]="node scripts/scrape-smartbeauty-catalog.js"
  [beleza37]="node scripts/scrape-beleza37-catalog.js"
  [notino]="node scripts/scrape-notino-catalog.js --match-seed"
  [powerbeauty]="node scripts/scrape-powerbeauty-catalog.js --known-only"
  [care2me]="node scripts/scrape-care2me-catalog.js"
  [fastpharma]="node scripts/scrape-fastpharma-catalog.js"
  [afarmaciaonline]="node scripts/scrape-afarmaciaonline-catalog.js"
  [docmorris]="node scripts/scrape-docmorris-catalog.js"
)
[ "$FULL" = "1" ] && SCRAPE[powerbeauty]="node scripts/scrape-powerbeauty-catalog.js --full --resume"

# As tres primeiras leem o catalogo A GRANEL (/products.json, ver
# lib/shopkit-granel.js): 20 a 163 paginas, minutos e megabytes em vez de horas
# e gigabytes. Vao a' frente de proposito — se a corrida for interrompida, ja'
# aterrou o mais barato de obter.
ORDER=(sobeauty smartbeauty beleza37 notino powerbeauty care2me fastpharma afarmaciaonline docmorris)
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
  # O catálogo entra no git COMPRIMIDO. Sem este pack, o `git add` do .json
  # não preparava nada (está no .gitignore), o `git diff --staged` dava vazio, o
  # script dizia "Nada mudou" e NÃO PUBLICAVA — com o scrape todo feito.
  bash scripts/ci/seed.sh pack
  git add data/seed-bundle.json.gz demo.html index.html catalogo.html data/ghost-check.json data/homepage-data.json 2>/dev/null || true
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
