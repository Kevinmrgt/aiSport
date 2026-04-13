# Changelog

Toutes les modifications notables de SportCoach IA sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
version sémantique selon [SemVer](https://semver.org/lang/fr/).

> Ce fichier est un livrable **ÉLIMINATOIRE** du Bloc 4 RNCP (C4.3.2).

---

## [Unreleased]

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
- Coverage CI 54% → 96% — seuil RNCP >70% atteint

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
