# Alcide

Alcide prépare des séances et des programmes sportifs personnalisés, avec un
minuteur, un journal de séances et un tableau de bord de progression.

Le monorepo utilise Next.js 15, Hono, PostgreSQL 16, Drizzle ORM, Auth.js,
OpenAI, Vitest et Playwright. Runtime : Node.js 24 et pnpm 11.9.

## Démarrage avec Docker

Prérequis : Git, Docker Compose v2, un client OAuth Google et une clé OpenAI.

```bash
git clone https://github.com/Kevinmrgt/aiSport.git
cd aiSport
cp .env.example .env
```

Sous PowerShell : `Copy-Item .env.example .env`.
Renseigner `OPENAI_API_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`AUTH_SECRET` et `SERVICE_SECRET`. Générer deux secrets distincts pour
Auth.js et les échanges Web/API, par exemple en exécutant deux fois :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dans le client OAuth Google, autoriser l'origine `http://localhost:3000` et
la redirection `http://localhost:3000/api/auth/callback/google`.

```bash
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose up --build -d
```

- Web : <http://localhost:3000>
- API : <http://localhost:3001/health>
- Readiness API : <http://localhost:3001/health/ready>

`docker compose logs -f web api` affiche les journaux ;
`docker compose down` arrête la stack en conservant les données.
Le mot de passe PostgreSQL du Compose est réservé au développement local.

## Développement sans conteneurs Web/API

```bash
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Configurer les fichiers copiés : même `SERVICE_SECRET` côté Web et API,
OAuth côté Web et clé OpenAI uniquement côté API.
La connexion utilisateur se fait avec Google.
`pnpm db:seed` est facultatif : ses données appartiennent à `demo@alcide.app`
et ne sont pas automatiquement visibles depuis un autre compte.

## Vérification

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:vercel-ignore
pnpm test:cd-policy
pnpm test:e2e:auth-policy
pnpm test:e2e:smoke
pnpm build
pnpm audit --prod --audit-level=low
```

Les tests PostgreSQL exigent une base de test dédiée ; les parcours Google
authentifiés exigent une vraie session de test. Voir
[les procédures de validation](docs/testing.md).

## Documentation

- [Guide utilisateur](docs/user-guide.md)
- [Déploiement](docs/deployment.md) et [CI/CD](docs/ci-cd.md)
- [Maintenance et incidents](docs/maintenance.md)
- [Tests et recette](docs/testing.md)
- [Accessibilité](docs/accessibility.md)
- [Sécurité](docs/security/owasp-review.md)
- [Travaux avant ouverture publique](docs/release-readiness.md)
- [Décisions d'architecture](docs/adr/)

## Structure

```text
apps/web/           interface Next.js et authentification Google
apps/api/           API Hono, services et repositories
packages/shared/    schémas Zod et types partagés
scripts/            contrôles de livraison et outils de diagnostic
docs/               documentation produit et exploitation
.github/workflows/  intégration, déploiement et surveillance
```

Les rapports générés restent dans `tmp/`, `output/` ou `outputs/`, ignorés par
Git. Les secrets, sessions de navigateur et données utilisateur ne doivent
jamais être ajoutés au dépôt.
