#!/usr/bin/env bash
# Deploy Africa Insight from GitHub → VPS (git only - never rsync from a laptop).
#
# Usage on the VPS:
#   bash /opt/africa-insight/ops/vps/deploy.sh
#   bash /opt/africa-insight/ops/vps/deploy.sh --ref abc1234
set -euo pipefail

REPO_DIR="${AFRICA_REPO:-/opt/africa-insight}"
COMPOSE_DIR="$REPO_DIR/ops/vps"
BRANCH="${AFRICA_DEPLOY_BRANCH:-main}"
REF=""

if [[ "${1:-}" == "--ref" ]]; then
  REF="${2:?usage: deploy.sh [--ref <sha|tag>]}"
fi

cd "$REPO_DIR"
if [[ ! -d .git ]]; then
  echo "ERROR: $REPO_DIR is not a git checkout. Clone from GitHub first." >&2
  exit 1
fi

echo "==> Fetching origin"
git fetch --prune origin

if [[ -n "$REF" ]]; then
  echo "==> Detach at $REF"
  git checkout --detach "$REF"
else
  echo "==> Reset $BRANCH to origin/$BRANCH"
  git checkout -B "$BRANCH" "origin/$BRANCH"
fi

echo "==> HEAD $(git rev-parse --short HEAD) - $(git log -1 --oneline)"
cd "$COMPOSE_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: missing $COMPOSE_DIR/.env (secrets stay on the server only)." >&2
  exit 1
fi

chmod +x "$REPO_DIR/ops/vps/"*.sh 2>/dev/null || true

echo "==> Refresh nginx site + client-IP map (if root)"
if [[ "$(id -u)" -eq 0 ]] && [[ -d /etc/nginx ]]; then
  install -m 0644 "$REPO_DIR/ops/vps/00-africa-insight-client-ip.conf" \
    /etc/nginx/conf.d/00-africa-insight-client-ip.conf
  install -m 0644 "$REPO_DIR/ops/vps/nginx-africa.conf" \
    /etc/nginx/sites-available/africa-insight.org
  ln -sfn /etc/nginx/sites-available/africa-insight.org \
    /etc/nginx/sites-enabled/africa-insight.org
  # Ensure leftover africa.mcbuleli.org is not enabled on this host
  rm -f /etc/nginx/sites-enabled/africa.mcbuleli.org \
    /etc/nginx/sites-enabled/africa-mcbuleli \
    /etc/nginx/sites-enabled/africa-mcbuleli-gone.conf 2>/dev/null || true
  nginx -t && systemctl reload nginx
  echo "nginx refreshed"
else
  echo "skip nginx refresh (not root or no /etc/nginx)"
fi

echo "==> Building web image"
docker compose build web
echo "==> Restarting web"
docker compose stop web 2>/dev/null || true
docker compose rm -f web 2>/dev/null || true
docker rm -f africa-insight-web-1 2>/dev/null || true
docker compose up -d web
sleep 5
curl -fsS -o /dev/null -w "health_http=%{http_code}\n" "http://127.0.0.1:3002/fr" || {
  echo "WARN: web not responding on :3002 yet - check: docker compose logs -f web" >&2
}

echo "==> Syncing article translations into live DB (preserve visits/admins)"
bash "$REPO_DIR/ops/vps/sync-seed-translations.sh" || {
  echo "WARN: translation sync failed - site is up, content may be stale" >&2
}

echo "DEPLOY_OK $(git -C "$REPO_DIR" rev-parse --short HEAD)"
