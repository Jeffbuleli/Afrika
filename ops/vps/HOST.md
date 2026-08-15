# Africa Insight production host

- **VPS:** `153.75.235.176` (dedicated partner media - not McBuleli)
- **Path:** `/opt/africa-insight`
- **Deploy:** `bash /opt/africa-insight/ops/vps/deploy.sh`
- **App bind:** `127.0.0.1:3002` → nginx → `https://www.africa-insight.org`
- **Canonical only:** `www.africa-insight.org` (+ apex 301)
- **Delinked:** `africa.mcbuleli.org` must **not** resolve / redirect via McBuleli (`162.35.181.98`). Delete DNS A/AAAA for `africa` on `mcbuleli.org` and disable any leftover nginx vhost there.
