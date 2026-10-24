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
