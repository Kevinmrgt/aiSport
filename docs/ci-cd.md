# CI/CD - Alcide

> Date: 2026-05-04  
> Scope: GitHub Actions, Vercel, Neon, Docker

## Architecture retenue

Production actuelle:

| Composant | Plateforme | URL |
| --- | --- | --- |
| Web Next.js | Vercel | `https://alcide-web.vercel.app` |
| API Hono | Vercel | `https://alcide-api.vercel.app` |
| PostgreSQL | Neon | configure via `DATABASE_URL` |

Docker Compose et Fly.io restent supportes pour l'auto-hebergement ou une
migration future, mais la CD canonique du depot cible Vercel.

## Workflows GitHub Actions

| Workflow | Declenchement | Role |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push, PR, manuel | lint, typecheck, tests API, build, smoke E2E, build Docker, audit |
| `.github/workflows/deploy-vercel.yml` | manuel, ou apres CI verte si `ENABLE_GHA_VERCEL_CD=true` | deploy API puis Web sur Vercel, smoke tests prod |
| `.github/workflows/db-migrate.yml` | manuel | migrations Drizzle contre Neon |

## Gates CI

La CI bloque sur:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:coverage` avec seuils Vitest de 70%
- `pnpm build`
- smoke E2E public et accessibilite Playwright/axe-core
- build Docker API et Web

L'audit `pnpm audit --audit-level=high` reste visible mais non bloquant pour
eviter un blocage de livraison sur une alerte transitoire. Toute alerte haute
doit etre traitee ou documentee.

## Secrets GitHub requis

Deja utilises par la CI:

- `SERVICE_SECRET`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_API_URL`

Requis pour la CD Vercel:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_API_PROJECT_ID`
- `VERCEL_WEB_PROJECT_ID`

La CD automatique apres `main` est armee par la variable GitHub
`ENABLE_GHA_VERCEL_CD=true`. Tant qu'elle n'est pas definie, le workflow reste
lançable manuellement sans provoquer de faux echecs apres chaque CI.

Le token `VERCEL_TOKEN` doit avoir acces au scope Vercel
`kevinmrgts-projects`. Un token personnel sans ce scope ne peut pas lire les
environnements ni deployer les projets `alcide-api` / `alcide-web`.

Requis pour le workflow manuel DB:

- `DATABASE_URL`

Secrets applicatifs a configurer dans Vercel, pas dans le code:

- Web: `NEXT_PUBLIC_API_URL`, `SERVICE_SECRET`, `AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`
- API: `DATABASE_URL`, `SERVICE_SECRET`, `OPENAI_API_KEY`, `FRONTEND_URL`,
  `NODE_ENV`

`SERVICE_SECRET` doit etre strictement identique cote Web et API.

## Migrations

Les migrations Drizzle sont versionnees sous `apps/api/drizzle/`.

Elles ne sont pas executees pendant le build Vercel. Pour la production:

1. Verifier la PR et la CI.
2. Lancer manuellement `DB - Drizzle migrations` depuis GitHub Actions.
3. Verifier les logs Drizzle.
4. Laisser `CD - Vercel` deployer ou le relancer manuellement.

Cette separation evite qu'un simple build applicatif modifie la base sans
trace explicite.

## Smoke tests production

Le workflow CD verifie:

```bash
curl --fail https://alcide-api.vercel.app/health
curl --fail https://alcide-web.vercel.app/api/health
```

Pour un controle manuel plus complet:

```bash
curl -I https://alcide-web.vercel.app
curl https://alcide-api.vercel.app/health
```

## Rollback

Rollback Vercel:

1. Ouvrir le dashboard Vercel du projet Web ou API.
2. Aller dans `Deployments`.
3. Selectionner le dernier deploiement sain.
4. Choisir `Promote to Production`.

Rollback DB:

- Les migrations destructrices doivent etre evitees ou accompagnees d'une
  migration inverse.
- Avant une migration sensible, creer un backup/branche Neon.
