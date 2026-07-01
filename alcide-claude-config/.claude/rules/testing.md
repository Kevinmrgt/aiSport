---
description: Règles de tests — COMPÉTENCE ÉLIMINATOIRE RNCP
globs: "*.test.ts,*.test.tsx,*.spec.ts"
---

# Tests — COMPÉTENCE ÉLIMINATOIRE

⚠️ C2.2.2 (tests unitaires) et C2.3.1 (cahier de recettes) sont éliminatoires.

## Tests unitaires (Vitest)
- Chaque service DOIT avoir des tests unitaires
- Priorité : `MistralService` (parsing JSON, gestion erreurs), `WorkoutRepository` (CRUD), Controllers (validation)
- Couverture cible : > 70%
- Mocker les appels externes (API Mistral) avec `vi.mock()`
- Nommer les fichiers de test : `nom-du-fichier.test.ts`
- Structure : `describe` > `it` avec des noms explicites en anglais

## Tests e2e (Playwright)
- Parcours critique : inscription → connexion → génération entraînement → consultation → timer
- Tester les cas d'erreur (API Mistral down, inputs invalides)

## Cahier de recettes
- Chaque fonctionnalité livrée → scénario documenté dans `docs/bloc2/cahier-recettes.md`
- Format : ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut
