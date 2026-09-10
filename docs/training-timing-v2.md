# Durées et prescriptions des entraînements

La version 2 remplace la répartition proportionnelle des secondes. Le même planning sert à la validation côté serveur, à la présentation et au minuteur. Elle s'applique aux nouvelles séances simples et aux séances des programmes.

## Contrat et calcul

Chaque mouvement possède une prescription versionnée : catégorie, mode, séries/tours, répétitions éventuelles, durée par série, repos entre efforts, transition finale et circuit éventuel. En répétitions, la durée d'effort est une **estimation** ; l'utilisateur valide chaque série. Le bilan mesure le temps actif réellement écoulé, repos compris et pauses exclues.

Pour des séries classiques : `séries × effort + (séries − 1) × repos + transition`. Dans un circuit, les mouvements alternent à chaque tour ; chaque effort est suivi de son repos sauf le tout dernier. Une seule transition termine le circuit. Les échauffements et retours au calme sont inclus.

La durée demandée est une cible indicative. La marge acceptée est de ±10 %, plafonnée à 5 minutes : pour 60 minutes demandées, 55 à 65 minutes sont acceptées, bornes incluses. Cette souplesse a été demandée après les premiers essais de production. Le composeur conserve une proposition déjà valide, même légèrement plus courte ou plus longue. Sinon il cherche une combinaison de séries/tours ou de minutes de cardio continu. Il peut aussi raccourcir les phases par paliers de 30 s : 120 s au total au maximum, dont 120 s d'échauffement et 60 s de retour au calme, sans supprimer de phase ni franchir leurs minima. Il ne les allonge jamais pour remplir le créneau et ne modifie ni les repos, ni les répétitions, ni la durée d'une série de force. Les états de recherche distinguent durée et volume total de force ; les variantes invalides sont éliminées avant comparaison. Les plafonds de séries sont vérifiés après composition pour permettre de réduire un brouillon trop chargé. L'interface distingue la cible de la durée totale calculée par le planning.

## Garde-fous de produit

Ces limites sont des valeurs initiales de planification, centralisées dans `packages/shared/src/training/rules.ts`, et non des prescriptions universelles pour tout athlète.

| Travail | Durée par effort | Séries maximales débutant / intermédiaire / avancé |
| --- | --- | --- |
| Force | 10–60 / 90 / 120 s | 4 / 5 / 6 |
| Isométrie | 10–45 / 60 / 90 s | 4 / 5 / 6 |
| Mobilité | 15–90 s | 4 |
| Cardio fractionné | 10–300 s, borne réduite pour mouvements explosifs reconnus | 12 |
| Technique | 10–180 s | 12 |
| Cardio continu | Minutes entières, 5–60 / 120 / 180 min | 1 |

Les repos appartiennent à la liste `0, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300 s`. Les transitions valent `0, 15, 30, 45, 60 s`. Le repos minimal entre efforts dépend de la catégorie ; la consigne IA privilégie notamment 90–180 s pour la force exigeante. Les efforts sont multiples de 5 s, les phases multiples de 30 s. Un nom de mouvement connu ne peut pas contourner sa catégorie, et le cardio continu doit nommer une activité reconnue.

L'échauffement dure au moins 3 min et au plus 30 % du créneau (plafond 15 min). Le retour au calme dure au moins 2 min et au plus 20 % (plafond 10 min). Le volume total de force est limité à 24 / 32 / 40 séries. Les descriptions techniques et conseils ne sont pas réécrits pour combler du temps.

## Génération, programmes et compatibilité

Le fournisseur reçoit un [schéma de sortie JSON strict](https://developers.openai.com/api/docs/guides/structured-outputs) : modes compatibles avec chaque catégorie, paliers de repos et de transition, bornes numériques par niveau et métadonnées demandées. La validation métier côté serveur reste obligatoire après réception. Les transitions internes aux circuits, ignorées par l'ordonnanceur, sont normalisées à zéro ; la transition finale et les repos sont conservés.

Pour corriger une semaine, toutes les séances sont contrôlées avant de renvoyer les problèmes à l'IA, avec leur numéro. Cela évite qu'une correction de la première séance laisse une deuxième séance invalide non signalée.

L'IA fournit un brouillon structuré. Les valeurs `null` sont assimilées à une absence uniquement pour `tips`, `reps` et `circuit_id`, qui sont facultatifs dans ce brouillon ; le contrat enregistré reste strict. Le serveur contrôle les paramètres demandés, les catégories, les bornes, les circuits et le budget. Une proposition invalide déclenche une correction ciblée incluant la proposition précédente et les problèmes détectés si le délai restant le permet : deux tentatives maximum, budget global 55 s, marge de réponse 5 s. Les journaux indiquent les chemins de champs et les règles rejetées sans enregistrer les réponses brutes, objectifs ou contraintes. Un résultat impossible n'est pas enregistré.

Les semaines d'un programme conservent leur génération parallèle. Toutes utilisent les mêmes contrôles et un cadre commun : adaptation, progression modérée éventuelle, consolidation. La consigne exclut les charges maximales automatiques et demande une alternance des efforts. Ce cadre ne constitue pas un suivi individualisé des charges entre semaines : les performances réelles ne sont pas connues au moment de la génération. Les contrôles numériques ne remplacent pas l'évaluation sportive du choix des exercices ; la reconnaissance des noms reste heuristique.

Les champs historiques de durée restent fournis sous forme agrégée pour les anciens clients. Le contrat vérifie leur cohérence avec la prescription. `planning_version: 2` est obligatoire lorsqu'une séance contient des prescriptions.

Les données déjà enregistrées ne sont ni migrées ni normalisées à la lecture. Sans prescription, le minuteur conserve un seul bloc par exercice et son repos historique ; il ne multiplie pas des durées potentiellement déjà agrégées par le nombre de séries. Un lien sur le détail propose de préparer une nouvelle séance ou un nouveau programme. L'ancien contenu et l'historique sont conservés.

## Vérification

Les tests couvrent notamment les repos à 101 s, les séries de 990 s, l'impossibilité de remplir artificiellement un long créneau avec deux exercices de force, les bornes de durée, les circuits, l'idempotence, la projection des durées, la lecture immuable des anciens programmes et le temps réel du minuteur avec pauses. Les régressions de boxe couvrent une proposition à 61 min conservée pour une cible de 60 min, ainsi que la réduction d'un mouvement à six séries vers cinq pour obtenir 59 min. Les champs facultatifs nuls et les plafonds de réduction des phases sont vérifiés séparément.

`node scripts/refonte-preview.mjs --timing` ajoute deux séances de démonstration pour contrôler séries et circuits dans la vraie interface sans base réelle. Le test réel du fournisseur est volontaire et payant : depuis `apps/api`, `node --import tsx scripts/training-quality-smoke.ts --live`, ou l'entrée manuelle `live_training_qa` du workflow CI. Il utilise uniquement des profils synthétiques et écrit un rapport local ; aucun entraînement n'est sauvegardé dans la base. Il n'est pas exécuté à chaque commit.

L'option supplémentaire `--boxing` exécute trois générations indépendantes « boxe anglaise, intermédiaire, 60 min, explosivité, sac de frappe ». Sans cette option, la matrice comprend aussi la musculation, la course, le circuit, la mobilité et un programme de deux semaines. Le script affiche les prescriptions synthétiques pour permettre une revue qualitative du résultat en plus de la validation numérique.

Références ayant orienté la conception : [ACSM, mise à jour 2026 sur l'entraînement de résistance](https://acsm.org/resistance-training-guidelines-update-2026/) pour l'individualisation et la simplicité ; [ACE, construction de circuits](https://www.acefitness.org/continuing-education/certified/august-2024/8682/the-ace-workout-builder-for-circuit-training/) pour la distinction entre efforts, repos et tours. Les seuils exacts du tableau sont des choix de produit et ne sont pas attribués à ces sources.
