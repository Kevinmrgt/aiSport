# Dossier Bloc 2 RNCP39583 - Concevoir et développer des applications logicielles

> Projet support : Alcide, coach sportif IA personnalisé.  
> Version applicative de référence : `0.12.0`.  
> Périmètre : code source, documentation associée, qualité, sécurité, accessibilité, recette et exploitation.

## 1. Synthèse du Bloc 2

Le Bloc 2 démontre la capacité à concevoir, développer, tester, sécuriser, déployer et documenter une application logicielle fonctionnelle. Alcide est une application full-stack composée :

- d'un frontend Next.js App Router ;
- d'une API Hono structurée en couches ;
- d'un package partagé TypeScript/Zod ;
- d'une base PostgreSQL pilotée avec Drizzle ;
- de services IA isolés et validés ;
- d'une CI/CD GitHub Actions ;
- d'un cahier de recettes RNCP.

Les compétences éliminatoires couvertes sont :

| Compétence | Statut | Preuves principales |
|---|---|---|
| C2.2.1 - Prototype logiciel ergonomique et sécurisé | Couvert, captures à annexer | `apps/web/app/`, `apps/web/components/`, `docs/bloc2/cahier-recettes.md` |
| C2.2.2 - Harnais de tests unitaires | Couvert | `apps/api/tests/`, `apps/web/components/Timer.test.ts`, `pnpm test` |
| C2.2.3 - Développement évolutif, sécurisé et accessible | Couvert, E2E smoke validé | `apps/api/src/`, `apps/web/app/`, `packages/shared/src/`, `docs/security/owasp-review.md` |
| C2.3.1 - Cahier de recettes | Couvert, scénarios corrigés dans le cahier | `docs/bloc2/cahier-recettes.md` |

Limites assumées :

- les tests E2E smoke publics/accessibilité sont passés ; le scénario E2E `generate.spec.ts` reste à relancer avant d'annoncer le total complet ;
- la couverture chiffrée disponible concerne principalement l'API ;
- les tests d'intégration DB directs restent limités, les repositories étant surtout validés par tests de services et recettes ;
- les captures de CI, Playwright et prototype doivent être annexées au pack final.

## 2. Environnements de déploiement et de test - C2.1.1

Alcide dispose de plusieurs environnements documentés.

| Environnement | Rôle | Preuves | Commandes ou contrôle |
|---|---|---|---|
| Local | Développement et validation rapide | `README.md`, `.env.example`, `apps/api/.env.example` | `pnpm dev` |
| Test automatisé | Non-régression API/Web | `apps/api/tests/`, `apps/web/components/Timer.test.ts` | `pnpm test`, `pnpm test:coverage` |
| Docker | Exécution reproductible Web/API/PostgreSQL | `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile` | `docker compose up --build -d` |
| CI GitHub Actions | Qualité avant intégration | `.github/workflows/ci.yml` | lint, typecheck, tests, build |
| Déploiement Vercel/Neon | Version de démonstration et production cible | `docs/deployment.md`, `.github/workflows/deploy-vercel.yml` | healthchecks API/Web |

Critères qualité et performance retenus :

| Critère | Cible | Mesure | Statut |
|---|---:|---|---|
| Tests Vitest | Succès | `pnpm test` | 71 tests passés le 2026-06-30 |
| Couverture API statements | >= 70% | `pnpm test:coverage` | 82.33% le 2026-06-30 |
| Build applicatif | Succès | `pnpm build` | Validé le 2026-06-30 |
| Healthcheck API | HTTP 200, JSON `status: ok` | `GET /health` | Route présente |
| Healthcheck Web | HTTP 200, JSON `status: ok` | `GET /api/health` | Route présente |
| Temps génération IA | < 30 s en conditions normales | recette CR-010 | À mesurer en démonstration réelle |
| E2E smoke publics/accessibilité | Succès | `pnpm test:e2e:smoke` | 48 tests passés le 2026-06-30 |

## 3. Protocole d'intégration continue - C2.1.2

Le protocole CI est porté par GitHub Actions. Il vise à réduire les régressions avant fusion ou déploiement.

Pipeline attendu :

```text
checkout
-> setup pnpm / Node
-> install avec lockfile
-> build package partagé
-> typecheck
-> lint
-> tests unitaires
-> coverage API
-> build API/Web
-> smoke E2E selon workflow
-> audit sécurité visible
```

Preuves :

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-vercel.yml`
- `.github/workflows/db-migrate.yml`
- `docs/ci-cd.md`
- `package.json`

Preuve à annexer : capture ou export d'une exécution CI verte récente. Sans cette capture, le dossier doit rester formulé comme "pipeline configuré" et non "dernière CI verte annexée".

## 4. Architecture logicielle maintenable

L'architecture suit une séparation par responsabilités.

```text
apps/web
  -> pages Next.js, Server Components, Server Actions, composants UI
  -> lib/server-api.ts pour communiquer avec l'API interne

packages/shared
  -> schémas Zod, types et contrats partagés

apps/api
  -> routes Hono
  -> controllers
  -> services métier
  -> repositories
  -> Drizzle/PostgreSQL
```

Preuves :

- `apps/web/app/`
- `apps/web/components/`
- `apps/web/lib/server-api.ts`
- `apps/api/src/routes/`
- `apps/api/src/controllers/`
- `apps/api/src/services/`
- `apps/api/src/repositories/`
- `apps/api/src/db/schema.ts`
- `packages/shared/src/`

Apports pour la maintenabilité :

- les contrats Zod évitent les divergences frontend/backend ;
- les services isolent les règles métier ;
- les repositories isolent la persistance ;
- les middlewares centralisent authentification, erreurs et rate limiting ;
- le monorepo pnpm simplifie l'alignement des versions et des scripts.

## 5. Prototype réalisé - C2.2.1

Le prototype retenu est la dernière version fonctionnelle d'Alcide. Il couvre le parcours utilisateur principal :

1. arrivée sur la page d'accueil ;
2. connexion OAuth Google ;
3. génération d'un entraînement ou programme ;
4. consultation du détail ;
5. exécution via timer ;
6. consultation de la liste avec filtres ;
7. suivi de progression via dashboard ;
8. réglage du modèle OpenAI utilisé par Alcide, sans clé utilisateur.

Routes et composants de preuve :

- `apps/web/app/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/generate/page.tsx`
- `apps/web/app/workouts/page.tsx`
- `apps/web/app/workouts/[id]/page.tsx`
- `apps/web/app/programs/page.tsx`
- `apps/web/app/programs/generate/page.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/settings/page.tsx`
- `apps/web/components/WorkoutForm.tsx`
- `apps/web/components/ProgramForm.tsx`
- `apps/web/components/Timer.tsx`

Captures à annexer :

| Capture | Objectif |
|---|---|
| Accueil ou login desktop | Montrer le point d'entrée et l'ergonomie générale |
| Génération d'entraînement | Montrer le formulaire, les validations et le parcours coeur |
| Détail/timer | Montrer la valeur utilisateur et l'accessibilité dynamique |
| Dashboard | Montrer les indicateurs utilisateur |
| Mobile | Montrer l'adaptation responsive |

## 6. Frameworks et paradigmes

| Élément | Usage | Justification Bloc 2 |
|---|---|---|
| Next.js App Router | Frontend, routes, Server Components | Développement web moderne, rendu structuré |
| Hono | API HTTP | API légère, testable, adaptée au monorepo |
| TypeScript | Langage commun | Typage, maintenabilité, réduction des erreurs |
| Zod | Validation et contrats | Sécurisation des entrées/sorties |
| Drizzle | ORM PostgreSQL | Requêtes typées, migrations, modèle explicite |
| Auth.js | Authentification OAuth | Gestion standardisée des sessions |
| Vitest | Tests unitaires | Harnais rapide pour services/controllers |
| Playwright | E2E et accessibilité | Validation parcours navigateur |
| pnpm workspace | Monorepo | Dépendances et scripts unifiés |

## 7. Tests unitaires - C2.2.2

Le harnais de test unitaire couvre l'API et un composant Web critique.

Référence documentaire actuelle :

- `pnpm test` : 71 tests Vitest passés, dont 70 API et 1 Web ;
- `pnpm test:coverage` : 82.33% statements API, 78.6% branches, 89.23% functions, 82.33% lines ;
- `pnpm test:e2e:smoke` : 48 exécutions Playwright passées sur Chromium et Firefox ;
- E2E complet : 56 exécutions listées, dont 8 exécutions `generate.spec.ts` encore à relancer si le total complet est annoncé.

Suites principales :

- `apps/api/tests/workout-ai.service.test.ts`
- `apps/api/tests/program-ai.service.test.ts`
- `apps/api/tests/workout.controller.test.ts`
- `apps/api/tests/workout.service.test.ts`
- `apps/api/tests/program.controller.test.ts`
- `apps/api/tests/program.service.test.ts`
- `apps/api/tests/session-log.controller.test.ts`
- `apps/api/tests/rate-limit.middleware.test.ts`
- `apps/api/tests/validate-env.test.ts`
- `apps/web/components/Timer.test.ts`

Limites :

- la couverture publiée est principalement API ;
- les repositories DB ne sont pas tous couverts par des tests d'intégration dédiés ;
- les E2E du parcours `generate.spec.ts` doivent encore être relancés si la preuve E2E complète est présentée.

## 8. Sécurité - C2.2.3

Mesures mises en oeuvre :

| Risque | Mesure | Preuve |
|---|---|---|
| Accès non autorisé API | Secret interne `SERVICE_SECRET` | `apps/api/src/middleware/auth.middleware.ts`, `apps/web/lib/server-api.ts` |
| Données invalides | Validation Zod | `packages/shared/src/schemas/`, controllers API |
| Injection SQL | Drizzle ORM et validation | `apps/api/src/repositories/`, CR-030 |
| XSS | Échappement React et validation | CR-031, composants Web |
| Abus génération IA | Rate limiting utilisateur | `apps/api/src/middleware/rate-limit.middleware.ts`, CR-035 |
| Secrets exposés côté client | Module serveur uniquement | `apps/web/lib/server-api.ts`, CR-032, CR-034 |
| Mauvaise configuration serveur | Fail-fast env | `apps/api/src/lib/validate-env.ts`, CR-042 |
| Réponses IA invalides | Validation et retry sur réponses OpenAI côté serveur | `apps/api/src/services/ai.service.ts`, `workout-ai.service.ts`, `program-ai.service.ts` |

Document de preuve : `docs/security/owasp-review.md`.

Point de contrôle du 2026-06-30 : `pnpm audit --audit-level=high` passe avec 0 vulnérabilité high/critical ; 6 vulnérabilités restent à suivre au niveau low/moderate.

## 9. Accessibilité - C2.2.3

Actions mises en oeuvre :

- labels sur les champs de formulaire ;
- messages d'erreur liés aux champs ;
- navigation clavier ;
- focus visible ;
- skip link ;
- `aria-live` sur les états dynamiques du timer ;
- `aria-busy` sur les états de chargement ;
- tests Playwright accessibilité et axe-core.

Preuves :

- `apps/web/tests/e2e/accessibility.spec.ts`
- `apps/web/tests/e2e/axe.spec.ts`
- `apps/web/components/Timer.tsx`
- `apps/web/components/WorkoutForm.tsx`
- `apps/web/components/ProgramForm.tsx`
- CR-025 dans `docs/bloc2/cahier-recettes.md`

Contrôle du 2026-06-30 : les tests E2E/accessibilité du smoke passent avec 48 exécutions Playwright sur Chromium et Firefox.

## 10. Déploiement progressif, historique et dernière version - C2.2.4

La version de référence documentaire est `0.12.0`, alignée avec :

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `docs/deployment.md`
- `CHANGELOG.md`

Le déploiement progressif repose sur :

- CI avant intégration ;
- déploiement Vercel Web/API ;
- migrations DB séparées ;
- healthchecks Web/API ;
- journal de version.

Protocole post-déploiement à exécuter :

1. vérifier la CI ;
2. vérifier `GET /health` côté API ;
3. vérifier `GET /api/health` côté Web ;
4. tester login ou route protégée ;
5. générer une séance ou utiliser les données seedées ;
6. consulter liste, détail, timer et dashboard ;
7. consigner résultat et date dans l'annexe.

## 11. Cahier de recettes - C2.3.1

Le cahier de recettes est le livrable central de validation fonctionnelle. Il couvre :

- authentification ;
- génération d'entraînement ;
- consultation, timer et suppression ;
- sécurité ;
- rate limiting ;
- états de chargement ;
- healthchecks ;
- pagination, filtres et dashboard ;
- tests automatisés.

Preuve : `docs/bloc2/cahier-recettes.md`.

Contrôle avant dépôt :

- CR-013 est couvert partiellement par tests unitaires et reste à relancer en coupure IA réelle ;
- CR-040 est aligné avec le JSON réel du healthcheck API : `status`, `service`, `timestamp`, `version` ;
- CR-044 est aligné avec le dashboard réel : séances créées, séances terminées, durée réalisée, effort moyen, dernière séance, niveaux et sports.

## 12. Plan de correction des bogues - C2.3.2

Le plan est formalisé dans `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md`.

Processus :

1. détecter l'anomalie par recette, test, CI, audit ou retour utilisateur ;
2. qualifier la gravité et le périmètre ;
3. reproduire avec étapes précises ;
4. identifier la cause racine ;
5. corriger dans un périmètre limité ;
6. ajouter ou relancer un test de non-régression ;
7. valider en CI ou localement ;
8. documenter dans le changelog ou le plan de correction.

## 13. Documentation d'exploitation - C2.4.1

Livrables associés :

- manuel de déploiement : `docs/deployment.md` ;
- manuel utilisateur : `docs/rncp/bloc2-manuel-utilisateur-alcide.md` ;
- manuel de mise à jour : `docs/rncp/bloc2-manuel-mise-a-jour.md` ;
- CI/CD : `docs/ci-cd.md` ;
- changelog : `CHANGELOG.md`.

Ces documents donnent une base exploitable pour une équipe technique et pour les futures évolutions du logiciel.

## 14. Annexes à joindre

Index des annexes : `docs/rncp/bloc2-annexes/index.md`.

Annexes recommandées :

- capture CI verte ;
- sortie `pnpm test` ;
- sortie `pnpm test:coverage` ;
- sortie `pnpm test:e2e:smoke` et mention explicite du `generate.spec.ts` restant ;
- captures prototype desktop/mobile ;
- extraits healthcheck ;
- extrait changelog ;
- extrait cahier de recettes.

## 15. Conclusion Bloc 2

Le Bloc 2 est techniquement solide : l'application existe, le code est structuré, les tests unitaires sont présents, la sécurité et l'accessibilité sont documentées, et le cahier de recettes couvre les principaux parcours. Les derniers risques portent surtout sur les preuves visuelles ou externes : capture CI, captures prototype, healthchecks datés, CR-013 en coupure IA réelle et E2E complet `generate.spec.ts`.

Décision de préparation : le Bloc 2 peut être présenté comme prêt sur le fond avec les preuves d'exécution locales du 2026-06-30. Ne pas annoncer comme validés les éléments encore hors preuve : captures CI/prototype/healthchecks, CR-013 en coupure IA réelle et E2E complet `generate.spec.ts`.
