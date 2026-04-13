# ADR-006 — Architecture de déploiement

> Date : 2026-04-13 | Statut : **Accepté** | Auteur : Kevin

---

## Contexte

SportCoach IA est un monorepo avec trois composants déployables :
- **Frontend** : Next.js 14 (App Router, Server Components, Server Actions)
- **API** : Hono sur Node.js 20
- **Base de données** : PostgreSQL 16

Le déploiement doit être reproductible, documenté, et conforme aux exigences RNCP Bloc 4 (livraison en production).

---

## Options considérées

### Option 1 — Vercel (web) + Railway (API + DB)

**Architecture :**
```
GitHub → Vercel (Next.js) ←→ Railway (Hono API + PostgreSQL)
```

**Avantages :**
- Zéro infrastructure à gérer
- Déploiement automatique depuis `main` (CD natif)
- Vercel optimise Next.js nativement (Edge Functions, ISR)
- Railway gère PostgreSQL managé avec backups automatiques
- Certificats HTTPS automatiques (OWASP A02)
- Free tier suffisant pour un prototype RNCP

**Inconvénients :**
- Vendor lock-in (Vercel, Railway)
- Coût à l'échelle (dépassement du free tier)
- Données hébergées hors UE possible (Railway peut être configuré EU)

### Option 2 — VPS (Hetzner/OVH) + Docker Compose

**Architecture :**
```
GitHub Actions → SSH → VPS → Docker Compose (web + api + postgres)
```

**Avantages :**
- Contrôle total, RGPD facilité (datacenter EU)
- Coût prévisible (~5€/mois)
- Pas de vendor lock-in

**Inconvénients :**
- Maintenance infra (SSL, backups, monitoring)
- Déploiement plus complexe (GitHub Actions SSH)
- Temps de setup élevé pour un prototype

### Option 3 — Docker Compose local uniquement

**Avantages :** Simple, zéro coût

**Inconvénients :** Pas de URL live — jury ne peut pas tester l'application

---

## Décision

**Option 1 retenue (Vercel + Railway)** pour le prototype RNCP.

**Option 2 documentée** via `docker-compose.yml` pour l'auto-hébergement et les démonstrations locales.

### Justification

- Priorité à la **disponibilité d'une URL live** pour la soutenance RNCP
- Déploiement en < 30 minutes depuis un repo GitHub existant
- Le `docker-compose.yml` full-stack garantit la portabilité si migration vers VPS

---

## Architecture cible

```
┌─────────────────────────────────────────────────────┐
│                    GitHub (main)                     │
└────────────┬──────────────────────────┬─────────────┘
             │ push                      │ push
             ▼                           ▼
    ┌─────────────────┐        ┌──────────────────────┐
    │  Vercel          │        │  Railway              │
    │  Next.js 14      │◄──────►│  Hono API (Node 20)  │
    │  (Edge Network)  │        │  PostgreSQL 16        │
    │  HTTPS auto      │        │  HTTPS auto           │
    └─────────────────┘        └──────────────────────┘
```

**Communication web → API :**
- En production : `NEXT_PUBLIC_API_URL=https://api.sportcoach.railway.app`
- Header `x-internal-secret` : variable d'env Railway (jamais exposée côté client)

---

## Variables d'environnement de production

### Vercel (Next.js)

| Variable | Source | Description |
|---|---|---|
| `AUTH_SECRET` | Vercel Secrets | Signe les sessions JWT Auth.js |
| `AUTH_GITHUB_ID` | GitHub OAuth App | Client ID OAuth |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App | Client Secret OAuth |
| `NEXTAUTH_URL` | `https://sportcoach.vercel.app` | URL publique du frontend |
| `NEXT_PUBLIC_API_URL` | `https://api.sportcoach.railway.app` | URL publique de l'API |
| `SERVICE_SECRET` | Partagé avec Railway | Secret interne service-to-service |

### Railway (API + DB)

| Variable | Source | Description |
|---|---|---|
| `DATABASE_URL` | Railway auto-injecté | URL PostgreSQL managée |
| `MISTRAL_API_KEY` | Mistral Console | Clé API Mistral |
| `SERVICE_SECRET` | Partagé avec Vercel | Secret interne service-to-service |
| `FRONTEND_URL` | `https://sportcoach.vercel.app` | CORS — seule origine autorisée |
| `NODE_ENV` | `production` | Mode production |

---

## Migrations de base de données

La migration Drizzle (`0000_amusing_starfox.sql`) doit être exécutée avant le premier déploiement :

```bash
# Sur Railway (via Railway CLI ou shell)
pnpm db:migrate
```

En production, ajouter la migration au script de démarrage via un healthcheck ou un Job Railway.

---

## Conséquences

**Positives :**
- URL live disponible pour la soutenance RNCP
- CD automatique sur chaque push vers `main`
- PostgreSQL managé avec backups automatiques (Railway)
- HTTPS automatique sur les deux services

**Négatives / Risques :**
- Si Railway supprime le free tier : migrer vers Fly.io ou VPS
- Le `docker-compose.yml` full-stack doit être maintenu en sync avec les Dockerfiles

---

## Références

- `docker-compose.yml` — stack complète pour auto-hébergement
- `apps/api/Dockerfile` — build multi-stage API (Node 20 Alpine)
- `apps/web/Dockerfile` — build multi-stage Next.js standalone
- `.env.example` — template de toutes les variables nécessaires
