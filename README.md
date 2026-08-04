# Africa Insight

Média d’analyse africaine bilingue (**FR / EN**).  
*L’Afrique expliquée - pas seulement racontée.*

**Prod :** [https://www.africa-insight.org](https://www.africa-insight.org)

Stack : **Next.js**, **Drizzle**, **SQLite**, images locales (R2 plus tard).

Repo : [github.com/Jeffbuleli/Afrika](https://github.com/Jeffbuleli/Afrika)

## Démarrage local

```bash
cd ~/Documents/Afrika
cp .env.example .env   # si besoin
npm install
npm run db:push
npm run db:seed
npm run dev
```

Ouvre [http://localhost:3001](http://localhost:3001)

- Site FR : `/fr` · EN : `/en` · Admin : `/admin`

### Identifiants admin (seed local)

- Email : `editor@africainsight.local`
- Mot de passe : `africa-insight-dev`

Modifie-les dans `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`) puis relance `npm run db:seed`.

## Contenu

~1700 articles issus des briefings **SHINTA Upwork** (janvier–juillet 2026) :

- Pays : DRC, Mali, Djibouti, Rwanda, Sudan, Uganda
- Rubriques : Politique, Sécurité, Économie, Société, Justice, Culture, Afrique, Opinion

## Production (VPS)

Même VPS que McBuleli (`162.35.181.98`), domaine **www.africa-insight.org**, port local `3002`.
L’ancien sous-domaine `africa.mcbuleli.org` redirige en 301 vers le nouveau domaine.

```bash
# Sur le VPS (bootstrap une fois)
git clone https://github.com/Jeffbuleli/Afrika.git /opt/africa-insight
cd /opt/africa-insight/ops/vps
cp .env.example .env   # secrets forts + NEXT_PUBLIC_APP_URL=https://www.africa-insight.org
# nginx + certbot (voir ops/vps/nginx-africa.conf + issue-cert.sh)
bash /opt/africa-insight/ops/vps/deploy.sh
```

Déploiements suivants : push sur `main` → GitHub Action **Deploy VPS**, ou `bash /opt/africa-insight/ops/vps/deploy.sh`.

DNS (Cloudflare) : **A** `@` et `www` → `162.35.181.98` (proxy orange OK).
SEO : `https://www.africa-insight.org/sitemap.xml` + Search Console.

## Structure utile

| Chemin | Rôle |
|--------|------|
| `src/app/[locale]` | Pages publiques FR/EN |
| `src/app/admin` | CMS rédaction |
| `src/db` | Schéma Drizzle + SQLite |
| `ops/vps` | Docker, nginx, deploy |
| `content/seed-all.json` | Seed bilingue |
| `scripts/seed.ts` | Charge le seed |

## Scripts

```bash
npm run dev        # http://localhost:3001
npm run db:push    # applique le schéma SQLite
npm run db:seed    # catégories, articles, admin
npm run build
npm start
```
