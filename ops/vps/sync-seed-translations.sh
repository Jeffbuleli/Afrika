#!/usr/bin/env bash
# Sync FR/EN article text from seed-all.json into the live SQLite volume
# without wiping visits, admins, or messages.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SEED="${ROOT}/content/seed-all.json"
SCRIPT="${ROOT}/ops/vps/sync-seed-translations.js"
COMPOSE_DIR="${ROOT}/ops/vps"

if [[ ! -f "$SEED" ]]; then
  echo "Missing $SEED" >&2
  exit 1
fi
if [[ ! -f "$SCRIPT" ]]; then
  echo "Missing $SCRIPT" >&2
  exit 1
fi

cd "$COMPOSE_DIR"
echo "==> Syncing article translations from seed into live DB"
docker compose cp "$SEED" web:/tmp/seed-all.json
docker compose cp "$SCRIPT" web:/app/sync-seed-translations.js
docker compose exec -T -w /app web node /app/sync-seed-translations.js /tmp/seed-all.json /app/data/africa-insight.db
echo "SYNC_OK"
