# Manifeste de dépôt — Bloc 2 RNCP39583

> État consolidé le 2026-07-21. Ce manifeste décrit uniquement des éléments
> observés, exécutés ou produits. L'audit humain RGAA et le test par un
> utilisateur autonome distinct ne sont pas déclarés réalisés.

## 1. Références vérifiables

| Élément                           | Valeur                                         |
| --------------------------------- | ---------------------------------------------- |
| Dépôt                             | `https://github.com/Kevinmrgt/aiSport`         |
| Branche de préparation            | `codex/bloc2-final-render`                     |
| Baseline applicative déployée     | `ac02d219802614d1da4064e542f8de6c5487e5eb`     |
| Commit des compléments techniques | `81b2b0bd6afa0cf3a33cca6d7ee045ae5808709d`     |
| Pull request finale               | `https://github.com/Kevinmrgt/aiSport/pull/39` |
| Version applicative               | `0.13.0-rc.3`                                  |
| Tag de remise prévu après fusion  | `rncp-bloc2-2026-07-21`                        |
| CI baseline `main`                | run `29817362423` — succès                     |
| CD baseline `main`                | run `29817698665` — succès                     |
| E2E authentifié baseline          | run `29817741589` — 4/4, succès                |
| CI du complément technique        | run `29819423534` — six jobs, succès           |
| E2E authentifié du complément     | run `29820498452` — 6/6, succès                |
| Web                               | `https://ai-sport-web.vercel.app`              |
| API liveness                      | `https://ai-sport-api.vercel.app/health`       |
| API readiness                     | `https://ai-sport-api.vercel.app/health/ready` |

Le tag de remise ne doit être créé qu'après fusion et vérification de la branche
`main`. Il ne déplace ni ne remplace le tag historique `v0.13.0-rc.3`.

## 2. Pièces finales à déposer

|  N° | Pièce                | Fichier                                                                       | Contrôle                                                                                                   |
| --: | -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
|  01 | Dossier écrit        | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf` | maximum officiel de 30 pages hors annexes ; pagination, sommaire, liens et rendu visuel contrôlés          |
|  02 | Annexes techniques   | `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf` | preuves sélectionnées A20 et A25 à A31 ; limites explicites                                                |
|  03 | Code source          | archive Git produite par `docs/rncp/tools/build_bloc2_delivery_pack.py`       | uniquement les fichiers suivis du commit de remise ; aucun secret, état OAuth, `.env` ou dépendance locale |
|  04 | Notice et empreintes | `LISEZ-MOI.txt` et `MANIFESTE-SHA256.txt` dans le paquet                      | ordre de lecture, SHA Git et SHA-256 de chaque pièce                                                       |

Empreintes des PDF après gel du rendu :

- dossier principal : `D3B588BCAED154E6B10937C1E408915C376A8B085D5CBFEFA0D35E75DA3889AF` ;
- annexes : `1B450ABABADC439E26B997C8B284DE620F885E97EF790B64ECCEE7C1CB31AB9E`.

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
| Sécurité                                         | dossier §10, revue OWASP, audit de dépendances                |
| Accessibilité                                    | dossier §11, B2-A20, axe automatisé et limites humaines       |
| Historique des versions                          | dossier §12, Git et `CHANGELOG.md`                            |
| Dernière version fonctionnelle, fiable et viable | dossier §13, CI/CD/healthchecks et B2-A28                     |
| Plan de tests et recette                         | dossier §14 et `docs/bloc2/cahier-recettes.md`                |
| Plan de correction des bogues                    | dossier §15 et registre B2-BUG                                |
| Manuel de déploiement                            | dossier §16 et `docs/deployment.md`                           |
| Manuel utilisateur                               | dossier §17 et manuel utilisateur autonome                    |
| Manuel de mise à jour                            | dossier §18 et manuel de mise à jour autonome                 |

## 4. Contrôles techniques exécutés

- [x] installation figée des dépendances ;
- [x] lint, typecheck et build ;
- [x] 155 tests API, 43 tests Web et 14 tests shared ;
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
- [x] aucune session OAuth, adresse personnelle ou donnée de recette incluse
      dans le code source ou les captures finales.

## 5. Contrôles humains non exécutés

- [ ] audit RGAA humain : clavier exhaustif, zoom 200/400 %, contrastes,
      lecteur d'écran et pages privées sur plusieurs tailles ;
- [ ] test du parcours par une personne distincte, sans guidage technique ;
- [ ] confirmation administrative du nommage, de la taille maximale, de la
      portée exacte de l'anonymisation et de la date/heure limite DigiformaCertif.

La checklist `docs/rncp/CHECKLIST-AVANT-DEPOT-BLOC2.md` décrit ces actions. Les
modèles B2-A32 et B2-A33 sont volontairement vides : ils ne doivent être joints
qu'après exécution réelle et signature. Le dossier ne doit pas être présenté
comme « conforme RGAA » ou « testé par un utilisateur autonome » avant cela.
