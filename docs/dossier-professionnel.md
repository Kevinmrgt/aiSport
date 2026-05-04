# Dossier Professionnel — SportCoach IA

> Certification RNCP 39583 — Expert en développement logiciel (Niv. 7, YNOV)
> Candidat : Kevin | Date : 2026-04-13 | Version du projet : 0.10.0

---

## 1. Présentation du projet

### Contexte et problématique

**SportCoach IA** est une application web full-stack permettant à des sportifs de générer des programmes d'entraînement personnalisés par intelligence artificielle. L'utilisateur sélectionne son sport, son niveau, ses objectifs et ses contraintes, puis reçoit un plan complet (exercices, séries, récupérations) généré par **Mistral AI** et stocké en base de données pour consultation ultérieure avec un timer intégré.

### Choix du projet support

Ce projet a été choisi comme support RNCP pour deux raisons :

1. **Couverture des 4 blocs** : le développement full-stack mobilise simultanément la conception d'interfaces (Bloc 1), la persistance sécurisée des données (Bloc 2), l'intégration de services IA avec contrôles de sécurité (Bloc 3), et le déploiement en infrastructure cloud avec CI/CD (Bloc 4).

2. **Complexité technique réelle** : intégration d'une API LLM avec validation stricte des sorties, pattern service-to-service sécurisé, architecture monorepo multi-packages — des problèmes concrets qui ont nécessité des décisions architecturales documentées.

### Stack technique

| Couche | Technologie | Version | Justification |
|---|---|---|---|
| Frontend | Next.js App Router | 14 | Server Components + Server Actions — zéro secret côté client |
| Backend | Hono | 4.x | Ultra-léger, TypeScript natif, compatible Edge |
| Base de données | PostgreSQL + Drizzle ORM | 16 / 0.38 | Requêtes paramétrées, schéma typé, migrations versionnées |
| Authentification | Auth.js (NextAuth v5) | 5.x | OAuth Google, JWT HTTP-only, zéro gestion de mots de passe |
| IA | Mistral AI | API v1 | JSON mode natif, coût maîtrisé, hébergement EU disponible |
| Tests unitaires | Vitest | 3.x | Compatible ESM natif, coverage v8 intégré |
| Tests E2E | Playwright | 1.x | Multi-navigateurs, trace viewer, webServer auto-start |
| CI/CD | GitHub Actions | — | 5 jobs : lint, test, build, audit sécurité, E2E |
| Conteneurisation | Docker (multi-stage) | — | Images < 200MB, utilisateurs non-root |
| Déploiement | Vercel + Fly.io + Neon | — | CD automatique, PostgreSQL serverless (Neon), HTTPS auto |

---

## 2. Bloc 1 — Conception et développement de composants d'interface utilisateur

### Compétences mobilisées

**C1.1 — Maquetter une application**

L'interface a été conçue autour de 5 routes principales avec une hiérarchie claire :
- `/` — Page d'accueil publique (hero, CTA, pitch)
- `/login` — Connexion OAuth (bouton Google unique)
- `/generate` — Formulaire de génération multi-champs
- `/workouts` — Liste des séances en grille responsive
- `/workouts/[id]` — Détail avec timer interactif

**C1.2 — Développer une interface utilisateur accessible (RGAA 4.1)**

Implémentation systématique des critères RGAA 4.1 :

| Critère | Implémentation | Fichier |
|---|---|---|
| Skip link | `<a href="#main-content">` avec styles visibles au focus | `layout.tsx` |
| Langue | `<html lang="fr">` | `layout.tsx` |
| Structure sémantique | `<header>`, `<main id="main-content">`, `<footer>` | `layout.tsx` |
| Labels formulaire | `<label for="id">` pour chaque `<input>` | `WorkoutForm.tsx` |
| ARIA live | `aria-live="polite"` sur les zones d'erreur | `WorkoutForm.tsx` |
| Dialog modal | `role="alertdialog"`, `aria-modal`, `aria-labelledby` | `DeleteWorkoutButton.tsx` |
| Navigation clavier | `focus:ring-2` sur tous les éléments interactifs | Tailwind global |
| États de chargement | `aria-busy="true"` + message `sr-only` | `loading.tsx` × 3 |

**Tests RGAA automatisés** : 10 tests Playwright dans `accessibility.spec.ts` + 4 tests dans `generate.spec.ts` vérifient ces critères sur les pages publiques et authentifiées.

**C1.3 — Développer des composants d'interface réutilisables**

Composants Next.js créés :

| Composant | Rôle | Pattern |
|---|---|---|
| `WorkoutForm` | Formulaire génération avec validation Zod côté client | Client Component + react-hook-form |
| `WorkoutCard` | Carte de liste avec badge de difficulté coloré | Server Component + aria-label |
| `DeleteWorkoutButton` | Dialog de confirmation accessible | Client Component + useRef focus trap |
| `Timer` | Timer interactif avec phases exercice/repos/récupération | Client Component + useEffect |
| `loading.tsx` × 3 | Skeletons animés pendant le fetch serveur | Next.js Suspense automatique |

### Réalisations concrètes

- **WorkoutForm** — validation Zod côté client (schéma partagé `GenerateWorkoutInputSchema`) avant soumission, messages d'erreur inline avec `aria-live`
- **Timer** — gestion d'état complexe (phase courante, index exercice, compteur), announce ARIA à chaque changement de phase
- **Loading states** — trois `loading.tsx` colocalisés activent automatiquement Suspense sans configuration supplémentaire

---

## 3. Bloc 2 — Conception et développement de la persistance des données

### Compétences mobilisées

**C2.1 — Concevoir une base de données**

Schéma PostgreSQL défini avec Drizzle ORM (`apps/api/src/db/schema.ts`) :

```
workouts
├── id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── userId      TEXT NOT NULL            — isolation propriétaire
├── title       TEXT NOT NULL
├── sport       TEXT NOT NULL
├── difficulty  TEXT NOT NULL
├── duration    INTEGER NOT NULL         — en minutes
├── exercises   JSONB NOT NULL           — structure Mistral sérialisée
├── createdAt   TIMESTAMP DEFAULT now()
└── updatedAt   TIMESTAMP DEFAULT now()
```

Décisions de conception :
- `userId` TEXT (non FK) — l'utilisateur vit dans Auth.js, pas en DB locale (pas de join cross-service)
- `exercises` JSONB — flexibilité du contrat Mistral sans migration à chaque évolution du prompt
- `gen_random_uuid()` — ID non prédictible (OWASP A01 — pas d'IDOR par enumération)

**C2.2 — Développer des composants d'accès aux données**

Architecture Repository Pattern (`apps/api/src/repositories/workout.repository.ts`) :

```typescript
// Toutes les requêtes incluent userId — OWASP A01 ownership
findWorkoutById(id: string, userId: string): Promise<WorkoutDetail | null>
deleteWorkout(id: string, userId: string): Promise<void>
findWorkoutsByUser(userId: string): Promise<WorkoutListItem[]>
saveWorkout(data: InsertWorkout): Promise<WorkoutDetail>
```

**Zéro SQL brut** — Drizzle ORM génère des requêtes paramétrées (OWASP A03 — Injection).

**C2.3 — Vérifier et valider la qualité des données**

Validation à double niveau :

| Niveau | Outil | Moment |
|---|---|---|
| Client | Zod + react-hook-form | Avant soumission formulaire |
| Serveur | Zod (`GenerateWorkoutInputSchema`) | Controller avant traitement |
| IA | Zod (`WorkoutDetailSchema`) | Après réponse Mistral |

**Cahier de recettes** : 39 scénarios documentés (`docs/bloc2/cahier-recettes.md`), dont 5 dédiés à la sécurité des données, couvrant injection SQL, XSS, ownership et isolation des données.

---

## 4. Bloc 3 — Intégration de la sécurité

### Compétences mobilisées

**C3.1 — Analyser les risques selon l'OWASP Top 10**

Revue complète documentée dans `docs/security/owasp-review.md` :

| Risque | Contrôle principal | Test |
|---|---|---|
| A01 — Broken Access Control | `authMiddleware` + ownership repository | `auth.middleware.test.ts` (6 tests) |
| A02 — Cryptographic Failures | Secrets en env, HTTPS, cookie HTTP-only | Revue de code |
| A03 — Injection | Drizzle ORM paramétré + Zod strict | CR-030 cahier de recettes |
| A04 — Insecure Design | Rate limiting 5 req/min + validation toutes frontières | `rate-limit.middleware.test.ts` (5 tests) |
| A05 — Security Misconfiguration | `secureHeaders()` Hono, CORS restrictif, CSP Next.js | Headers vérifiés en déploiement |
| A06 — Vulnerable Components | `pnpm audit` en CI, lockfile `--frozen` | Job `security-audit` GitHub Actions |
| A07 — Auth Failures | Auth.js OAuth, JWT 30j, HTTP-only cookie | E2E `auth.spec.ts` |
| A08 — Integrity Failures | `--frozen-lockfile` CI, versions GH Actions fixées | CI workflow |
| A09 — Logging | Logs structurés sur auth invalide, rate limit, AppError, error boundary | Tous les middlewares |
| A10 — SSRF | URL Mistral fixe, AbortController 30s | `mistral.service.ts` |

**C3.2 — Implémenter les contrôles de sécurité**

Pattern service-to-service documenté dans ADR-004 :
```
Next.js (Server Action) → [x-internal-secret + x-user-id] → Hono API
```

Le secret ne transite jamais côté client (`server-only` package bloque l'import en bundle client).

**Rate limiting** (Sprint 05) — middleware Hono sur `POST /generate` :
- Fenêtre glissante 60s, 5 requêtes max par `userId`
- Réponse 429 avec `Retry-After`
- Nettoyage périodique du store (anti-fuite mémoire)

**C3.3 — Tester la sécurité**

- 6 tests unitaires `authMiddleware` — tous les cas d'échec et de succès
- 5 tests unitaires `rateLimitMiddleware` — quota, isolation, headers
- Scénarios CR-030 à CR-036 dans le cahier de recettes
- E2E `auth.spec.ts` — vérification en conditions réelles (redirect sans session)

---

## 5. Bloc 4 — Déploiement et qualité logicielle

### Compétences mobilisées

**C4.1 — Mettre en place une chaîne CI/CD**

Pipeline GitHub Actions en 5 jobs (`/.github/workflows/ci.yml`) :

```
push → main
  ├── lint-typecheck   ESLint + tsc --noEmit
  ├── test-unit        Vitest + coverage ≥ 70% (bloquant)
  │     └── build      pnpm build (artefacts Next.js + Hono)
  ├── security-audit   pnpm audit --audit-level=high
  └── test-e2e         Playwright (continue-on-error)
```

**C4.2 — Conteneuriser et déployer une application**

Dockerfiles multi-stage (Sprint 06) :

- **API** (`apps/api/Dockerfile`) : `builder` (pnpm + tsc) → `runner` (prod deps + dist, user non-root `hono:1001`)
- **Web** (`apps/web/Dockerfile`) : `deps` → `builder` (next build standalone) → `runner` (artefacts seuls, user `nextjs:1001`)
- **docker-compose.yml** : orchestration postgres → api (healthcheck) → web (depends_on healthy)

Architecture de déploiement cible (ADR-006) :
```
GitHub → Vercel (Next.js, Edge Network) ←→ Railway (Hono + PostgreSQL managé)
```

**C4.3 — Assurer la qualité logicielle**

Métriques de qualité atteintes :

| Métrique | Cible RNCP | Atteint |
|---|---|---|
| Coverage statements | ≥ 70% | **94.69%** |
| Coverage functions | ≥ 70% | **100%** |
| Tests unitaires | — | **28 tests** |
| Tests E2E | — | **29 tests (Playwright + axe-core, Chromium + Firefox)** |
| Zéro erreur lint | Oui | **✅** |
| Zéro erreur TypeScript | Oui | **✅** |
| Vulnérabilités `high` | 0 | **0 (audit CI)** |

**Décisions architecturales documentées** :

| ADR | Décision | Statut |
|---|---|---|
| ADR-001 | Monorepo pnpm workspaces | Accepté |
| ADR-002 | Hono comme framework backend | Accepté |
| ADR-003 | Mistral AI + JSON mode + Zod | Accepté |
| ADR-004 | Auth service-to-service (x-internal-secret) | Accepté |
| ADR-005 | Pyramide de tests (unitaires + E2E) | Accepté |
| ADR-006 | Déploiement Vercel + Fly.io + Neon | Accepté |

**Veille technologique** : `docs/bloc4/veille-technologique.md` — 6 domaines couverts (IA, frameworks, sécurité, tests, accessibilité, hébergement).

**Rapport de bug** : `docs/bloc4/bugs/BUG-001-coverage-threshold.md` — bug CI réel détecté (coverage 54% < 70%), analyse cause racine, correction appliquée.

---

## 6. Synthèse des réalisations

### Chronologie des sprints

| Sprint | Version | Réalisations principales |
|---|---|---|
| Sprint 01 | 0.1.0 | Bootstrap monorepo, CI/CD, architecture initiale |
| Sprint 02 | 0.2.0 | Intégration frontend-backend complète, auth réelle |
| Sprint 03 | 0.3.0 | Delete UI, error pages, 96% coverage |
| Sprint 04 | 0.4.0 | 27 tests E2E Playwright, OWASP review |
| Sprint 05 | 0.5.0 | Rate limiting, loading states, Bloc 4 docs |
| Sprint 06 | 0.6.0 | Dockerfiles multi-stage, docker-compose, ADR-006 |
| Sprint 07 | 0.7.0 | Dossier professionnel, compte rendu d'activité |
| Sprint 08 | 0.8.0 | axe-core WCAG automatique, db:seed démo, README UTF-8 |
| Sprint 09 | 0.9.0 | Fix encodage README UTF-16→UTF-8, .gitattributes, BUG-002 |
| Sprint 10 | 0.10.0 | Route /api/health Next.js, validateEnv() fail-fast OWASP A05 |
| Sprint 11 | 0.11.0 | Tests validateEnv(), IaC Fly.io + Vercel, déploiement cloud, docs RNCP finalisées |
| Sprint 12 | 0.12.0 | Pagination/filtres workouts, dashboard stats, BDD Neon migrée, fix OAuth Vercel |

### Compétences démontrées par le code

| Compétence | Preuve dans le code |
|---|---|
| TypeScript strict | `tsconfig.base.json` — `strict: true`, `noUncheckedIndexedAccess` |
| Validation des entrées | `GenerateWorkoutInputSchema` — Zod à toutes les frontières |
| Séparation des responsabilités | Routes → Controllers → Services → Repositories |
| Code sécurisé | Aucun `eval()`, aucun SQL brut, secrets en env uniquement |
| Tests lisibles | Nomenclature AAA (Arrange, Act, Assert), mocks explicites |
| Accessibilité | ARIA sur chaque composant interactif, tests automatisés RGAA |
| Documentation | 6 ADRs, CHANGELOG, 12 sprints, cahier de recettes 44 scénarios |

---

## 7. Difficultés rencontrées et solutions

| Difficulté | Impact | Solution appliquée |
|---|---|---|
| Coverage CI échoue à 54% (seuil 70%) | Pipeline bloqué | Exclusion fichiers DB + 18 nouveaux tests ciblés |
| Secret GitHub OAuth fine-grained PAT refused | Secrets non configurables en CI | Migration vers classic PAT scope `repo` |
| `@typescript-eslint/require-await` sur Server Actions | CI ESLint bloquant | Directive `eslint-disable` justifiée (contrat Next.js) |
| Mocks `async () => value` levaient ESLint | Tests illisibles | Réécriture `() => Promise.resolve(value)` |
| Hono `authMiddleware` placeholder en prod | Sécurité inexistante | Implémentation réelle x-internal-secret + userId |

---

## 8. Axes d'amélioration

1. **Intégration DB testée** — ajouter des tests d'intégration sur les repositories avec une DB de test (Testcontainers)
2. **Redis rate limiting** — remplacer le store in-memory par Upstash Redis pour la persistence cross-instances
3. **Monitoring** — intégrer Pino (logger structuré) + export vers un SIEM (Datadog, Grafana)
4. **Pagination** — la liste des workouts n'est pas paginée côté serveur
5. **Progressive Web App** — mode offline avec Service Worker pour le Timer
