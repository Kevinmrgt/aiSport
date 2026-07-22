# Manifeste de dépôt — Bloc 2 RNCP39583

> État consolidé localement le 2026-07-22. Ce manifeste décrit uniquement des éléments
> observés, exécutés ou produits. Les contrôles d'accessibilité automatisés ne
> sont pas présentés comme une déclaration de conformité exhaustive au RGAA.

## 1. Références vérifiables

| Élément                            | Valeur                                         |
| ---------------------------------- | ---------------------------------------------- |
| Dépôt                              | `https://github.com/Kevinmrgt/aiSport`         |
| Branche de remise                  | `main`                                         |
| Baseline applicative déployée      | `ea703aef912ce9e7c49c4c9b7872a5a7b595b666`     |
| Baseline de consolidation antérieure | `0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`   |
| Pull request fermeture finale      | `https://github.com/Kevinmrgt/aiSport/pull/43` |
| Pull request gel probatoire final  | `https://github.com/Kevinmrgt/aiSport/pull/44` |
| Pull request validation du paquet  | `https://github.com/Kevinmrgt/aiSport/pull/45` |
| Pull request publication `rc.4`    | `https://github.com/Kevinmrgt/aiSport/pull/47` |
| Correction documentaire antérieure | `https://github.com/Kevinmrgt/aiSport/pull/40` |
| Version applicative déployée       | `0.13.0-rc.4`                                  |
| Tag du gel final corrigé           | `rncp-bloc2-2026-07-21-v8`                     |
| Snapshot documentaire antérieur    | `rncp-bloc2-2026-07-21-v7` — retiré, contenu hors périmètre |
| CI pull request `rc.4`             | run `29906947215` — 6 jobs réussis             |
| CI baseline `main`                 | run `29907294766` — 6 jobs réussis             |
| CD baseline `main`                 | run `29907642144` — migration, API, Web et smoke réussis |
| CI/CD de consolidation antérieures | runs `29832575391` / `29832944876` — succès    |
| E2E authentifié baseline           | run `29833210488` — 6/6, succès                |
| Web                                | `https://ai-sport-web.vercel.app`              |
| API liveness                       | `https://ai-sport-api.vercel.app/health`       |
| API readiness                      | `https://ai-sport-api.vercel.app/health/ready` |

Le tag `rncp-bloc2-2026-07-21-v8` identifie le gel final strictement écrit,
enrichi par la preuve négative CI/CD courante B2-A38 et la navigation PDF.
Le gel `v7` est retiré : il ajoutait à tort des supports hors périmètre au Bloc 2.
Il ne déplace ni le tag applicatif historique `v0.13.0-rc.3`, ni les gels
documentaires antérieurs, conservés comme historiques. Le SHA de l'archive de
remise peut être postérieur à `ea703ae` lorsqu'il ne contient que des
corrections documentaires ; la baseline applicative déployée reste alors
explicitement `ea703aef912ce9e7c49c4c9b7872a5a7b595b666`.

La version `0.13.0-rc.4` corrige les avis de dépendances détectés le 22 juillet,
le focus des formulaires invalides et les relations des onglets. Elle a été
publiée après fusion de la PR `#47`, CI/CD verte et contre-recette explicite.

## 2. Pièces finales à déposer

|  N° | Pièce                | Fichier                                                                       | Contrôle                                                                                                   |
| --: | -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
|  01 | Dossier écrit        | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf` | maximum officiel de 30 pages hors annexes ; pagination, sommaire, liens et rendu visuel contrôlés          |
|  02 | Annexes techniques   | `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf` | preuves A20, A25 à A31 et A34 à A40, quatre livrables complets et trois manuels ; limites explicites        |
|  03 | Code source          | archive Git produite par `docs/rncp/tools/build_bloc2_delivery_pack.py`       | fichiers suivis du commit de remise, dont les trois manuels complets ; aucun secret, état OAuth, `.env` ou dépendance locale |
|  04 | Notice et empreintes | `LISEZ-MOI.txt` et `MANIFESTE.txt` dans le paquet                             | ordre de lecture, SHA Git et SHA-256 de chaque pièce                                                       |

Les empreintes qui font foi sont calculées après chaque régénération et inscrites
dans le `MANIFESTE.txt` du paquet. Elles ne sont pas dupliquées ici afin d'éviter
qu'une correction documentaire laisse une empreinte historique présentée comme
courante.

Le paquet local `alcide-bloc2-rncp39583-0.13.0-rc.4-final-2026-07-22.zip` a été
validé depuis un état Git suivi propre. Il contient un dossier de 11 pages et
75 pages d'annexes, les quatre livrables structurants et B2-A39/A40. La gate a
validé navigation, anonymisation, ZIP imbriqué, décompression et empreintes. Le
`MANIFESTE.txt` interne reste la source des SHA-256 des pièces après chaque
régénération.

Les anciens PDF de `docs/rncp/livrables/` et les exports non suffixés
`final-2026-07-21` sont historiques et ne doivent pas être remis.

## 3. Couverture des seize éléments officiels

| Exigence du Bloc 2                               | Preuve principale                                             |
| ------------------------------------------------ | ------------------------------------------------------------- |
| Protocole de déploiement continu                 | dossier §3, `.github/workflows/deploy-vercel.yml`, manuel de déploiement |
| Qualité et performance                           | dossier §3, B2-A29/B2-A39, CI `29907294766`                   |
| Protocole d'intégration continue                 | dossier §4, `.github/workflows/ci.yml`                        |
| Architecture maintenable                         | dossier §5, ADR et arborescence du monorepo                   |
| Prototype                                        | dossier §7, matrice user stories/preuves, B2-A30 et captures desktop/mobile authentifiées |
| Frameworks et paradigmes                         | dossier §6 et ADR                                             |
| Tests unitaires                                  | dossier §8, rapports API/Web/PostgreSQL/shared, B2-A31        |
| Sécurité                                         | dossier §9, revue OWASP, B2-A35 et B2-A39                     |
| Accessibilité                                    | dossier §10, B2-A20/B2-A36/B2-A37/B2-A40, axe, zoom, clavier, sémantique, tri contraste et limites humaines |
| Historique des versions                          | dossier §11, Git et `CHANGELOG.md`                            |
| Dernière version fonctionnelle, fiable et viable | dossier §11, CI/CD/healthchecks et B2-A28/B2-A37              |
| Plan de tests et recette                         | dossier §12, cahier complet et B2-A34 à B2-A40                |
| Plan de correction des bogues                    | dossier §13 et registre B2-BUG                                |
| Manuel de déploiement                            | dossier §14 et `docs/deployment.md`                           |
| Manuel utilisateur                               | dossier §15 et manuel utilisateur autonome                    |
| Manuel de mise à jour                            | dossier §16 et manuel de mise à jour autonome                 |

## 4. Contrôles techniques exécutés

- [x] installation figée des dépendances ;
- [x] lint, typecheck et build ;
- [x] 170 tests API, 55 tests Web et 14 tests shared sur `rc.4` ;
- [x] couverture API, Web, PostgreSQL et shared publiée séparément ;
- [x] `0.13.0-rc.4` : audit de production au niveau `low` sans vulnérabilité
      connue, lint, types, 239 tests et builds verts ;
- [x] publication de `0.13.0-rc.4` : PR `#47`, CI `29907294766`, CD
      `29907642144` et healthchecks API/Web en version `rc.4` ;
- [x] Playwright public et axe dans la CI ;
- [x] Playwright authentifié local et CI finale `29833210488` : 6/6, dont viewport mobile 390 × 844,
      absence de débordement horizontal et axe sans violation critique/sérieuse ;
- [x] images Docker API et Web construites dans la CI ;
- [x] baseline `main` `ea703ae` déployée avec migration et smoke tests par le run `29907642144` ;
- [x] chemin négatif courant isolé : CI `29856584668` rouge, quatre jobs aval
      ignorés, aucun CD associé et inventaires Vercel production inchangés ;
- [x] politique de blocage du workflow CD testée localement : 6/6 ;
- [x] 50 requêtes séquentielles sur chacun des trois endpoints de santé :
      150/150 réponses valides, p95 Web 508,63 ms, API liveness 339,66 ms et
      readiness 267,11 ms, sous l'objectif de 1 000 ms ;
- [x] prototype authentifié réellement capturé en desktop et mobile ;
- [x] sécurité finale : SQL-like sur PostgreSQL réel, XSS Chromium/Firefox,
      secrets/CORS/CSP/headers de production contrôlés ;
- [x] accessibilité `rc.4` : 33/33 Playwright sur 3 pages publiques et 5
      privées, focus invalide et 3/3 relations d'onglets contre-recettés,
      échantillonnage composite 78/79 signatures et 165/166 contextes, zoom
      Chromium natif 200/400 % en production 16/16 ;
- [x] parcours CR-065 de production avec journal et dashboard `3 → 4` ;
- [x] gate d'anonymisation du paquet : texte, métadonnées, annotations, liens
      et flux PDF, puis contenu du ZIP et des archives imbriquées ;
- [x] aucune session OAuth ou donnée de recette incluse dans le code source ou
      les captures finales.

## 5. Contrôles administratifs avant dépôt

- [ ] confirmation administrative du nommage, de la taille maximale, de la
      portée exacte de l'anonymisation et de la date/heure limite DigiformaCertif.

La checklist `docs/rncp/CHECKLIST-AVANT-DEPOT-BLOC2.md` décrit cette vérification.
Le dossier expose les actions d'accessibilité réellement testées et ne formule
aucune déclaration de conformité exhaustive au RGAA.
