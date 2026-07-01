# B2-A11 - Preuve audit sécurité - 2026-06-30

Compétence liée : C2.2.3 - sécurisation du code source et des dépendances.

Commande exécutée depuis la racine du projet :

```bash
pnpm audit --audit-level=high
```

Résultat :

| Indicateur | Valeur |
|---|---:|
| Statut commande | Succès |
| Vulnérabilités high | 0 |
| Vulnérabilités critical | 0 |
| Vulnérabilités restantes | 6 |
| Détail sévérité restante | 2 low, 4 moderate |

Conclusion : l'audit high est vert. Les vulnérabilités low/moderate restent à suivre dans le cycle de maintenance.

