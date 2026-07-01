# Sprint 10 — Health routes, validation env, finitions production

> Période : 2026-04-13 | Version : 0.10.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Route `GET /api/health` Next.js (fix Dockerfile healthcheck web) | ✅ |
| 2 | `validateEnv()` — validation des env vars au démarrage API (fail-fast) | ✅ |
| 3 | Sprint review + CHANGELOG v0.10.0 | ✅ |

---

## Réalisations

### Route `/api/health` (Next.js)

**Fichier** (`apps/web/app/api/health/route.ts`) :

```typescript
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'alcide-web', timestamp: ... });
}
```

**Raison** : le `Dockerfile` web référençait `http://localhost:3000/api/health` dans son `HEALTHCHECK` mais cette route n'existait pas — docker-compose marquait le service web comme `unhealthy` en production.

### Validation env vars au démarrage (API)

**Fichier** (`apps/api/src/lib/validate-env.ts`) :

Variables obligatoires vérifiées au boot :
- `DATABASE_URL` — connexion PostgreSQL
- `SERVICE_SECRET` — auth service-to-service (OWASP A01)
- `MISTRAL_API_KEY` — appels IA

Si une variable est absente : log d'erreur explicite + `process.exit(1)` immédiat.

**OWASP A05** — Principle of Fail-Safe Defaults : un serveur qui démarre sans `SERVICE_SECRET` accepterait toutes les requêtes sans contrôle d'accès. Le fail-fast force la détection de la misconfiguration avant tout trafic.

**Ajout dans `index.ts`** — appelé en premier, avant l'import de `db/index.ts` (qui ferait aussi crash si `DATABASE_URL` est absent, mais avec un message moins clair).

---

## Impact sécurité

| Avant | Après |
|---|---|
| Serveur démarre même sans `SERVICE_SECRET` (authMiddleware échoue en runtime) | Crash immédiat au boot avec message explicite |
| Serveur démarre même sans `MISTRAL_API_KEY` (erreur à la première génération) | Crash immédiat au boot |
| Healthcheck web pointait vers une route inexistante | Route `/api/health` opérationnelle → docker-compose healthy |

---

## Métriques v0.10.0

| Métrique | Valeur |
|---|---|
| Tests unitaires | 28 |
| Tests E2E | 29 |
| Coverage statements | 94.69% |
| Routes healthcheck | 2 (`/health` API + `/api/health` web) |
| Validation env vars | 3 variables obligatoires vérifiées au boot |
| Sprints documentés | 10 |

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Healthcheck Next.js | Bloc 4 | `apps/web/app/api/health/route.ts` |
| Validation env démarrage | Bloc 3 (OWASP A05) | `apps/api/src/lib/validate-env.ts` |
