# Sprint 12 — Pagination/Filtres, Dashboard Stats, Déploiement Live

> Période : 2026-04-16 | Version : 0.12.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Pagination + filtres (sport, niveau) sur `/workouts` | ✅ |
| 2 | Dashboard utilisateur `/dashboard` avec statistiques agrégées | ✅ |
| 3 | Fix OAuth GitHub (`error=Configuration` → `trustHost: true`) | ✅ |
| 4 | Migration BDD Neon + seed données de démonstration | ✅ |
| 5 | Docs RNCP à jour (CHANGELOG, sprint review, cahier recettes, CRA) | ✅ |

---

## Réalisations

### Pagination et filtres `/workouts`

**Backend** (`apps/api/src/repositories/workout.repository.ts`) :

`findWorkoutsByUser(userId, { page, limit, sport, level })` — requête SQL en deux passes :
1. `count(*)::int` pour le total
2. `SELECT … LIMIT limit OFFSET (page-1)*limit` avec filtres `eq(sport)` / `eq(difficulty)`

Query params validés par Zod (`WorkoutQuerySchema`) avant tout accès BDD (OWASP A04).

**Frontend** (`apps/web/app/workouts/page.tsx`) :

- `<FilterBar>` : `<form method="GET">` avec `<select>` sport et niveau — fonctionne sans JavaScript (RGAA)
- Pagination : liens `← Précédent` / `Suivant →` avec `aria-label`, `aria-current="page"`
- Compteur total visible, bouton "Réinitialiser" si filtre actif

### Dashboard statistiques

**Nouvel endpoint** `GET /workouts/stats` :

```json
{
  "total": 5,
  "byLevel": { "beginner": 2, "intermediate": 2, "advanced": 1 },
  "bySport": { "Course à pied": 3, "HIIT": 2 },
  "lastGenerated": "2026-04-16T10:00:00.000Z"
}
```

**Page `/dashboard`** (`apps/web/app/dashboard/page.tsx`) :

| Zone | Contenu |
|---|---|
| KPIs (3 cards) | Total, niveau le plus pratiqué, date du dernier entraînement |
| Barres de progression | Répartition beginner / intermediate / advanced avec `role="progressbar"` |
| Top sports | 4 sports les plus pratiqués |

### Fix OAuth Vercel (`trustHost: true`)

**Symptôme** : `GET /api/auth/signin/github` → `302 /login?error=Configuration`

**Cause** : Auth.js v5 beta rejette les requêtes dont le host ne correspond pas à l'`AUTH_URL` quand derrière un proxy (Vercel). La propriété `trustHost` n'était pas définie.

**Fix** (`apps/web/lib/auth.ts`) :
```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Requis sur Vercel — proxy entre client et fonction serverless
  providers: [GitHub({ ... })],
  ...
});
```

### Migration BDD Neon

```
✓ migrations applied successfully!
✓ Utilisateur démo : demo@alcide.app
✓ 3 workouts seed : Cardio Débutant, Force Intermédiaire, HIIT Avancé
```

Tables créées : `users`, `accounts`, `sessions`, `workouts`.

---

## Métriques

| Métrique | Sprint 11 | Sprint 12 |
|---|---|---|
| Tests unitaires | 36 | **41** |
| Tests E2E | 29 | 29 |
| Coverage statements | >94% | >90% |
| Erreurs TypeScript | 0 | 0 |
| Erreurs ESLint | 0 | 0 |
| Déploiements Vercel | 2 projets READY | 2 projets READY |
| BDD | — | Neon — 4 tables migrées |

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `apps/api/src/repositories/workout.repository.ts` | Pagination, filtres, stats |
| `apps/api/src/services/workout.service.ts` | Signature paginée + getUserStats |
| `apps/api/src/controllers/workout.controller.ts` | Zod query params + handleGetStats |
| `apps/api/src/routes/workout.routes.ts` | Route `/stats` avant `/:id` |
| `apps/api/tests/workout.service.test.ts` | 2 nouveaux cas pagination |
| `apps/web/app/workouts/page.tsx` | FilterBar + Pagination |
| `apps/web/app/dashboard/page.tsx` | Nouveau — dashboard stats |
| `apps/web/app/layout.tsx` | Lien "Dashboard" navbar |
| `apps/web/lib/server-api.ts` | getWorkouts(params) + getStats() |
| `apps/web/lib/auth.ts` | trustHost: true |
| `packages/shared/src/types/workout.types.ts` | WorkoutListResponse, WorkoutStats |
| `packages/shared/src/index.ts` | Export nouveaux types |
