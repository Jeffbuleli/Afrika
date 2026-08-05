#!/usr/bin/env bash
set -euo pipefail
REPO=/opt/africa-insight
# Issue/renew cert for apex + www (HTTP-01 via Cloudflare → this origin)
certbot certonly --webroot -w /var/www/html \
  -d www.africa-insight.org -d africa-insight.org \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring

# Install full TLS config from repo (without legacy mcbuleli vhosts on this box)
python3 - <<'PY'
from pathlib import Path
src = Path('/opt/africa-insight/ops/vps/nginx-africa.conf').read_text()
# Drop legacy africa.mcbuleli.org server blocks (stay on McBuleli VPS)
parts = src.split('# --- Legacy McBuleli subdomain')
out = parts[0].rstrip() + '\n'
Path('/etc/nginx/sites-available/africa-insight.org').write_text(out)
print('nginx config written, bytes', len(out))
PY
ln -sfn /etc/nginx/sites-available/africa-insight.org /etc/nginx/sites-enabled/africa-insight.org
nginx -t
systemctl reload nginx
curl -fsS -o /dev/null -w "https_www=%{http_code}\n" https://www.africa-insight.org/fr || true
echo CUTOVER_TLS_OK
