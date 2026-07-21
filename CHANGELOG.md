# Changelog

Toutes les modifications notables de Alcide sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
version sémantique selon [SemVer](https://semver.org/lang/fr/).

> Ce fichier est un livrable **ÉLIMINATOIRE** du Bloc 4 RNCP (C4.3.2).

---

## [Unreleased]

> Correctifs de stabilisation postérieurs au gel nominal `0.13.0-rc.3`, mais
> déjà déployés sous la même version de service. La baseline applicative
> canonique est `b002adb0e0e7d8d85ee493d54879e190d77d2078`, validée par la CI
> `29845956008` et le CD `29846343559`.

### Fixed

- Validation serveur des modèles OpenAI alignée sur l'allowlist de l'interface ; une valeur arbitraire renvoie désormais HTTP 400 sans persistance.
- Confirmation de journalisation préservée en évitant la revalidation inutile de la page Timer courante.
- Hiérarchie des pages de génération corrigée : un seul `h1` de page et titres internes de formulaire en `h2`.
- Reflow au zoom natif 400 % corrigé : remplacement des troncatures par des
  retours à la ligne dans `MetricPill`, `ProgramCard` et `WorkoutCard`, puis
  contre-recette de production réussie à 200/400 % sur huit routes, 16/16.

### Added

- Recettes finales Bloc 2 B2-A34 à B2-A36 : erreurs IA, journal/douleur/dashboard, SQL-like PostgreSQL réel, XSS, secrets/CORS/CSP et audit accessibilité public/privé.
- Tests RNCP dédiés API, Web, Playwright et PostgreSQL pour les scénarios C2.3.1 et C2.2.3 restés ouverts.

---

## [0.13.0-rc.3] — 2026-07-20

> Correctifs issus d'une recette authentifiée réelle sur la production
> `0.13.0-rc.2`. Leur validation en production est consignée séparément après
> déploiement afin de ne pas confondre test local et preuve livrée.

### Fixed

- Messages Zod des formulaires de séance et programme entièrement localisés en français.
- Restitution du focus au contrôle du Timer après fermeture du plein écran, y compris après une sortie plein écran native.
- Filtre des séances compatible avec tout sport libre accepté lors de la génération.
- Regroupement des variantes de casse, accents et espaces dans le classement des sports du dashboard.

## [0.13.0-rc.2] — 2026-07-20

> Candidate déployée après CI et CD vertes. Les limites restantes sur le
> parcours authentifié et l'audit humain d'accessibilité sont conservées dans
> le manifeste et ne sont pas présentées comme validées.

### Added

- Endpoint de readiness API vérifiant PostgreSQL et la configuration OpenAI, distinct du liveness check.
- Service métier de journalisation contrôlant l'ownership des séances et programmes avant insertion.
- Invariants Zod et tests de cohérence des durées, semaines, séances et numérotations des sorties IA.
- Couverture Vitest Web sur le périmètre `app`, `components` et `lib`, avec tests de composants via Testing Library.
- Tests et commandes Playwright publics/authentifiés séparés ; un état Auth.js réel est désormais obligatoire pour la suite authentifiée.
- Plan d'audit RGAA 4.1.2/WCAG 2.1 AA, manifeste de dépôt Bloc 2 et information de confidentialité utilisateur.
- Services Docker Compose `migrate` et `seed` basés sur le stage outillage.
- Workflow GitHub Actions `Monitoring - Production health` : verification horaire des healthchecks API/Web, artifact de preuve et issue automatique en cas d'echec.
- Templates GitHub Issues Bloc 4 : consignation d'anomalie et cas support client.
- Pull request template avec checklist MCO/RNCP.
- Setup MCP local documente : Filesystem, Playwright, Vercel et exemple GitHub MCP sans secret.
- `docs/rncp/bloc4-preuves-mco-a-completer.md` : checklist des preuves restantes avant depot.
- Test unitaire API pour le healthcheck.
- Recette navigateur instrumentée des pages publiques avec artefacts JSON/PNG, reflow 320 px, axe, console, focus et redirections sans session sur Chromium et Firefox.

### Changed

- CD Vercel : GitHub Actions devient l'unique chemin de production ; l'intégration Git conserve les previews mais ignore ses builds de production automatiques afin d'éviter les doubles déploiements.
- Audit des dépendances désormais bloquant dès le niveau `low`, avec overrides ciblés et testés pour les six alertes transitoires du lockfile.
- Runtime de référence aligné sur Node.js 24 LTS et pnpm 11.9.0 dans `.nvmrc`, les manifests, la CI/CD et les images Docker ; Node.js 20 était en fin de vie et pnpm 9 ne lisait pas la configuration d'overrides courante.
- CI : tests et rapports de couverture API/Web, audit high/critical bloquant et CD déclenchable uniquement après une CI `main` réussie.
- CD : migration Drizzle de production devenue une dépendance bloquante avant le déploiement API, puis Web ; le workflow manuel reste disponible pour la reprise.
- GitHub Actions : actions officielles Node 24 mises à jour et épinglées par SHA (`checkout` 7.0.0, `setup-node` 7.0.0, `upload-artifact` 7.0.1, `pnpm/action-setup` 6.0.9).
- Timer : calcul sur le temps actif hors pauses et deadline réelle pour résister au ralentissement d'un onglet.
- Navigation clavier : onglets avec flèches/Home/End, confirmation de suppression avec gestion du focus et plein écran Timer accessible.
- Gestion Web des erreurs : distinction 404/403/5xx, timeouts explicites et suppression des valeurs de secours trompeuses.
- CSP de production durcie ; `unsafe-eval` est limité au développement.
- Dossier Bloc 2, matrice et recettes réécrits pour distinguer code, test automatisé, recette exécutée et preuve finale.
- Documentation Docker, URLs de production, Next.js 15 et décision OpenAI alignées sur le code courant.
- Healthchecks API/Web rendus non cacheables et alignés sur la version candidate `0.13.0-rc.1`.
- Documentation RNCP et projet harmonisée : distinction entre la production `0.12.0` et la candidate `0.13.0-rc.1`, métriques `pnpm test` / `pnpm test:coverage`, cible Vercel Web/API + Neon, cahier de recettes et preuves OWASP.
- Manifests racine, API, Web et shared alignés sur `0.13.0-rc.1` ; cette candidate ne sera annoncée en production qu'après déploiement et vérification des healthchecks.
- `docs/rncp/audit-coherence-documentaire.md` ajouté pour tracer les incohérences corrigées et les points à valider avant dépôt.

### Fixed

- Connexions PostgreSQL : normalisation explicite des modes TLS historiques vers `sslmode=verify-full` dans le runtime API et Drizzle, afin de conserver la vérification du certificat et du nom d'hôte lors du futur passage à `pg` 9.
- Contrôle d'accès manquant sur les `workoutId`/`programId` des journaux de séance.
- Validation UUID des identifiants de routes afin de renvoyer une erreur client au lieu d'une erreur PostgreSQL 500.
- Timeout global de génération d'une séance borné sous la durée maximale Vercel.
- Contrat de réponse de génération de séance aligné entre API, types partagés et Web.
- Fausses pages 404 lors d'une panne API et erreurs de suppression auparavant masquées.
- Procédure Docker qui demandait `drizzle-kit` et `tsx` dans l'image runtime sans devDependencies.
- Cahier de recettes : suppression des affirmations erronées selon lesquelles Zod rejetait une chaîne SQL ou qu'une inspection de repository prouvait l'ownership.
- Lien d'évitement désormais focalisé sur `main#main-content`, lettre « G » décorative retirée du nom accessible Google et contrastes de la page de connexion/footer renforcés après inspection des captures 320 px.

### Security

- Lockfile corrigé et vérifié par `pnpm audit --audit-level=low` : aucune vulnérabilité connue au 2026-07-20.
- Audit des dépendances high/critical rendu bloquant dans GitHub Actions.
- Secrets Docker obligatoires et valeurs d'exemple sensibles laissées vides.
- Contrôle d'ownership centralisé pour les journaux et métadonnées dérivées de la ressource serveur.
- URL OpenAI fixe, timeout global et validation métier renforcée des sorties générées.

---

## [0.12.0] — 2026-04-16

### Added

- `apps/api/src/repositories/workout.repository.ts` : `findWorkoutsByUser()` paginée avec filtres `sport` et `level` (LIMIT/OFFSET, comptage total)
- `apps/api/src/repositories/workout.repository.ts` : `getWorkoutStatsByUser()` — agrégats BDD (total, byLevel, bySport, lastGenerated)
- `apps/api/src/controllers/workout.controller.ts` : `handleGetStats()` — `GET /workouts/stats`
- `apps/web/app/workouts/page.tsx` : `FilterBar` (sport + niveau, form GET sans JS requis) + `Pagination` (liens prev/next, aria-labels RGAA)
- `apps/web/app/dashboard/page.tsx` : page `/dashboard` — 3 KPIs, barres de progression par niveau, top 4 sports
- `packages/shared/src/types/workout.types.ts` : `WorkoutListResponse`, `WorkoutStats`
- `apps/web/app/layout.tsx` : lien "Dashboard" dans la navigation authentifiée
- Neon (PostgreSQL) : migrations appliquées + seed 3 workouts de démonstration

### Changed

- `apps/api/src/services/workout.service.ts` : `getUserWorkouts()` accepte `{ page, limit, sport, level }` — réponse paginée
- `apps/web/lib/server-api.ts` : `getWorkouts(params?)` accepte les filtres, ajout `getStats()`
- `apps/api/tests/workout.service.test.ts` : 2 nouveaux cas — pagination passée au repository, filtres transmis
- `apps/web/lib/auth.ts` : ajout `trustHost: true` — résout `error=Configuration` Auth.js v5 sur Vercel

### Security

- OWASP A04 : query params `page`, `limit`, `sport`, `level` validés par Zod avant tout accès BDD
- OWASP A01 : filtres pagination respectent le scope userId — aucun workout d'un autre utilisateur

---

## [0.11.0] — 2026-04-13

### Added

- `apps/api/tests/validate-env.test.ts` : 4 tests unitaires pour `validateEnv()` (process.exit spy, isolation par variable)
- `apps/api/fly.toml` : configuration Fly.io pour le déploiement de l'API Hono (région cdg, shared-cpu-1x, healthcheck)
- `vercel.json` : configuration monorepo pour le déploiement Next.js sur Vercel (rootDirectory, buildCommand)
- `docs/bloc2/cahier-recettes.md` : CR-040 (GET /health API), CR-041 (GET /api/health web), CR-042 (fail-fast validateEnv)

### Changed

- `docs/adr/ADR-006-deployment-architecture.md` : mise à jour — remplace Railway (non gratuit) par Fly.io + Neon (free tier sans limite)
- `docs/deployment.md` : réécriture Option A avec Fly.io + Neon — instructions `fly launch`, secrets, migration Neon
- `docs/dossier-professionnel.md` : Sprint 09 et 10 ajoutés à la chronologie, métriques finales corrigées (0.10.0)
- `docs/bloc4/compte-rendu-activite.md` : Sprints 08/09/10 ajoutés, métriques 10 sprints / 32 tests unitaires / 29 E2E
- `docs/security/owasp-review.md` : section A05 enrichie — `validateEnv()` documenté (Fail-Safe Defaults)
- `package.json` : version `0.1.0` → `0.10.0`

### Security

- OWASP A05 : `validateEnv()` désormais testé (4 tests) et documenté dans la revue OWASP

---

## [0.10.0] — 2026-04-13

### Added

- `apps/web/app/api/health/route.ts` : endpoint GET /api/health pour le healthcheck Docker web
- `apps/api/src/lib/validate-env.ts` : validation des env vars obligatoires au démarrage (fail-fast)

### Security

- OWASP A05 : fail-fast si SERVICE_SECRET, DATABASE_URL ou MISTRAL_API_KEY sont absents au boot

### Fixed

- Dockerfile web : healthcheck `wget /api/health` pointe maintenant vers une route existante

---

## [0.9.0] — 2026-04-13

### Fixed

- `README.md` : réécrit en UTF-8 sans BOM (était en UTF-16 LE — illisible sur GitHub)

### Added

- `.gitattributes` : force UTF-8 + LF pour tous les fichiers texte (prévient la récurrence)
- `docs/bloc4/bugs/BUG-002-readme-utf16.md` : rapport de bug encodage (Bloc 4 RNCP)

### Changed

- `docs/dossier-professionnel.md` : Sprint 08 ajouté, métriques E2E mises à jour (27→29 tests)

---

## [0.8.0] — 2026-04-13

### Added

- `@axe-core/playwright` : détection automatique violations WCAG 2.1 A/AA sur `/` et `/login`
- `apps/web/tests/e2e/axe.spec.ts` : 2 tests axe-core (critical + serious uniquement)
- `apps/api/src/db/seed.ts` : script de seed avec 3 workouts de démo (beginner/intermediate/advanced)
- `pnpm db:seed` : commande racine monorepo pour exécuter le seed

---

## [0.7.0] — 2026-04-13

### Added

- `docs/dossier-professionnel.md` : synthèse des 4 blocs RNCP (livrable clé soutenance)
- `docs/bloc4/compte-rendu-activite.md` : CRA avec chronologie, compétences, métriques
- Cahier de recettes : CR-035/036 (rate limiting) + CR-037/038/039 (loading states)
- Cahier de recettes : table des suites de tests complète (55 tests : 28 unitaires + 27 E2E)

---

## [0.6.0] — 2026-04-13

### Added

- `apps/api/Dockerfile` : build multi-stage Node 20 Alpine, utilisateur non-root, healthcheck
- `apps/web/Dockerfile` : build multi-stage Next.js standalone, utilisateur non-root
- `docker-compose.yml` : stack complète postgres + api + web avec healthchecks et depends_on
- `.env.example` (racine) : template de toutes les variables pour docker-compose
- ADR-006 : architecture de déploiement (Vercel + Railway vs Docker VPS)
- `docs/deployment.md` : guide complet déploiement cloud, Docker Compose, et local

### Changed

- `next.config.mjs` : `output: 'standalone'` pour réduire la taille de l'image Docker (~90%)

### Security

- OWASP A05 : utilisateurs non-root dans les deux Dockerfiles (`hono:1001`, `nextjs:1001`)
- OWASP A02 : secrets injectés via variables d'env, jamais dans les images Docker

---

## [0.5.0] — 2026-04-13

### Added

- `rate-limit.middleware.ts` : rate limiting 5 req/min par userId sur `/workouts/generate` (OWASP A04)
- `AppError.tooManyRequests()` : factory 429 `RATE_LIMIT_EXCEEDED` avec header `Retry-After`
- `loading.tsx` pour `/workouts`, `/generate`, `/workouts/[id]` : skeletons accessibles (RGAA 4.1, `aria-busy`)
- 5 nouveaux tests unitaires pour `rateLimitMiddleware` (quota, isolation userId, Retry-After, A09 logging)
- `docs/bloc4/bugs/BUG-001-coverage-threshold.md` : rapport de bug RNCP Bloc 4
- `docs/bloc4/veille-technologique.md` : veille IA, frameworks, sécurité, testing, accessibilité

### Security

- OWASP A04 : rate limiting in-memory, isolation par userId, log des dépassements

---

## [0.4.0] — 2026-04-13

### Added

- Tests E2E Playwright : 27 tests (home, auth, generate, accessibilité RGAA 4.1)
- `playwright.config.ts` : webServer auto-start, Chromium + Firefox, trace on-first-retry
- `tests/fixtures/session.json` + `createMockSession()` : session mockée pour tests authentifiés
- ADR-005 : stratégie de tests (pyramide unitaires Vitest + E2E Playwright)
- `docs/security/owasp-review.md` : revue OWASP Top 10 complète (A01–A10)
- Job `test-e2e` dans GitHub Actions CI (Playwright, `continue-on-error: true`)

### Changed

- CI pipeline : 5 jobs (lint-typecheck, test-unit, build, security-audit, **test-e2e**)

---

## [0.3.0] — 2026-04-13

### Added

- `DeleteWorkoutButton` : dialog de confirmation accessible (RGAA 4.1 — `role="alertdialog"`, `aria-modal`)
- Server Action `handleDelete` dans `/workouts` avec `revalidatePath` après suppression
- `not-found.tsx` : page 404 accessible (RGAA 4.1)
- `error.tsx` : error boundary client avec bouton "Réessayer" (OWASP A09 — digest uniquement)
- ADR-004 : documentation du pattern auth service-to-service (Next.js → Hono)
- 18 nouveaux tests unitaires (workout.service, workout.controller complet, error.middleware)

### Changed

- `WorkoutCard` : intégration du bouton supprimer, lien et bouton séparés (RGAA 4.1)
- `cahier-recettes.md` : 34 scénarios avec résultats réels Sprint 02/03
- Coverage exclusion `repositories/` et `routes/` (dépendances DB)

### Fixed

- Coverage CI historique 54% → 96% sur un périmètre API réduit — seuil interne de 70% atteint ; cette mesure ne prouve pas à elle seule la majorité du code exigée par C2.2.2

### Security

- OWASP A09 : `error.tsx` loggue uniquement `error.digest`, pas les détails internes

---

## [0.2.0] — 2026-04-13

### Added

- `server-api.ts` : module server-only pour les appels Hono authentifiés (Next.js → Hono)
- `WorkoutCard` : composant carte accessible (RGAA 4.1 — role="article", aria-label)
- Navbar session-aware : affichage conditionnel connecté/déconnecté, bouton de déconnexion
- Page `/workouts` : liste réelle des séances avec grille responsive
- Page `/workouts/[id]` : détail complet avec échauffement, Timer et récupération
- 6 nouveaux tests unitaires pour `authMiddleware` (secret invalide, userId manquant, OWASP A09)

### Changed

- `auth.middleware.ts` : remplacement du placeholder par validation `x-internal-secret` réelle
- `generate/page.tsx` : Server Action connecté à `serverApi.generateWorkout()` + redirect
- `layout.tsx` : navbar async session-aware avec `auth()` et `signOut`
- CI/CD : ajout `SERVICE_SECRET` dans les env du job test

### Security

- OWASP A01 : pattern service-to-service (secret partagé, jamais exposé au client)
- OWASP A09 : logging des tentatives d'auth invalides avec timestamp

---

## [0.1.0] — 2026-04-13

### Added

- Bootstrap du monorepo pnpm (apps/web, apps/api, packages/shared)
- Structure Next.js 14 App Router avec Tailwind CSS
- Backend Hono avec architecture en couches (Routes → Controllers → Services → Repositories)
- Intégration Mistral AI avec validation Zod (contrat JSON strict)
- Schéma PostgreSQL avec Drizzle ORM
- Middleware Auth.js pour l'authentification OAuth
- Pipeline CI/CD GitHub Actions (lint → typecheck → test → build)
- Documentation RNCP initiale (ADRs, cahier de recettes, sprint-01)

---

<!-- Les versions futures seront ajoutées ici par le skill /changelog -->
