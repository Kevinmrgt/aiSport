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
| C2.2.1 - Prototype logiciel ergonomique et sécurisé | Couvert, captures annexées | `apps/web/app/`, `apps/web/components/`, `docs/bloc2/cahier-recettes.md`, B2-A18 |
| C2.2.2 - Harnais de tests unitaires | Couvert | `apps/api/tests/`, `apps/web/components/Timer.test.ts`, `pnpm test` |
| C2.2.3 - Développement évolutif, sécurisé et accessible | Couvert, E2E smoke validé | `apps/api/src/`, `apps/web/app/`, `packages/shared/src/`, `docs/security/owasp-review.md` |
| C2.3.1 - Cahier de recettes | Couvert, scénarios corrigés dans le cahier | `docs/bloc2/cahier-recettes.md` |

Limites assumées :

- les tests E2E smoke publics/accessibilité sont passés ; le scénario E2E automatisé `generate.spec.ts` reste à relancer avant d'annoncer le total complet, mais les parcours réels `/generate` et `/programs/generate` ont été rejoués en production le 2026-07-16 ;
- la couverture chiffrée disponible concerne principalement l'API ;
- les tests d'intégration DB directs restent limités, les repositories étant surtout validés par tests de services et recettes ;
- les captures prototype et les preuves post-fix sont annexées dans B2-A17/B2-A18.

## Validation finale et addendum post-fix 2026-07-16

La validation finale initiale du Bloc 2 est consolidée dans B2-A17. L'état final à présenter au jury est l'addendum B2-A18, produit le 2026-07-16 après correction des erreurs de build Vercel.

Points validés au 2026-07-16 :

| Axe | Résultat | Preuve |
|---|---|---|
| Etat Git | `main` alignée sur `origin/main`, commit `533f17b` | B2-A18 |
| CI GitHub | `CI - Alcide` verte sur `main` | Run `29489995458`, B2-A18 |
| Monitoring production | `Monitoring - Production health` vert | Run `29496100988`, B2-A18 |
| Healthcheck API | HTTP 200, `status:"ok"`, version `0.12.0` | `GET https://ai-sport-api.vercel.app/health`, B2-A18 |
| Healthcheck Web | HTTP 200, `status:"ok"`, version `0.12.0` | `GET https://ai-sport-web.vercel.app/api/health`, B2-A18 |
| Fournisseur IA | OpenAI uniquement, clé côté serveur, aucune clé utilisateur | Logs Vercel `provider: 'openai'`, aucun `OPENAI_API_KEY` exposé |
| Génération séance | Parcours réel réussi en production | `/workouts/f1d03237-7987-4fef-b8b8-145edc26ec61`, B2-A18 |
| Génération programme | Parcours réel réussi en production | `/programs/e818c9a6-f09c-4387-972f-b8d2fc59327b`, B2-A18 |
| Prototype UI | Accueil, génération séance, détail/timer, dashboard, settings, historique et programme capturés | Captures `docs/rncp/bloc2-annexes/screenshots/` |
| Tests unitaires et coverage | Jobs CI verts ; dernière mesure locale API à 88.1% statements, 95.08% functions | B2-A17/B2-A18 |
| Typecheck/build/Docker | Jobs CI verts sur `main` | Run `29489995458` |

Décision : le Bloc 2 est validable techniquement au 2026-07-16. Les points restants sont non bloquants : secret GitHub `VERCEL_TOKEN` à renouveler si le workflow CD custom doit être vert, CR-013 à rejouer en coupure IA réelle si le jury exige cette preuve, warning SSL PostgreSQL à durcir en `sslmode=verify-full`, favicon à ajouter, E2E automatisé `generate.spec.ts` à relancer si une preuve Playwright exhaustive est exigée.

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
| Tests Vitest | Succès | CI `Unit tests and coverage` | Job vert le 2026-07-16 |
| Couverture API statements | >= 70% | Dernière mesure locale `pnpm test:coverage` | 88.1% le 2026-07-15 |
| Build applicatif | Succès | CI `Build packages` | Job vert le 2026-07-16 |
| Build Docker | Succès | CI `Docker image build` | Job vert le 2026-07-16 |
| Healthcheck API | HTTP 200, JSON `status: ok` | `GET /health` | OK le 2026-07-16 |
| Healthcheck Web | HTTP 200, JSON `status: ok` | `GET /api/health` | OK le 2026-07-16 |
| Génération IA séance | Parcours réel production | recette CR-010 | OK le 2026-07-16 |
| Génération IA programme | Parcours réel production | B2-A18 | OK le 2026-07-16 |
| E2E smoke publics/accessibilité | Succès | CI `E2E smoke and accessibility` | Job vert le 2026-07-16 |

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

Preuve annexée : exécution `CI - Alcide` verte du 2026-07-16, run `29489995458`, commit `533f17b`, consolidée dans B2-A18.

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

Captures annexées :

| Capture | Objectif |
|---|---|
| Accueil ou login desktop | Montrer le point d'entrée et l'ergonomie générale |
| Génération d'entraînement | Montrer le formulaire, les validations et le parcours coeur |
| Détail/timer | Montrer la valeur utilisateur et l'accessibilité dynamique |
| Dashboard | Montrer les indicateurs utilisateur |
| Génération programme | Montrer le cycle multi-semaines généré en production |

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
- `pnpm test:coverage` : dernière mesure locale à 88.1% statements API, 79.34% branches, 95.08% functions, 88.1% lines ;
- `pnpm test:e2e:smoke` : job CI `E2E smoke and accessibility` vert le 2026-07-16 ;
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
- les E2E automatisés du parcours `generate.spec.ts` doivent encore être relancés si la preuve E2E complète est présentée, même si les générations réelles séance/programme ont été validées en production.

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

Le Bloc 2 est techniquement solide : l'application existe, le code est structuré, les tests unitaires sont présents, la sécurité et l'accessibilité sont documentées, le cahier de recettes couvre les principaux parcours, et la production Vercel a été contrôlée le 2026-07-16 après correction des erreurs de build.

Décision finale : le Bloc 2 peut être présenté comme validable techniquement avec les preuves d'exécution locales, CI, production et visuelles consolidées dans B2-A17/B2-A18. Ne pas sur-vendre les points non rejoués : coupure IA réelle CR-013, E2E automatisé complet `generate.spec.ts` et CD GitHub custom tant que `VERCEL_TOKEN` n'est pas renouvelé. Ces points sont transparents, suivis et non bloquants pour la conformité fonctionnelle du Bloc 2.
