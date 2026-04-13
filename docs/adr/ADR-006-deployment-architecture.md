# ADR-006 — Architecture de déploiement

> Date : 2026-04-13 | Statut : **Accepté (mis à jour Sprint 11)** | Auteur : Kevin

---

## Contexte

SportCoach IA est un monorepo avec trois composants déployables :
- **Frontend** : Next.js 14 (App Router, Server Components, Server Actions)
- **API** : Hono sur Node.js 20
- **Base de données** : PostgreSQL 16

Le déploiement doit être reproductible, documenté, et conforme aux exigences RNCP Bloc 4 (livraison en production). Contrainte : hébergement **100% gratuit** sans limite de durée.

---

## Options considérées

### Option 1 — Vercel (web) + Fly.io (API) + Neon (DB) ✅ RETENUE

**Architecture :**
```
GitHub → Vercel (Next.js) ←→ Fly.io (Hono API) ←→ Neon (PostgreSQL serverless)
```

**Avantages :**
- **Fly.io** : machines toujours actives sur free tier (3 shared VMs), déploiement depuis Docker
- **Neon** : PostgreSQL serverless gratuit, connexions poolées, branching DB, région EU
- **Vercel** : optimise Next.js nativement (Edge Network, ISR), CD automatique depuis GitHub
- Certificats HTTPS automatiques (OWASP A02) sur les trois services
- Pas de limite de durée sur les free tiers

**Inconvénients :**
- Vendor lock-in (trois services différents)
- Configuration initiale plus complexe que Railway

### Option 2 — Vercel (web) + Railway (API + DB)

**Avantages :** Setup simple, Railway gère PostgreSQL managé

**Inconvénients :**
- Railway a supprimé son free tier début 2024 — **non gratuit** (5$/mois minimum)
- Éliminé pour cette raison

### Option 3 — VPS (Hetzner/OVH) + Docker Compose

**Avantages :** Contrôle total, RGPD facilité (datacenter EU), coût prévisible (~5€/mois)

**Inconvénients :** Maintenance infra (SSL, backups, monitoring), déploiement plus complexe

### Option 4 — Docker Compose local uniquement

**Avantages :** Simple, zéro coût

**Inconvénients :** Pas de URL live — jury ne peut pas tester l'application

---

## Décision

**Option 1 retenue (Vercel + Fly.io + Neon)** — stack cloud gratuite sans limite de durée.

**Option 3 documentée** via `docker-compose.yml` pour l'auto-hébergement et les démonstrations locales.

### Justification

- Priorité à la **disponibilité d'une URL live** pour la soutenance RNCP
- Fly.io déploie depuis le `Dockerfile` existant — aucun changement de code
- Neon est PostgreSQL natif — compatible Drizzle ORM sans modification
- Le `docker-compose.yml` full-stack garantit la portabilité si migration vers VPS

---

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                       GitHub (main)                          │
└──────────────┬───────────────────────────┬───────────────────┘
               │ push (CD Vercel)           │ push (fly deploy CI)
               ▼                           ▼
    ┌─────────────────┐        ┌──────────────────────┐
    │  Vercel          │        │  Fly.io (cdg — Paris) │
    │  Next.js 14      │◄──────►│  Hono API (Node 20)  │
    │  (Edge Network)  │        │  shared-cpu-1x 256MB  │
    │  HTTPS auto      │        │  HTTPS auto           │
    └─────────────────┘        └──────────┬───────────┘
                                          │ DATABASE_URL
                                          ▼
                               ┌──────────────────────┐
                               │  Neon (PostgreSQL)    │
                               │  Region : EU-West     │
                               │  Serverless + pooler  │
                               └──────────────────────┘
```

**Communication web → API :**
- En production : `NEXT_PUBLIC_API_URL=https://sportcoach-api.fly.dev`
- Header `x-internal-secret` : variable d'env Fly.io (jamais exposée côté client)

---

## Variables d'environnement de production

### Vercel (Next.js)

| Variable | Source | Description |
|---|---|---|
| `AUTH_SECRET` | Vercel Secrets | Signe les sessions JWT Auth.js |
| `AUTH_GITHUB_ID` | GitHub OAuth App | Client ID OAuth |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App | Client Secret OAuth |
| `NEXTAUTH_URL` | `https://sportcoach.vercel.app` | URL publique du frontend |
| `NEXT_PUBLIC_API_URL` | `https://sportcoach-api.fly.dev` | URL publique de l'API |
| `SERVICE_SECRET` | Partagé avec Fly.io | Secret interne service-to-service |

### Fly.io (API Hono)

| Variable | Source | Description |
|---|---|---|
| `DATABASE_URL` | Neon Dashboard | URL PostgreSQL poolée (`postgres://...@ep-xxx.neon.tech/sportcoach?sslmode=require`) |
| `MISTRAL_API_KEY` | Mistral Console | Clé API Mistral |
| `SERVICE_SECRET` | Partagé avec Vercel | Secret interne service-to-service |
| `FRONTEND_URL` | `https://sportcoach.vercel.app` | CORS — seule origine autorisée |
| `NODE_ENV` | `production` | Mode production |

---

## Migrations de base de données

La migration Drizzle doit être exécutée une fois après la création de la DB Neon :

```bash
# Pointer DATABASE_URL vers Neon
export DATABASE_URL="postgres://...@ep-xxx.neon.tech/sportcoach?sslmode=require"
pnpm db:migrate
```

---

## Conséquences

**Positives :**
- URL live disponible pour la soutenance RNCP
- CD automatique sur chaque push vers `main` (Vercel)
- Fly.io déploie le Dockerfile existant sans modification
- PostgreSQL Neon compatible Drizzle, géo-répliqué EU
- HTTPS automatique sur tous les services (OWASP A02)

**Négatives / Risques :**
- Fly.io free tier : 3 shared VMs max — suffisant pour RNCP
- Neon free tier : 0.5 GB storage, 1 projet — suffisant pour prototype
- Le `docker-compose.yml` full-stack doit être maintenu en sync avec les Dockerfiles

---

## Références

- `apps/api/fly.toml` — configuration Fly.io pour le déploiement de l'API
- `vercel.json` — configuration Vercel pour le monorepo Next.js
- `docker-compose.yml` — stack complète pour auto-hébergement
- `apps/api/Dockerfile` — build multi-stage API (Node 20 Alpine)
- `apps/web/Dockerfile` — build multi-stage Next.js standalone
- `.env.example` — template de toutes les variables nécessaires
