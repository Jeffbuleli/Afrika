#!/usr/bin/env bash
# Run on the VPS AFTER DNS A record africa → 162.35.181.98 exists.
set -euo pipefail
REPO="${AFRICA_REPO:-/opt/africa-insight}"
certbot --nginx -d africa.mcbuleli.org --non-interactive --agree-tos --register-unsafely-without-email --redirect
cp "$REPO/ops/vps/nginx-africa.conf" /etc/nginx/sites-available/africa.mcbuleli.org
ln -sfn /etc/nginx/sites-available/africa.mcbuleli.org /etc/nginx/sites-enabled/africa.mcbuleli.org
nginx -t
systemctl reload nginx
curl -fsS -o /dev/null -w "https=%{http_code}\n" https://africa.mcbuleli.org/fr
echo "CERT_OK"
