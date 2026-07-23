# Guide de deploiement - Alcide

> Version applicative déployée: 0.13.0-rc.6
> Baseline applicative déployée: b5f941311fb034831f2c6a310c61585ad7b3f092
> Date de verification documentaire initiale: 2026-05-07
> Derniere verification Bloc 2 et contre-recette de production: 2026-07-23

La version `0.13.0-rc.6` conserve les correctifs de restitution NVDA et ajoute
l'accès jury temporaire sécurisé. Elle a passé la CI `29990178784`, la CD
`29990426551`, les smoke tests et la recette navigateur de production du
23 juillet 2026.

## Production canonique

| Composant       | Plateforme      | URL                               |
| --------------- | --------------- | --------------------------------- |
| Frontend        | Vercel          | `https://ai-sport-web.vercel.app` |
| API             | Vercel          | `https://ai-sport-api.vercel.app` |
| Base de donnees | Neon PostgreSQL | via `DATABASE_URL`                |

La CI/CD est documentee dans `docs/ci-cd.md`.

## Variables d'environnement Vercel

Projet Web:

```text
API_URL=https://ai-sport-api.vercel.app
NEXT_PUBLIC_API_URL=https://ai-sport-api.vercel.app
SERVICE_SECRET=<same value as API>
AUTH_SECRET=<Auth.js secret>
AUTH_GOOGLE_ID=<Google OAuth client id>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
JURY_ACCESS_ENABLED=false
JURY_ACCESS_IDENTIFIER=<identifiant temporaire>
JURY_ACCESS_PASSWORD_HASH=<hash scrypt salé>
JURY_ACCESS_USER_ID=<identité de session stable>
JURY_ACCESS_EMAIL=<email technique dédié>
JURY_ACCESS_NAME=<nom affiché>
JURY_ACCESS_EXPIRES_AT=<date ISO 8601 absolue avec fuseau>
JURY_ACCESS_SESSION_VERSION=<nonce à renouveler à chaque activation>
NEXTAUTH_URL=https://ai-sport-web.vercel.app
```

L'accès jury est limité à l'environnement Vercel `Production`. Le mot de passe
en clair ne doit jamais être ajouté à Vercel ou au dépôt. Pour produire son hash
sans écrire le secret dans l'historique PowerShell :

```powershell
$securePassword = Read-Host "Mot de passe jury" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:JURY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  pnpm jury:hash
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:JURY_PASSWORD -ErrorAction SilentlyContinue
}
```

La sortie `scrypt$...` devient `JURY_ACCESS_PASSWORD_HASH`. À chaque
réactivation, renouveler aussi `JURY_ACCESS_SESSION_VERSION` pour que les
anciens cookies ne puissent pas redevenir valides. Le callback
`POST /api/auth/callback/jury` est protégé dans Vercel Firewall par une fenêtre
fixe de 10 tentatives par minute et par IP.

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
   build, smoke E2E public, audit dès le niveau low, politique de déploiement
   Vercel et Docker.
2. `CD - Vercel` se lance uniquement après une CI verte sur `main` si la
   variable GitHub `ENABLE_GHA_VERCEL_CD=true` est définie. Il n'existe plus de
   lancement manuel contournant les gates.
3. `CD - Vercel` applique les migrations Drizzle avant le déploiement API ; un
   échec bloque ensuite l'API et le Web. `DB - Drizzle migrations` reste un
   chemin manuel de reprise, rattaché à l'environnement `production`. Au relevé
   du 2026-07-20, cet environnement ne possédait aucune règle de protection ni
   approbateur ; ce n'est donc pas encore une gate humaine.
4. Les previews Vercel de pull request restent actives. Pour `VERCEL_ENV=production`,
   `ignoreCommand` ignore le déploiement automatique de l'intégration Git ; le
   workflow CD force explicitement le chemin canonique après CI verte.

Secrets GitHub requis pour la CD:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_API_PROJECT_ID
VERCEL_WEB_PROJECT_ID
DATABASE_URL
```

Le token doit autoriser `vercel pull/build/deploy` sur les deux projets. Le run
CD canonique `29931146789`, déclenché automatiquement après la CI `29930722308`,
a réussi sur le SHA `c63439e8ac8d68efd5ba091211b326ee8575fbba` : migration,
API, Web et smoke tests de production. Les productions automatiques de
l'intégration Git sont annulées par `ignoreCommand`, puis une seule production
GitHub Actions aboutit par projet. Les runs `29747228594` et `29747592571`
restent des preuves historiques du même protocole avant la correction finale de
reflow.

## Deploiement manuel Vercel

Cette procédure est réservée au diagnostic ou à une intervention d'urgence
autorisée. Elle ne doit pas servir à contourner la CI ni à constituer la preuve
de la version remise ; le chemin nominal reste le workflow CD après CI verte.

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

Dans le chemin nominal, le job `migrate-db` du workflow `CD - Vercel` applique
les migrations avant le déploiement API. Pour une reprise autorisée ou une
migration isolée, lancer le workflow manuel `DB - Drizzle migrations`.

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

- [x] CI verte sur le SHA applicatif livré
- [x] Migrations Drizzle appliquées par la CD
- [x] `SERVICE_SECRET` cohérent côté Web et API, prouvé par les smoke tests service-to-service
- [x] OAuth Google démarre avec le callback `https://ai-sport-web.vercel.app/api/auth/callback/google`
- [x] API liveness et readiness HTTP 200 après déploiement
- [x] Web healthcheck HTTP 200 après déploiement
- [x] Génération d'une séance testée avec un compte authentifié, puis donnée de recette supprimée (B2-A25)
- [x] Génération d'un programme testée avec un compte authentifié, puis donnée de recette supprimée (B2-A25)
- [x] run CI automatique vert sur la baseline applicative livrée (`29930722308`)
- [x] run CD automatique vert sur la baseline applicative livrée (`29931146789`)
- [x] zoom natif 200/400 % contre-recetté en production, 16/16, puis suite
      d'accessibilité rejouée, 33/33

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

| Service    | URL                     |
| ---------- | ----------------------- |
| Web        | `http://localhost:3000` |
| API        | `http://localhost:3001` |
| PostgreSQL | `localhost:5432`        |

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
