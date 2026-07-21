# Manifeste de dépôt — Bloc 2 RNCP39583

> État consolidé le 2026-07-21. Ce manifeste décrit uniquement des éléments
> observés, exécutés ou produits. Les contrôles d'accessibilité automatisés ne
> sont pas présentés comme une déclaration de conformité exhaustive au RGAA.

## 1. Références vérifiables

| Élément                         | Valeur                                         |
| ------------------------------- | ---------------------------------------------- |
| Dépôt                           | `https://github.com/Kevinmrgt/aiSport`         |
| Branche de remise               | `main`                                         |
| Baseline applicative déployée   | `10596d24271bb659e20654fab6fe9fe95afcaf2c`     |
| Pull request technique finale   | `https://github.com/Kevinmrgt/aiSport/pull/39` |
| Correction documentaire         | `https://github.com/Kevinmrgt/aiSport/pull/40` |
| Version applicative             | `0.13.0-rc.3`                                  |
| Tag du gel documentaire corrigé | `rncp-bloc2-2026-07-21-v2`                     |
| CI baseline `main`              | run `29821725811` — succès                     |
| CD baseline `main`              | run `29822081133` — succès                     |
| E2E authentifié baseline        | run `29822300455` — 6/6, succès                |
| Web                             | `https://ai-sport-web.vercel.app`              |
| API liveness                    | `https://ai-sport-api.vercel.app/health`       |
| API readiness                   | `https://ai-sport-api.vercel.app/health/ready` |

Le tag `rncp-bloc2-2026-07-21-v2` identifie le gel corrigé après la fusion de la
PR 40. Il ne déplace ni le tag applicatif `v0.13.0-rc.3`, ni le premier gel
documentaire `rncp-bloc2-2026-07-21`, conservés comme historiques.

## 2. Pièces finales à déposer

|  N° | Pièce                | Fichier                                                                       | Contrôle                                                                                                   |
| --: | -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
|  01 | Dossier écrit        | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf` | maximum officiel de 30 pages hors annexes ; pagination, sommaire, liens et rendu visuel contrôlés          |
|  02 | Annexes techniques   | `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf` | preuves sélectionnées A20, A25 à A31 et A34 à A36 ; limites explicites                                     |
|  03 | Code source          | archive Git produite par `docs/rncp/tools/build_bloc2_delivery_pack.py`       | uniquement les fichiers suivis du commit de remise ; aucun secret, état OAuth, `.env` ou dépendance locale |
|  04 | Notice et empreintes | `LISEZ-MOI.txt` et `MANIFESTE.txt` dans le paquet                             | ordre de lecture, SHA Git et SHA-256 de chaque pièce                                                       |

Empreintes des PDF après gel du rendu :

- dossier principal : `A4BA0121CE37A9542FE96CBD9590363E79312E4E91FDBF6BFAAB1C001C6EC364` ;
- annexes : `B034C7E0A0F9D013B3FB95B3E5CE520C559BDC682CC215F69021063A3CCA6283`.

Les anciens PDF de `docs/rncp/livrables/` et les exports non suffixés
`final-2026-07-21` sont historiques et ne doivent pas être remis.

## 3. Couverture des seize éléments officiels

| Exigence du Bloc 2                               | Preuve principale                                             |
| ------------------------------------------------ | ------------------------------------------------------------- |
| Protocole de déploiement continu                 | dossier §3, `.github/workflows/cd.yml`, manuel de déploiement |
| Qualité et performance                           | dossier §4, B2-A29, CI `29819423534`                          |
| Protocole d'intégration continue                 | dossier §5, `.github/workflows/ci.yml`                        |
| Architecture maintenable                         | dossier §6, ADR et arborescence du monorepo                   |
| Prototype                                        | dossier §7, B2-A30 et captures desktop/mobile authentifiées   |
| Frameworks et paradigmes                         | dossier §8 et ADR                                             |
| Tests unitaires                                  | dossier §9, rapports API/Web/PostgreSQL/shared, B2-A31        |
| Sécurité                                         | dossier §10, revue OWASP, B2-A35 et audit de dépendances      |
| Accessibilité                                    | dossier §11, B2-A20/B2-A36, axe, clavier et limites humaines  |
| Historique des versions                          | dossier §12, Git et `CHANGELOG.md`                            |
| Dernière version fonctionnelle, fiable et viable | dossier §13, CI/CD/healthchecks et B2-A28                     |
| Plan de tests et recette                         | dossier §14, cahier et B2-A34 à B2-A36                        |
| Plan de correction des bogues                    | dossier §15 et registre B2-BUG                                |
| Manuel de déploiement                            | dossier §16 et `docs/deployment.md`                           |
| Manuel utilisateur                               | dossier §17 et manuel utilisateur autonome                    |
| Manuel de mise à jour                            | dossier §18 et manuel de mise à jour autonome                 |

## 4. Contrôles techniques exécutés

- [x] installation figée des dépendances ;
- [x] lint, typecheck et build ;
- [x] 170 tests API, 55 tests Web et 14 tests shared sur la candidate locale ;
- [x] couverture API, Web, PostgreSQL et shared publiée séparément ;
- [x] audit des dépendances au niveau `low` sans vulnérabilité connue ;
- [x] Playwright public et axe dans la CI ;
- [x] Playwright authentifié local et CI `29820498452` : 6/6, dont viewport mobile 390 × 844,
      absence de débordement horizontal et axe sans violation critique/sérieuse ;
- [x] images Docker API et Web construites dans la CI ;
- [x] baseline `main` déployée avec migration et smoke tests ;
- [x] 50 requêtes séquentielles sur chacun des trois endpoints de santé :
      150/150 réponses valides, p95 Web 508,63 ms, API liveness 339,66 ms et
      readiness 267,11 ms, sous l'objectif de 1 000 ms ;
- [x] prototype authentifié réellement capturé en desktop et mobile ;
- [x] sécurité finale : SQL-like sur PostgreSQL réel, XSS Chromium/Firefox,
      secrets/CORS/CSP/headers de production contrôlés ;
- [x] accessibilité finale : 33/33 Playwright sur 3 pages publiques et 5
      privées, 2/2 structure, clavier/focus/reflow/contrastes/arbre AX ;
- [x] parcours CR-065 de production avec journal et dashboard `3 → 4` ;
- [x] aucune session OAuth, adresse personnelle ou donnée de recette incluse
      dans le code source ou les captures finales.

## 5. Contrôles administratifs avant dépôt

- [ ] confirmation administrative du nommage, de la taille maximale, de la
      portée exacte de l'anonymisation et de la date/heure limite DigiformaCertif.

La checklist `docs/rncp/CHECKLIST-AVANT-DEPOT-BLOC2.md` décrit cette vérification.
Le dossier expose les actions d'accessibilité réellement testées et ne formule
aucune déclaration de conformité exhaustive au RGAA.
