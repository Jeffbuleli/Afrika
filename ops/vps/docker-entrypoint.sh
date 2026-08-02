#!/usr/bin/env bash
set -euo pipefail

mkdir -p /app/data /app/public/uploads

if [[ ! -f /app/data/africa-insight.db ]]; then
  echo "==> Initializing SQLite from docker-seed"
  cp /app/docker-seed/africa-insight.db /app/data/africa-insight.db
fi

# Ensure WAL sidecars are writable by the app user
chown -R nextjs:nodejs /app/data /app/public/uploads || true

if [[ "$(id -u)" -eq 0 ]]; then
  exec gosu nextjs "$@"
fi
exec "$@"
