# Alcide

Alcide est un coach IA personnel qui prépare des entraînements sportifs personnalisés.

L'utilisateur sélectionne un sport, décrit ses objectifs et contraintes, puis Alcide construit une séance ou un programme sur mesure. **OpenAI API** est le fournisseur par défaut côté serveur : l'utilisateur ne fournit plus de clé API personnelle. Les entraînements sont stockés en PostgreSQL et peuvent être exécutés avec un timer intégré.

> Projet support à la certification RNCP 39583 — Expert en développement logiciel (Niv. 7, YNOV).

---

## Stack technique

| Couche           | Technologie                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router), TypeScript, Tailwind CSS                                                   |
| Backend          | Hono (TypeScript), architecture en couches                                                          |
| Base de données  | PostgreSQL 16 + Drizzle ORM                                                                         |
| Authentification | Auth.js (NextAuth v5) — OAuth Google                                                                |
| IA               | OpenAI API côté serveur, modèle configurable, estimation de coût affichée, sorties validées par Zod |
| Tests            | Vitest (unitaires), Playwright (E2E), axe-core (WCAG)                                               |
| CI/CD            | GitHub Actions — CI, CD Vercel, migrations DB manuelles                                             |
| Deploy           | Vercel (frontend + API) + Neon PostgreSQL                                                           |

Runtime de référence : **Node.js 24 LTS** et **pnpm 11.9.0**.

---

## Démarrage rapide

### Option A — Docker Compose (stack complète)

```bash
cp .env.example .env
# Remplacer toutes les valeurs de démonstration dans .env avant de continuer.
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up --build -d
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
alcide/
├── apps/
│   ├── web/                    # Next.js 15 — frontend
│   │   ├── app/                # App Router (pages, layouts, loading)
│   │   ├── components/         # Composants réutilisables
│   │   ├── lib/                # server-api.ts, auth.ts
│   │   └── tests/e2e/          # Playwright + axe-core
│   └── api/                    # Hono — backend
│       ├── src/
│       │   ├── controllers/    # Handlers HTTP
│       │   ├── services/       # Logique métier + providers IA
│       │   ├── repositories/   # Accès base de données
│       │   ├── middleware/      # Auth, rate-limit, error
│       │   └── db/             # Schéma Drizzle + seed
│       └── tests/              # Vitest — tests unitaires
├── packages/
│   └── shared/                 # Types & schémas Zod partagés
├── docs/
│   ├── adr/                    # Architecture Decision Records (×8)
│   ├── bloc2/                  # Cahier de recettes et preuves d'exécution
│   ├── bloc4/                  # Veille techno, CRA, rapports de bugs
│   ├── security/               # Revue OWASP Top 10
│   ├── sprints/                # Revues sprint 01 à 12
│   ├── deployment.md           # Guide déploiement (cloud, Docker, local)
│   └── dossier-professionnel.md
├── .github/workflows/ci.yml    # Pipeline CI à 6 jobs
├── docker-compose.yml          # Stack complète
└── .env.example                # Template variables d'environnement
```

---

## CI/CD

Pipeline GitHub Actions sur chaque push vers main et pull request :

```
lint-typecheck → tests + couverture API/Web → build → docker-build
              ↘ test-e2e-smoke (Playwright + axe-core)
              ↘ security-audit low/moderate/high/critical (bloquant)
CI verte sur main → CD Vercel API → CD Vercel Web → smoke tests prod
```

---

## Conformité RNCP

| Critère                    | Statut                                                                    | Preuve                                       |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Sécurité OWASP Top 10      | Revue et écarts résiduels documentés                                      | docs/security/owasp-review.md                |
| Accessibilité              | WCAG 2.1 AA retenu ; automatisation et contrôles manuels à joindre        | tests/e2e/accessibility.spec.ts              |
| Tests automatisés          | Résultat à dater après chaque version candidate                           | `pnpm test`                                  |
| Couverture                 | Rapports API et Web distincts, sans assimiler le seuil CI au critère RNCP | `pnpm test:coverage`                         |
| Documentation ADRs         | 8 décisions, dont ADR-003 remplacée par ADR-008                           | docs/adr/                                    |
| Cahier de recettes         | Inventaire complet avec statuts exécuté/automatisé/à exécuter             | docs/bloc2/cahier-recettes.md                |
| Déploiement conteneurisé   | ✅ Dockerfiles multi-stage                                                | apps/\*/Dockerfile                           |
| Dossier professionnel RNCP | ✅                                                                        | docs/rncp/dossier-professionnel-rncp39583.md |

---

## Déploiement production

Voir [docs/deployment.md](docs/deployment.md) pour le guide complet.

Architecture cible : **Vercel** (Next.js + Hono API) + **Neon PostgreSQL**.

Voir aussi [docs/ci-cd.md](docs/ci-cd.md) pour les workflows et secrets GitHub.
