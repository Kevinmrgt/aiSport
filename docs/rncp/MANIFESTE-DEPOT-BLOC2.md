# Manifeste de dépôt - Bloc 2 RNCP39583

> Statut au 2026-07-20 : **candidate `0.13.0-rc.2` livrée techniquement**.
> La CI, la CD, les healthchecks, l'audit de dépendances et les recettes
> publiques sont réels. Le parcours Google authentifié complet et l'audit humain
> RGAA restent volontairement non validés.

## Références vérifiables

| Élément                          | Valeur                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dépôt                            | `https://github.com/Kevinmrgt/aiSport`                                                            |
| Branche                          | `main`                                                                                            |
| SHA applicatif validé et déployé | `4151b80cc6d164c38549e753f7b960ec4914f519`                                                        |
| Pull request                     | `https://github.com/Kevinmrgt/aiSport/pull/30`                                                    |
| Tag de release                   | `v0.13.0-rc.2` - créé sur le commit documentaire final qui contient ce manifeste et le PDF        |
| Version API/Web/packages         | `0.13.0-rc.2`                                                                                     |
| CI `main`                        | `https://github.com/Kevinmrgt/aiSport/actions/runs/29740673466` - succès                          |
| CD Vercel                        | `https://github.com/Kevinmrgt/aiSport/actions/runs/29740979781` - succès                          |
| Web                              | `https://ai-sport-web.vercel.app` - HTTP 200, version `0.13.0-rc.2`                               |
| API liveness                     | `https://ai-sport-api.vercel.app/health` - HTTP 200, version `0.13.0-rc.2`                        |
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
| Dossier écrit, maximum 30 pages | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.2.pdf` | généré : 15 pages, texte extrait contrôlé et toutes les pages rendues puis inspectées visuellement |
| Manuel de déploiement           | `docs/deployment.md`                                         | présent et actualisé                                                                               |
| Manuel utilisateur              | `docs/rncp/bloc2-manuel-utilisateur-alcide.md`               | présent                                                                                            |
| Manuel de mise à jour           | `docs/rncp/bloc2-manuel-mise-a-jour.md`                      | présent                                                                                            |
| Cahier de recettes              | `docs/bloc2/cahier-recettes.md`                              | présent ; parcours authentifiés à compléter                                                        |
| Plan de correction              | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md`        | présent                                                                                            |
| Revue OWASP                     | `docs/security/owasp-review.md`                              | actualisée ; audit low propre                                                                      |
| Accessibilité                   | `docs/rncp/bloc2-accessibilite-rgaa.md` et B2-A20            | automatisation réelle ; audit humain incomplet                                                     |
| Dépendances et CD               | B2-A23                                                       | local, CI et production prouvés                                                                    |
| OAuth production                | B2-A24                                                       | démarrage jusqu'à Google prouvé ; connexion non effectuée                                          |

## Contrôles réussis

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` - 91 tests API et 39 tests Web
- [x] `pnpm test:coverage`
- [x] `pnpm build`
- [x] `pnpm audit --audit-level=low` - aucune vulnérabilité connue
- [x] 8 tests de politique Vercel, dont 2 tests du script CLI réel
- [x] tests d'intégration PostgreSQL dans la CI
- [x] Playwright public et axe dans la CI
- [x] build Docker dans la CI
- [x] migration de production, déploiements API/Web et smoke tests CD
- [x] healthchecks post-déploiement sur `0.13.0-rc.2`
- [x] démarrage OAuth avec PKCE, scopes `openid profile email` et callback HTTPS attendu

## Contrôles non exécutés - ne pas les revendiquer

- [ ] saisie d'un compte Google, consentement et retour Auth.js ;
- [ ] vérification réelle du cookie et de l'expiration de session ;
- [ ] génération d'une séance et d'un programme par un utilisateur authentifié sur `0.13.0-rc.2` ;
- [ ] suite Playwright authentifiée avec un `storageState` réel ;
- [ ] audit RGAA humain complet avec navigation autonome et lecteur d'écran.

La candidate ne doit être présentée comme « prête au dépôt sans réserve »
qu'après ces actions personnelles. Les tests publics, les tests unitaires et
l'audit axe ne sont pas assimilés à un audit RGAA humain complet.
