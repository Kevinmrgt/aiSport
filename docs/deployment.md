# Guide de déploiement — SportCoach IA

> Version : 0.6.0 | Date : 2026-04-13

---

## Option A — Déploiement cloud (recommandé pour RNCP)

### Prérequis

- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [Railway](https://railway.app) (gratuit, 5$/mois après trial)
- Application GitHub OAuth configurée
- Clé API Mistral

### 1. Configurer l'application GitHub OAuth

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL** : `https://votre-app.vercel.app`
3. **Authorization callback URL** : `https://votre-app.vercel.app/api/auth/callback/github`
4. Copier le **Client ID** et générer un **Client Secret**

### 2. Déployer l'API sur Railway

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Créer un nouveau projet
railway new

# Ajouter PostgreSQL
railway add --plugin postgresql

# Déployer depuis le dossier API
railway up --service api
```

**Variables d'environnement Railway** (Settings → Variables) :

```
MISTRAL_API_KEY=sk-...
SERVICE_SECRET=<openssl rand -hex 32>
FRONTEND_URL=https://votre-app.vercel.app
NODE_ENV=production
```

`DATABASE_URL` est injecté automatiquement par Railway.

**Exécuter la migration :**

```bash
railway run pnpm db:migrate
```

### 3. Déployer le frontend sur Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer depuis le dossier web
cd apps/web
vercel --prod
```

**Variables d'environnement Vercel** (Settings → Environment Variables) :

```
AUTH_SECRET=<openssl rand -hex 32>
AUTH_GITHUB_ID=<GitHub OAuth Client ID>
AUTH_GITHUB_SECRET=<GitHub OAuth Client Secret>
NEXTAUTH_URL=https://votre-app.vercel.app
NEXT_PUBLIC_API_URL=https://votre-api.railway.app
SERVICE_SECRET=<même valeur que Railway>
```

### 4. Déploiement continu (CD)

Connecter le repo GitHub à Vercel et Railway pour le déploiement automatique sur chaque push vers `main`.

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
curl https://votre-api.railway.app/health

# Vérifier les headers de sécurité (OWASP A05)
curl -I https://votre-app.vercel.app | grep -E "X-Frame|X-Content|Referrer"
```

### Checklist de mise en production

- [ ] `AUTH_SECRET` et `SERVICE_SECRET` générés avec `openssl rand -hex 32`
- [ ] `MISTRAL_API_KEY` configuré
- [ ] URL OAuth GitHub callback correcte
- [ ] Migration DB exécutée (`pnpm db:migrate`)
- [ ] Route `/health` répond 200
- [ ] Authentification GitHub OAuth fonctionnelle
- [ ] Génération d'un workout de bout en bout testée
- [ ] Headers OWASP vérifiés (X-Frame-Options, CSP, etc.)
