# Référentiel et plan de vérification accessibilité — Bloc 2

> Compétence : C2.2.3 — état consolidé du 2026-07-21.

## Référentiel choisi et justification

Alcide retient le **RGAA 4.1.2**, méthode française actuellement publiée,
adossée aux critères A et AA de WCAG 2.1 :

- [RGAA 4.1.2](https://accessibilite.numerique.gouv.fr/) ;
- [méthode technique RGAA](https://accessibilite.numerique.gouv.fr/methode/introduction/) ;
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/).

Ce choix est pertinent pour un service Web en français et fournit des critères
et tests reproductibles. Axe et Playwright servent de détecteurs de régression ;
ils ne remplacent pas un audit humain. Aucune mention « conforme RGAA » ne doit
être utilisée avant l'évaluation manuelle d'un échantillon représentatif.

## Échantillon représentatif

| Page ou état          | Enjeu                             | Automatique        | Manuel                       |
| --------------------- | --------------------------------- | ------------------ | ---------------------------- |
| `/`                   | structure, navigation, contrastes | Playwright + axe   | clavier, zoom 200/400 %      |
| `/login`              | authentification                  | Playwright + axe   | intitulé et retour d'erreur  |
| `/generate` séance    | formulaire métier                 | Playwright + axe   | erreurs, ordre de tabulation |
| `/programs/generate`  | formulaire métier                 | Playwright + axe   | erreurs, attente longue      |
| `/workouts`           | liste, filtres, pagination        | Playwright + axe   | clavier et reflow mobile     |
| `/workouts/[id]`      | contenu généré et Timer           | Playwright + axe   | annonces, pause, plein écran |
| `/programs` et détail | onglets et contenu complexe       | Playwright + axe   | flèches clavier, focus       |
| `/dashboard`          | statistiques                      | Playwright + axe   | compréhension hors couleur   |
| `/settings`           | formulaire de préférences         | Playwright + axe   | erreur et confirmation       |
| dialogue suppression  | modale destructive                | test composant/E2E | focus, Échap, restauration   |

## Contrôles manuels obligatoires

- navigation complète au clavier, sans piège et avec focus visible ;
- ordre de focus cohérent et retour du focus après fermeture d'une modale ;
- titres, régions, listes, tableaux et formulaires sémantiquement structurés ;
- noms accessibles et messages d'erreur reliés aux champs ;
- annonces des changements dynamiques sans répétition excessive ;
- contraste des textes, composants, focus et états désactivés ;
- zoom texte 200 %, zoom navigateur 400 % et reflow à 320 px CSS ;
- absence de contenu ou d'action disponible uniquement à la souris ;
- Timer utilisable avec lecteur d'écran et sans dépendre uniquement du temps ;
- contenu généré par IA lisible même lorsque sa longueur varie.

## Règles de preuve

Chaque contrôle final doit préciser : date, navigateur, viewport, technologie
d'assistance éventuelle, page, critère, résultat, anomalie et preuve. Les
violations `minor` et `moderate` ne sont pas filtrées du rapport final. Toute
anomalie est reliée au plan de correction Bloc 2 et à un test de non-régression.

## État courant

Les composants disposent déjà de bases utiles : langue française, skip link,
HTML sémantique, labels, focus visible, états de chargement et zones dynamiques.
Une campagne automatisée locale a produit 24 fichiers JSON et 8 captures pour
Chromium et Firefox dans
`docs/rncp/bloc2-annexes/browser-evidence-2026-07-20/`. Les deux runs finaux ont
réussi, 12/12 sur Chromium puis 12/12 sur Firefox. À 320 × 720 px, les quatre
pages observées (`/`, `/login`, `/confidentialite` et la page 404) ont une
largeur de document de 320 px et aucune `pageerror` JavaScript. Axe ne rapporte
aucune violation pour les tags WCAG 2.1 A/AA sélectionnés. Le statut HTTP 404 et
le message console réseau émis uniquement par Chromium sont conservés comme
observations attendues, pas supprimés du rapport.

La campagne couvre aussi le lien d'évitement sur trois pages, le nom accessible
du bouton Google et les redirections de `/generate`, `/programs`, `/workouts` et
`/settings` sans session. Les résultats détaillés et les limites figurent dans
`B2-A20-recette-navigateur-accessibilite-publique-2026-07-20.md`.

Le 2026-07-21, la suite Playwright authentifiée a été étendue sur `/generate` :
viewport mobile 390 × 844, contrôle d'absence de débordement horizontal et
analyse axe sans violation `critical` ou `serious`. Les six tests locaux ont
réussi avec un `storageState` OAuth réel conservé uniquement hors Git. Les
captures desktop/mobile sont consignées dans B2-A30. Cette preuve améliore le
périmètre automatisé mais ne couvre pas toutes les pages privées, les niveaux
axe `minor`/`moderate`, le zoom, les contrastes mesurés ou le lecteur d'écran.

Le statut de conformité reste **non déterminé** : les contrôles exécutés
démontrent des actions d'accessibilité, mais pas la conformité exhaustive au
RGAA. Aucune déclaration « conforme RGAA » n'est donc formulée dans le dossier.
