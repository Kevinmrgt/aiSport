# Recette responsive — 9 septembre 2026

La refonte conserve ses 12 pages et ses fonctionnalités. Ce complément adapte les écrans étroits, les tailles intermédiaires et le minuteur en paysage. Les vérifications utilisent la vraie interface et les actions serveur avec l’API de démonstration en mémoire de `scripts/refonte-preview.mjs`.

## Corrections

- Statistiques : deux colonnes jusqu’à la tablette, taille des chiffres adaptée et effort avec son unité sur une ligne.
- Programmes : actions sous les informations sur tablette ; confirmation et titres peuvent se répartir sans élargir la carte. Historique présenté en lignes réorganisées sur tablette et téléphone.
- Formulaires : bouton de génération sans largeur minimale imposée sur mobile, fieldsets réductibles, boutons contenus dans leur panneau. Les placeholders de chargement sont limités à la largeur disponible.
- Navigation mobile : largeur répartie selon les libellés pour conserver les cinq intitulés sur une ligne à 320 px. Les semaines du programme passent sur deux colonnes sur petit mobile.
- Minuteur : anneau proportionnel à son panneau, plein écran défilable depuis son premier contrôle, disposition en deux colonnes en paysage court, prise en compte des zones réservées aux bords de l’écran. Rotation et sortie conservent l’état courant.
- Bilan : les dix choix d’effort restent présents, répartis sur plusieurs lignes sur petit écran. À 320 px, chaque choix mesure environ 47 × 50 px. Les boutons de confirmation/annulation mesurent au moins 44 px de haut, y compris hors des listes.

Les fonds abstraits et le véritable verre transparent sont conservés : panneaux standard `rgba(142, 182, 155, 0.1)` et `backdrop-filter: blur(18px) saturate(1.12)`. Aucun masquage global des débordements n’a été ajouté.

## Couverture et résultats

Les 12 routes : accueil, connexion, création de séance, progression, historique, détail de séance, programmes, création de programme, détail de programme, séance de programme, Coach et confidentialité.

| Vérification                                                                            | Résultat                                                                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 12 routes à 320, 360, 600, environ 768, 1025, 1280 et 1920 px pendant l’intégration     | Aucun débordement horizontal de page. Le contrôle des enfants a repéré puis permis de corriger le bouton du formulaire.                 |
| Version compilée : 12 routes × 320, 770 et 1280 px, hauteur 840 px                      | 36 contrôles réussis, aucun débordement de page ni de contenu hors des panneaux.                                                        |
| Anneau intégré à 320 px                                                                 | Environ 211 px, égal à la largeur intérieure disponible.                                                                                |
| Plein écran à environ 843 × 390 px                                                      | Sortie, reprise et passage d’étape dans la fenêtre ; contenu long défilable depuis le début. Pas de débordement horizontal du dialogue. |
| Rotation vers 320 × 840 puis sortie                                                     | Étape et pause conservées ; focus rendu à « Reprendre ».                                                                                |
| Bilan à 320 px                                                                          | Dix efforts et trois ressentis accessibles ; notes saisies ; sauvegarde de démonstration réussie, « Enregistré » désactivé ensuite.     |
| Confirmation programme à 320 et environ 768 px                                          | Message et commandes contenus dans la carte ; annulation sans suppression.                                                              |
| Programme de quatre semaines à 320 px                                                   | Quatre onglets visibles sur deux lignes ; touche End sélectionne la semaine 4.                                                          |
| Aucun résultat, 404, erreur serveur simulée, quota épuisé des deux formulaires à 320 px | Messages et commandes sans débordement. La panne et le quota artificiels ont ensuite été remis à zéro/valeur normale.                   |
| Tests et compilation                                                                    | 89 tests réussis dans 18 fichiers ; compilation de production, lint et types réussis. Aucun fichier de route supprimé.                  |

Le seul dépassement de 4 px encore relevé par la sonde des enfants concerne l’icône « + » tournée en croix dans un accordéon ouvert : sa boîte transformée reste à l’intérieur des 18 px de padding du panneau. Aucun texte ou contrôle ne dépasse la carte ; ce signal n’est pas un débordement de contenu.

## Preuves et limites

Preuves dans `output/design/responsive-2026-09-09/` :

- `mesures-production.json` : les 36 contrôles de la version finale compilée, avec dimensions réellement lues dans le navigateur.
- `mesures-avant.json`, `mesures-apres-dev.json`, `mesures-tous-etats.json` : relevés successifs ; les fichiers intermédiaires conservent aussi les défauts corrigés ensuite.
- `minuteur-paysage.json`, `bilan-320.json` : dimensions des commandes et du dialogue.
- `accueil-mobile-390.png`, `programmes-tablette-768.png`, `progression-mobile-320.png` : captures relues pendant l’intégration. La dernière précède l’ajustement final de largeur des libellés de navigation ; leur passage sur une ligne a été confirmé par mesure DOM en production.
- `tests.log`, `build.log`, `etat-api-final.json` : résultats et état de démonstration restauré.

Chrome utilise un zoom préexistant de 80 % : les dimensions d’émulation ont été compensées et les mesures CSS effectives consignées. La largeur demandée de 768 px correspond approximativement à 767,5 px CSS ; 770 px a donc également été vérifié en production pour couvrir l’autre côté du seuil de 768 px. Le zoom du navigateur n’a pas été changé.

Des captures ont échoué dans l’outil Chrome pendant l’émulation et le plein écran. Les contrôles de géométrie et les interactions ont continué dans le même navigateur ; les images manquantes ne sont pas présentées comme des captures validées. Les fichiers initiaux `avant-320-*` représentent en réalité environ 400 px CSS avant compensation du zoom et ne servent pas de preuve à 320 px.

Cette recette ne constitue pas un test sur téléphones physiques, Safari/iOS ou Firefox, ni un audit complet au lecteur d’écran ou au zoom natif 200 %. L’authentification Google, la base et la génération IA réelles ne sont pas sollicitées par l’aperçu isolé. Aucun déploiement n’a été effectué.
