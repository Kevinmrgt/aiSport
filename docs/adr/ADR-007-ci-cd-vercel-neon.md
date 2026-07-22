# ADR-007 - CI/CD Vercel + Neon

> Date: 2026-05-04  
> Status: Accepted  
> Projet Alcide

## Context

The project already has live production URLs on Vercel:

- Web: `https://alcide-web.vercel.app`
- API: `https://alcide-api.vercel.app`

Previous documentation also mentioned Fly.io and Railway, which made the
deployment target ambiguous.

## Decision

The canonical production path is:

```text
GitHub main -> CI - Alcide -> CD - Vercel -> Web/API Vercel -> Neon
```

Database migrations are not part of the Vercel build. They are handled by a
manual GitHub Actions workflow protected by the `production` environment.

Docker and Fly.io remain supported as portability options, but they are not the
default CD target.

## Consequences

Positive:

- CI must be green before the GitHub Actions CD workflow deploys.
- Vercel deployments are reproducible from prebuilt outputs.
- Drizzle migrations become auditable and explicit.
- Docker images are built in CI, so container regressions are detected early.

Trade-offs:

- GitHub needs additional Vercel secrets.
- If Vercel Git auto-deploy remains enabled, it can still deploy before CI. The
  preferred setup is to let this workflow be the production promotion path.

## Required secrets

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_API_PROJECT_ID`
- `VERCEL_WEB_PROJECT_ID`
- `DATABASE_URL`
