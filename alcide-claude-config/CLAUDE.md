# Alcide

## Projet

Alcide est un coach IA personnel intégré à une application web d'entraînements sportifs personnalisés. L'utilisateur sélectionne un sport, décrit ses objectifs et contraintes, puis Alcide prépare une séance ou un programme sur mesure avec le fournisseur IA configuré. Les entraînements sont stockés en base PostgreSQL. L'utilisateur peut exécuter une séance avec un timer intégré affichant titre, description et durée de chaque exercice.

Phase actuelle : MVP — génération d'entraînements personnalisés avec IA (pas encore de social ni gamification).

## Contexte académique

Ce projet sert de support à la certification RNCP 39583 « Expert en développement logiciel » (Niv. 7, YNOV). Chaque décision technique, chaque bug corrigé, chaque choix d'architecture doit pouvoir être documenté et justifié pour le dossier de certification. Pense toujours à la traçabilité.

## Stack technique

- **Frontend** : Next.js 15 (App Router, RSC), TypeScript, Tailwind CSS
- **Backend** : Hono (TypeScript), architecture en couches (Routes → Controllers → Services → Repositories)
- **BDD** : PostgreSQL + Drizzle ORM (migrations, type-safe)
- **Auth** : Auth.js (NextAuth) — OAuth
- **IA** : OpenAI API côté serveur — réponses JSON structurées, validées par Zod
- **Validation** : Zod (inputs et réponses API)
- **Tests** : Vitest (unitaires), Playwright (e2e)
- **CI/CD** : GitHub Actions (CI, CD Vercel, migrations DB manuelles)
- **Deploy** : Vercel (front + API) + Neon PostgreSQL
- **Monitoring** : UptimeRobot ou Better Stack

## Structure du projet

```
alcide/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # Composants React
│   │   ├── lib/                # Utilitaires, hooks
│   │   └── tests/
│   └── api/                    # Hono backend
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/       # orchestration métier et appels OpenAI
│       │   ├── repositories/
│       │   ├── schemas/        # Schémas Zod
│       │   ├── middleware/
│       │   └── types/
│       └── tests/
├── packages/shared/            # Types partagés front/back
├── docs/                       # Documentation RNCP
│   ├── bloc2/
│   ├── bloc4/bugs/
│   ├── adr/
│   └── sprints/
├── .github/workflows/
├── CHANGELOG.md
└── README.md
```

## Commandes

```bash
# Dev
pnpm dev              # Lance front + back
pnpm dev:web          # Next.js dev
pnpm dev:api          # Hono dev

# Tests
pnpm test             # Vitest (tous)
pnpm test:web         # Tests front
pnpm test:api         # Tests back
pnpm test:e2e         # Playwright
pnpm test:coverage    # Couverture

# Qualité
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # tsc --noEmit

# BDD
pnpm db:generate      # Drizzle generate
pnpm db:migrate       # Drizzle migrate
pnpm db:studio        # Drizzle Studio

# Build
pnpm build            # Build all
pnpm build:web        # Build Next.js
pnpm build:api        # Build Hono
```

## Conventions importantes

- Conventional Commits obligatoires : `type(scope): description`
- TypeScript strict, zéro `any`
- Chaque feature a des tests unitaires
- Chaque bug est documenté dans `docs/bloc4/bugs/`
- CHANGELOG.md mis à jour à chaque release
- ADR pour chaque décision technique importante dans `docs/adr/`

## Déploiement & CI/CD

Voir `rules/ci.md` et `docs/ci-cd.md` pour le détail complet (pipeline, rollback, debug).

### URLs de production

| App | URL |
|---|---|
| **Web** | `https://ai-sport-web.vercel.app` |
| **API** | `https://ai-sport-api.vercel.app` |

### Variables d'env critiques (Vercel)

- `NEXT_PUBLIC_API_URL` (web) doit pointer vers l'URL de production de l'API
- `SERVICE_SECRET` **doit être identique** dans les deux projets Vercel
- `OPENAI_API_KEY` est gérée côté API ; l'application ne demande jamais de clé à l'utilisateur

### Diagnostic rapide en production

```bash
# Santé de l'API
curl https://ai-sport-api.vercel.app/health

# Logs CI
gh run list --workflow=ci.yml --limit=5
gh run view <RUN_ID> --log
```

### Logs structurés

Les logs de debug suivent le préfixe `[Module]` :
- `[GeneratePage]` — erreurs server action Next.js
- `[ServerAPI]` — appels et erreurs vers l'API Hono
- `[AiService]`, `[WorkoutAiService]`, `[ProgramAiService]` — appels OpenAI
- `[WorkoutRepository]` — erreurs DB
- `[AppError]` / `[UnexpectedError]` — erreurs Hono centralisées
- `[Auth]` — tentatives d'accès non autorisées
