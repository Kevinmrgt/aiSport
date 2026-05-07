# Preuves MCO Bloc 4 a completer

> Projet : SportCoach IA / aiSport  
> Bloc RNCP39583 : Maintenir l'application logicielle en condition operationnelle  
> Date de mise en place : 2026-05-07

## Preuves deja mises en place dans le repo

| Preuve                                     | Fichier ou outil                                                           | Competence        |
| ------------------------------------------ | -------------------------------------------------------------------------- | ----------------- |
| Workflow de monitoring production horaire  | `.github/workflows/production-health-monitor.yml`                          | C4.1.2            |
| Issue automatique en cas de healthcheck KO | GitHub Actions + GitHub Issues                                             | C4.1.2 / C4.2.1   |
| Template anomalie                          | `.github/ISSUE_TEMPLATE/anomaly_report.yml`                                | C4.2.1            |
| Template support client                    | `.github/ISSUE_TEMPLATE/support_case.yml`                                  | C4.3.3            |
| Pull request checklist MCO                 | `.github/PULL_REQUEST_TEMPLATE.md`                                         | C4.2.2 / C4.3.2   |
| Healthchecks no-store et versionnes        | `apps/api/src/routes/health.routes.ts`, `apps/web/app/api/health/route.ts` | C4.1.2            |
| Test unitaire API health                   | `apps/api/tests/health.routes.test.ts`                                     | C4.1.2            |
| Setup MCP local                            | `.codex/config.toml`, `docs/mcp-setup.md`                                  | Support outillage |

## Captures a produire avant depot

| Priorite | Capture                                                       | Pourquoi                               |
| -------- | ------------------------------------------------------------- | -------------------------------------- |
| P0       | Run GitHub Actions `Monitoring - Production health` en succes | Prouver que la surveillance fonctionne |
| P0       | Detail du run avec artifact `production-health-report`        | Prouver les sondes et payloads         |
| P0       | Better Stack : deux monitors API/Web actifs                   | Renforcer C4.1.2 avec outil externe    |
| P0       | Better Stack : destinataire e-mail d'alerte                   | Prouver la modalite de signalement     |
| P1       | Issue GitHub creee depuis le template anomalie                | Prouver le processus de collecte       |
| P1       | Issue GitHub creee depuis le template support                 | Prouver C4.3.3 avec un cas support     |
| P1       | Capture d'une CI verte finale                                 | Prouver non-regression avant depot     |
| P1       | Capture Dependabot ou audit dependances traite                | Prouver C4.1.1                         |
| P2       | Capture Vercel deployments avec dernier deploiement sain      | Prouver rollback possible              |
| P2       | Capture Neon backup/branch avant migration                    | Prouver reprise DB                     |

## Ticket support pilote conseille

Creer une issue avec le template `Cas support client Bloc 4` :

- titre : `[SUPPORT] Generation IA trop lente sur programme 8 semaines`
- contexte : utilisateur pilote signale une attente longue ou une erreur de generation ;
- diagnostic : logs IA, timeout, validation Zod, charge fournisseur ;
- resolution : message utilisateur plus clair, limitation du scenario de demo, recommandation retry/backoff ;
- validation : test de generation court + confirmation du retour pilote.

Ce ticket peut etre annonce comme une mise en situation si aucun vrai client n'a remonte le probleme. Il faut rester explicite avec le jury.

## Definition de pret pour le dossier Bloc 4

Le Bloc 4 est pret lorsque :

- le workflow de monitoring a au moins un run vert ;
- un canal d'alerte externe ou GitHub est visible ;
- une anomalie est consignee avec reproduction, impact, cause, correctif et validation ;
- un cas support est trace, meme en mise en situation declaree ;
- le changelog reference les correctifs ;
- les limites restantes sont assumees dans la conclusion.
