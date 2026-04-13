# Sprint 07 — Dossier Professionnel RNCP, CRA, Cahier de recettes final

> Période : 2026-04-13 | Version : 0.7.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Cahier de recettes : CR-035/036 (rate limit) + CR-037/038/039 (loading states) | ✅ |
| 2 | Cahier de recettes : mise à jour table des suites de tests (28+27 = 55 tests) | ✅ |
| 3 | Dossier professionnel — synthèse des 4 blocs RNCP | ✅ |
| 4 | Compte Rendu d'Activité (CRA) Bloc 4 | ✅ |
| 5 | Sprint review + CHANGELOG v0.7.0 | ✅ |

---

## Réalisations

### Cahier de recettes mis à jour

5 nouveaux scénarios ajoutés (39 total) :

| ID | Fonctionnalité | Statut |
|---|---|---|
| CR-035 | Rate limiting — dépassement quota (429 + Retry-After) | ✅ |
| CR-036 | Rate limiting — isolation utilisateurs | ✅ |
| CR-037 | Loading state `/workouts` — skeleton grille | ✅ |
| CR-038 | Loading state `/generate` — skeleton formulaire | ✅ |
| CR-039 | Loading state `/workouts/[id]` — skeleton timer | ✅ |

Table des suites de tests complète avec 55 tests totaux (unitaires + E2E).

### Dossier professionnel (`docs/dossier-professionnel.md`)

Document de synthèse structuré autour des 4 blocs RNCP :

| Section | Contenu |
|---|---|
| Présentation projet | Contexte, problématique, stack technique justifiée |
| Bloc 1 — UI | RGAA 4.1, composants, loading states, Timer |
| Bloc 2 — Persistance | Schéma DB, Repository Pattern, validation Zod |
| Bloc 3 — Sécurité | OWASP A01-A10, rate limiting, tests sécurité |
| Bloc 4 — Déploiement | CI/CD 5 jobs, Dockerfiles, métriques qualité, ADRs |
| Synthèse | Chronologie sprints, compétences démontrées, difficultés |
| Axes amélioration | 5 pistes pour une v2 |

### Compte Rendu d'Activité (`docs/bloc4/compte-rendu-activite.md`)

- Chronologie sprint par sprint avec livrables
- Méthodologie agile documentée
- Difficultés réelles rencontrées et solutions
- Compétences techniques et transversales évaluées
- Métriques qualité finales

---

## Métriques finales du projet

| Métrique | Valeur |
|---|---|
| Tests unitaires Vitest | **28** |
| Tests E2E Playwright | **27** |
| Coverage statements | **94.69%** |
| Coverage functions | **100%** |
| Scénarios cahier de recettes | **39** |
| ADRs | **6** |
| Sprints documentés | **7** |
| OWASP risques couverts | **10/10** |
| RGAA critères automatisés | **6** |
| Erreurs TypeScript | **0** |
| Erreurs ESLint | **0** |
| Vulnérabilités `high` | **0** |

---

## Arborescence documentaire finale

```
docs/
├── adr/
│   ├── ADR-001-monorepo-pnpm.md
│   ├── ADR-002-hono-backend.md
│   ├── ADR-003-mistral-ai.md
│   ├── ADR-004-service-to-service-auth.md
│   ├── ADR-005-testing-strategy.md
│   └── ADR-006-deployment-architecture.md
├── bloc2/
│   └── cahier-recettes.md          (39 scénarios)
├── bloc4/
│   ├── bugs/
│   │   └── BUG-001-coverage-threshold.md
│   ├── compte-rendu-activite.md
│   └── veille-technologique.md
├── security/
│   └── owasp-review.md             (A01-A10 complet)
├── sprints/
│   ├── sprint-01.md → sprint-07.md
├── deployment.md
└── dossier-professionnel.md        ← LIVRABLE CLÉ SOUTENANCE
```

---

## Livrables RNCP par bloc

| Livrable | Bloc | Fichier |
|---|---|---|
| Dossier professionnel | Tous | `docs/dossier-professionnel.md` |
| Cahier de recettes | Bloc 2 | `docs/bloc2/cahier-recettes.md` |
| Revue OWASP | Bloc 3 | `docs/security/owasp-review.md` |
| CRA | Bloc 4 | `docs/bloc4/compte-rendu-activite.md` |
| Veille technologique | Bloc 4 | `docs/bloc4/veille-technologique.md` |
| Rapport de bug | Bloc 4 | `docs/bloc4/bugs/BUG-001-coverage-threshold.md` |
| ADRs (×6) | Bloc 4 | `docs/adr/` |
| CI/CD pipeline | Bloc 4 | `.github/workflows/ci.yml` |
| Dockerfiles | Bloc 4 | `apps/*/Dockerfile` |
