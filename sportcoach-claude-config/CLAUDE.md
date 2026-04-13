# SportCoach IA

## Projet

SportCoach IA est une application web de génération d'entraînements sportifs personnalisés par intelligence artificielle. L'utilisateur sélectionne un sport, décrit ses objectifs et contraintes, et reçoit un programme sur mesure (séance, semaine, mois) généré par Mistral AI. Les entraînements sont stockés en base PostgreSQL. L'utilisateur peut exécuter une séance avec un timer intégré affichant titre, description et durée de chaque exercice.

Phase actuelle : MVP — génération d'entraînements personnalisés avec IA (pas encore de social ni gamification).

## Contexte académique

Ce projet sert de support à la certification RNCP 39583 « Expert en développement logiciel » (Niv. 7, YNOV). Chaque décision technique, chaque bug corrigé, chaque choix d'architecture doit pouvoir être documenté et justifié pour le dossier de certification. Pense toujours à la traçabilité.

## Stack technique

- **Frontend** : Next.js 14+ (App Router, RSC), TypeScript, Tailwind CSS
- **Backend** : Hono (TypeScript), architecture en couches (Routes → Controllers → Services → Repositories)
- **BDD** : PostgreSQL + Drizzle ORM (migrations, type-safe)
- **Auth** : Auth.js (NextAuth) — OAuth
- **IA** : Mistral API (clé gratuite) — réponses JSON normées, validées par Zod
- **Validation** : Zod (inputs et réponses API)
- **Tests** : Vitest (unitaires), Playwright (e2e)
- **CI/CD** : GitHub Actions (lint → tests → build → deploy)
- **Deploy** : Vercel (front) + Railway/VPS Docker (back + PostgreSQL)
- **Monitoring** : UptimeRobot ou Better Stack

## Structure du projet

```
sportcoach-ia/
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
│       │   ├── services/       # dont MistralService
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
