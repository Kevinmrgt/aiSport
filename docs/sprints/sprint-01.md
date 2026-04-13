# Sprint 01 — Bootstrap du projet

**Dates** : 2026-04-13 au 2026-04-20
**Objectif** : Mettre en place les fondations du monorepo et la structure complète du projet

---

## Objectifs du sprint

- Créer le monorepo pnpm avec workspaces
- Scaffolding complet : frontend Next.js 14, backend Hono, package shared
- Mettre en place la structure de données PostgreSQL + Drizzle ORM
- Implémenter le service Mistral AI avec validation Zod
- Mettre en place le pipeline CI/CD GitHub Actions
- Produire la documentation RNCP initiale (ADRs, cahier de recettes)

---

## Réalisations

### Structure & Configuration
- `feat(ci): add GitHub Actions pipeline (lint → typecheck → test → build → security audit)`
- `feat(shared): create shared package with Zod schemas (WorkoutSchema, ExerciseSchema, PhaseSchema)`
- `chore: setup monorepo pnpm workspaces with tsconfig.base.json`

### Backend (Hono)
- `feat(api): implement layered architecture (Routes → Controllers → Services → Repositories)`
- `feat(ai): add MistralService with JSON contract, Zod validation, and 1-retry logic`
- `feat(db): add Drizzle ORM schema (users, workouts, accounts, sessions)`
- `security(api): add auth middleware (OWASP A01), error middleware, CORS, secureHeaders`
- `test(api): add unit tests for MistralService and WorkoutController`

### Frontend (Next.js 14)
- `feat(web): setup Next.js 14 App Router with Tailwind CSS`
- `feat(auth): configure Auth.js with GitHub OAuth provider`
- `feat(web): add accessible UI components (Button, Input, Select) — RGAA 4.1`
- `feat(web): add WorkoutForm with Zod client-side validation`
- `feat(timer): add Timer component with aria-live and keyboard navigation`
- `security(web): add CSP headers, X-Frame-Options, Referrer-Policy`

### Documentation
- `docs(adr): add ADR-001 (monorepo pnpm), ADR-002 (Hono), ADR-003 (Mistral AI)`
- `docs(bloc2): add cahier-recettes.md with 32 test scenarios`

---

## Métriques

| Indicateur | Valeur |
|---|---|
| Fichiers créés | ~45 |
| Tests écrits | 8 cas (MistralService + WorkoutController) |
| OWASP couverts | A01, A02, A03, A04, A05, A07, A08, A09, A10 |
| RGAA appliqué | Skip link, labels, aria-live, aria-busy, sémantique HTML5 |
| ADRs créés | 3 |
| Scénarios de recettes | 12 |

---

## Arbitrage / Décision

### Choix : WorkoutSchema dans packages/shared plutôt que dans apps/api

- **Problématique** : Le schéma Zod de la réponse Mistral doit-il vivre dans le backend (seul consommateur de l'API Mistral) ou dans le package partagé ?
- **Options** :
  1. Dans `apps/api/src/schemas/` — plus simple initialement
  2. Dans `packages/shared/` — partageable avec le frontend pour la validation client
- **Décision** : Dans `packages/shared/` (option 2)
- **Justification** : Le frontend doit valider les données au même niveau que le backend avant d'envoyer la requête. Avoir un schéma unique évite la divergence et respecte le principe DRY.

---

## Rétrospective

- **Ce qui a bien fonctionné** : La structure en couches Hono est claire et respecte strictement l'architecture RNCP. Les composants UI accessibles sont réutilisables et conformes RGAA 4.1.
- **Ce qui peut être amélioré** : La page `/generate` doit être finalisée avec la connexion réelle entre le formulaire client et le backend (via `api-client.ts`). Les tests e2e Playwright restent à écrire.

---

## Objectifs du prochain sprint (Sprint 02)

- Connecter le formulaire frontend au backend (flow complet génération → affichage)
- Implémenter la liste des workouts avec données réelles
- Ajouter les tests Playwright pour le parcours critique
- Configurer Drizzle migrations et tester avec une vraie base PostgreSQL
- Compléter le cahier de recettes avec les résultats réels
