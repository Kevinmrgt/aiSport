# Sécurité applicative

Cette synthèse conserve les contrôles et risques utiles à l'exploitation.
Elle ne remplace ni une recette de la révision livrée ni un audit complet.

| Domaine            | Contrôles présents                                                               | Limites à suivre                                                                              |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Accès              | OAuth Google, session Auth.js, secret interservice, ownership et validation UUID | Recette Google et isolation PostgreSQL sur la révision livrée                                 |
| Secrets            | Variables serveur, clé IA uniquement côté API                                    | Rotation coordonnée et contrôle des artefacts                                                 |
| Injection          | Requêtes Drizzle paramétrées, validation Zod, rendu React                        | Tests SQL-like sur DB réelle et XSS navigateur                                                |
| Abus et coût IA    | Limiteur utilisateur, timeouts et retries bornés                                 | Limitation en mémoire ; aucun budget global par compte Google                                 |
| Configuration      | CORS restrictif, headers Hono/Next.js et readiness séparée                       | CSP `unsafe-inline` ; nonce à étudier                                                         |
| Dépendances        | Lockfile figé, audit en CI et mises à jour suivies                               | Réexécuter l'audit à chaque livraison                                                         |
| Authentification   | Google seul, pages privées protégées et cookie Auth.js                           | Cookies marqués d'un autre fournisseur refusés ; session de 30 jours à réévaluer              |
| Intégrité          | CI avant CD, SHA livré, migrations versionnées et sorties IA validées            | Rollback DB distinct du rollback applicatif                                                   |
| Journaux           | Événements d'erreur/auth/API et surveillance Web/API                             | Corrélation, rétention et alertes sécurité à compléter ; aucun journal privé dans les tickets |
| Requêtes sortantes | URL OpenAI fixe côté serveur et délais bornés                                    | Surveiller erreurs et volumes réels                                                           |

Les tests API, Web, Playwright et PostgreSQL restent dans le code sous leurs
noms produit. Voir [testing.md](../testing.md).

Les données saisies, notamment le ressenti et les notes de douleur, nécessitent
une politique d'exploitation explicite. Les points ouverts sont conservés dans
[release-readiness.md](../release-readiness.md).
