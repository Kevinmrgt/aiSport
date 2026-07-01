# ADR-001 — Monorepo pnpm avec Workspaces

**Date** : 2026-04-13
**Statut** : Accepté
**Auteur** : Kevin

## Contexte

Le projet Alcide nécessite deux applications distinctes (frontend Next.js et backend Hono) qui partagent des types TypeScript et des schémas Zod (notamment le contrat JSON de réponse Mistral AI). Il faut décider de la stratégie de gestion des dépendances et du partage de code.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| **Monorepo pnpm** | Partage de code natif, scripts unifiés, hoisting des dépendances | Courbe d'apprentissage |
| Deux repos séparés | Indépendance totale | Duplication des types, synchronisation manuelle |
| Monorepo npm workspaces | Standard npm | Performance inférieure à pnpm |

## Décision

**Monorepo pnpm avec workspaces** organisé en :
- `apps/web` — Next.js 14 (frontend)
- `apps/api` — Hono (backend)
- `packages/shared` — types et schémas Zod partagés

## Justification

1. **Partage de types sans duplication** : les schémas Zod du contrat Mistral sont définis une seule fois dans `@alcide/shared` et importés côté frontend (validation client) et backend (validation serveur).
2. **Cohérence** : un seul `pnpm install` installe tout le projet. Les scripts `pnpm dev`, `pnpm test`, `pnpm build` fonctionnent depuis la racine.
3. **Performance pnpm** : stockage en hard-links, temps d'installation ~3x plus rapide que npm, lockfile déterministe.
4. **Traçabilité RNCP** : un seul repository Git, donc un seul historique de commits lisible et auditable par le jury.

## Conséquences

- Chaque package doit avoir son propre `tsconfig.json` héritant de `tsconfig.base.json` à la racine.
- Le package `shared` doit être buildé avant `web` et `api`.
- Le CI/CD doit respecter l'ordre : `shared → api → web`.
