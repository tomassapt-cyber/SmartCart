#!/usr/bin/env bash
set -euo pipefail
BRANCH="${GITHUB_REF_NAME:-main}"
RAW="data/catalog/farmacianovadamaia-full.json"
RAW_DIR="$(mktemp -d)"
trap 'rm -f -- "$RAW_DIR/catalog.json"; rmdir -- "$RAW_DIR"' EXIT
cp -- "$RAW" "$RAW_DIR/catalog.json"
for attempt in 1 2 3 4 5 6; do
  if git push origin "HEAD:${BRANCH}"; then exit 0; fi
  if [ "$attempt" -eq 6 ]; then break; fi
  git fetch origin "$BRANCH"
  LATEST="$(git rev-parse "origin/${BRANCH}")"
  git reset --hard "$LATEST"
  [ "$(git rev-parse HEAD)" = "$LATEST" ]
  bash scripts/ci/seed.sh unpack
  cp -- "$RAW_DIR/catalog.json" "$RAW"
  node scripts/integrate-farmacianovadamaia-catalog.js
  bash scripts/ci/seed.sh pack
  git add data/seed-bundle.json.gz
  git add -f "$RAW"
  if git diff --cached --quiet; then exit 0; fi
  git commit -m "chore: Farmacia Nova da Maia daily refresh"
  sleep "$((2 + attempt))"
done
echo 'Publication failed after six guarded attempts' >&2
exit 1
