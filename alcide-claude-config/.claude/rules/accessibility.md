---
description: Accessibilité RGAA 4.1 — COMPÉTENCE ÉLIMINATOIRE RNCP
globs: "*.tsx,*.css"
---

# Accessibilité — RGAA 4.1

⚠️ COMPÉTENCE ÉLIMINATOIRE (C2.2.3) — le jury vérifiera la conformité au référentiel d'accessibilité.

Référentiel choisi : **RGAA 4.1** (Référentiel Général d'Amélioration de l'Accessibilité).

Chaque composant UI DOIT :

- Utiliser la sémantique HTML5 (`header`, `main`, `nav`, `section`, `article`, `button` — pas de `div` cliquables)
- Avoir des attributs ARIA quand la sémantique native ne suffit pas
- Respecter un contraste minimum AA (4.5:1 texte normal, 3:1 grands textes)
- Être navigable au clavier (focus visible, tab order logique, pas de piège clavier)
- Avoir des textes alternatifs sur tous les éléments visuels
- Être responsive et fonctionnel sur mobile
- Avoir des labels explicites sur tous les champs de formulaire (pas de placeholder seul)
- Gérer les états dynamiques avec `aria-live` pour le timer et les notifications

Préférer les composants natifs HTML aux composants custom quand possible.
Tester avec : `axe-core` (intégré dans les tests), Lighthouse accessibility > 90.
