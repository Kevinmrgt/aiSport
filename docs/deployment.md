# Guide de déploiement — SportCoach IA

> Version : 0.10.0 | Date : 2026-04-13

---

## Option A — Déploiement cloud gratuit (recommandé pour RNCP)

Stack : **Vercel** (Next.js) + **Fly.io** (API Hono) + **Neon** (PostgreSQL serverless)

### Prérequis

- Compte [Vercel](https://vercel.com) (gratuit, CD depuis GitHub)
- Compte [Fly.io](https://fly.io) (gratuit, 3 VMs shared partagées)
- Compte [Neon](https://neon.tech) (gratuit, 0.5 GB PostgreSQL EU)
- Application GitHub OAuth configurée
- Clé API Mistral

### 1. Configurer l'application GitHub OAuth

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL** : `https://votre-app.vercel.app`
3. **Authorization callback URL** : `https://votre-app.vercel.app/api/auth/callback/github`
4. Copier le **Client ID** et générer un **Client Secret**

### 2. Créer la base de données Neon

1. [neon.tech](https://neon.tech) → New Project → Région `eu-west-2` (Paris)
2. Nom du projet : `sportcoach`
3. Copier la **Connection string** (pooled) : `postgres://user:pass@ep-xxx.eu-west-2.aws.neon.tech/sportcoach?sslmode=require`

**Exécuter la migration :**

```bash
export DATABASE_URL="postgres://...@ep-xxx.neon.tech/sportcoach?sslmode=require"
pnpm db:migrate
```

### 3. Déployer l'API sur Fly.io

```bash
# Installer flyctl (CLI Fly.io)
# macOS/Linux :
curl -L https://fly.io/install.sh | sh
# Windows (PowerShell) :
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# S'authentifier
fly auth login

# Déployer depuis le dossier API (utilise apps/api/fly.toml)
cd apps/api
fly launch --name sportcoach-api --region cdg --dockerfile Dockerfile --no-deploy

# Configurer les secrets
fly secrets set \
  DATABASE_URL="postgres://...@ep-xxx.neon.tech/sportcoach?sslmode=require" \
  MISTRAL_API_KEY="sk-..." \
  SERVICE_SECRET="$(openssl rand -hex 32)" \
  FRONTEND_URL="https://votre-app.vercel.app" \
  NODE_ENV="production"

# Premier déploiement
fly deploy
```

**URL API** : `https://sportcoach-api.fly.dev`

**Vérifier le healthcheck :**

```bash
curl https://sportcoach-api.fly.dev/health
# {"status":"ok","service":"sportcoach-api"}
```

### 4. Déployer le frontend sur Vercel

Connecter le repo GitHub à Vercel via [vercel.com/new](https://vercel.com/new) :

1. Sélectionner le repo → Framework preset : **Next.js**
2. Root directory : `apps/web`
3. Build command : `pnpm --filter shared build && pnpm --filter web build`

**Variables d'environnement Vercel** (Settings → Environment Variables) :

```
AUTH_SECRET=<openssl rand -hex 32>
AUTH_GITHUB_ID=<GitHub OAuth Client ID>
AUTH_GITHUB_SECRET=<GitHub OAuth Client Secret>
NEXTAUTH_URL=https://votre-app.vercel.app
NEXT_PUBLIC_API_URL=https://sportcoach-api.fly.dev
SERVICE_SECRET=<même valeur que Fly.io>
```

### 5. Déploiement continu (CD)

- **Vercel** : déploiement automatique sur chaque push vers `main` (natif)
- **Fly.io** : ajouter au CI GitHub Actions :

```yaml
- name: Deploy API to Fly.io
  uses: superfly/flyctl-actions/setup-flyctl@master
- run: fly deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## Option B — Auto-hébergement Docker Compose

### Prérequis

- Docker Desktop (Mac/Windows) ou Docker Engine + Compose (Linux)
- Fichier `.env` à la racine (copier `.env.example`)

### 1. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec les vraies valeurs
```

Générer les secrets :

```bash
# SERVICE_SECRET
openssl rand -hex 32

# AUTH_SECRET
openssl rand -hex 32
```

### 2. Démarrer la stack complète

```bash
# Build et démarrage de tous les services
docker compose up --build -d

# Vérifier que les services sont healthy
docker compose ps

# Exécuter les migrations DB
docker compose exec api pnpm db:migrate

# Voir les logs
docker compose logs -f
```

### 3. URLs locales

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| DB (pgAdmin/DBeaver) | localhost:5432 |

### 4. Arrêter la stack

```bash
docker compose down          # Arrêter (données conservées)
docker compose down -v       # Arrêter + supprimer les volumes
```

---

## Option C — Développement local (sans Docker)

```bash
# 1. Démarrer uniquement PostgreSQL
docker compose up postgres -d

# 2. Copier et configurer les env vars
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Installer les dépendances
pnpm install

# 4. Migrer la base de données
pnpm db:migrate

# 5. Démarrer API + frontend en parallèle
pnpm dev
```

---

## Vérification post-déploiement

```bash
# Sanity check API
curl https://sportcoach-api.fly.dev/health

# Sanity check Web
curl https://votre-app.vercel.app/api/health

# Vérifier les headers de sécurité (OWASP A05)
curl -I https://votre-app.vercel.app | grep -E "X-Frame|X-Content|Referrer"
```

### Checklist de mise en production

- [ ] `AUTH_SECRET` et `SERVICE_SECRET` générés avec `openssl rand -hex 32`
- [ ] `MISTRAL_API_KEY` configuré sur Fly.io
- [ ] Migration DB exécutée sur Neon (`pnpm db:migrate`)
- [ ] URL OAuth GitHub callback mise à jour avec l'URL Vercel réelle
- [ ] Route `/health` API répond 200 (`https://sportcoach-api.fly.dev/health`)
- [ ] Route `/api/health` web répond 200 (`https://votre-app.vercel.app/api/health`)
- [ ] Authentification GitHub OAuth fonctionnelle
- [ ] Génération d'un workout de bout en bout testée
- [ ] Headers OWASP vérifiés (X-Frame-Options, CSP, etc.)
