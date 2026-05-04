# SportCoach IA

Application web de génération d'entraînements sportifs personnalisés par intelligence artificielle.

L'utilisateur sélectionne un sport, décrit ses objectifs et contraintes, et reçoit un programme sur mesure généré par **Mistral AI**. Les entraînements sont stockés en PostgreSQL et peuvent être exécutés avec un timer intégré.

> Projet support à la certification RNCP 39583 — Expert en développement logiciel (Niv. 7, YNOV).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Hono (TypeScript), architecture en couches |
| Base de données | PostgreSQL 16 + Drizzle ORM |
| Authentification | Auth.js (NextAuth v5) — OAuth GitHub |
| IA | Mistral AI — JSON mode validé par Zod |
| Tests | Vitest (unitaires), Playwright (E2E), axe-core (WCAG) |
| CI/CD | GitHub Actions — CI, CD Vercel, migrations DB manuelles |
| Deploy | Vercel (frontend + API) + Neon PostgreSQL |

---

## Démarrage rapide

### Option A — Docker Compose (stack complète)

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
```

Frontend : http://localhost:3000 | API : http://localhost:3001

### Option B — Développement local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up postgres -d
pnpm db:migrate
pnpm dev
```

---

## Commandes

```bash
pnpm dev              # Lance frontend + backend en parallèle
pnpm test             # Tests Vitest (unitaires)
pnpm test:e2e         # Tests Playwright (E2E + axe-core)
pnpm test:coverage    # Vitest avec rapport de couverture
pnpm lint             # ESLint
pnpm typecheck        # TypeScript strict
pnpm build            # Build production
pnpm db:migrate       # Appliquer les migrations Drizzle
pnpm db:seed          # Charger les données de démonstration
pnpm db:studio        # Interface Drizzle Studio
```

---

## Structure du projet

```
aiSport/
├── apps/
│   ├── web/                    # Next.js 14 — frontend
│   │   ├── app/                # App Router (pages, layouts, loading)
│   │   ├── components/         # Composants réutilisables
│   │   ├── lib/                # server-api.ts, auth.ts
│   │   └── tests/e2e/          # Playwright + axe-core
│   └── api/                    # Hono — backend
│       ├── src/
│       │   ├── controllers/    # Handlers HTTP
│       │   ├── services/       # Logique métier + Mistral
│       │   ├── repositories/   # Accès base de données
│       │   ├── middleware/      # Auth, rate-limit, error
│       │   └── db/             # Schéma Drizzle + seed
│       └── tests/              # Vitest — tests unitaires
├── packages/
│   └── shared/                 # Types & schémas Zod partagés
├── docs/
│   ├── adr/                    # Architecture Decision Records (×6)
│   ├── bloc2/                  # Cahier de recettes (39 scénarios)
│   ├── bloc4/                  # Veille techno, CRA, rapports de bugs
│   ├── security/               # Revue OWASP Top 10
│   ├── sprints/                # Revues sprint 01 à 08
│   ├── deployment.md           # Guide déploiement (cloud, Docker, local)
│   └── dossier-professionnel.md
├── .github/workflows/ci.yml    # Pipeline CI/CD 5 jobs
├── docker-compose.yml          # Stack complète
└── .env.example                # Template variables d'environnement
```

---

## CI/CD

Pipeline GitHub Actions sur chaque push vers main et pull request :

```
lint-typecheck → test-unit (coverage ≥ 70%) → build → docker-build
              ↘ test-e2e-smoke (Playwright + axe-core)
              ↘ security-audit (pnpm audit, non bloquant)
CI verte sur main → CD Vercel API → CD Vercel Web → smoke tests prod
```

---

## Conformité RNCP

| Critère | Statut | Preuve |
|---|---|---|
| Sécurité OWASP Top 10 | ✅ A01–A10 couverts | docs/security/owasp-review.md |
| Accessibilité RGAA 4.1 | ✅ + axe-core WCAG 2.1 | tests/e2e/accessibility.spec.ts |
| Tests automatisés ≥ 70% | ✅ 94.69% statements | Vitest coverage |
| Documentation ADRs | ✅ 7 décisions | docs/adr/ |
| Cahier de recettes | ✅ 39 scénarios | docs/bloc2/cahier-recettes.md |
| Déploiement conteneurisé | ✅ Dockerfiles multi-stage | apps/*/Dockerfile |
| Dossier professionnel | ✅ | docs/dossier-professionnel.md |

---

## Déploiement production

Voir [docs/deployment.md](docs/deployment.md) pour le guide complet.

Architecture cible : **Vercel** (Next.js + Hono API) + **Neon PostgreSQL**.

Voir aussi [docs/ci-cd.md](docs/ci-cd.md) pour les workflows et secrets GitHub.
