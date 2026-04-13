# Sprint 09 — README UTF-8, .gitattributes, BUG-002, Finitions

> Période : 2026-04-13 | Version : 0.9.0

---

## Objectifs

| # | Objectif | Statut |
|---|---|---|
| 1 | Réécrire README.md en UTF-8 (corrige l'affichage GitHub) | ✅ |
| 2 | Ajouter `.gitattributes` pour prévenir les problèmes d'encodage | ✅ |
| 3 | BUG-002 — rapport d'incident encodage UTF-16 | ✅ |
| 4 | Mettre à jour dossier-professionnel.md avec Sprint 08 | ✅ |
| 5 | Sprint review + CHANGELOG v0.9.0 | ✅ |

---

## Réalisations

### README.md — Réécriture UTF-8

**Problème** : le README était encodé en UTF-16 LE depuis la création du projet. Sur GitHub, chaque caractère était séparé par un octet nul (`\x00`), rendant le fichier illisible (`# S p o r t C o a c h   I A`).

**Correction** :
- Réécriture complète en UTF-8 sans BOM via PowerShell (`UTF8Encoding($false)`)
- Contenu mis à jour pour refléter l'état v0.8.0 (stack, commandes, structure, CI/CD, conformité RNCP)

### .gitattributes

Nouveau fichier à la racine du monorepo — force UTF-8 + LF pour tous les fichiers texte :

```gitattributes
* text=auto eol=lf
*.md text eol=lf encoding=utf-8
*.ts text eol=lf encoding=utf-8
*.tsx text eol=lf encoding=utf-8
*.json text eol=lf encoding=utf-8
```

**Effet** : prévient toute récurrence du bug UTF-16 sur Windows, normalise les fins de ligne (LF au lieu de CRLF) — supprime les warnings Git systématiques.

### BUG-002

`docs/bloc4/bugs/BUG-002-readme-utf16.md` — rapport complet :
- Description du symptôme
- Détection via `xxd` (analyse hexadécimale)
- Cause racine (comportement PowerShell Windows par défaut)
- Correction appliquée
- Leçons apprises

### Dossier professionnel mis à jour

- Sprint 08 ajouté dans la chronologie
- Métrique E2E : 27 → 29 tests (axe-core inclus)

---

## Métriques finales v0.9.0

| Métrique | Valeur |
|---|---|
| Tests unitaires Vitest | 28 |
| Tests E2E Playwright | 29 (dont 2 axe-core WCAG) |
| Coverage statements | 94.69% |
| OWASP risques couverts | 10/10 |
| Scénarios cahier de recettes | 39 |
| ADRs | 6 |
| Rapports de bugs | 2 (BUG-001, BUG-002) |
| Sprints documentés | 9 |
| Encodage README | UTF-8 sans BOM ✅ |

---

## Livrables RNCP

| Livrable | Bloc | Fichier |
|---|---|---|
| README.md lisible sur GitHub | Bloc 4 | `README.md` |
| BUG-002 rapport encodage | Bloc 4 | `docs/bloc4/bugs/BUG-002-readme-utf16.md` |
| `.gitattributes` encodage | Bloc 4 | `.gitattributes` |
