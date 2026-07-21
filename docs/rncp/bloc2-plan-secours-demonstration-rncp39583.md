# Plan de secours de démonstration — Bloc 2 RNCP39583

> Objectif : conserver une preuve compréhensible sans présenter une capture ou
> un résultat historique comme une observation live.

## Préparation

### Trente minutes avant l'oral

- contrôler l'accès à l'application et au compte de recette dédié ;
- appeler les healthchecks Web, API et readiness sans afficher de secret ;
- ouvrir les runs CI `29845956008` et CD `29846343559` ;
- ouvrir localement le dossier, les annexes, les captures B2-A30 et le
  `MANIFESTE.txt` ;
- vérifier que les PDF restent accessibles sans réseau ;
- fermer l'historique, les consoles et gestionnaires pouvant révéler une
  identité, un jeton ou une variable d'environnement.

### Cinq minutes avant l'oral

- ne pas se déconnecter si la session dédiée est valide ;
- placer le Timer sur une séance de recette non sensible ;
- garder le cahier de recettes à CR-055 et ouvrir B2-A38 pour CR-062 ;
- basculer l'ordinateur sur secteur et couper les notifications.

## Niveaux de démonstration

### Niveau A — Production et OAuth disponibles

Exécuter le parcours live du script : accueil, génération sans appel IA
obligatoire, programme, Timer, journal, dashboard et paramètres. Ne créer que
des données de recette et les supprimer après l'oral si une création est
nécessaire.

### Niveau B — OAuth indisponible, production publique disponible

1. Montrer la redirection vers le fournisseur uniquement si elle fonctionne.
2. Dire : « L'obtention d'une nouvelle session n'est pas disponible maintenant ;
   je passe aux preuves horodatées, sans qualifier cette étape de live. »
3. Présenter B2-A24 pour le démarrage OAuth, B2-A25/B2-A34 pour le parcours
   authentifié et B2-A30 pour le rendu bureau/mobile anonymisé.
4. Poursuivre en live sur les pages publiques et les healthchecks.

### Niveau C — Production indisponible, plateformes de preuve disponibles

1. Montrer que l'échec est externe au support local, sans tenter de modifier la
   production pendant l'oral.
2. Afficher la CI `29845956008`, le CD `29846343559` et leurs SHA.
3. Montrer B2-A28 pour la chaîne CI/CD, B2-A38 pour la gate négative, B2-A29
   pour les mesures de production, B2-A30 pour le prototype et B2-A34/B2-A35
   pour les recettes finales.
4. Dire : « Ces éléments sont des preuves conservées de la campagne du
   21 juillet 2026 ; ils ne prouvent pas la disponibilité à cet instant. »

### Niveau D — Réseau entièrement indisponible

Utiliser uniquement le paquet local manifesté : dossier, annexes, captures,
archive source et trois manuels. Montrer dans `MANIFESTE.txt` les SHA et
empreintes. Ne pas lancer un serveur local non préparé, car son environnement
ne serait pas la production `b002adb` démontrée dans le dossier.

## Incidents et bascule probatoire

| Incident | Décision immédiate | Preuves de remplacement | Formulation exacte |
| --- | --- | --- | --- |
| OAuth refuse ou expire la session | Ne pas saisir d'identité personnelle devant le jury ; passer au niveau B. | B2-A24, B2-A25, B2-A26, B2-A30, B2-A34 | « L'authentification live est indisponible ; voici l'exécution horodatée et sa portée. » |
| L'API ou le Web renvoie une erreur | Capturer mentalement le code, ne pas redéployer ; passer au niveau C. | CD `29846343559`, B2-A28, B2-A29, B2-A30 | « La disponibilité actuelle n'est pas prouvée ; le dernier état conservé est celui-ci. » |
| Génération IA lente, quota ou 503 | Ne pas relancer en boucle et ne pas exposer la clé. | B2-A25 pour la génération réelle ; B2-A34 pour retry, timeout et erreur 503 | « Le fournisseur est une dépendance externe ; le comportement nominal et l'échec contrôlé ont chacun une preuve. » |
| GitHub Actions indisponible | Utiliser les annexes et le manifeste local. | B2-A28, `docs/ci-cd.md`, `MANIFESTE.txt` | « Le run n'est pas consultable live ; je n'en modifie ni l'identifiant ni le verdict consigné. » |
| Capture contenant une donnée personnelle | Fermer immédiatement la vue ; utiliser les captures anonymisées. | B2-A30 | « Je retire cette vue et poursuis avec la preuve anonymisée prévue. » |
| Mise en page live différente de B2-A30 | Ne pas affirmer l'équivalence ; montrer le SHA de la page si disponible, sinon arrêter le live. | Baseline `b002adb`, B2-A30, B2-A37 | « Je ne peux pas rattacher cette vue à la baseline sans vérification ; voici la preuve gelée. » |
| Timer ou dialogue ne répond pas | Ne pas rafraîchir avant d'avoir expliqué la bascule. | B2-A25, tests Web de la CI, CR-025 à CR-029 | « Je passe de l'observation live à la contre-recette conservée. » |
| Le jury demande le chemin CI rouge actuel | Présenter B2-A38 sans provoquer un nouvel échec pendant l'oral. | CI courante `29856584668` sur PR isolée `#46`, jobs aval skipped, absence de CD, inventaires Vercel inchangés, `test:cd-policy` 6/6 | « CR-062 est fermé sur le workflow courant ; aucun commit rouge n'a été poussé sur main. » |

## Ordre minimal en cas de temps réduit

S'il reste moins de huit minutes, conserver dans cet ordre :

1. les quatre compétences éliminatoires ;
2. la baseline `b002adb` reliée aux runs CI/CD ;
3. les 58/59 recettes et l'unique réserve CR-055 ;
4. les trois manuels et le manifeste ;
5. les autres compétences dans la matrice de lecture, sans démonstration longue.

## Après l'oral

- supprimer uniquement les données de recette créées pendant la démonstration ;
- ne pas supprimer les preuves historiques ni modifier le paquet remis ;
- consigner séparément tout incident live, avec heure, page et code d'erreur ;
- ne jamais réécrire une annexe datée pour lui faire décrire un événement
  postérieur.
