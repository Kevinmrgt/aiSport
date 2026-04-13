# Changelog

Toutes les modifications notables de SportCoach IA sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
version sémantique selon [SemVer](https://semver.org/lang/fr/).

> Ce fichier est un livrable **ÉLIMINATOIRE** du Bloc 4 RNCP (C4.3.2).

---

## [Unreleased]

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
