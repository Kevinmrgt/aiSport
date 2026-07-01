---
name: bug-report
description: Créer une fiche de bug au format RNCP Bloc 4. Utiliser à chaque bug détecté ou corrigé pour alimenter le dossier de certification.
---

# Skill — Bug Report (Bloc 4 RNCP)

Quand un bug est détecté ou corrigé, créer un fichier dans `docs/bloc4/bugs/` au format suivant.

Le numéro du bug est incrémental : regarder le dernier fichier dans le dossier pour déterminer le prochain numéro.

## Template

Créer le fichier `docs/bloc4/bugs/BUG-XXX.md` :

```markdown
# BUG-XXX — [Titre court et descriptif]

**Date** : YYYY-MM-DD
**Sévérité** : Critique | Majeure | Mineure | Cosmétique
**Statut** : Ouvert | En cours | Résolu
**Version** : vX.Y.Z
**Auteur** : [Qui a détecté le bug]

## Description

[Description claire et concise du bug]

## Étapes de reproduction

1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

## Résultat attendu

[Ce qui devrait se passer]

## Résultat obtenu

[Ce qui se passe réellement — inclure logs/screenshots si pertinent]

## Environnement

- OS : [ex: macOS 14.5]
- Navigateur : [ex: Chrome 120]
- Version app : [ex: v1.2.0]
- Environnement : [dev | staging | prod]

## Analyse root cause

[Pourquoi le bug existe — quelle partie du code est en cause]

## Correctif appliqué

[Description du fix — référencer le commit/PR]

## Test de non-régression

[Comment on vérifie que le bug ne reviendra pas — test unitaire ajouté ?]

## Leçon apprise

[Ce qu'on retient pour éviter des bugs similaires à l'avenir]
```

## Pourquoi c'est important

La compétence C4.2.1 (consignation des anomalies) est **ÉLIMINATOIRE**. Le jury attend au moins un exemple concret et détaillé de fiche de bug dans le dossier Bloc 4.
