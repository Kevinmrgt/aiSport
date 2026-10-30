# Accessibilité

Les contrôles visent les critères pertinents RGAA/WCAG sur les routes publiques
et les parcours privés de génération, liste, détail, journal et paramètres.
Aucune conformité exhaustive n'est revendiquée.

## Mesures conservées

- Repères de page, lien d'évitement, titres hiérarchisés et labels explicites.
- Erreurs de formulaire annoncées et focus sur le premier champ invalide.
- Confirmation de suppression avec gestion du focus et fermeture par Échap.
- Onglets de semaines avec flèches/Home/End et panneaux liés.
- Commandes du Timer accessibles, retour du focus après plein écran.
- Reflow petit écran et zoom navigateur 200/400 %.

Les tests `accessibility-structure.test.tsx`, les suites Playwright et axe,
ainsi que les outils de zoom/contraste restent dans le dépôt.
Voir [testing.md](testing.md).

## Limites et suivi

Les campagnes de juillet 2026 ont conduit à des correctifs de contrastes,
reflow, focus, onglets et alertes. Un parcours NVDA a également été réalisé.
Ces résultats ne valident pas automatiquement une nouvelle version.

Deux améliorations P2 restent à contre-recetter : l'annonce finale de succès
après suppression et l'annonce de la page atteinte après déconnexion.
Voir [release-readiness.md](release-readiness.md).

Les alternatives pertinentes, contrastes composites et qualité de la
restitution vocale exigent des contrôles humains. Pour chaque anomalie,
consigner page/état, navigateur, technologie d'assistance, résultat attendu,
résultat observé et contre-recette.
