# Référentiel et périmètre de vérification accessibilité — Bloc 2

> Compétence : C2.2.3 — état vérifié le 2026-07-22.

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
| 3. Couleurs | Textes, boutons, focus, fonds opaques et composites | axe `color-contrast`, calculs sRGB, regroupement, échantillonnage composite et borne conservatrice | **Couvert sur l'échantillon** : 0 violation calculable ; 165/166 contextes passent l'échantillonnage et le dernier est décidé à 15,00:1 dans le pire cas |
| 4. Multimédia | Aucun lecteur audio ou vidéo dans les composants observés | recherche source et échantillon navigateur | **Non applicable observé** |
| 5. Tableaux | Aucun tableau de données dans les états observés | recherche source et échantillon navigateur | **Non applicable observé** |
| 6. Liens | Navigation, lien d'évitement, cartes et actions | axe public, inventaire tabulable, cycle `Tab` | **Couvert sur l'échantillon** ; pertinence de tous les intitulés futurs à maintenir |
| 7. Scripts | Formulaires, erreurs, dialogues, Timer, onglets | tests composants, alertes `role="alert"`, clavier, arbre AX et parcours NVDA B2-A41 | **Partiel** : restitution réelle exécutée ; faux message `NEXT_REDIRECT` corrigé localement, contre-recette requise |
| 8. Éléments obligatoires | Langue, titres de pages et structure HTML | axe public, arbre AX, tests de structure | **Couvert sur l'échantillon** |
| 9. Structuration | `main`, navigation nommée, titres, listes, formulaires | arbre AX sur huit routes, tests `h1`/`h2` | **Couvert sur l'échantillon** ; deux titres internes ont été corrigés de `h1` vers `h2` |
| 10. Présentation | Reflow, zoom, focus, longueur variable des contenus | zoom Chromium natif 200/400 %, reflow CSS, contrôle des rectangles | **Couvert sur l'échantillon** : zoom 16/16 sans rognage et 166/166 contextes composites décidés |
| 11. Formulaires | Labels, erreurs reliées, contrôles de séance et de paramètres | axe, tests composants, clavier, alertes | **Couvert sur les formulaires échantillonnés** |
| 12. Navigation | Skip link, menu, ordre de tabulation, absence de piège | cycles clavier complets sur huit routes | **Couvert sur l'échantillon** |
| 13. Consultation | Contenus générés, changements dynamiques, Timer | tests composants/E2E, arbre AX et Visionneuse de parole NVDA | **Partiel** : Timer et erreurs restitués ; annonce de sauvegarde corrigée localement, confort auditif non évalué |

Cette matrice doit être mise à jour dès qu'un nouveau type de contenu apparaît.
Un statut « non applicable observé » devient à réévaluer si un cadre, un média
ou un tableau est ajouté.

## Résultats automatisés rejoués

Les contrôles suivants ont été rejoués les 2026-07-21 et 2026-07-22 sans exposer le contenu du
stockage OAuth local :

- suite publique locale Chromium et Firefox : **48 tests lancés, commande
  terminée avec le code 0** ;
- suite RNCP de production authentifiée : **33 tests lancés, commande terminée
  avec le code 0** sur les huit routes de l'échantillon ;
- zoom Chromium natif en production : **16/16 mesures** à 200 % et 400 %, zoom
  obtenu 2×/4×, aucun débordement horizontal et aucun texte ou contrôle rogné ;
- contraste détaillé en production : **8 routes, 0 violation, 19 nœuds
  calculés conformes et 416 nœuds `incomplete`** ;
- préqualification des contrastes composites : **416 occurrences regroupées en
  79 signatures de rendu et 166 contextes route-signature**, dont 34 signatures
  P1 et 45 P2 pour la revue humaine ;
- échantillonnage post-déploiement du fond composite sous les glyphes : **165/166
  contextes en succès automatisé** ; le dernier contexte, `/programs`
  `.section-kicker`, est décidé par une borne conservatrice à **15,00:1** dans
  le pire cas, soit 166/166 contextes décidés sur l'échantillon ;
- tests de structure des deux formulaires : **2/2 réussis** ;
- audit sémantique authentifié B2-A40 : **huit routes principales et trois
  détails dynamiques**, sans contenu principal ou titre principal multiple,
  sans commande visible non nommée ni identifiant dupliqué ; confirmation de
  suppression annulée avec restitution du focus ;
- parcours réel NVDA B2-A41 sur les pages publiques et authentifiées : **6
  scénarios conformes, 3 partiels et 1 non conforme**, avec trace de la
  Visionneuse de parole ; B2-BUG-042/043 corrigés localement.

Les 416 résultats `incomplete` ne sont pas 416 non-conformités : axe ne sait
pas calculer le fond composite final. Ils ne sont pas davantage considérés
comme conformes sans vérification humaine. Le regroupement reproductible par
cause axe, couleur, fond, graisse, corps et seuil WCAG réduit la liste de revue,
mais ne remplace pas la mesure sur le pixel composite le plus défavorable.

Les 14 alertes potentielles initiales ont conduit à renforcer les fonds et
textes de la navigation, des métriques, des libellés de section, de
l'introduction, du pied de page et de la page de confidentialité. Les
correctifs ont passé la CI `29907294766`, la CD `29907642144` et le rejeu de
production. Le dernier contexte non échantillonné automatiquement est tranché
par une borne conservatrice à 15,00:1, détaillée dans B2-A37.

## Audit sémantique complémentaire du 22 juillet

B2-A40 contrôle la présence d'un `main#main-content` et d'un seul `h1`, le
lien d'évitement, les noms accessibles, les identifiants et les relations ARIA
sur les huit routes principales. Les pages de détail d'un programme, d'une
séance de programme et d'une séance enregistrée complètent l'échantillon. Les
deux pages Timer exposent les régions dynamiques attendues.

Deux anomalies ont été reproduites sur la production `rc.3` :

- après une soumission invalide, les alertes étaient correctement reliées aux
  champs mais le focus restait sur le bouton ;
- deux onglets d'un programme désignaient des panneaux absents avec
  `aria-controls`.

La version `rc.4` focalise maintenant le premier champ invalide et conserve
tous les panneaux d'onglets dans le DOM en masquant les inactifs. Après la CI
et la CD vertes, la contre-recette de production a observé le focus sur
`input-sport` et 3/3 relations `aria-controls` résolues.

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

Le poste de contrôle contient Narrator (`Narrator.exe`, version de fichier
`10.0.22621.6133`) et une copie portable officielle de NVDA `2026.1.1`.
Narrator a été lancé mais sa sortie n'a pas pu être capturée dans la session
RDP. NVDA a réellement exécuté la grille B2-A41 avec Chrome `150.0.7871.129` ;
sa Visionneuse de parole et son journal niveau entrée/sortie fournissent la
trace textuelle. Aucune appréciation auditive humaine n'est déduite de cette
trace.

## Conclusion pour C2.2.3

L'exigence RNCP de présenter les actions mises en œuvre pour permettre l'accès
aux personnes en situation de handicap est étayée par des correctifs, des
tests reproductibles, un échantillon public/privé et un véritable zoom
navigateur à 200 % et 400 %. L'audit B2-A40 renforce la preuve structurelle et
la gestion du focus sans être assimilé à une restitution vocale.

Un parcours avec un vrai lecteur d'écran est désormais consigné dans B2-A41.
Il confirme les noms, rôles, états, alertes, onglets, commandes du Timer et
restitutions de focus sur l'échantillon, tout en révélant deux anomalies
B2-BUG-042/043 corrigées localement. Leur CI, déploiement et contre-recette NVDA
restent nécessaires. Les 166 contextes composites sont décidés séparément dans
B2-A37. La conformité RGAA exhaustive et une validation auditive humaine ne
sont pas revendiquées.
