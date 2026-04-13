# Sprint 05 — Rate Limiting, Loading States, Documentation Bloc 4

> Période : 2026-04-13 | Version : 0.5.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Rate limiting OWASP A04 sur `/workouts/generate` | ✅ |
| 2 | Loading states Next.js (Suspense) pour les routes protégées | ✅ |
| 3 | Tests unitaires du rate limiter (5 tests) | ✅ |
| 4 | BUG-001 — rapport de bug RNCP Bloc 4 | ✅ |
| 5 | Veille technologique RNCP Bloc 4 | ✅ |
| 6 | Sprint review + CHANGELOG v0.5.0 | ✅ |

---

## Réalisations

### Rate Limiting (OWASP A04)

**Middleware** (`apps/api/src/middleware/rate-limit.middleware.ts`) :
- Fenêtre glissante 60s par `userId` (store in-memory `Map`)
- Limite : **5 requêtes/minute** sur `POST /workouts/generate`
- Réponse 429 avec header `Retry-After` en secondes
- Log `console.warn` des dépassements (OWASP A09)
- Nettoyage périodique du store toutes les 5 minutes (anti-fuite mémoire)

**AppError** — nouvelle factory `tooManyRequests(message)` → 429 `RATE_LIMIT_EXCEEDED`

**Route** (`workout.routes.ts`) :
```
POST /generate → [authMiddleware] → [rateLimitMiddleware] → handleGenerateWorkout
```

**Note production** : remplacer le store in-memory par Redis (Upstash) pour la persistance cross-instances.

### Loading States Next.js

Trois fichiers `loading.tsx` colocalisés avec les `page.tsx` :

| Route | Skeleton | Éléments animés |
|---|---|---|
| `/workouts` | Grille 6 cartes | Titre, badges, durée, bouton |
| `/generate` | Formulaire | 4 champs + bouton submit |
| `/workouts/[id]` | Timer + fil d'Ariane | Titre, badges, 3 exercices, bouton |

Tous incluent :
- `aria-busy="true"` sur le conteneur (RGAA 4.1)
- `aria-hidden="true"` sur les éléments skeleton
- Message `sr-only` pour les lecteurs d'écran
- Classe Tailwind `animate-pulse` pour l'animation

### Tests rate limiter

5 tests dans `tests/rate-limit.middleware.test.ts` :

| Test | Scénario |
|---|---|
| Autoriser les premières requêtes | count ≤ 5 → 200 |
| Bloquer après MAX_REQUESTS | 6ème requête → 429 RATE_LIMIT_EXCEEDED |
| Header Retry-After présent | Valeur > 0 en secondes |
| Isolation par userId | Quota user-A n'affecte pas user-B |
| console.warn appelé (A09) | Log du dépassement avec userId et count |

### Documentation Bloc 4 RNCP

**BUG-001** (`docs/bloc4/bugs/BUG-001-coverage-threshold.md`) :
- Bug réel de Sprint 02/03 : coverage 54% < seuil 70% bloquant CI
- Cause racine : fichiers DB inclus dans le calcul + tests insuffisants
- Correction : exclusions vitest.config.ts + 18 nouveaux tests
- Résultat : 96% statements

**Veille technologique** (`docs/bloc4/veille-technologique.md`) :
- IA générative pour le sport (Mistral vs GPT-4o vs Llama 3)
- Next.js App Router vs alternatives
- Hono vs Express/Fastify
- OWASP LLM Top 10 (prompt injection)
- Playwright vs Cypress, Vitest vs Jest
- RGAA 4.1 → 4.2 (WCAG 2.2)
- Hébergement et déploiement (Vercel, Railway, Fly.io)

---

## Métriques

| Métrique | Sprint 04 | Sprint 05 |
|---|---|---|
| Tests unitaires | 23 | **28** (+5 rate limiter) |
| Tests E2E | 27 | 27 |
| Coverage statements | 96% | 96% |
| OWASP risques couverts | 10/10 | 10/10 |
| Loading states | 0 | **3** |
| Docs Bloc 4 | 0 | **2** (BUG-001, veille) |

---

## Architecture mise à jour

```
POST /workouts/generate
  → authMiddleware (x-internal-secret + x-user-id)
  → rateLimitMiddleware (5 req/min par userId, 429 + Retry-After)
  → handleGenerateWorkout
  → MistralService (JSON mode, Zod validation, retry x1)
  → WorkoutRepository (Drizzle, paramétré)
```

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Rapport de bug BUG-001 | Bloc 4 | `docs/bloc4/bugs/BUG-001-coverage-threshold.md` |
| Veille technologique | Bloc 4 | `docs/bloc4/veille-technologique.md` |
| Rate limiting (OWASP A04) | Bloc 3 | `apps/api/src/middleware/rate-limit.middleware.ts` |
| Loading states (RGAA 4.1) | Bloc 2 | `apps/web/app/*/loading.tsx` |
