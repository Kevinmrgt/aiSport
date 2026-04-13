---
name: changelog
description: Mettre à jour le CHANGELOG.md lors d'une release. Livrable ÉLIMINATOIRE du Bloc 4 RNCP (C4.3.2).
---

# Skill — Changelog (Bloc 4 RNCP)

Quand on crée un tag de version, mettre à jour le `CHANGELOG.md` à la racine du projet.

## Workflow

1. Lire l'historique git depuis le dernier tag : `git log --oneline $(git describe --tags --abbrev=0)..HEAD`
2. Classer les commits par catégorie selon leur type (Conventional Commits)
3. Ajouter l'entrée en haut du CHANGELOG.md
4. Committer : `docs: update CHANGELOG for vX.Y.Z`

## Format

```markdown
## [vX.Y.Z] — YYYY-MM-DD

### Added
- feat(scope): description (#PR)

### Fixed
- fix(scope): description (#PR)

### Changed
- refactor(scope): description (#PR)

### Security
- security(scope): description (#PR)

### Performance
- perf(scope): description (#PR)

### Breaking Changes
- description du changement cassant
```

## Pourquoi c'est important

La compétence C4.3.2 (journal des versions) est **ÉLIMINATOIRE**. Le jury attend un exemplaire du journal de version avec les améliorations, corrections et évolutions documentées pour chaque version déployée.
