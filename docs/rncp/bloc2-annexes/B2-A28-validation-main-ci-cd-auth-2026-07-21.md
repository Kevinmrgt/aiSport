# B2-A28 - Validation de la baseline de consolidation, CI, CD et OAuth

> Date : 2026-07-21
> Baseline de consolidation avant le correctif final de reflow : `0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`
> Version annoncée par les services : `0.13.0-rc.3`
> Baseline canonique après correctif de reflow : `b002adb0e0e7d8d85ee493d54879e190d77d2078`, CI `29845956008`, CD `29846343559`

## Chaîne réellement exécutée

| Contrôle                       | Exécution                                                                        | Résultat                                   |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------ |
| CI complète `main`             | [run 29832575391](https://github.com/Kevinmrgt/aiSport/actions/runs/29832575391) | 6 jobs réussis                             |
| Migration et CD Vercel         | [run 29832944876](https://github.com/Kevinmrgt/aiSport/actions/runs/29832944876) | migration, API, Web et smoke tests réussis |
| Playwright OAuth               | [run 29833210488](https://github.com/Kevinmrgt/aiSport/actions/runs/29833210488) | 6/6 scénarios réussis en 9,8 s             |
| Playwright accessibilité du lot | exécution locale sur la production `0d5c6b6`                                      | 33/33 sur 3 pages publiques et 5 privées   |
| Web health                     | `GET https://ai-sport-web.vercel.app/api/health`                                 | HTTP 200, `status=ok`                      |
| API readiness                  | `GET https://ai-sport-api.vercel.app/health/ready`                               | HTTP 200, DB `ok`, IA `ok`                 |

La CI a exécuté lint, typecheck, tests de politiques, 170 tests API, 55 Web,
14 shared, couvertures, tests PostgreSQL, Playwright public et axe, builds de
production, audit de dépendances et images Docker. Le CD n'a démarré qu'après
le succès de la CI.

## Artefacts de couverture détaillée du run antérieur `29817362423`

Les métriques ci-dessous ont été extraites du premier run consolidé et restent
conservées pour leur granularité. Le run de consolidation `29832575391` republie les quatre
rapports après l'ajout des recettes finales.

Les artefacts suivants ont été listés puis téléchargés depuis GitHub Actions :

- `coverage-report-api` ;
- `coverage-report-web` ;
- `coverage-report-api-integration` ;
- `playwright-report`.

L'analyse des fichiers `lcov.info` donne :

| Rapport                    |                Lignes |          Branches |         Fonctions |
| -------------------------- | --------------------: | ----------------: | ----------------: |
| API unitaire               | 1 038/1 212 - 85,64 % | 197/245 - 80,41 % |   62/65 - 95,38 % |
| Web                        | 2 804/4 061 - 69,05 % | 405/520 - 77,88 % | 110/136 - 80,88 % |
| API intégration PostgreSQL |     431/460 - 93,70 % |      52/65 - 80 % |     16/16 - 100 % |

Le package `shared` ne disposait pas encore d'un rapport autonome dans ce run.
Cette lacune est corrigée et prouvée séparément dans B2-A31.

## Protection de la session OAuth

Le run authentifié restaure le `storageState` depuis GitHub Secrets, vérifie
l'identité Auth.js attendue, n'enregistre aucune session Google et supprime le
fichier du runner avant la publication du rapport. Les logs masquent
l'identité. Le fichier local reste exclu de Git et protégé par les droits du
seul utilisateur Windows.

Cette annexe prouve la chaîne technique observée, sans prouver l'usage
historique exclusif du compte Google ni un audit RGAA humain. Elle conserve la
preuve de la consolidation `0d5c6b6` : le correctif de reflow postérieur ne
modifie ni le protocole CI/CD, ni les couvertures, ni le parcours OAuth. La
baseline applicative finalement déployée est `b002adb`, validée par la CI
`29845956008`, le CD `29846343559`, le zoom natif 16/16 et la contre-recette
d'accessibilité 33/33 détaillés dans B2-A37.
