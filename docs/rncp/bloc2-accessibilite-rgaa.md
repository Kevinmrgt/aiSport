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

Le 2026-07-21, une campagne finale dédiée a ensuite exécuté **33/33 contrôles
Playwright en production authentifiée** sur trois pages publiques et cinq pages
privées : reflow 640/320 pixels CSS, cycle clavier complet, focus visible,
contrastes axe sans filtrage de sévérité, arbre d'accessibilité Chromium et
annonces d'erreur. Un contrôle indépendant a ajouté `/programs/generate`.
Deux titres internes de formulaire détectés en `h1` ont été corrigés en `h2` et
protégés par 2/2 tests de structure. Les détails reproductibles figurent dans
B2-A36. Après fusion et déploiement de la baseline `0d5c6b6...`, les 33
contrôles ont été rejoués avec le même résultat ; la CI `29832575391`, le CD
`29832944876` et l'E2E OAuth `29833210488` sont également verts.

Les ratios opaques représentatifs mesurés sont de 17,36:1 sur les pages
publiques et 8,19:1 sur les pages privées, au-dessus du seuil AA de 4,5:1.
Axe conserve toutefois un contrôle `incomplete` par page pour des fonds
composites. Le reflow 640/320 est une équivalence CSS du zoom 200/400 %, pas une
preuve de raccourci de zoom réel. L'arbre d'accessibilité n'est pas assimilé à
une restitution NVDA, Narrator, JAWS ou VoiceOver.

## Conclusion pour C2.2.3

L'exigence RNCP de **présenter les actions mises en œuvre pour permettre
l'accès aux personnes en situation de handicap** est étayée par des
correctifs, des tests reproductibles, un échantillon public/privé et des
résultats mesurés. Le périmètre automatisable est contrôlé.

Le statut réglementaire de conformité exhaustive au RGAA reste **non
déterminé**, ce qui est volontaire et distinct de l'état de la compétence :
il manque un essai réel de zoom navigateur, la vérification humaine des fonds
composites et un parcours avec un vrai lecteur d'écran. Aucune déclaration
« conforme RGAA » n'est formulée avant ces trois opérations.
