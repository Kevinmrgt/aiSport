# Sprint 04 — Tests E2E, OWASP A01-A10, ADR-005

> Période : 2026-04-13 | Version : 0.4.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Tests E2E Playwright — pages publiques et flux authentifié | ✅ |
| 2 | Tests RGAA 4.1 automatisés (accessibilité) | ✅ |
| 3 | Revue de sécurité OWASP Top 10 documentée | ✅ |
| 4 | ADR-005 — Stratégie de tests (pyramide) | ✅ |
| 5 | Job E2E dans GitHub Actions CI | ✅ |
| 6 | Sprint review + CHANGELOG v0.4.0 | ✅ |

---

## Réalisations

### Tests E2E Playwright

**Configuration** (`apps/web/playwright.config.ts`) :
- `webServer` : démarre `pnpm dev` automatiquement si le serveur n'est pas actif
- `reuseExistingServer: !CI` : réutilise le serveur en dev local
- Projets : **Chromium** + **Firefox** (cross-browser)
- Timeout : 30s par test, trace on-first-retry

**Suites de tests** :

| Fichier | Tests | Couverture |
|---|---|---|
| `home.spec.ts` | 7 | Page d'accueil publique — titre, skip link, nav, footer, lien /login |
| `auth.spec.ts` | 6 | Page /login GitHub, protection routes (generate, workouts, workouts/[id]), 404 |
| `generate.spec.ts` | 4 | Formulaire (session mockée) — accessibilité, labels, validation Zod, aria-live |
| `accessibility.spec.ts` | 10 | RGAA 4.1 — skip link, lang="fr", header/main/footer, main#main-content |

**Total : 27 tests E2E** couvrant les flux critiques.

### Session fixture Playwright

- `tests/fixtures/session.json` : fixture pour `storageState` (injectée en test)
- `createMockSession()` : helper réutilisable pour injecter un cookie `authjs.session-token`

### Revue OWASP Top 10

- `docs/security/owasp-review.md` : tous les 10 risques documentés avec contrôles, fichiers, couverture test
- **A01** (Broken Access Control) : authMiddleware + ownership repository + Server Action
- **A02** (Cryptographic Failures) : secrets dans env, HTTPS en prod, cookie HTTP-only
- **A03** (Injection) : Drizzle paramétré + Zod strict
- **A04** (Insecure Design) : validation toutes frontières, architecture en couches
- **A05** (Security Misconfiguration) : secureHeaders(), CORS restrictif, CSP Next.js
- **A06** (Vulnerable Components) : pnpm audit en CI, lockfile committé
- **A07** (Auth Failures) : Auth.js OAuth, JWT signé 30 jours, cookie HTTP-only
- **A08** (Integrity Failures) : --frozen-lockfile, versions GH Actions fixées, Zod validation Mistral
- **A09** (Logging) : logs structurés sur auth invalide, AppError, Mistral, error boundary
- **A10** (SSRF) : URL Mistral fixe, AbortController 30s, pas d'URL dynamique depuis input

### ADR-005 — Pyramide de tests

- Décision : pyramide 2 niveaux (unitaires Vitest + E2E Playwright) sans intégration DB
- Seuil coverage ≥ 70% bloquant en CI
- E2E non bloquant (`continue-on-error: true`) — nécessite serveur live

---

## Métriques

| Métrique | Valeur |
|---|---|
| Tests unitaires | 23 (auth middleware × 6, workout.service × 8, workout.controller × 9) |
| Tests E2E | 27 (home × 7, auth × 6, generate × 4, accessibility × 10) |
| Coverage statements | 96% |
| OWASP risques couverts | 10/10 |
| RGAA critères automatisés | 6 (skip link, lang, sémantique HTML5, labels, aria-live, texte liens) |
| Jobs CI | 5 (lint-typecheck, test-unit, build, security-audit, test-e2e) |

---

## Architecture CI après Sprint 04

```
Push → main
  ├── lint-typecheck (ESLint + tsc)
  ├── test-unit (Vitest + coverage ≥ 70%)
  │     └── build (pnpm build)
  ├── security-audit (pnpm audit --audit-level=high)
  └── test-e2e (Playwright — continue-on-error)
```

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Revue OWASP Top 10 | Bloc 3 | `docs/security/owasp-review.md` |
| ADR stratégie tests | Bloc 4 | `docs/adr/ADR-005-testing-strategy.md` |
| Tests E2E RGAA 4.1 | Bloc 2 | `apps/web/tests/e2e/accessibility.spec.ts` |
| CI pipeline complet | Bloc 4 | `.github/workflows/ci.yml` |
