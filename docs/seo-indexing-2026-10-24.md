# Africa Insight — indexation Google (24 oct. 2026)

Export Search Console : `africa-insight.org-Coverage-2026-10-24.zip` (Téléchargements).

## Synthèse (16 oct. 2026)

| Métrique | Valeur |
|----------|--------|
| Dans l’index | ~6 853 |
| Non indexées | ~1 398 |
| Tendance | Fort pic non-indexé début août 2026, puis baisse continue ; plateau ~1,4k depuis mi-oct. |

## Motifs non indexation (export « Problèmes critiques »)

| Raison | Pages | Interprétation |
|--------|------:|----------------|
| Détectée, actuellement non indexée | 902 | File d’attente Google (gros catalogue bilingue ~7k URLs sitemap). |
| Explorée, actuellement non indexée | 433 | Qualité / priorité crawl ; souvent doublons FR/EN ou contenus proches. |
| Autre page avec balise canonique correcte | 30 | Normal : une locale indexée, l’autre renvoie vers le canonique. |
| Introuvable (404) | 26 | URLs sans préfixe `/fr` ou `/en` (ex. `/article/slug`) — **redirections 301 ajoutées oct. 2026**. |
| Page avec redirection | 5 | Apex → www, etc. |
| Bloquée par robots.txt | 2 | Attendu : `/fr/search`, `/en/search` (noindex). |

## Actions techniques (repo)

1. **Couvertures « noires »** : éviter `Bahunde_*_UMBRA-0.jpg` (JPEG niveaux de gris) pour les cartes article ; préférer visuels couleur HD (`/covers/…`).
2. **Redirections permanentes** : `/article/:slug` → `/fr/article/:slug` ; `/:category` → `/fr/:category` (`next.config.ts`).
3. **Sitemap** : `/sitemap.xml` (~7k URLs FR+EN) ; `news-sitemap.xml` = articles **72 dernières heures** uniquement (vide si pas de publication récente — normal).
4. **Search Console** : demander une validation sur « Détectée, non indexée » après déploiement ; inspecter l’URL exemple Rubavu après sync DB.

## Déploiement contenu (featured / image)

Après modification de `content/seed-all.json` :

```bash
bash ops/vps/sync-seed-translations.sh   # sur le VPS, via deploy.sh
```

---

## Bing Webmaster (complément Google)

Import **Google Search Console → Bing Webmaster** = vérif domaine + souvent reprise des sitemaps. **Ce n’est pas** la même index ni les mêmes stats que GSC.

### Checklist Bing (5 min)

1. **Propriété canonique** : `https://www.africa-insight.org` (alignée avec `site.ts` et prod).
2. **Sitemaps** (Bing → Sitemaps), si absents après import :
   - `https://www.africa-insight.org/sitemap.xml`
   - `https://www.africa-insight.org/news-sitemap.xml`
3. **Ne pas** soumettre ~7k URLs à la main (URL Submission) — le sitemap suffit.
4. **Search Performance** Bing : données après quelques jours ; part de marché < Google en Afrique / diaspora FR-EN.

### IndexNow (automatisé dans le repo)

Ping Bing (et autres moteurs IndexNow) à chaque article **publié** ou **republié** via l’admin.

| Variable | Rôle |
|----------|------|
| `INDEXNOW_KEY` | Clé 8–128 caractères `[a-zA-Z0-9-]` (Bing Webmaster ou `openssl rand -hex 16`) |
| `INDEXNOW_HOST` | Optionnel — défaut `www.africa-insight.org` |
| `BING_SITE_VERIFICATION` | Optionnel — meta `msvalidate.01` si vérif HTML |
| `GOOGLE_SITE_VERIFICATION` | Optionnel — meta Google si vérif HTML |

Fichier clé public : `https://www.africa-insight.org/{INDEXNOW_KEY}.txt` (rewrite Next → `/api/indexnow/key-file`). **Rebuild** l’image Docker après ajout de `INDEXNOW_KEY` (rewrite dans `next.config.ts`).

Test après deploy :

```bash
curl -sS "https://www.africa-insight.org/VOTRE_CLE.txt"
curl -sS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{"host":"www.africa-insight.org","key":"VOTRE_CLE","keyLocation":"https://www.africa-insight.org/VOTRE_CLE.txt","urlList":["https://www.africa-insight.org/fr/article/exemple-slug"]}'
```

Réponse **200** ou **202** = OK.

### Script API Bing (sitemaps)

Depuis le repo Afrika (charge `.env`, `ops/vps/.env`, ou `../McBuleliP2P/.env`) :

```bash
npx tsx scripts/bing-webmaster-submit-sitemaps.ts
```

Variables : `BING_WEBMASTER_API_KEY` ou `BING_API_KEY` (clé utilisateur Bing Webmaster → API Access).

### Priorité produit

1. **Google** : file « détectée / explorée non indexée », canoniques FR/EN, fraîcheur.
2. **Bing** : sitemap + IndexNow (coût faible).
3. **Distribution** : LinkedIn, partenaires, backlinks — hors moteurs.
