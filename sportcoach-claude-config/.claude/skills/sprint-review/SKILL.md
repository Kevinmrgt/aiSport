---
name: sprint-review
description: Générer un résumé de sprint pour le dossier Bloc 3 RNCP. Utiliser à la fin de chaque sprint ou milestone.
---

# Skill — Sprint Review (Bloc 3 RNCP)

Générer un résumé de sprint dans `docs/sprints/sprint-XX.md`.

Analyser l'historique git récent, les issues fermées et l'état du projet pour remplir le template.

## Template

```markdown
# Sprint XX — [Date début] au [Date fin]

## Objectifs du sprint

- [Objectif 1]
- [Objectif 2]

## Réalisations

### Features
- [feat: description — PR #XX]

### Corrections
- [fix: description — PR #XX]

### Technique
- [chore/refactor/ci: description]

## Métriques

| Indicateur | Valeur |
|---|---|
| Tickets fermés | X/Y |
| Couverture de tests | XX% |
| Lighthouse perf | XX |
| Lighthouse a11y | XX |
| Bugs ouverts | X |
| Temps de réponse API moyen | XXXms |

## Arbitrage / Décision

[Décrire une décision prise pendant le sprint]
- **Problématique** : ...
- **Options envisagées** : ...
- **Décision** : ...
- **Justification** : ...

## Rétrospective

- **Ce qui a bien fonctionné** : ...
- **Ce qui peut être amélioré** : ...

## Objectifs du prochain sprint

- [Objectif 1]
- [Objectif 2]
```

## Pourquoi c'est important

Le Bloc 3 demande des comptes rendus d'activité, des cas d'arbitrage et des indicateurs de suivi. Ces sprint reviews alimentent directement ces livrables.
