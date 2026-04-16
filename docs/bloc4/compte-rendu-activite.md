# Compte Rendu d'Activité — SportCoach IA

> Bloc 4 RNCP 39583 — C4.3.1 Gérer son activité professionnelle
> Candidat : Kevin | Période : 2026-03-01 → 2026-04-13

---

## Contexte de l'activité

Dans le cadre de la certification RNCP 39583 Expert en développement logiciel, j'ai conçu et développé **SportCoach IA**, une application web de génération d'entraînements sportifs personnalisés par intelligence artificielle. Le projet a été conduit en autonomie complète sur 10 sprints de développement itératif.

---

## Chronologie et charge de travail

| Période | Sprint | Activités principales | Livrables |
|---|---|---|---|
| S01 2026 | Sprint 01 | Bootstrap monorepo pnpm, architecture initiale, CI/CD GitHub Actions | Monorepo fonctionnel, 8 tests, pipeline CI vert |
| S01-S02 2026 | Sprint 02 | Intégration frontend-backend, auth service-to-service, Server Actions | MVP fonctionnel end-to-end, ADR-004 |
| S02 2026 | Sprint 03 | UI suppression, error pages, montée couverture 54%→96% | 23 tests unitaires, ADR-004, BUG-001 |
| S02 2026 | Sprint 04 | Tests E2E Playwright, revue OWASP, ADR-005 | 27 tests E2E, owasp-review.md |
| S02 2026 | Sprint 05 | Rate limiting, loading states, docs Bloc 4 | Middleware 429, skeletons RGAA, veille techno |
| S02 2026 | Sprint 06 | Dockerisation, docker-compose full-stack, guide déploiement | Dockerfiles, ADR-006, deployment.md |
| S02 2026 | Sprint 07 | Dossier professionnel, CRA, mise à jour cahier de recettes | dossier-professionnel.md, CRA |
| S02 2026 | Sprint 08 | Tests WCAG automatisés axe-core, seed démo, fix README UTF-8 | axe.spec.ts, db:seed, BUG-002 |
| S02 2026 | Sprint 09 | Correction encodage UTF-16→UTF-8, .gitattributes, rapport bug | README.md UTF-8, .gitattributes |
| S02 2026 | Sprint 10 | Route healthcheck Next.js, validateEnv() fail-fast OWASP A05 | /api/health, validate-env.ts |
| S02 2026 | Sprint 11 | Tests validateEnv(), déploiement Vercel + Neon, IaC, docs RNCP | validate-env.test.ts, fly.toml, vercel.json |
| S02 2026 | Sprint 12 | Pagination/filtres workouts, dashboard stats, migration BDD live | dashboard/page.tsx, /workouts/stats, Neon migré |

---

## Méthodologie de travail

### Approche itérative

Le développement a suivi une approche sprint-based inspirée de Scrum :
- **Planification** : définition des objectifs et livrables en début de sprint
- **Développement** : implémentation avec commits atomiques et conventionnels
- **Revue** : `sprint-XX.md` récapitulatif, mise à jour CHANGELOG
- **CI/CD** : chaque push déclenche le pipeline de validation automatique

### Gestion de la qualité

- **Revue de code en continu** : ESLint + TypeScript strict bloquent les erreurs à chaque commit
- **Tests d'abord** : les tests unitaires ont été écrits en parallèle ou avant le code de production quand possible
- **Documentation des décisions** : tout choix architectural non évident est justifié dans un ADR
- **Traçabilité des bugs** : BUG-001 documente un bug réel de CI avec cause racine et correction

### Outils utilisés

| Outil | Usage |
|---|---|
| VS Code + Claude Code CLI | Développement et assistance IA |
| GitHub | Versioning, CI/CD, gestion de projet |
| Docker Desktop | Stack locale PostgreSQL + API + Web |
| Postman / curl | Test manuel des endpoints Hono |
| Chrome DevTools | Debug React, vérification headers OWASP |
| Drizzle Studio | Inspection de la base de données |

---

## Compétences développées

### Techniques

| Compétence | Niveau avant | Niveau après | Preuve |
|---|---|---|---|
| Next.js App Router / Server Actions | Intermédiaire | Avancé | `generate/page.tsx`, `workouts/page.tsx` |
| Architecture monorepo TypeScript | Débutant | Intermédiaire | `pnpm-workspace.yaml`, `tsconfig.base.json` |
| Sécurité OWASP Top 10 | Notions | Intermédiaire | `owasp-review.md`, ADR-004 |
| Tests automatisés (Vitest + Playwright) | Débutant | Intermédiaire | 41 tests unitaires + 29 E2E |
| Conteneurisation Docker | Notions | Intermédiaire | Dockerfiles multi-stage, docker-compose |
| Accessibilité RGAA 4.1 | Notions | Intermédiaire | Tests automatisés, aria-*, skip links |
| Intégration LLM (Mistral AI) | Découverte | Intermédiaire | JSON mode, validation Zod, retry/backoff |

### Transversales

- **Autonomie** : projet conduit seul de la conception au déploiement
- **Documentation** : 6 ADRs, 12 sprints, cahier de recettes 44 scénarios, veille technologique
- **Rigueur** : 0 erreur TypeScript, 0 erreur ESLint, >90% coverage en CI
- **Adaptabilité** : bugs CI résolus (coverage, secrets GitHub, ESLint), solutions documentées

---

## Difficultés et apprentissages

### Difficulté 1 — Configuration des secrets GitHub CI

**Problème** : les Personal Access Tokens fine-grained générés ne disposaient pas des droits suffisants pour écrire les secrets GitHub via l'API.

**Solution** : migration vers un classic PAT avec scope `repo`, utilisation de `GH_TOKEN` env var (alternative à `gh auth login` qui nécessite `read:org`).

**Apprentissage** : bien lire la documentation des permissions API GitHub avant de générer un token. La granularité fine-grained n'inclut pas les secrets par défaut.

### Difficulté 2 — Architecture service-to-service sans exposition client

**Problème** : comment appeler l'API Hono depuis Next.js en transmettant l'identité utilisateur sans exposer le token de session ou la clé secrète au navigateur ?

**Solution** : Server Actions + module `server-only` + headers `x-internal-secret` + `x-user-id`. Le secret ne quitte jamais le serveur (documenté ADR-004).

**Apprentissage** : comprendre la frontière client/serveur dans Next.js App Router est fondamental — `'use server'` ne signifie pas "code privé" si le résultat est exposé en props.

### Difficulté 3 — Coverage CI bloquant à 54%

**Problème** : le pipeline CI échouait sur le seuil de 70% de coverage car les fichiers `repositories/` et `routes/` (dépendants d'une vraie DB) étaient inclus dans le calcul.

**Solution** : exclusion des fichiers infrastructure dans `vitest.config.ts` + 18 nouveaux tests sur les couches testables unitairement (services, middlewares, error handler).

**Apprentissage** : configurer correctement les exclusions de coverage dès le bootstrap pour éviter la dette de tests.

---

## Résultats et impact

### Livrables finaux

| Catégorie | Quantité |
|---|---|
| Fichiers de code source | ~60 fichiers TypeScript/TSX |
| Tests automatisés | 61 tests (32 unitaires + 29 E2E) |
| ADRs | 6 décisions documentées |
| Sprints documentés | 10 revues |
| Scénarios cahier de recettes | 42 |
| Environnements déployables | 3 (Vercel+Fly.io+Neon, Docker, local) |

### Métriques qualité

| Métrique | Valeur |
|---|---|
| Coverage statements | 94.69% |
| Coverage functions | 100% |
| Vulnérabilités `high` | 0 |
| Erreurs TypeScript | 0 |
| Erreurs ESLint | 0 |
| OWASP risques couverts | 10/10 |
| RGAA critères automatisés | 6 |

---

## Perspectives

À l'issue de ce projet, les axes d'amélioration identifiés pour une version v2 :

1. **Tests d'intégration DB** (Testcontainers) — tester les repositories sans mock
2. **Monitoring production** (Pino + Datadog) — remplacer les `console.log` en production
3. **Pagination** — la liste des workouts n'est pas paginée côté serveur
4. **Redis rate limiting** — persistence cross-instances pour le rate limiter
5. **Export PDF** — permettre l'impression d'un workout
6. **Progressive Web App** — mode offline avec Service Worker pour le Timer
