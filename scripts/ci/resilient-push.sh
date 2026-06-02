#!/usr/bin/env bash
# ============================================================================
# SmartCart — Resilient push para os workflows de catálogo
# ============================================================================
#
# PROBLEMA QUE RESOLVE
# --------------------
# data/seed-bundle.json é um JSON minificado numa única linha enorme. Quando
# vários workflows (wells ~4h, druni, atida, etc.) fazem push em simultâneo,
# um `git rebase origin/main` colide SEMPRE nessa linha → `--abort` → retry do
# MESMO commit → falha outra vez → loop até ao timeout de 60min do job ser
# cancelado. Resultado: a loja faz scrape+integrate mas NUNCA chega ao main,
# e o verified_at fica congelado (a "staleness" que o utilizador reportou).
#
# ESTRATÉGIA
# ----------
# Em vez de rebasear um blob em conflito, quando o push é rejeitado:
#   1. Preserva os ficheiros RAW do catálogo (fonte de verdade do integrate).
#   2. `git reset --hard origin/<branch>` — descarta o nosso commit local e
#      adopta o seed-bundle.json MAIS RECENTE do main.
#   3. Restaura os ficheiros raw e RE-CORRE o integrate (idempotente: faz match
#      por EAN/fingerprint + dedup + normalize + inject) por cima do seed fresco.
#   4. Re-commita e tenta push outra vez → agora é um fast-forward limpo.
# Como o integrate é idempotente, re-correr não introduz duplicados.
#
# USO
#   scripts/ci/resilient-push.sh "<integrate-cmd>" "<commit-msg>" [raw-file...]
#
# Exemplo:
#   scripts/ci/resilient-push.sh \
#     "node scripts/integrate-farmaciapt-catalog.js" \
#     "chore: Farmácia.pt daily refresh ($(date -u +%F))" \
#     data/catalog/farmaciapt-full.json
# ============================================================================
set -uo pipefail

INTEGRATE_CMD="${1:?integrate-cmd em falta}"; shift
COMMIT_MSG="${1:?commit-msg em falta}"; shift
RAW_FILES=("$@")  # ficheiros raw do catálogo a preservar entre resets

BRANCH="${GITHUB_REF_NAME:-main}"
SEED_AND_HTML=(data/seed-bundle.json demo.html index.html catalogo.html)

# Backoffs com jitter — ~30min de janela total, dentro do timeout do job.
BACKOFFS=(0 10 25 45 90 150 240 360 540 540)

stage_all() {
  git add "${SEED_AND_HTML[@]}" 2>/dev/null || true
  for f in "${RAW_FILES[@]}"; do git add -f "$f" 2>/dev/null || true; done
}

for i in "${!BACKOFFS[@]}"; do
  attempt=$((i + 1))
  W=${BACKOFFS[$i]}
  if [ "$W" -gt 0 ]; then
    WAIT=$((W + RANDOM % 10))
    echo "⏳ A aguardar ${WAIT}s antes da tentativa ${attempt}..."
    sleep "$WAIT"
  fi

  if git push origin "HEAD:${BRANCH}"; then
    echo "✅ Push ok (tentativa ${attempt})"
    exit 0
  fi

  echo "↻ Push rejeitado (tentativa ${attempt}) — re-integrar sobre origin/${BRANCH}…"

  # 1) Preservar ficheiros raw num tmp (sobrevivem ao reset --hard)
  TMP="$(mktemp -d)"
  for f in "${RAW_FILES[@]}"; do
    if [ -f "$f" ]; then mkdir -p "$TMP/$(dirname "$f")"; cp "$f" "$TMP/$f"; fi
  done

  # 2) Adoptar o seed mais recente do main
  git fetch origin "${BRANCH}" || true
  git reset --hard "origin/${BRANCH}"

  # 3) Restaurar raw e re-integrar (idempotente)
  for f in "${RAW_FILES[@]}"; do
    if [ -f "$TMP/$f" ]; then mkdir -p "$(dirname "$f")"; cp "$TMP/$f" "$f"; fi
  done
  rm -rf "$TMP"

  echo "▶ ${INTEGRATE_CMD}"
  eval "${INTEGRATE_CMD}" || echo "⚠ integrate devolveu erro — continuar para tentar push à mesma"

  # 4) Re-commit
  stage_all
  if git diff --staged --quiet; then
    echo "ℹ Nada novo após re-integrar (loja já no main mais recente) — terminar ok."
    exit 0
  fi
  git commit -m "${COMMIT_MSG}"
done

echo "❌ Push falhou após ${#BACKOFFS[@]} tentativas. Artifact contém os dados."
exit 1
