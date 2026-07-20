# Manifeste de dépôt - Bloc 2 RNCP39583

> Statut au 2026-07-20 : **candidate `0.13.0-rc.3` livrée techniquement**.
> La CI, la CD, les healthchecks, l'audit de dépendances et les recettes
> publiques et authentifiées décrites dans B2-A25 sont réels. L'audit humain
> RGAA complet reste volontairement non validé.

## Références vérifiables

| Élément                          | Valeur                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dépôt                            | `https://github.com/Kevinmrgt/aiSport`                                                            |
| Branche                          | `main`                                                                                            |
| SHA applicatif validé et déployé | `3a21e3b2b547e99410388d5b83b62df79a436ea8`                                                        |
| Pull request                     | `https://github.com/Kevinmrgt/aiSport/pull/34`                                                    |
| Tag de release                   | `v0.13.0-rc.3` - identifie le commit documentaire final qui contient ce manifeste et le PDF       |
| Version API/Web/packages         | `0.13.0-rc.3`                                                                                     |
| CI `main`                        | `https://github.com/Kevinmrgt/aiSport/actions/runs/29747228594` - succès                          |
| CD Vercel                        | `https://github.com/Kevinmrgt/aiSport/actions/runs/29747592571` - succès                          |
| Web                              | `https://ai-sport-web.vercel.app` - HTTP 200, version `0.13.0-rc.3`                               |
| API liveness                     | `https://ai-sport-api.vercel.app/health` - HTTP 200, version `0.13.0-rc.3`                        |
| API readiness                    | `https://ai-sport-api.vercel.app/health/ready` - HTTP 200, PostgreSQL `ok`, configuration IA `ok` |

## Unicité du déploiement de production

Pour le SHA applicatif validé, l'intégration Git Vercel a créé une tentative de
production par projet, toutes deux annulées par `ignoreCommand`. GitHub Actions
a ensuite créé une seule production prête par projet :

| Projet | Intégration Git                                 | CD GitHub Actions                            |
| ------ | ----------------------------------------------- | -------------------------------------------- |
| API    | `dpl_5mrSuitYwdKEmwpvzh7vU9Cp9BFB` - `CANCELED` | `dpl_GKNpqDoHMHkBwUSfMyWZa7q7iUXZ` - `READY` |
| Web    | `dpl_5xgYantaAdLn89GDgRgDSwuUmrPt` - `CANCELED` | `dpl_3dryqiaD8LB7d4cYSYDuBVR7gTVM` - `READY` |

Les deployments Web Dependabot observés avec `target=null` sont des previews et
ne sont pas des doubles productions.

## Pièces du dossier

| Pièce                           | Emplacement                                                  | État réel                                                                                          |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Code source                     | dépôt et tag ci-dessus                                       | présent                                                                                            |
| Dossier écrit, maximum 30 pages | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.3.pdf` | généré : 15 pages, texte extrait et toutes les pages rendues puis inspectées visuellement          |
| Empreinte du PDF                | SHA-256 `C72A04FB7829679972423326BD3445D6F064B0F0E1A04405EE421286D7BC7FB4` | calculée sur le fichier final `rc.3`                                                      |
| Manuel de déploiement           | `docs/deployment.md`                                         | présent et actualisé                                                                               |
| Manuel utilisateur              | `docs/rncp/bloc2-manuel-utilisateur-alcide.md`               | présent                                                                                            |
| Manuel de mise à jour           | `docs/rncp/bloc2-manuel-mise-a-jour.md`                      | présent                                                                                            |
| Cahier de recettes              | `docs/bloc2/cahier-recettes.md`                              | présent ; parcours authentifiés réels détaillés, réserves explicites                               |
| Plan de correction              | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md`        | présent                                                                                            |
| Revue OWASP                     | `docs/security/owasp-review.md`                              | actualisée ; audit low propre                                                                      |
| Accessibilité                   | `docs/rncp/bloc2-accessibilite-rgaa.md` et B2-A20            | automatisation réelle ; audit humain incomplet                                                     |
| Dépendances et CD               | B2-A23                                                       | local, CI et production prouvés                                                                    |
| OAuth et recette authentifiée   | B2-A24 et B2-A25                                             | démarrage OAuth instrumenté, session obtenue par le candidat et parcours privés contre-recettés    |

## Contrôles réussis

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` - 155 tests API et 43 tests Web
- [x] `pnpm test:coverage`
- [x] `pnpm build`
- [x] `pnpm audit --audit-level=low` - aucune vulnérabilité connue
- [x] 8 tests de politique Vercel, dont 2 tests du script CLI réel
- [x] tests d'intégration PostgreSQL dans la CI
- [x] Playwright public et axe dans la CI
- [x] build Docker dans la CI
- [x] migration de production, déploiements API/Web et smoke tests CD
- [x] healthchecks post-déploiement sur `0.13.0-rc.3`
- [x] démarrage OAuth avec PKCE, scopes `openid profile email` et callback HTTPS attendu
- [x] séance et programme générés en production, durées contrôlées puis données de recette supprimées
- [x] Timer pause/reprise/plein écran, onglets, dashboard, paramètres, suppressions et déconnexion contre-recettés

## Contrôles non exécutés - ne pas les revendiquer

- [ ] instrumentation des écrans de compte/consentement Google ;
- [ ] inspection du cookie et de l'expiration de session, volontairement non réalisée ;
- [ ] suite Playwright authentifiée avec un `storageState` réel ;
- [ ] audit RGAA humain complet avec navigation autonome et lecteur d'écran.

La candidate ne doit être présentée comme « prête au dépôt sans réserve »
qu'après l'audit humain et les contrôles personnels restants. Les recettes
authentifiées, les tests unitaires et l'audit axe ne sont pas assimilés à un
audit RGAA humain complet.
