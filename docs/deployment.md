# Guide de deploiement - Alcide

> Version applicative de reference: 0.12.0
> Date de verification documentaire initiale: 2026-05-07
> Derniere verification operationnelle Bloc 2: 2026-07-16

## Production canonique

| Composant | Plateforme | URL |
| --- | --- | --- |
| Frontend | Vercel | `https://ai-sport-web.vercel.app` |
| API | Vercel | `https://ai-sport-api.vercel.app` |
| Base de donnees | Neon PostgreSQL | via `DATABASE_URL` |

La CI/CD est documentee dans `docs/ci-cd.md`.

## Variables d'environnement Vercel

Projet Web:

```text
NEXT_PUBLIC_API_URL=https://ai-sport-api.vercel.app
SERVICE_SECRET=<same value as API>
AUTH_SECRET=<Auth.js secret>
AUTH_GOOGLE_ID=<Google OAuth client id>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
NEXTAUTH_URL=https://ai-sport-web.vercel.app
```

Projet API:

```text
DATABASE_URL=<Neon pooled PostgreSQL URL>
SERVICE_SECRET=<same value as Web>
OPENAI_API_KEY=<OpenAI API key geree par Alcide cote serveur>
FRONTEND_URL=https://ai-sport-web.vercel.app
NODE_ENV=production
```

## GitHub Actions

1. `CI - Alcide` verifie lint, types, tests, build, smoke E2E et Docker.
2. `CD - Vercel` se lance manuellement, ou apres une CI verte sur `main` si la
   variable GitHub `ENABLE_GHA_VERCEL_CD=true` est definie.
3. `DB - Drizzle migrations` reste manuel et protege par l'environnement
   `production`.

Secrets GitHub requis pour la CD:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_API_PROJECT_ID
VERCEL_WEB_PROJECT_ID
DATABASE_URL
```

`VERCEL_TOKEN` doit etre cree ou re-authentifie avec acces au scope Vercel
`kevinmrgts-projects`; sinon `vercel pull/build/deploy` echouera sur les deux
projets de production.

Etat constate le 2026-07-16 : la production Web/API et le monitoring sont OK,
mais le workflow GitHub Actions `CD - Vercel` echoue encore car `VERCEL_TOKEN`
est invalide au moment de `vercel pull`. Cette action est une configuration
proprietaire GitHub/Vercel, pas une panne applicative.

## Deploiement manuel Vercel

Depuis la racine du depot:

```bash
pnpm install --frozen-lockfile
pnpm build
```

API:

```bash
cd apps/api
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Web:

```bash
cd apps/web
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

## Migrations Neon

Depuis GitHub Actions, lancer le workflow manuel `DB - Drizzle migrations`.

En local, uniquement si `DATABASE_URL` pointe volontairement vers la cible:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

## Verification post-deploiement

```bash
curl https://ai-sport-api.vercel.app/health
curl https://ai-sport-web.vercel.app/api/health
curl -I https://ai-sport-web.vercel.app
```

Checklist:

- [x] CI verte sur `main` : run `29489995458`, commit `533f17b`, 2026-07-16
- [ ] Migrations Drizzle appliquees si le schema a change
- [ ] `SERVICE_SECRET` identique cote Web et API
- [ ] OAuth Google callback: `https://ai-sport-web.vercel.app/api/auth/callback/google`
- [x] API healthcheck HTTP 200 le 2026-07-16
- [x] Web healthcheck HTTP 200 le 2026-07-16
- [x] Generation d'un entrainement testee avec un compte authentifie le 2026-07-16
- [x] Generation d'un programme testee avec un compte authentifie le 2026-07-16
- [ ] `VERCEL_TOKEN` GitHub regenere si le workflow CD custom doit etre relance

## Alternative Docker Compose

Pour une demonstration locale ou un auto-hebergement:

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api pnpm db:migrate
```

URLs locales:

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| PostgreSQL | `localhost:5432` |

## Alternative Fly.io pour l'API

Le fichier `apps/api/fly.toml` reste disponible. Depuis la racine:

```bash
fly deploy --config apps/api/fly.toml --remote-only .
```

Secrets Fly requis:

```text
DATABASE_URL
OPENAI_API_KEY
SERVICE_SECRET
FRONTEND_URL=https://ai-sport-web.vercel.app
NODE_ENV=production
```
