# CI/CD — GitHub Actions & Vercel

## Pipeline GitHub Actions (`.github/workflows/ci.yml`)

```
lint-typecheck → test-unit → build   (séquentiels, bloquants)
lint-typecheck → test-e2e            (parallèle, continue-on-error: true)
security-audit                        (indépendant, continue-on-error: true)
```

### Jobs détaillés

| Job | Dépend de | Bloquant | Ce qu'il fait |
|---|---|---|---|
| `lint-typecheck` | — | ✅ | tsc --noEmit + ESLint |
| `test-unit` | lint-typecheck | ✅ | Vitest + couverture > 70% |
| `build` | test-unit | ✅ | pnpm build (shared + api + web) |
| `test-e2e` | lint-typecheck | ❌ | Playwright (pas de DB en CI) |
| `security-audit` | — | ❌ | pnpm audit --audit-level=high |

### Déclencheurs
- `push` sur `main` ou `develop`
- `pull_request` vers `main`

---

## Inspecter CI avec `gh` CLI

```bash
# Lister les derniers runs
gh run list --workflow=ci.yml --limit=5

# Voir les détails + logs d'un run
gh run view <RUN_ID>
gh run view <RUN_ID> --log

# Voir les checks d'une PR
gh pr checks <PR_NUMBER>

# Relancer un run échoué
gh run rerun <RUN_ID>

# Voir les secrets configurés
gh secret list
```

---

## Déploiement Vercel

### Projets

| App | Project ID | URL de production |
|---|---|---|
| **Web (Next.js)** | `prj_HFyrBgWVUn5aGqYXcfoAfW51FNZC` | `https://ai-sport-web.vercel.app` |
| **API (Hono)** | `prj_xLHwTV68FV3gH9OyeqmAThhWZoxL` | `https://ai-sport-api.vercel.app` |
| **Team** | `team_oTjY1aWeytiIR4kzRyTuGugU` | — |

### Variables d'environnement requises

**Web (`prj_HFyrBgWVUn5aGqYXcfoAfW51FNZC`) :**

| Variable | Valeur attendue | Portée |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://ai-sport-api.vercel.app` | Production |
| `SERVICE_SECRET` | Même valeur que l'API | Production |
| `AUTH_SECRET` | Secret Auth.js | Production |
| `AUTH_GITHUB_ID` | OAuth App GitHub | Production |
| `AUTH_GITHUB_SECRET` | OAuth App GitHub | Production |
| `NEXTAUTH_URL` | `https://ai-sport-web.vercel.app` | Production |

**API (`prj_xLHwTV68FV3gH9OyeqmAThhWZoxL`) :**

| Variable | Valeur attendue | Portée |
|---|---|---|
| `DATABASE_URL` | URL Neon PostgreSQL (pooler) | Production |
| `MISTRAL_API_KEY` | Clé API Mistral | Production |
| `SERVICE_SECRET` | **IDENTIQUE** au web | Production |
| `FRONTEND_URL` | `https://ai-sport-web.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

⚠️ `SERVICE_SECRET` DOIT être identique dans les deux projets Vercel — c'est le secret partagé service-to-service. Tout écart provoque des erreurs 401 côté API.

### Diagnostic production

```bash
# Santé de l'API
curl https://ai-sport-api.vercel.app/health

# Lister les déploiements récents (via API Vercel)
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_xLHwTV68FV3gH9OyeqmAThhWZoxL&limit=5"

# Lire les logs d'un déploiement
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v2/deployments/<DEPLOYMENT_ID>/events"
```

### Déployer manuellement

```bash
# Déployer en production (depuis la branche main)
vercel --prod

# Ou via un push git → le déploiement est déclenché automatiquement par Vercel
git push origin main
```

### Rollback

```bash
# Rollback via CLI Vercel
vercel rollback <DEPLOYMENT_URL>

# Ou via l'interface Vercel : Deployments → sélectionner l'ancien deploy → Promote to Production
```

---

## Debug d'une erreur 500 en production

1. **Vérifier les logs Next.js (web)** : Vercel Dashboard → web → Functions → `/generate`
   - Chercher `[GeneratePage]`, `[ServerAPI]` dans les logs
2. **Vérifier les logs Hono (api)** : Vercel Dashboard → api → Functions → `/workouts/generate`
   - Chercher `[AppError]`, `[UnexpectedError]`, `[MistralService]`, `[WorkoutRepository]`
3. **Vérifier les env vars** : Les deux `SERVICE_SECRET` doivent correspondre
4. **Vérifier Mistral** : `MISTRAL_API_KEY` valide et quota non épuisé
5. **Vérifier Neon DB** : `DATABASE_URL` valide, pool disponible

---

## Scopes Conventional Commits pour CI/CD

- `ci` : changements dans `.github/workflows/`
- `chore` : mise à jour de dépendances, configuration build
- Exemples : `ci(github): add deploy step after build`, `chore(deps): bump next to 14.3`
