---
description: Format des commits — Conventional Commits obligatoire
globs: ""
---

# Conventional Commits

Chaque commit DOIT suivre le format : `type(scope): description`

## Types
- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `docs` : documentation uniquement
- `style` : formatage, pas de changement de code
- `refactor` : ni feature ni fix
- `test` : ajout ou modification de tests
- `chore` : maintenance, dépendances
- `ci` : changements CI/CD
- `perf` : amélioration de performance
- `security` : correctif de sécurité

## Scopes
`web`, `api`, `shared`, `db`, `auth`, `ai`, `timer`, `ci`, `docs`

## Exemples
- `feat(ai): add streaming response for workout generation`
- `fix(api): handle truncated JSON from Mistral`
- `test(api): add unit tests for MistralService`
- `security(api): sanitize user inputs with Zod`
- `docs(bloc2): add deployment manual`

## Breaking changes
Ajouter `BREAKING CHANGE:` dans le body du commit.

Ceci alimente automatiquement le CHANGELOG.md — livrable du Bloc 4 RNCP.
