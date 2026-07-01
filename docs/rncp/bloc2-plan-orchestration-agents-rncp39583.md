# Plan d'orchestration agents - Bloc 2 RNCP39583

> Objectif : permettre à un orchestrateur de distribuer le Bloc 2 "Concevoir et développer des applications logicielles" à un agent à la fois, avec un périmètre précis, des livrables vérifiables, des contrôles systématiques et une traçabilité exploitable pour le jury.

## 1. Périmètre officiel Bloc 2

Le Bloc 2 est un rendu écrit individuel avec code source et documentation associée. Le dossier final doit tenir en 30 pages maximum hors annexes et couvrir :

- protocole de déploiement continu ;
- critères de qualité et de performance ;
- protocole d'intégration continue ;
- architecture logicielle maintenable ;
- présentation d'un prototype réalisé ;
- frameworks et paradigmes de développement ;
- jeu de tests unitaires ;
- mesures de sécurité ;
- accessibilité pour les personnes en situation de handicap ;
- historique des versions ;
- dernière version fonctionnelle, fiable et viable ;
- cahier de recettes ;
- plan de correction des bogues ;
- manuel de déploiement ;
- manuel d'utilisation ;
- manuel de mise à jour.

Compétences éliminatoires Bloc 2 :

- C2.2.1 : prototype logiciel ergonomique et sécurisé ;
- C2.2.2 : harnais de tests unitaires ;
- C2.2.3 : développement évolutif, sécurisé, accessible et conforme ;
- C2.3.1 : cahier de recettes.

## 2. Sources de vérité

L'orchestrateur doit imposer ces sources dans cet ordre :

1. Référentiel officiel RNCP39583 et règlement spécial présents dans `docs/rncp/`.
2. Matrice locale : `docs/rncp/matrice-conformite-rncp39583.md`.
3. Audit final : `docs/rncp/audit-final-conformite-rncp39583.md`.
4. Dossier professionnel : `docs/rncp/dossier-professionnel-rncp39583.md`.
5. Cahier de recettes : `docs/bloc2/cahier-recettes.md`.
6. Code réel : `apps/api/`, `apps/web/`, `packages/shared/`, `.github/workflows/`.

Règle stricte : un agent ne doit pas inventer une preuve. Si une preuve n'existe pas ou n'a pas été relancée, il doit écrire "à produire", "à relancer" ou "non vérifié" avec une action claire.

## 3. Gouvernance d'orchestration

Un seul agent travaille à la fois sur une mission. L'orchestrateur valide la mission avant de lancer la suivante.

Chaque mission doit avoir :

- un identifiant unique `B2-MXX` ;
- un objectif mesurable ;
- un périmètre de fichiers autorisés ;
- des entrées à lire avant d'écrire ;
- des livrables attendus ;
- des contrôles à exécuter ;
- un statut final : `À faire`, `En cours`, `En revue`, `Validé`, `Bloqué`.

L'orchestrateur tient un journal de suivi dans ce format :

| Mission | Agent | Statut | Fichiers modifiés | Commandes lancées | Résultat contrôle | Bloquants | Validation orchestrateur |
|---|---|---|---|---|---|---|---|
| B2-M00 |  | À faire |  |  |  |  |  |

## 4. Règles de contrôle qualité

Avant de valider une mission, l'orchestrateur contrôle :

- le livrable répond exactement à la compétence ou à l'attendu ciblé ;
- les chemins de preuves existent dans le dépôt ;
- les chiffres de tests sont cohérents partout ;
- les E2E ne sont jamais annoncés comme réussis s'ils n'ont pas été relancés ;
- les fichiers hors périmètre n'ont pas été modifiés ;
- le style reste factuel, professionnel et compatible jury ;
- les écarts sont assumés au lieu d'être maquillés ;
- les compétences éliminatoires C2.2.1, C2.2.2, C2.2.3 et C2.3.1 restent toujours prioritaires.

Commandes de contrôle recommandées après les missions documentaires :

```powershell
git diff --stat
rg -n "28 tests|32 tests|41 tests|55 tests|61 tests|E2E.*pass|Playwright.*pass" docs README.md
rg -n "CR-013|CR-040|CR-044|À tester|A relancer|À relancer" docs/bloc2 docs/rncp
```

Commandes de contrôle recommandées après les missions code/tests :

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm --filter web exec playwright test --list
```

## 5. Missions agent par agent

### B2-M00 - État initial et gel des faits

Objectif : établir la photographie exacte du dépôt avant travail Bloc 2.

Périmètre autorisé :

- lecture seule, sauf ajout éventuel d'un journal de suivi si demandé par l'orchestrateur.

Entrées à lire :

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- `docs/rncp/matrice-conformite-rncp39583.md`
- `docs/rncp/audit-final-conformite-rncp39583.md`
- `docs/bloc2/cahier-recettes.md`

Livrable :

- synthèse courte : branche, état Git, chiffres de tests actuellement déclarés, écarts Bloc 2 connus.

Contrôle d'acceptation :

- aucune modification applicative ;
- la synthèse distingue faits vérifiés et faits à relancer.

### B2-M01 - Mapping officiel Bloc 2 vers livrables

Objectif : produire une table de correspondance complète entre chaque compétence C2.x et les livrables/preuves du projet.

Périmètre autorisé :

- `docs/rncp/bloc2-*.md`
- `docs/rncp/matrice-conformite-rncp39583.md`

Entrées à lire :

- référentiel RNCP local ;
- `docs/rncp/matrice-conformite-rncp39583.md`.

Livrable :

- tableau : compétence, éliminatoire ou non, attendu officiel, preuve existante, fichier de preuve, statut, action restante.

Contrôle d'acceptation :

- toutes les compétences C2.1.1 à C2.4.1 sont présentes ;
- les quatre compétences éliminatoires sont signalées visiblement ;
- aucune compétence Bloc 1, 3 ou 4 n'est mélangée dans le livrable Bloc 2.

### B2-M02 - Structure du dossier final Bloc 2

Objectif : créer ou consolider le squelette du dossier final Bloc 2 en 30 pages maximum hors annexes.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- `docs/rncp/dossier-professionnel-rncp39583.md`
- `docs/rncp/matrice-conformite-rncp39583.md`

Livrable :

- plan détaillé du dossier avec sections, objectif de chaque section, preuves associées, estimation de volume par section.

Contrôle d'acceptation :

- le dossier couvre les 16 attendus officiels ;
- les annexes sont séparées du coeur du dossier ;
- le volume cible reste compatible avec 30 pages.

### B2-M03 - Environnements, déploiement et critères qualité/performance

Objectif : documenter C2.1.1 avec critères mesurables.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `docs/deployment.md`
- `docs/ci-cd.md`

Entrées à lire :

- `docker-compose.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `.github/workflows/ci.yml`
- `apps/api/src/routes/health.routes.ts`
- `apps/web/app/api/health/route.ts`

Livrable :

- section "Environnements et critères qualité/performance" ;
- tableau des critères : coverage, build, healthcheck API, healthcheck Web, temps cible génération IA, disponibilité cible, audit sécurité.

Contrôle d'acceptation :

- chaque critère a une méthode de mesure ;
- les critères non mesurés en réel sont indiqués comme cible ou à vérifier ;
- aucune fausse mesure de production n'est affirmée.

### B2-M04 - Protocole d'intégration continue

Objectif : documenter C2.1.2 et prouver le pipeline CI.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `docs/ci-cd.md`

Entrées à lire :

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-vercel.yml`
- `.github/workflows/db-migrate.yml`
- `package.json`

Livrable :

- schéma textuel du pipeline ;
- liste des gates : install, shared build, typecheck, lint, tests, coverage, build, smoke, audit ;
- emplacement prévu pour capture CI verte.

Contrôle d'acceptation :

- la CI documentée correspond au YAML réel ;
- si aucune capture récente n'est présente, le livrable mentionne "preuve CI verte à annexer".

### B2-M05 - Prototype et storyboard utilisateur

Objectif : sécuriser C2.2.1 avec une présentation claire du prototype.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- dossier d'annexes Bloc 2 si créé

Entrées à lire :

- `apps/web/app/`
- `apps/web/components/`
- `docs/bloc2/cahier-recettes.md`

Livrable :

- storyboard du parcours : accueil, login, génération, détail/timer, liste, dashboard ;
- liste des captures nécessaires desktop/mobile ;
- justification ergonomie, équipements ciblés et sécurité.

Contrôle d'acceptation :

- le prototype est présenté comme la dernière version fonctionnelle du projet ;
- les routes citées existent ;
- les captures manquantes sont listées explicitement comme à produire.

### B2-M06 - Architecture logicielle maintenable

Objectif : documenter l'architecture structurée et sa maintenabilité.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- `apps/api/src/routes/`
- `apps/api/src/controllers/`
- `apps/api/src/services/`
- `apps/api/src/repositories/`
- `apps/web/app/`
- `packages/shared/src/`
- `docs/adr/ADR-001-monorepo-pnpm.md`
- `docs/adr/ADR-002-hono-backend.md`

Livrable :

- section architecture avec diagramme texte ;
- justification des couches ;
- preuve de séparation frontend, API, contrats partagés, persistance.

Contrôle d'acceptation :

- aucun composant majeur du code réel n'est oublié ;
- les chemins de preuve pointent vers des fichiers existants ;
- la section explique la maintenabilité, pas seulement la stack.

### B2-M07 - Frameworks et paradigmes de développement

Objectif : relier les choix techniques aux exigences Bloc 2.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- éventuellement `docs/adr/` si correction factuelle nécessaire

Entrées à lire :

- `README.md`
- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `packages/shared/package.json`
- ADR existantes

Livrable :

- tableau framework/paradigme : Next.js App Router, Hono, Drizzle, Zod, Auth.js, Vitest, Playwright, pnpm workspace, Server Components/Actions, architecture en couches.

Contrôle d'acceptation :

- chaque choix a un rôle, un bénéfice et une preuve ;
- aucune technologie absente du repo n'est ajoutée.

### B2-M08 - Harnais de tests unitaires et couverture

Objectif : sécuriser C2.2.2.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `docs/bloc2/cahier-recettes.md`
- fichiers de tests seulement si l'orchestrateur demande une correction code

Entrées à lire :

- `apps/api/tests/`
- `apps/api/vitest.config.ts`
- `apps/web/components/Timer.test.ts`
- `apps/web/vitest.config.ts`
- `package.json`

Livrable :

- synthèse des suites de tests ;
- chiffres de référence ;
- limites assumées : repositories DB, E2E à relancer si non exécutés ;
- commande exacte de reproduction.

Contrôle d'acceptation :

- les chiffres sont homogènes : 70 Vitest si aucune relance ne prouve autre chose ;
- les anciens chiffres 28, 32, 41, 55, 61 sont supprimés ou marqués historiques ;
- aucune réussite E2E n'est affirmée sans log récent.

### B2-M09 - Sécurité applicative Bloc 2

Objectif : documenter les mesures de sécurité mises en oeuvre pour C2.2.3.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `docs/security/owasp-review.md`
- `docs/bloc2/cahier-recettes.md`

Entrées à lire :

- `apps/api/src/middleware/auth.middleware.ts`
- `apps/api/src/middleware/rate-limit.middleware.ts`
- `apps/api/src/lib/validate-env.ts`
- `apps/web/lib/server-api.ts`
- `packages/shared/src/schemas/`

Livrable :

- tableau risque -> mesure -> preuve -> scénario de recette ;
- statut de `pnpm audit --audit-level=high` : corrigé, à corriger ou justifié.

Contrôle d'acceptation :

- les vulnérabilités high ne sont pas ignorées ;
- les secrets sont décrits comme serveur uniquement ;
- les scénarios sécurité du cahier de recettes restent alignés au code.

### B2-M10 - Accessibilité et handicap

Objectif : documenter les actions d'accessibilité pour C2.2.3.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `docs/bloc2/cahier-recettes.md`

Entrées à lire :

- `apps/web/tests/e2e/accessibility.spec.ts`
- `apps/web/tests/e2e/axe.spec.ts`
- composants Web concernés : layout, formulaires, Timer

Livrable :

- section accessibilité : navigation clavier, focus visible, labels, skip link, aria-live, aria-busy, axe-core ;
- liste des preuves à annexer : rapport Playwright/axe, captures.

Contrôle d'acceptation :

- les tests non relancés sont marqués à relancer ;
- la section parle d'accès aux personnes en situation de handicap, pas seulement de "bonne UX".

### B2-M11 - Dernière version fonctionnelle et historique

Objectif : documenter C2.2.4.

Périmètre autorisé :

- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`
- `CHANGELOG.md`
- `docs/deployment.md`

Entrées à lire :

- `CHANGELOG.md`
- `docs/sprints/`
- `docs/deployment.md`
- workflows CD

Livrable :

- section historique des versions ;
- preuve de dernière version fonctionnelle ;
- protocole de validation post-déploiement.

Contrôle d'acceptation :

- la version déclarée est cohérente entre README, CHANGELOG, API, dossier RNCP ;
- si la production n'a pas été vérifiée, écrire "à vérifier" et fournir la commande.

### B2-M12 - Cahier de recettes : correction et verrouillage

Objectif : sécuriser C2.3.1, compétence éliminatoire.

Périmètre autorisé :

- `docs/bloc2/cahier-recettes.md`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- cahier complet ;
- code des fonctionnalités citées ;
- tests E2E et unitaires.

Livrable :

- cahier corrigé ;
- traitement explicite de CR-013, CR-040 et CR-044 ;
- table de synthèse : nombre de scénarios, passés, à relancer, bloqués.

Contrôle d'acceptation :

- aucun scénario ne promet un comportement absent du code ;
- CR-013 n'est plus laissé vague ;
- CR-040 et CR-044 sont alignés avec le code réel ;
- les E2E restent à relancer si aucun log récent n'existe.

### B2-M13 - Plan de correction des bogues

Objectif : couvrir C2.3.2 avec un plan global issu de la recette.

Périmètre autorisé :

- `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- `docs/bloc2/cahier-recettes.md`
- `docs/bloc4/bugs/`
- `CHANGELOG.md`
- audit final Bloc 2

Livrable :

- procédure de correction : détection, qualification, reproduction, correction, test, validation, déploiement, clôture ;
- tableau anomalies : ID, source, gravité, cause, correctif, fichier, test de non-régression, statut.

Contrôle d'acceptation :

- le plan relie au moins les anomalies connues et les scénarios de recette ;
- il ne se contente pas de recopier les fiches Bloc 4 ;
- chaque anomalie a un test ou une vérification de non-régression.

### B2-M14 - Manuel de déploiement

Objectif : vérifier que le manuel de déploiement est autonome pour C2.4.1.

Périmètre autorisé :

- `docs/deployment.md`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- `README.md`
- `.env.example`
- `apps/api/.env.example`
- `docker-compose.yml`
- workflows de déploiement

Livrable :

- check-list déploiement local, Docker, Vercel/Neon ;
- variables d'environnement ;
- healthchecks ;
- rollback minimal.

Contrôle d'acceptation :

- une personne externe peut suivre la procédure ;
- aucune variable secrète réelle n'apparaît ;
- les commandes correspondent au repo actuel.

### B2-M15 - Manuel utilisateur

Objectif : produire le manuel utilisateur autonome manquant.

Périmètre autorisé :

- `docs/rncp/bloc2-manuel-utilisateur-alcide.md`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- routes Web ;
- cahier de recettes ;
- README.

Livrable :

- guide utilisateur : connexion, génération entraînement, génération programme, consultation, timer, logs de séance, filtres, dashboard, paramètres IA, suppression.

Contrôle d'acceptation :

- langage compréhensible par un utilisateur non technique ;
- pas de documentation de code dans le manuel utilisateur ;
- les fonctionnalités décrites existent réellement.

### B2-M16 - Manuel de mise à jour

Objectif : produire la procédure de mise à jour applicative.

Périmètre autorisé :

- `docs/rncp/bloc2-manuel-mise-a-jour.md`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- `CHANGELOG.md`
- `docs/ci-cd.md`
- `docs/deployment.md`
- `package.json`
- `pnpm-lock.yaml`
- migrations Drizzle si présentes

Livrable :

- procédure version, dépendances, migration DB, tests, déploiement, smoke tests, rollback, changelog.

Contrôle d'acceptation :

- la procédure distingue mise à jour code, dépendances et base de données ;
- elle indique quoi faire en cas d'échec CI ou migration.

### B2-M17 - Harmonisation documentaire

Objectif : supprimer les incohérences de chiffres, version, stack et statut de tests.

Périmètre autorisé :

- `README.md`
- `CHANGELOG.md`
- `docs/bloc2/cahier-recettes.md`
- `docs/rncp/*.md`
- `docs/dossier-professionnel.md`

Entrées à lire :

- tous les documents RNCP et README ;
- résultats de commandes si disponibles.

Livrable :

- patch d'harmonisation ;
- note listant les valeurs canoniques retenues.

Contrôle d'acceptation :

- `rg` ne trouve plus d'anciens chiffres contradictoires ;
- la version de référence est unique ou les écarts sont expliqués ;
- E2E est "à relancer" sauf preuve d'exécution.

### B2-M18 - Pack de preuves et annexes

Objectif : préparer les annexes sans surcharger le dossier de 30 pages.

Périmètre autorisé :

- `docs/rncp/bloc2-annexes/`
- `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`

Entrées à lire :

- captures existantes ;
- rapports de tests existants ;
- logs CI si disponibles ;
- documents Bloc 2 produits par les missions précédentes.

Livrable :

- index des annexes : capture CI, coverage, Playwright, prototype, healthchecks, extraits changelog, extraits code.

Contrôle d'acceptation :

- chaque annexe a un nom, une date, une source et une compétence associée ;
- les annexes ne remplacent pas le dossier principal.

### B2-M19 - Revue finale Bloc 2

Objectif : contrôler que le Bloc 2 est prêt dépôt.

Périmètre autorisé :

- lecture globale ;
- corrections mineures dans `docs/rncp/bloc2-*.md` ;
- mise à jour de la matrice si nécessaire.

Entrées à lire :

- tous les livrables Bloc 2 ;
- matrice ;
- audit final ;
- cahier de recettes ;
- résultats de commandes récentes.

Livrable :

- rapport de revue finale avec statut par compétence : OK, Partiel, Bloqué ;
- liste des derniers bloquants ;
- décision : prêt dépôt ou non prêt.

Contrôle d'acceptation :

- les quatre compétences éliminatoires sont OK ou explicitement bloquées ;
- les commandes de vérification sont listées avec résultat ;
- les risques restants sont formulés honnêtement.

## 6. Prompts standard pour agents

### Prompt de mission

```text
Tu travailles uniquement sur la mission {ID} du Bloc 2 RNCP39583.

Objectif :
{objectif}

Périmètre de fichiers autorisés :
{fichiers}

À lire avant toute modification :
{sources}

Livrables attendus :
{livrables}

Contraintes :
- ne pas modifier de fichier hors périmètre ;
- ne pas inventer de preuve ;
- distinguer preuve vérifiée, preuve documentaire et preuve à produire ;
- garder les chiffres de tests cohérents ;
- ne jamais annoncer les E2E comme réussis sans exécution récente ;
- terminer par la liste des fichiers modifiés et les contrôles réalisés.
```

### Rapport de fin de mission

```text
Mission : {ID}
Statut : Validé / En revue / Bloqué
Fichiers modifiés :
- ...

Preuves ajoutées ou consolidées :
- ...

Commandes exécutées :
- commande : résultat

Écarts restants :
- ...

Demande à l'orchestrateur :
- validation / arbitrage / mission suivante
```

## 7. Ordre recommandé

Ordre minimal avant dépôt :

1. B2-M00
2. B2-M01
3. B2-M02
4. B2-M12
5. B2-M13
6. B2-M15
7. B2-M16
8. B2-M08
9. B2-M09
10. B2-M10
11. B2-M17
12. B2-M19

Ordre complet idéal :

1. B2-M00 à B2-M19 dans l'ordre.

Priorité absolue :

- B2-M12 car C2.3.1 est éliminatoire ;
- B2-M08 car C2.2.2 est éliminatoire ;
- B2-M05, B2-M09 et B2-M10 car C2.2.1 et C2.2.3 sont éliminatoires ;
- B2-M13, B2-M15 et B2-M16 car ce sont les écarts documentaires les plus visibles.

## 8. Definition of Done Bloc 2

Le Bloc 2 est considéré prêt lorsque :

- le dossier principal Bloc 2 existe et couvre les 16 attendus officiels ;
- les quatre compétences éliminatoires sont documentées avec preuves réelles ;
- le cahier de recettes est corrigé et cohérent avec le code ;
- le plan de correction des bogues existe ;
- le manuel utilisateur existe ;
- le manuel de mise à jour existe ;
- les chiffres de tests sont harmonisés ;
- les commandes qualité récentes sont disponibles ou les limites sont explicitement indiquées ;
- la matrice RNCP indique un statut Bloc 2 cohérent avec les preuves ;
- aucun livrable ne prétend une validation non vérifiée.

