---
description: Conventions de code TypeScript pour tout le projet
globs: "*.ts,*.tsx"
---

# Code Style

- TypeScript strict partout (`strict: true`, `noUncheckedIndexedAccess: true`)
- Zéro `any` — utiliser `unknown` puis valider avec Zod
- Imports absolus avec alias (`@/`, `@api/`, `@shared/`)
- Fichiers en kebab-case, composants en PascalCase, fonctions en camelCase
- Un fichier = une responsabilité, max ~200 lignes
- Commenter le "pourquoi", pas le "quoi"
- Préférer les fonctions pures et l'immutabilité
- Utiliser `const` par défaut, `let` seulement si nécessaire
- Destructuring pour les props et les objets
- Early return plutôt que des if/else imbriqués
