#!/usr/bin/env bash
# Overnight FR retranslation loop (local only). Sync prod separately.
set -euo pipefail
cd "$(dirname "$0")/.."
LOG=content/.translate-night.log
mkdir -p content

echo "=== night run start $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
batch=1
while true; do
  echo "=== batch $batch start $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
  python3 scripts/retranslate-englishish-fr.py 200 2>&1 | tee -a "$LOG"

  left=$(python3 scripts/_count-englishish-fr.py)
  echo "remaining_after_batch=$left" | tee -a "$LOG"

  if [ -f scripts/normalize-datelines.py ]; then
    python3 scripts/normalize-datelines.py 2>&1 | tee -a "$LOG" || true
  fi

  if [ "$left" -eq 0 ]; then
    echo "=== all done $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
    break
  fi
  batch=$((batch + 1))
  if [ "$batch" -gt 12 ]; then
    echo "=== safety stop after 12 batches ===" | tee -a "$LOG"
    break
  fi
done
