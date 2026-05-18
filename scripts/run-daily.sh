#!/bin/bash
# Cron diário: corre scraper TS (--run-now) e regista timestamp. Suposto: 0 6 * * *
# Uso: 0 6 * * * /bin/bash /path/to/Cosmetics/scripts/run-daily.sh

set -euo pipefail

# Resolve raiz do projecto (este script vive em scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/scraper"

mkdir -p "$PROJECT_ROOT/logs"
LOG_FILE="$PROJECT_ROOT/logs/cron.log"

echo "[$(date -Iseconds)] cron arrancou" >> "$LOG_FILE"

# Arranca o orchestrator TS. dist/index.js criado por `npm run build`.
if node dist/index.js --run-now >> "$LOG_FILE" 2>&1; then
  echo "[$(date -Iseconds)] job concluído OK" >> "$LOG_FILE"
else
  echo "[$(date -Iseconds)] job FALHOU (exit $?)" >> "$LOG_FILE"
  exit 1
fi
