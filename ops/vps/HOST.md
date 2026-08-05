# Africa Insight production host

- **VPS:** `153.75.235.176` (dedicated — not McBuleli)
- **Path:** `/opt/africa-insight`
- **Deploy:** `bash /opt/africa-insight/ops/vps/deploy.sh`
- **App bind:** `127.0.0.1:3002` → nginx → `https://www.africa-insight.org`
- **Legacy:** `africa.mcbuleli.org` 301 redirect stays on McBuleli (`162.35.181.98`)
