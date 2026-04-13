# Sprint 08 — Axe-core WCAG, Seed DB, Finitions MVP

> Période : 2026-04-13 | Version : 0.8.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | `@axe-core/playwright` — détection automatique violations WCAG | ✅ |
| 2 | Script `db:seed` — 3 workouts de démonstration pour la soutenance | ✅ |
| 3 | Script `pnpm db:seed` exposé à la racine du monorepo | ✅ |
| 4 | Sprint review + CHANGELOG v0.8.0 | ✅ |

---

## Réalisations

### @axe-core/playwright — Tests WCAG automatiques

**Installation** : `@axe-core/playwright@^4.11.1` ajouté aux devDependencies de `apps/web`.

**Nouveau fichier de tests** (`apps/web/tests/e2e/axe.spec.ts`) :

```
axe-core — Violations WCAG automatiques
  ├── / — aucune violation WCAG critique
  └── /login — aucune violation WCAG critique
```

- Tags testés : `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
- Filtre : violations `critical` et `serious` uniquement (les `moderate` et `minor` sont informatifs)
- Message d'erreur explicite listant chaque violation avec son ID et sa description

**Complémentarité** avec `accessibility.spec.ts` :
- `accessibility.spec.ts` → vérifications manuelles RGAA 4.1 (skip link, lang, sémantique)
- `axe.spec.ts` → détection automatique des violations WCAG (contraste, ARIA incorrects, labels manquants)

### Script db:seed — Données de démonstration

**Fichier** (`apps/api/src/db/seed.ts`) :

Crée 1 utilisateur de démo + 3 workouts variés sans nécessiter Mistral AI :

| Workout | Sport | Difficulté | Durée |
|---|---|---|---|
| Cardio Débutant — Course à pied | Course à pied | beginner | 30 min |
| Force Intermédiaire — Musculation haut du corps | Musculation | intermediate | 45 min |
| HIIT Avancé — Full Body | HIIT | advanced | 25 min |

Chaque workout inclut :
- `warmup` : 2 exercices d'échauffement
- `exercises` : 3-4 exercices principaux avec sets, durée, repos
- `cooldown` : 2 exercices de récupération

Utilisation :
```bash
# Après pnpm db:migrate
pnpm db:seed
```

**Cas d'usage** : soutenance RNCP sans connexion Mistral, démonstration du Timer avec données réelles.

---

## Métriques finales v0.8.0

| Métrique | Valeur |
|---|---|
| Tests unitaires Vitest | 28 |
| Tests E2E Playwright | 27 + 2 (axe-core) = **29** |
| Coverage statements | 94.69% |
| OWASP risques couverts | 10/10 |
| RGAA critères | 6 manuels + 2 WCAG automatiques |
| Scénarios cahier de recettes | 39 |
| ADRs | 6 |
| Sprints documentés | 8 |
| Workouts de démo | 3 |

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| Tests WCAG automatiques axe-core | Bloc 2 | `apps/web/tests/e2e/axe.spec.ts` |
| Données de démonstration | Bloc 2 | `apps/api/src/db/seed.ts` |
