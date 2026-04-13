# BUG-002 — README.md encodé en UTF-16 LE — illisible sur GitHub

> Bloc 4 RNCP — Rapport de bug
> Date détection : 2026-04-13 | Statut : **Résolu** | Sévérité : **Modéré**

---

## Description

Le fichier `README.md` était encodé en **UTF-16 Little-Endian** au lieu de UTF-8. Sur GitHub, le fichier s'affichait avec des caractères parasites entre chaque lettre (`# S p o r t C o a c h   I A`) et les caractères accentués français étaient illisibles (`g?n?ration`, `entra?nements`).

**Impact** :
- La page principale du dépôt GitHub était illisible pour tout visiteur
- Les outils d'indexation (search, GitHub Linguist) ne parsaient pas le fichier correctement
- Mauvaise première impression pour un jury RNCP consultant le dépôt

---

## Détection

Bug détecté lors de la revue finale du projet (Sprint 09) en affichant le fichier via `cat` dans le terminal :

```
#   S p o r t C o a c h   I A
```

Confirmation via `xxd` :
```
00000000: 2300 2000 5300 7000 6f00 7200 7400 4300
```

Les octets `00` entre chaque caractère indiquent l'encodage UTF-16 LE (chaque caractère ASCII est encodé sur 2 octets, le second étant `\x00`).

---

## Cause racine

Le fichier `README.md` a été créé initialement via VS Code avec un paramètre système Windows qui utilise UTF-16 par défaut pour certains types de fichiers, ou lors d'une opération de copie/redirection qui a préservé l'encodage source.

PowerShell sur Windows utilise UTF-16 LE par défaut pour `Out-File` et `Set-Content`, contrairement à `echo` / redirection `>` sur Linux/Mac qui produisent de l'UTF-8.

---

## Correction appliquée

Réécriture complète du fichier via PowerShell avec encodage explicite :

```powershell
[System.IO.File]::WriteAllText(
  'README.md',
  $content,
  (New-Object System.Text.UTF8Encoding $false)  # false = pas de BOM
)
```

Le paramètre `$false` dans `UTF8Encoding` supprime le BOM (Byte Order Mark `EF BB BF`) pour une compatibilité maximale avec les outils Unix et GitHub.

---

## Vérification

```bash
xxd README.md | head -1
# Attendu : 2320 5370 6f72 7443 6f61 6368 2049 41 (# SportCoach IA en ASCII pur)
# Obtenu  : 2320 5370 6f72 7443 6f61 6368 2049 410a ✅
```

---

## Leçons apprises

- **Toujours vérifier l'encodage des fichiers créés sous Windows** avant de committer, particulièrement les fichiers Markdown destinés à GitHub.
- Configurer `.gitattributes` pour forcer l'encodage UTF-8 sur tous les fichiers texte :

```gitattributes
* text=auto eol=lf
*.md text eol=lf encoding=utf-8
*.ts text eol=lf encoding=utf-8
*.tsx text eol=lf encoding=utf-8
*.json text eol=lf encoding=utf-8
```

- Les avertissements `LF will be replaced by CRLF` de Git sur Windows signalent une conversion de fins de ligne mais pas d'encodage — les deux problèmes sont distincts.

---

## Fichiers modifiés

- `README.md` — réécrit en UTF-8 sans BOM avec contenu complet mis à jour
