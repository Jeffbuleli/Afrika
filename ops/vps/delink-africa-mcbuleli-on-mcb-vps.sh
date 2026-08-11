#!/usr/bin/env bash
# Run on McBuleli VPS (162.35.181.98) to fully delink africa.mcbuleli.org.
# Africa Insight lives only on www.africa-insight.org (153.75.235.176).
set -euo pipefail

echo "==> Disabling africa.mcbuleli.org nginx vhosts"
rm -f /etc/nginx/sites-enabled/africa.mcbuleli.org \
  /etc/nginx/sites-enabled/africa-mcbuleli \
  /etc/nginx/sites-enabled/africa-insight-legacy 2>/dev/null || true

# Neutralise available configs if present (do not delete certs yet)
for f in /etc/nginx/sites-available/africa.mcbuleli.org \
         /etc/nginx/sites-available/africa-mcbuleli; do
  if [[ -f "$f" ]]; then
    mv -f "$f" "${f}.disabled.$(date +%Y%m%d)" || true
    echo "disabled $f"
  fi
done

# Catch-all: any remaining server_name africa.mcbuleli.org → 410
cat > /etc/nginx/sites-available/africa-mcbuleli-gone.conf <<'EOF'
# Delinked: partner media is www.africa-insight.org only.
server {
  listen 80;
  listen [::]:80;
  server_name africa.mcbuleli.org;
  return 410;
}
server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name africa.mcbuleli.org;
  # Reuse any existing cert if present; otherwise omit this block after DNS removal.
  ssl_certificate /etc/letsencrypt/live/africa.mcbuleli.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/africa.mcbuleli.org/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  return 410;
}
EOF

if [[ -f /etc/letsencrypt/live/africa.mcbuleli.org/fullchain.pem ]]; then
  ln -sfn /etc/nginx/sites-available/africa-mcbuleli-gone.conf \
    /etc/nginx/sites-enabled/africa-mcbuleli-gone.conf
else
  # HTTP-only 410 if no cert
  cat > /etc/nginx/sites-available/africa-mcbuleli-gone.conf <<'EOF'
server {
  listen 80;
  listen [::]:80;
  server_name africa.mcbuleli.org;
  return 410;
}
EOF
  ln -sfn /etc/nginx/sites-available/africa-mcbuleli-gone.conf \
    /etc/nginx/sites-enabled/africa-mcbuleli-gone.conf
fi

nginx -t
systemctl reload nginx
echo "DELINK_OK — also delete DNS A/AAAA for africa.mcbuleli.org in Cloudflare (mcbuleli.org zone)."
