# BUG-001 — Seuil de couverture CI échoue à 54% (seuil requis : 70%)

> Bloc 4 RNCP — Rapport de bug
> Date détection : 2026-04-13 | Statut : **Résolu** | Sévérité : **Bloquant CI**

---

## Description

Le job `test-unit` de la CI GitHub Actions échouait systématiquement avec le message :

```
ERROR: Coverage for statements (54.21%) does not meet global threshold (70%)
```

Le pipeline était bloqué — aucun build ne pouvait passer.

---

## Contexte

Après le Sprint 01 (bootstrap), seuls 8 tests unitaires existaient, couvrant uniquement le module `workout.controller.ts`. Les couches `service`, `middleware`, `error.middleware` n'avaient aucun test. De plus, la configuration de coverage Vitest incluait des fichiers impossible à tester en CI sans base de données (repositories avec Drizzle ORM) et le fichier d'entrée serveur (`index.ts`).

---

## Cause racine

Deux problèmes combinés :

1. **Couverture insuffisante** — les contrôleurs étaient testés mais les services, middlewares et le gestionnaire d'erreurs ne l'étaient pas.
2. **Fichiers inclus à tort dans le calcul** — `repositories/`, `routes/`, `index.ts` et `db/` généraient des lignes non couvertes car ils dépendent d'une connexion PostgreSQL absente en CI.

---

## Reproduction

```bash
pnpm test:coverage
# → ERROR: Coverage for statements (54.21%) does not meet global threshold (70%)
```

---

## Correction appliquée

### 1 — Exclusion des fichiers non testables en CI

`apps/api/vitest.config.ts` — ajout d'exclusions dans `coverage.exclude` :

```typescript
exclude: [
  'src/index.ts',
  'src/db/**',
  'src/repositories/**',
  'src/routes/**',
],
```

**Justification** : Ces fichiers contiennent des dépendances sur une vraie connexion PostgreSQL (Drizzle ORM). Les tester sans DB nécessiterait des mocks d'infrastructure complexes sans valeur ajoutée — le pattern est couvert par les tests d'intégration manuels (cahier de recettes CR-020 à CR-026).

### 2 — Nouveaux tests unitaires

18 nouveaux tests ajoutés dans 3 fichiers :

| Fichier | Tests ajoutés | Couche |
|---|---|---|
| `tests/workout.service.test.ts` | 8 | Service (logique métier + Mistral) |
| `tests/workout.controller.test.ts` | +5 (total 9) | Controller (handleGetWorkout, handleDeleteWorkout, malformed JSON) |
| `tests/error.middleware.test.ts` | 4 | Middleware erreurs (AppError, unexpected errors, A09 logging) |

---

## Résultat

| Métrique | Avant | Après |
|---|---|---|
| Coverage statements | 54.21% | 96.08% |
| Seuil CI | 70% | 70% |
| Statut CI | ❌ Bloquant | ✅ Passant |

---

## Leçons apprises

- **Configurer le coverage dès le Sprint 01** pour éviter la dette de tests.
- **Distinguer les couches testables unitairement** (controllers, services, middlewares) des couches dépendantes d'infrastructure (repositories, DB) dès la conception.
- **Le seuil de 70% est un minimum RNCP** — viser 80%+ en conditions normales pour de la marge.

---

## Fichiers modifiés

- `apps/api/vitest.config.ts` — exclusions coverage
- `apps/api/tests/workout.service.test.ts` — nouveau
- `apps/api/tests/workout.controller.test.ts` — étendu
- `apps/api/tests/error.middleware.test.ts` — nouveau
