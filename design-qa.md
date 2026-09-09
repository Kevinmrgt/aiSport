# Alcide — QA de la refonte UI/UX

Date : 9 septembre 2026. Périmètre : 12 pages existantes, 14 états de référence, navigation et composants partagés. La demande autorise une réorganisation de l’UX, avec conservation des capacités du projet.

**Final result: passed**

Aucun défaut P0/P1/P2 identifié restant dans le périmètre visuel contrôlé. Ce résultat concerne l’interface et les parcours locaux décrits ci-dessous ; il ne certifie pas les intégrations Google, OpenAI ou PostgreSQL réelles.

## Références et preuves

- Source visuelle : `output/design/frames-site-2026-09-09-01a08582/01-accueil.png` à `14-confidentialite.png`, et son `manifest.json`.
- Implémentation : `http://127.0.0.1:3100`, application Next réelle. Prévisualisation isolée avec API en mémoire, Auth.js jury et actions serveur. Version finale démarrée à partir du build de production.
- Captures : `output/design/refonte-verification/01-accueil.png` à `14-confidentialite.png`, `mobile-*.png`, `tablette-*.png`.
- Comparaisons communes frame/site : `output/design/refonte-verification/comparisons/*.jpg` ; chaque planche met effectivement la source et le rendu dans la même image. Galerie : `output/design/refonte-verification/galerie.html`.
- Détails comparés : `comparisons/detail-01-accueil.jpg`, `detail-10-creation-programme.jpg`, `detail-07-minuteur-actif.jpg`. Ces régions permettent de relire choix, champs, icônes, chiffres et commandes sans se limiter aux vues d’ensemble.
- Inventaire et résultats fonctionnels : `docs/design/refonte-preservation.md`, 32 capacités, avec preuves et limites individuelles.

## Dimensions, densité et état

Les 14 sources mesurent 1422 × 1106 pixels. Le viewport desktop demandé au navigateur est 1422 × 1106 CSS px, DPR 1. Certaines captures CUA avec barre de défilement sont livrées en 1407 × 1094 pixels, les autres en 1422 × 1106. `comparison-manifest.json` donne les dimensions réelles fichier par fichier. Les planches réduisent chaque image proportionnellement dans une zone de 895 × 695, sans déformation ; aucun score de similitude pixel à pixel n’est revendiqué.

Exception documentée : le minuteur en mode plein écran a été capturé à la taille réelle de la fenêtre, 1936 × 1048, DPR 1 (`timer-viewport.json`). Le rendu final utilise le dialogue de repli, `nativeFullscreen: false`. Les commandes sont toutes visibles. La vue native avait également été exercée pendant la recette de développement. Le format diffère de la frame ; la comparaison de ce mode se fonde sur la hiérarchie et la région minuteur/commandes, pas sur l’occupation exacte de la même hauteur.

Les captures mobiles utilisent 390 × 844 CSS px ; les 12 routes sont représentées dans `browser-pages.json`, sans débordement horizontal. Deux vérifications complémentaires à 768 × 1024 couvrent le formulaire programme et une séance de programme. Le mode plein écran sur téléphone physique et le zoom natif restent hors de cette recette.

Les données des listes et statistiques sont celles de l’API de test, et non les nombres dessinés dans les frames. Les formulaires de comparaison finale reprennent les exemples des frames. Le quota jury, les labels explicites, les champs requis, les métadonnées et les contenus légaux existants demeurent visibles même lorsqu’ils ajoutent de la hauteur. Le bilan capturé est celui d’une session de programme après saisie. La navigation dépend de la session ; la frame confidentialité est publique alors que sa capture de recette est connectée.

## Historique des écarts et corrections

| Priorité | Constat                                                                                                          | Correction                                                                                                                                  | Preuve après correction                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Le rafraîchissement serveur après sauvegarde du bilan réinitialisait le minuteur et masquait le résultat.        | Réinitialiser seulement lorsqu’un identifiant ou le contenu sémantique de la séance change. Conserver le bilan pour des props équivalentes. | Tests Timer.interactions ; `bilan-programme-sauvegarde.txt` ; succès après une erreur 503 et nouvelle tentative.                                    |
| P1       | Une soumission très précoce pouvait précéder l’hydratation du formulaire.                                        | Champs et soumission désactivés jusqu’à disponibilité du formulaire ; méthode POST et garde de soumission.                                  | Trois tests `form-readiness`, génération séance et programme au navigateur.                                                                         |
| P2       | Les onglets de semaine ne distinguaient pas assez la sélection.                                                  | Fond sauge de l’onglet actif, état ARIA et clavier conservés.                                                                               | `11-detail-programme.png`, tests de navigation clavier.                                                                                             |
| P2       | Le fond textile initial présentait une texture trop dominante par rapport au centre calme des frames.            | Nouvelle image générée, maille plus fine et lumière mieux répartie.                                                                         | Asset final `refonte-textile.webp`, comparaison `01-accueil.jpg`. Source de la variante antérieure conservée dans `output/design/refonte-assets/`.  |
| P2       | L’aide de durée placée entre label et champ désalignait la première ligne du formulaire séance.                  | Aide déplacée sous le champ, association accessible conservée.                                                                              | `03-creation-seance.png`, alignement comparé à la frame.                                                                                            |
| P2       | Le formulaire programme était trop haut sur desktop et repoussait le bouton de génération sous le premier écran. | Réduction des marges et espacements propres au programme, sans retirer de champ ni de quota.                                                | Nouvelle compilation, `10-creation-programme.png`, comparaison finale et captures mobile/tablette. Le bouton est entièrement visible à 1422 × 1106. |

Les premières captures de certains écrans ont été remplacées lors de la recapture finale ; les constats initiaux sont consignés ici et dans les échanges de recette, tandis que les fichiers de comparaison contiennent la version corrigée.

Un défaut apparent de bande noire pendant la capture du plein écran a fait l’objet d’un diagnostic en lecture seule par `error_investigator`. L’ancienne image de 1422 × 770 correspondait à une réduction de la surface native 1936 × 1048 pendant l’émulation. Réinitialiser le viewport, sans changer le produit, a supprimé la bande. La preuve finale montre le dialogue rempli sur 1936 × 1048. Aucun correctif CSS artificiel n’a été ajouté pour cet artefact.

## Cinq surfaces de fidélité

**Polices et typographie.** Barlow pour les titres et Urbanist pour l’interface, servies localement par Next Font. Les titres restent courts, sportifs et sans serif ; la hiérarchie, les retours à la ligne et les chiffres du minuteur ont été relus dans les planches et leurs détails. Les icônes proviennent de Phosphor. Les familles exactes d’une image générée ne sont pas identifiables comme des fichiers de fontes : il s’agit d’une correspondance visuelle. Les longs titres peuvent se répartir sur plusieurs lignes, sans suppression de texte.

**Espacements et disposition.** Configuration centrale de l’accueil, bande de statistiques, liste de séances, programmes, onglets de semaine, détail à deux colonnes et bilan large reprennent la structure des frames. Les listes conservent neuf résultats par page et peuvent défiler. Les informations plus nombreuses qu’une frame illustrative ne sont pas retirées pour forcer un écran de hauteur fixe. Les alignements de formulaire et la hauteur du programme ont été corrigés et recapturés.

**Couleurs et surfaces.** Palette pétrole/sauge : #051F20, #0B2B26, #163832, #235347, #8EB69B, #DAF1DE. Les panneaux standard utilisent une teinte à 10 % et les soft à 7 %, avec flou de l’arrière-plan de 18 px et saturation 1,12. Le texte reste à opacité 1. Les boutons sélectionnés sont volontairement plus opaques pour lire l’état actif.

**Images.** Trois fonds WebP abstraits, issus d’Image Gen : textile, performance et mouvement. Ils sont appliqués derrière les surfaces, avec un centre lisible et des variantes par route. Aucun fond n’est une capture de l’interface avec texte ou contrôles intégrés. La découpe est responsive ; le rendu de la matière varie donc avec le viewport. Les anneaux et graphiques de données restent des éléments calculés, correspondant aux valeurs réelles du minuteur et des statistiques.

**Textes et contenu.** Les titres simples sont conservés. Le bloc demandé « Un cadre clair. La liberté d’avancer. » avec « Vos envies », « Une séance adaptée » et « Votre progression » est présent. Les accroches supplémentaires sont retirées. Les informations fonctionnelles de quota, aide, erreur, conseils d’exercice et confidentialité restent présentes. Le guide Coach ne promet pas de conversation ou réglages absents du projet.

## Preuve de transparence

`glass-a.png` et `glass-b.png` montrent exactement les mêmes panneaux de l’historique avec le même contenu, la même géométrie et les mêmes styles ; seul le fond passe de textile à performance. Les relevés `glass-a.json` et `glass-b.json` sont identiques. `glass-comparison.jpg` permet de voir que la couleur transmise à travers le filtre soft et la liste standard change, alors que les textes restent nets. `glass-proof.json` mesure également une différence des pixels à l’intérieur des deux panneaux. Le fond normal a été restauré avant compilation.

La variante `glass-strong` demeure disponible à 16 % dans la primitive partagée, mais aucune page finale ne l’utilise ; son rendu est couvert par le test des primitives, sans preuve A/B de production. Le repli sans prise en charge de `backdrop-filter` utilise une surface plus opaque pour maintenir la lisibilité ; ce cas n’a pas été testé dans un navigateur ancien.

## Parcours et contrôles

- Sélection objectif/durée à l’accueil, passage par la connexion jury, génération séance et programme via actions serveur, ouverture et rechargement.
- Historique : filtres combinés, aucun résultat, reset, pagination, annulation puis suppression d’une séance fictive. Programmes : pagination et suppression ciblée d’un programme fictif.
- Programme de quatre semaines et vingt séances : sélection clavier de la dernière semaine, accès à la dernière séance, contexte et identifiants corrects.
- Minuteur : départ, passage du temps, pause stable, reprise, plein écran/sortie, étapes jusqu’au bilan. Exercice manuel et focus couverts en tests.
- Bilan séance et programme : champs facultatifs, provenance, sauvegarde, erreur réessayable sans perdre la saisie et maintien du résultat enregistré.
- Statistiques calculées et actualisées ; quota commun épuisé qui bloque les deux générations ; déconnexion et redirection d’un lien protégé.
- 84 tests réussis dans 17 fichiers (`unit-tests-final.log`). Lint, types et compilation de production réussis (`lint.log`, `typecheck.log`, `build.log`). Aucun fichier de route ou handler n’a disparu (`routes-apres-refonte.json`).

Les journaux navigateur ont été consultés. Les erreurs de compilation rencontrées pendant l’intégration ont été corrigées ; l’erreur de bilan 503 était injectée intentionnellement pour vérifier la reprise. Aucune nouvelle erreur console de la version compilée n’a été relevée dans les derniers parcours. Cela ne remplace pas une surveillance des services réels.

## Limites et suite de recette

OAuth Google externe, génération OpenAI réelle, persistance PostgreSQL, isolation entre deux comptes réels, réservation atomique du quota, son sur matériel physique, zoom natif et audit complet avec lecteur d’écran n’ont pas été rejoués. Leurs contrats et composants existants sont conservés. Les validations locales et les zones partiellement testées sont explicitées capacité par capacité dans la matrice.

Écarts acceptables : fonds nouvellement générés dans la même DA, texte réel plus complet que les exemples, liste de neuf éléments, actions de suppression avec intitulé, titre du contexte conservé au-dessus du bilan et navigation adaptée à la session. Ces choix suivent la priorité de conservation fonctionnelle et la liberté de réorganisation UX donnée par l’utilisateur.

P3 : un réglage fin de l’épaisseur des reflets et des graisses de petits textes pourra être fait après retour visuel de l’utilisateur. Il ne bloque aucun parcours contrôlé.

## Checklist de livraison

- [x] Douze pages transformées ; aucune route existante retirée.
- [x] Quatorze états comparés aux frames, avec régions détaillées.
- [x] Transparence réelle des surfaces utilisées vérifiée sur deux fonds.
- [x] Recette desktop, mobile et contrôles tablette.
- [x] Défauts bloquants trouvés corrigés ; nouvelle comparaison des écrans modifiés.
- [x] Tests, types, lint et build réussis.
- [x] Limites d’intégration réelle documentées.
- [x] Prévisualisation locale disponible ; aucun déploiement réalisé.

## Correctif de l’accès à l’aperçu après retour utilisateur

Le bouton Google de l’aperçu déclenchait une erreur 401 `invalid_client` : le lanceur local transmettait `local-unused` comme identifiant OAuth. La capture utilisateur et l’URL de l’onglet Chrome confirmaient cette valeur. Diagnostic confirmé en lecture seule par `error_investigator`. Ce défaut P1, non exercé pendant la première recette, est corrigé.

L’aperçu isolé propose désormais « Explorer l’aperçu », avec un texte explicite sur les données de démonstration. L’action ouvre la session jury de la fixture, via la vérification de credentials existante. Le secret temporaire est généré au lancement et reste côté serveur. Le mode nécessite une option explicite, les origines locales exactes du lanceur et l’identité fictive attendue ; il refuse une API distante ou un compte ordinaire. Google reste proposé dans le fonctionnement normal du projet et n’est plus enregistré comme fournisseur dans l’aperçu isolé.

Validation : 89 tests réussis dans 18 fichiers, compilation avec types et lint réussie. Dans l’onglet Chrome de l’utilisateur, « Explorer l’aperçu » ouvre bien `/programs` et ses dix programmes de test. `auth-preview-providers.json` confirme que l’aperçu n’annonce que son fournisseur jury. Captures et journaux : `connexion-apercu-corrigee.png/.txt`, `connexion-apercu-succes.txt`, `auth-preview-tests.log`, `auth-preview-build.log`, dans le dossier de preuves. La nouvelle capture de connexion a été relue visuellement à 1920 × 911, viewport normal du navigateur ; sa présentation simplifiée est spécifique au mode démonstration.

Les clés Google réelles sont absentes de la configuration locale inspectée ; la connexion Google réelle n’est donc toujours pas validée. Aucun paramètre du déploiement réel n’a été modifié.

final result: passed

## Complément responsive — 9 septembre 2026

Les 12 pages ont été contrôlées de 320 à 1920 px. Les chiffres, les listes sur tablette, les confirmations, le bouton de génération, les chargements et le minuteur en paysage ont été ajustés ; le verre transparent et les fonctionnalités restent présents. La version compilée passe 36 mesures (12 routes à 320, 770 et 1280 px), les états mobile supplémentaires, 89 tests et la compilation avec lint/types.

La recette détaillée, ses preuves et ses limites sont consignées dans `docs/design/responsive-2026-09-09.md`. Les dimensions réelles sont enregistrées ; les problèmes de capture de l’outil ne sont pas confondus avec le rendu de l’application.
