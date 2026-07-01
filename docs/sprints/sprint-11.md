# Sprint 11 — Finalisation RNCP : docs à jour, tests manquants, IaC Fly.io

> Période : 2026-04-13 | Version : 0.11.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Tests unitaires `validateEnv()` — couvrir le fail-fast OWASP A05 | ✅ |
| 2 | Docs RNCP à jour — dossier professionnel, CRA, OWASP, cahier recettes | ✅ |
| 3 | IaC Fly.io — `fly.toml` + `vercel.json` pour déploiement cloud gratuit | ✅ |
| 4 | ADR-006 + deployment.md — remplacer Railway par Fly.io + Neon | ✅ |
| 5 | CHANGELOG v0.11.0 + sprint review | ✅ |

---

## Réalisations

### Tests `validateEnv()` (4 tests)

**Fichier** (`apps/api/tests/validate-env.test.ts`) :

Stratégie : `vi.spyOn(process, 'exit').mockImplementation(...)` pour intercepter l'exit sans tuer le runner Vitest + `vi.resetModules()` pour re-importer le module proprement entre chaque test.

| Test | Assertion |
|---|---|
| Toutes vars présentes | `process.exit` NOT called |
| `SERVICE_SECRET` absent | `process.exit(1)` called |
| `MISTRAL_API_KEY` absente | `process.exit(1)` called |
| `DATABASE_URL` absente | `process.exit(1)` called |

### Documentation RNCP

**`docs/dossier-professionnel.md`** :
- Version projet : 0.6.0 → 0.10.0
- Sprint 09 + 10 ajoutés à la table chronologique
- Référence Railway → Fly.io + Neon dans la stack et les ADRs
- Axes d'amélioration mis à jour (axe-core déjà implémenté, retiré)
- Scénarios cahier de recettes : 39 → 42

**`docs/bloc4/compte-rendu-activite.md`** :
- "7 sprints" → "10 sprints" dans le contexte et les métriques
- Sprints 08, 09, 10 ajoutés à la chronologie
- Tests : 28 unitaires + 27 E2E → 32 unitaires + 29 E2E
- Sprints documentés : 7 → 10

**`docs/security/owasp-review.md`** :
- Section A05 enrichie avec `validateEnv.ts` — Fail-Safe Defaults
- Résumé mis à jour : A05 couvre désormais `secureHeaders()`, CORS et `validateEnv()`

**`docs/bloc2/cahier-recettes.md`** :
- CR-040 : GET /health API → 200 JSON
- CR-041 : GET /api/health Next.js → 200 JSON
- CR-042 : démarrage sans SERVICE_SECRET → exit immédiat
- Table des tests : ValidateEnv (4 tests), axe.spec.ts (2 E2E) ajoutés
- Total tests : 32 unitaires + 29 E2E

### IaC Déploiement (Fly.io + Neon + Vercel)

**`apps/api/fly.toml`** :
- App : `alcide-api`, région `cdg` (Paris)
- VM : `shared-cpu-1x` 256 MB — free tier Fly.io
- Healthcheck : `GET /health` port 3001, intervalle 30s
- `auto_stop_machines = false` — service toujours actif

**`vercel.json`** :
- `rootDirectory: "apps/web"` — déploiement monorepo
- `buildCommand` : build shared + web

**ADR-006 révisé** :
- Railway remplacé par Fly.io + Neon (Railway payant depuis 2024)
- Diagramme d'architecture mis à jour
- Variables d'environnement de production mises à jour

**`docs/deployment.md`** :
- Option A réécrite : Fly.io + Neon step-by-step
- `fly launch`, `fly secrets set`, `fly deploy`
- Instructions migration Neon (`pnpm db:migrate` avec DATABASE_URL Neon)
- Checklist post-déploiement étendue (2 healthchecks)

---

## Métriques v0.11.0

| Métrique | Valeur |
|---|---|
| Tests unitaires | 32 |
| Tests E2E | 29 |
| Coverage statements | ≥ 94.69% |
| Sprints documentés | 11 |
| Scénarios cahier de recettes | 42 |
| OWASP risques couverts | 10/10 |

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Tests validateEnv() | Bloc 3 (OWASP A05) | `apps/api/tests/validate-env.test.ts` |
| Dossier professionnel v0.10.0 | Bloc 4 | `docs/dossier-professionnel.md` |
| CRA — 10 sprints | Bloc 4 (C4.3.1) | `docs/bloc4/compte-rendu-activite.md` |
| Cahier de recettes 42 scénarios | Bloc 2 (C2.3.1) | `docs/bloc2/cahier-recettes.md` |
| IaC Fly.io | Bloc 4 (déploiement) | `apps/api/fly.toml` |
| Config Vercel monorepo | Bloc 4 (déploiement) | `vercel.json` |

---

## Actions utilisateur requises (déploiement live)

1. **Neon** → neon.tech → Créer projet `alcide` → Copier DATABASE_URL
2. **Fly.io** → fly.io → `fly auth login` → `cd apps/api && fly launch`
3. **Fly.io secrets** → `fly secrets set DATABASE_URL=... MISTRAL_API_KEY=... SERVICE_SECRET=... FRONTEND_URL=...`
4. **Migration** → `export DATABASE_URL=<neon_url> && pnpm db:migrate`
5. **Vercel** → vercel.com/new → Connecter repo GitHub → Configurer env vars
6. **GitHub OAuth** → Mettre à jour callback URL avec l'URL Vercel réelle
