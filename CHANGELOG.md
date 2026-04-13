# Changelog

Toutes les modifications notables de SportCoach IA sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
version sémantique selon [SemVer](https://semver.org/lang/fr/).

> Ce fichier est un livrable **ÉLIMINATOIRE** du Bloc 4 RNCP (C4.3.2).

---

## [Unreleased]

### Added
- Bootstrap du monorepo pnpm (apps/web, apps/api, packages/shared)
- Structure Next.js 14 App Router avec Tailwind CSS
- Backend Hono avec architecture en couches (Routes → Controllers → Services → Repositories)
- Intégration Mistral AI avec validation Zod (contrat JSON strict)
- Schéma PostgreSQL avec Drizzle ORM
- Middleware Auth.js pour l'authentification OAuth
- Pipeline CI/CD GitHub Actions (lint → typecheck → test → build)
- Documentation RNCP initiale (ADRs, cahier de recettes, sprint-01)

---

<!-- Les versions futures seront ajoutées ici par le skill /changelog -->
