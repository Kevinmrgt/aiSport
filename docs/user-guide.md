# Guide utilisateur

## Connexion

Ouvrir `/login` et choisir « Continuer avec Google ». Utiliser le même compte
pour retrouver ses données sur plusieurs appareils.

## Créer une séance

Depuis `/generate`, renseigner le sport, le niveau, la durée, les objectifs
et les contraintes utiles. Générer la séance puis consulter ses exercices,
son échauffement et sa récupération.

Le minuteur permet de suivre la séance, de mettre en pause et de reprendre.
À la fin, enregistrer l'effort et le ressenti. Les notes de douleur sont
facultatives ; éviter d'y saisir des informations médicales détaillées.

## Préparer un programme

Depuis `/programs/generate`, préciser le sport, le niveau, le nombre de
semaines, la fréquence, la durée des séances et les objectifs. Consulter les
semaines et leurs séances depuis le détail du programme.

## Retrouver son activité

- `/workouts` : liste, recherche, consultation et suppression des séances.
- `/programs` : programmes et détail par semaine.
- `/dashboard` : activité enregistrée et progression.
- `/settings` : présentation du fonctionnement du coach.

La suppression demande une confirmation. Elle retire la ressource de la
liste ; vérifier les données sélectionnées avant de confirmer.

## Résoudre un problème

| Symptôme                | Action                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| Retour à la connexion   | Se reconnecter avec Google                                          |
| Génération indisponible | Réessayer plus tard ; signaler l'heure et le parcours au mainteneur |
| Liste vide              | Vérifier le compte utilisé et les filtres                           |
| Ressource inaccessible  | Revenir à sa liste personnelle                                      |
| Tableau de bord vide    | Terminer une séance et enregistrer son ressenti                     |

La clé du service de génération est gérée par Alcide côté serveur.
Les suggestions sportives ne remplacent pas un accompagnement professionnel
adapté à une situation médicale. La page `/confidentialite` décrit les
traitements actuellement annoncés aux utilisateurs.
