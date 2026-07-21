# Référentiel et périmètre de vérification accessibilité — Bloc 2

> Compétence : C2.2.3 — état vérifié le 2026-07-21.

## Référentiel choisi et portée de l'évaluation

Alcide retient le **RGAA 4.1.2**, méthode française en vigueur au moment de
l'évaluation, adossée aux critères A et AA de WCAG 2.1 :

- [RGAA 4.1.2](https://accessibilite.numerique.gouv.fr/) ;
- [critères et tests RGAA](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/) ;
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/).

Ce choix fournit des critères et des tests reproductibles pour un service Web
en français. La matrice ci-dessous décrit le **périmètre effectivement
contrôlé** pour le Bloc 2 ; elle n'est ni un audit réglementaire exhaustif des
106 critères, ni une déclaration d'accessibilité.

Les statuts employés signifient :

- **couvert sur l'échantillon** : les contrôles annoncés ont été exécutés et
  ont réussi sur les pages indiquées ;
- **partiel** : une preuve automatique ou manuelle existe, mais une
  appréciation humaine reste nécessaire ;
- **non applicable observé** : aucun composant de cette famille n'a été trouvé
  dans les états inspectés ; ce statut ne préjuge pas d'un futur contenu ;
- **ouvert** : aucun résultat positif n'est revendiqué.

## Échantillon représentatif

| Page ou état | Enjeu principal | Contrôle exécuté |
| --- | --- | --- |
| `/` | structure, navigation, images, contrastes | axe, clavier, arbre AX, zoom natif |
| `/login` | authentification | axe, clavier, arbre AX, zoom natif |
| `/confidentialite` | contenu éditorial | axe, clavier, arbre AX, zoom natif |
| `/dashboard` | statistiques et états dynamiques | axe, clavier, arbre AX, zoom natif |
| `/generate` | formulaire métier et erreurs | axe, clavier, alertes, arbre AX, zoom natif |
| `/programs` | liste et contenu complexe | axe, clavier, arbre AX, zoom natif |
| `/workouts` | liste et filtres | axe, clavier, arbre AX, zoom natif |
| `/settings` | formulaire de préférences | axe, clavier, arbre AX, zoom natif |

Des contrôles complémentaires historiques couvrent `/programs/generate`, le
détail d'une séance, le Timer, les onglets de programme et les dialogues de
suppression. Ils sont distingués des huit routes rejouées dans la campagne
finale de production.

## Matrice de périmètre RGAA exploitable

| Thématique RGAA | Éléments observés et preuve | Méthode | Statut et limite |
| --- | --- | --- | --- |
| 1. Images | Images Next.js publiques et décoratives | axe public, inspection des noms accessibles | **Partiel** : présence d'alternatives contrôlée automatiquement ; pertinence éditoriale non auditée image par image |
| 2. Cadres | Aucun `iframe` ou `frame` dans les composants observés | recherche source et échantillon navigateur | **Non applicable observé** |
| 3. Couleurs | Textes, boutons, focus, fonds opaques et composites | axe `color-contrast`, calculs sRGB, focus visible | **Partiel** : 0 violation calculable ; 416 nœuds `incomplete` exigent une décision humaine sur les composites |
| 4. Multimédia | Aucun lecteur audio ou vidéo dans les composants observés | recherche source et échantillon navigateur | **Non applicable observé** |
| 5. Tableaux | Aucun tableau de données dans les états observés | recherche source et échantillon navigateur | **Non applicable observé** |
| 6. Liens | Navigation, lien d'évitement, cartes et actions | axe public, inventaire tabulable, cycle `Tab` | **Couvert sur l'échantillon** ; pertinence de tous les intitulés futurs à maintenir |
| 7. Scripts | Formulaires, erreurs, dialogues, Timer, onglets | tests composants, alertes `role="alert"`, clavier, arbre AX | **Partiel** : nom/rôle/état et focus sont testés ; restitution vocale réelle ouverte |
| 8. Éléments obligatoires | Langue, titres de pages et structure HTML | axe public, arbre AX, tests de structure | **Couvert sur l'échantillon** |
| 9. Structuration | `main`, navigation nommée, titres, listes, formulaires | arbre AX sur huit routes, tests `h1`/`h2` | **Couvert sur l'échantillon** ; deux titres internes ont été corrigés de `h1` vers `h2` |
| 10. Présentation | Reflow, zoom, focus, longueur variable des contenus | zoom Chromium natif 200/400 %, reflow CSS, contrôle des rectangles | **Partiel** : zoom 16/16 sans rognage ; contraste composite humain encore ouvert |
| 11. Formulaires | Labels, erreurs reliées, contrôles de séance et de paramètres | axe, tests composants, clavier, alertes | **Couvert sur les formulaires échantillonnés** |
| 12. Navigation | Skip link, menu, ordre de tabulation, absence de piège | cycles clavier complets sur huit routes | **Couvert sur l'échantillon** |
| 13. Consultation | Contenus générés, changements dynamiques, Timer | tests composants/E2E et arbre AX | **Partiel** : structure et annonces DOM contrôlées ; confort de restitution par lecteur d'écran ouvert |

Cette matrice doit être mise à jour dès qu'un nouveau type de contenu apparaît.
Un statut « non applicable observé » devient à réévaluer si un cadre, un média
ou un tableau est ajouté.

## Résultats automatisés rejoués

Les contrôles suivants ont été rejoués le 2026-07-21 sans exposer le contenu du
stockage OAuth local :

- suite publique locale Chromium et Firefox : **48 tests lancés, commande
  terminée avec le code 0** ;
- suite RNCP de production authentifiée : **33 tests lancés, commande terminée
  avec le code 0** sur les huit routes de l'échantillon ;
- zoom Chromium natif en production : **16/16 mesures** à 200 % et 400 %, zoom
  obtenu 2×/4×, aucun débordement horizontal et aucun texte ou contrôle rogné ;
- contraste détaillé en production : **8 routes, 0 violation, 19 nœuds
  calculés conformes et 416 nœuds `incomplete`** ;
- tests de structure des deux formulaires : **2/2 réussis**.

Les 416 résultats `incomplete` ne sont pas 416 non-conformités : axe ne sait
pas calculer le fond composite final. Ils ne sont pas davantage considérés
comme conformes sans vérification humaine.

## Contrôles humains et règles de preuve

Les contrôles automatisés couvrent le reflow, le zoom natif, une partie des
contrastes, l'ordre de tabulation, le focus visible, les alertes et la structure
de l'arbre d'accessibilité. Ils ne permettent pas d'évaluer seuls :

- la pertinence de chaque alternative et de chaque intitulé ;
- chaque contraste sur gradient, image ou pseudo-élément ;
- l'ordre, la concision et le confort d'une restitution vocale réelle ;
- l'ensemble des critères RGAA sur toutes les variantes de données.

Chaque contrôle humain futur doit préciser date, navigateur, page, état de
données, technologie d'assistance, critère, résultat, anomalie et preuve. Toute
anomalie doit être reliée au plan de correction et à une contre-recette.

## Conclusion pour C2.2.3

L'exigence RNCP de présenter les actions mises en œuvre pour permettre l'accès
aux personnes en situation de handicap est étayée par des correctifs, des
tests reproductibles, un échantillon public/privé et un véritable zoom
navigateur à 200 % et 400 %.

Deux limites restent volontairement explicites : la qualification humaine des
fonds composites signalés `incomplete` et un parcours avec un vrai lecteur
d'écran. **Aucun test NVDA, Narrator, JAWS ou VoiceOver n'a été réalisé ou
observé dans cette campagne.** L'arbre AX Chromium n'est pas assimilé à une
restitution vocale. La conformité RGAA exhaustive reste donc non déterminée et
n'est pas revendiquée.
