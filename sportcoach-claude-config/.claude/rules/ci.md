# CI/CD - GitHub Actions, Vercel, Neon

## Workflows

| Workflow | Role | Blocking |
|---|---|---|
| `.github/workflows/ci.yml` | lint, typecheck, tests, build, smoke E2E, Docker build, audit | Oui sauf audit |
| `.github/workflows/deploy-vercel.yml` | deploy API puis Web sur Vercel, manuel ou auto si `ENABLE_GHA_VERCEL_CD=true` | Oui |
| `.github/workflows/db-migrate.yml` | migrations Drizzle manuelles vers Neon | Manuel/protege |

## Pipeline CI

```text
lint-typecheck -> test-unit -> build -> docker-build
               -> test-e2e-smoke
               -> security-audit (continue-on-error)
```

## Production

| App | URL |
|---|---|
| Web | `https://ai-sport-web.vercel.app` |
| API | `https://ai-sport-api.vercel.app` |

## Secrets GitHub

CI:

- `SERVICE_SECRET`
- `MISTRAL_API_KEY`
- `NEXT_PUBLIC_API_URL`

CD Vercel:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_API_PROJECT_ID`
- `VERCEL_WEB_PROJECT_ID`

DB:

- `DATABASE_URL`

## Variables Vercel requises

Web:

- `NEXT_PUBLIC_API_URL=https://ai-sport-api.vercel.app`
- `SERVICE_SECRET` identique a l'API
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `NEXTAUTH_URL=https://ai-sport-web.vercel.app`

API:

- `DATABASE_URL`
- `MISTRAL_API_KEY`
- `SERVICE_SECRET` identique au Web
- `FRONTEND_URL=https://ai-sport-web.vercel.app`
- `NODE_ENV=production`

## Regles

- Ne jamais executer `db:migrate` pendant un build Vercel.
- Les migrations Drizzle doivent etre versionnees sous `apps/api/drizzle/`.
- Tout changement CI/CD important doit etre documente dans `docs/ci-cd.md`
  ou un ADR.
- Avant un deploy production, la CI doit etre verte.
- Si l'auto-deploy Git Vercel reste actif, il peut deployer avant la CI; le
  workflow `CD - Vercel` est le chemin de promotion recommande.
