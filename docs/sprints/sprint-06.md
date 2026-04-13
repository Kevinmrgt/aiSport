# Sprint 06 — Déploiement Docker + Guide de mise en production

> Période : 2026-04-13 | Version : 0.6.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Dockerfile API multi-stage (Node 20 Alpine) | ✅ |
| 2 | Dockerfile Next.js standalone + .dockerignore | ✅ |
| 3 | docker-compose.yml full-stack (postgres + api + web) | ✅ |
| 4 | `.env.example` racine pour docker-compose | ✅ |
| 5 | `next.config.mjs` output standalone | ✅ |
| 6 | ADR-006 — Architecture de déploiement | ✅ |
| 7 | `docs/deployment.md` — Guide complet (cloud + Docker + local) | ✅ |
| 8 | Sprint review + CHANGELOG v0.6.0 | ✅ |

---

## Réalisations

### Dockerfiles multi-stage

**API** (`apps/api/Dockerfile`) :
- Stage `builder` : pnpm install + build TypeScript → `dist/`
- Stage `runner` : dépendances prod uniquement + `dist/` + migrations Drizzle
- Utilisateur non-root `hono:1001` (OWASP A05 — moindre privilège)
- Healthcheck : `wget /health` toutes les 30s

**Web** (`apps/web/Dockerfile`) :
- Stage `deps` : installation des dépendances
- Stage `builder` : `next build` en mode `standalone`
- Stage `runner` : artefacts standalone uniquement (~50MB vs ~500MB sans standalone)
- Utilisateur non-root `nextjs:1001`
- `next.config.mjs` : `output: 'standalone'` ajouté

### docker-compose.yml full-stack

```yaml
services:
  postgres  → healthcheck pg_isready
  api       → depends_on: postgres (healthy), healthcheck /health
  web       → depends_on: api (healthy)
```

- `api` et `web` lisent les secrets depuis le fichier `.env` racine (non commité)
- `DATABASE_URL` interne : `postgresql://...@postgres:5432/...` (réseau Docker interne)

### `.env.example` racine

Template unique pour `docker-compose up` avec toutes les variables nécessaires et instructions de génération des secrets (`openssl rand -hex 32`).

### Architecture de déploiement (ADR-006)

**Option retenue** : Vercel (Next.js) + Railway (API + PostgreSQL)

**Justification** :
- URL live disponible pour la soutenance RNCP sans gestion d'infra
- CD automatique depuis `main` sur les deux plateformes
- Free tier suffisant pour un prototype

**Option alternative documentée** : docker-compose sur VPS (Hetzner/OVH) pour l'auto-hébergement.

### Guide de déploiement (`docs/deployment.md`)

Trois options documentées :
| Option | Usage |
|---|---|
| A — Vercel + Railway | Production / soutenance RNCP |
| B — Docker Compose | Auto-hébergement / démonstration locale |
| C — Dev local | Développement quotidien |

Inclut : checklist de mise en production, commandes OAuth setup, migration DB, vérification headers OWASP.

---

## Métriques

| Métrique | Sprint 05 | Sprint 06 |
|---|---|---|
| Tests unitaires | 28 | 28 |
| Tests E2E | 27 | 27 |
| Coverage | 94.69% | 94.69% |
| ADRs | 5 | **6** |
| Dockerfiles | 0 | **2** |
| Options déploiement | 0 | **3** |

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Architecture de déploiement | Bloc 4 | `docs/adr/ADR-006-deployment-architecture.md` |
| Guide de déploiement | Bloc 4 | `docs/deployment.md` |
| Dockerfile API | Bloc 4 | `apps/api/Dockerfile` |
| Dockerfile Web | Bloc 4 | `apps/web/Dockerfile` |
| docker-compose.yml full-stack | Bloc 4 | `docker-compose.yml` |
