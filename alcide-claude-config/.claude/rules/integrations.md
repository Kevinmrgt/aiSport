# Intégrations & Accès Agent

L'agent dispose d'un accès complet aux services suivants pour gérer et contrôler l'infrastructure du projet.

---

## GitHub — `gh` CLI

L'agent peut utiliser le CLI `gh` pour toutes les opérations GitHub.

**Capacités :**
- Créer, consulter, commenter et merger des Pull Requests (`gh pr create/view/merge`)
- Consulter et créer des Issues (`gh issue create/list/view`)
- Lire les logs et relancer des runs CI/CD (`gh run list/view/rerun`)
- Gérer les secrets du repository (`gh secret set/list`)
- Créer des releases et tags (`gh release create`)
- Consulter le statut des checks (`gh pr checks`)

**Usage :**
```bash
gh pr list
gh run list --workflow=ci.yml
gh issue create --title "..." --body "..."
```

---

## Vercel — MCP + REST API

L'agent a accès à l'API Vercel via token Bearer.

**IDs projet :**
- **API** : `prj_xLHwTV68FV3gH9OyeqmAThhWZoxL` → `alcide-api.vercel.app`
- **Web** : `prj_HFyrBgWVUn5aGqYXcfoAfW51FNZC` → `alcide-web.vercel.app`
- **Team** : `team_oTjY1aWeytiIR4kzRyTuGugU`

**Capacités :**
- Lister et inspecter les déploiements (`/v6/deployments`)
- Lire et modifier les variables d'environnement (`/v10/projects/:id/env`)
- Consulter les logs de déploiement (`/v2/deployments/:id/events`)
- Redéclencher un déploiement via push git ou CLI `vercel --prod`
- Vérifier la santé des services déployés (`curl https://alcide-api.vercel.app/health`)

**Token :** Disponible dans `settings.local.json` (permissions Bash curl).

---

## Neon — Base de données PostgreSQL

L'agent peut se connecter directement à la base de données Neon (PostgreSQL serverless).

**Connexion :**
```
Host   : ep-aged-star-ame9w1n7-pooler.c-5.us-east-1.aws.neon.tech
DB     : neondb
User   : neondb_owner
Mode   : pooler (pgBouncer), sslmode=require, channel_binding=require
```

**Capacités :**
- Lancer les migrations Drizzle (`pnpm db:migrate`)
- Exécuter les seeds (`pnpm db:seed`)
- Inspecter le schéma via Drizzle Studio (`pnpm db:studio`)
- Requêtes directes via `psql` ou scripts Node si besoin de diagnostic

**Variable d'env :** `DATABASE_URL` à injecter en préfixe sur les commandes db (voir `settings.local.json`).

---

## Résumé des responsabilités

| Service  | Utilisation principale                                    |
|----------|-----------------------------------------------------------|
| GitHub   | CI/CD, PRs, Issues, secrets, releases                     |
| Vercel   | Déploiements, variables d'env, monitoring prod/preview    |
| Neon     | Migrations, seeds, diagnostic BDD, requêtes de debug      |
