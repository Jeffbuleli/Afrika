#!/usr/bin/env bash
# Run on the VPS AFTER DNS for www.africa-insight.org points at this origin
# (Cloudflare orange-cloud OK - ACME HTTP-01 is forwarded).
# Also add apex A/AAAA for africa-insight.org if you want apex on the cert.
set -euo pipefail
REPO="${AFRICA_REPO:-/opt/africa-insight}"
WEBROOT="${WEBROOT:-/var/www/html}"
mkdir -p "$WEBROOT"

DOMAINS=(-d www.africa-insight.org)
if dig +short africa-insight.org A | grep -q . || dig +short africa-insight.org AAAA | grep -q .; then
  DOMAINS+=(-d africa-insight.org)
fi

echo "==> Requesting cert: ${DOMAINS[*]}"
certbot certonly --webroot -w "$WEBROOT" \
  "${DOMAINS[@]}" \
  --cert-name africa-insight.org \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --expand

cp "$REPO/ops/vps/nginx-africa.conf" /etc/nginx/sites-available/africa-insight.org
ln -sfn /etc/nginx/sites-available/africa-insight.org /etc/nginx/sites-enabled/africa-insight.org
rm -f /etc/nginx/sites-enabled/africa.mcbuleli.org

nginx -t
systemctl reload nginx
curl -fsS -o /dev/null -w "https_www=%{http_code}\n" https://www.africa-insight.org/fr || true
echo "CERT_OK"
