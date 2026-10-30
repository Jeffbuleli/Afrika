# Audience analytics (admin)

Africa Insight enregistre deux niveaux de métriques :

| Niveau | Rétention | Usage |
|--------|-----------|--------|
| **Logs bruts** (`visit_logs`) | 2500 dernières lignes | Debug live, IP, référent exact |
| **Agrégats journaliers** | 90 jours | Tendances 7 / 30 jours, partenaires |

## Où voir

Admin → **Logs & visites** → section **Audience** : bascule **D / W / M**, tri récent ou ancien, un seul tableau + totaux de la période affichée.

## Définitions

- **Pages vues** : une ligne par changement de page (beacon client), bots exclus.
- **Visiteurs uniques (jour)** : une empreinte SHA-256 de l’IP par jour (pepper `ANALYTICS_IP_PEPPER` optionnel).
- **Visiteurs uniques (7 / 30 j)** : `COUNT(DISTINCT ip_hash)` sur la fenêtre — une personne comptée une fois même si elle revient plusieurs jours.
- **Google** : référent dont l’hôte contient `google.`.
- **Interne** : référent `africa-insight.org` (navigation multi-pages, pas une preuve d’install PWA).
- **Direct** : référent vide (souvent favori, PWA, lien copié).
- **PWA standalone** : page vue avec `display-mode: standalone`.
- **Installs PWA** : événement `appinstalled` (Chrome/Edge), pas iOS « Ajouter à l’écran » sans API.

## Limites

- Pas de remplacement de Google Analytics / Search Console pour le SEO global.
- Somme des uniques journaliers ≠ uniques sur 30 j (utiliser la colonne agrégée 30 j).
- Historique antérieur au déploiement de cette fonctionnalité n’est pas reconstruit.

## Code

- `src/lib/analytics.ts` — `getAudienceReport()`, `AUDIENCE_RETENTION_DAYS`
- `POST /api/analytics/visit` — beacon + `displayMode`
- `POST /api/analytics/install` — compteur install
