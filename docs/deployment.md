# Guide de deploiement - Alcide

> Version applicative candidate: 0.13.0-rc.1
> Version encore déployée au début de cette correction: 0.12.0
> Date de verification documentaire initiale: 2026-05-07
> Derniere verification locale Bloc 2: 2026-07-20

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

1. `CI - Alcide` vérifie lint, types, tests et couvertures API/Web/PostgreSQL,
   build, smoke E2E public, audit high/critical et Docker.
2. `CD - Vercel` se lance uniquement après une CI verte sur `main` si la
   variable GitHub `ENABLE_GHA_VERCEL_CD=true` est définie. Il n'existe plus de
   lancement manuel contournant les gates.
3. `DB - Drizzle migrations` reste manuel et rattaché à l'environnement
   `production`. Au relevé du 2026-07-20, cet environnement ne possédait aucune
   règle de protection ni approbateur ; ce n'est donc pas encore une gate humaine.

Secrets GitHub requis pour la CD:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_API_PROJECT_ID
VERCEL_WEB_PROJECT_ID
DATABASE_URL
```

Le token doit autoriser `vercel pull/build/deploy` sur les deux projets. Le run
CD `29721620945`, déclenché manuellement le 2026-07-20 sur l'ancien SHA
`533f17b`, a réussi : il prouve que le token fonctionnait pour ce run, mais ne
valide pas la version candidate non commitée. L'échec au token invalide du
2026-07-16 reste uniquement un fait historique.

## Deploiement manuel Vercel

Cette procédure est réservée au diagnostic ou à une intervention d'urgence
autorisée. Elle ne doit pas servir à contourner la CI ni à constituer la preuve
de la candidate RNCP ; le chemin nominal reste le workflow CD après CI verte.

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
curl https://ai-sport-api.vercel.app/health/ready
curl https://ai-sport-web.vercel.app/api/health
curl -I https://ai-sport-web.vercel.app
```

Checklist:

- [ ] CI verte sur le SHA final de la version candidate
- [ ] Migrations Drizzle appliquees si le schema a change
- [ ] `SERVICE_SECRET` identique cote Web et API
- [ ] OAuth Google callback: `https://ai-sport-web.vercel.app/api/auth/callback/google`
- [ ] API liveness et readiness HTTP 200 après déploiement du SHA final
- [ ] Web healthcheck HTTP 200 après déploiement du SHA final
- [ ] Génération d'une séance testée avec un compte authentifié sur le SHA final
- [ ] Génération d'un programme testée avec un compte authentifié sur le SHA final
- [ ] run CD automatique vert sur le SHA final (ne régénérer le token qu'en cas d'échec d'authentification constaté)

## Alternative Docker Compose

Pour une demonstration locale ou un auto-hebergement:

```bash
cp .env.example .env
# Remplacer OPENAI_API_KEY, SERVICE_SECRET et les secrets OAuth de démonstration.
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed  # facultatif
docker compose up --build -d
```

Les commandes de migration et de seed utilisent des services outillage basés
sur le stage Docker `builder`. Elles ne sont pas exécutées dans l'image API de
production, qui ne contient volontairement ni `drizzle-kit`, ni `tsx`, ni les
sources TypeScript.

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
