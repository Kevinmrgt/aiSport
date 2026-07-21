# B2-A28 - Validation de la baseline `main`, CI, CD et OAuth

> Date : 2026-07-21
> Baseline applicative : `ac02d219802614d1da4064e542f8de6c5487e5eb`
> Version annoncée par les services : `0.13.0-rc.3`

## Chaîne réellement exécutée

| Contrôle               | Exécution                                                                        | Résultat                                   |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| CI complète `main`     | [run 29817362423](https://github.com/Kevinmrgt/aiSport/actions/runs/29817362423) | 6 jobs réussis                             |
| Migration et CD Vercel | [run 29817698665](https://github.com/Kevinmrgt/aiSport/actions/runs/29817698665) | migration, API, Web et smoke tests réussis |
| Playwright OAuth       | [run 29817741589](https://github.com/Kevinmrgt/aiSport/actions/runs/29817741589) | 4/4 scénarios réussis en 56 s              |
| Web health             | `GET https://ai-sport-web.vercel.app/api/health`                                 | HTTP 200, `status=ok`                      |
| API readiness          | `GET https://ai-sport-api.vercel.app/health/ready`                               | HTTP 200, DB `ok`, IA `ok`                 |

La CI a exécuté lint, typecheck, tests de politiques, couvertures, tests
PostgreSQL, Playwright public et axe, builds de production, audit de
dépendances et images Docker. Le CD n'a démarré qu'après le succès de la CI.

## Artefacts de couverture du run `29817362423`

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

Cette annexe prouve la chaîne technique observée. Elle ne prouve pas l'usage
historique exclusif du compte Google ni un audit RGAA humain.
