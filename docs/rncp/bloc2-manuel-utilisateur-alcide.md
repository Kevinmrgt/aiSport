# Manuel utilisateur - Alcide

> Livrable Bloc 2 RNCP39583 - Documentation d'exploitation utilisateur.
> Version observée en production : `0.13.0-rc.5` - baseline `c63439e8ac8d68efd5ba091211b326ee8575fbba`.

## 1. Présentation

Alcide est une application web de coaching sportif assisté par IA. Elle permet à un utilisateur connecté de générer des séances ou programmes sportifs personnalisés, de les consulter, de suivre une séance avec timer et d'observer sa progression.

Public cible :

- sportif débutant, intermédiaire ou avancé ;
- coach ou utilisateur souhaitant préparer rapidement une séance ;
- jury RNCP pendant la démonstration.

## 2. Accéder à l'application

1. Ouvrir l'application web.
2. Depuis la page d'accueil, cliquer sur le bouton de connexion.
3. Choisir la connexion Google.
4. Autoriser l'application.
5. Après connexion, l'utilisateur accède aux fonctionnalités protégées.

Si l'utilisateur tente d'accéder directement à une page protégée sans session, il est redirigé vers la page de connexion.

## 3. Générer une séance d'entraînement

1. Aller sur la page `Générer` ou `/generate`.
2. Renseigner le sport souhaité.
3. Choisir le niveau.
4. Indiquer la durée.
5. Décrire les objectifs ou contraintes.
6. Valider le formulaire.

Résultat attendu :

- les champs invalides affichent un message d'erreur ;
- une demande valide crée une séance ;
- l'utilisateur est redirigé vers le détail de la séance.

En cas d'erreur IA ou serveur, un message d'erreur est affiché à l'utilisateur et la génération peut être relancée.

## 4. Générer un programme

1. Aller sur la page de génération de programme.
2. Renseigner l'objectif sportif.
3. Choisir le niveau, la durée et les contraintes.
4. Soumettre le formulaire.

Résultat attendu :

- Alcide génère un programme multi-semaines ;
- le programme peut être consulté depuis la liste des programmes ;
- chaque semaine ou séance peut être consultée dans le détail.

## 5. Consulter ses séances

1. Aller sur `/workouts`.
2. Lire les cartes de séances disponibles.
3. Utiliser les filtres par sport ou niveau si nécessaire.
4. Ouvrir une séance pour voir le détail.

La liste affiche uniquement les séances de l'utilisateur connecté.

## 6. Utiliser le timer

1. Ouvrir le détail d'une séance.
2. Cliquer sur `Démarrer`.
3. Suivre l'exercice affiché.
4. Utiliser `Pause` ou `Reprendre` si nécessaire.
5. Laisser le timer passer automatiquement aux phases suivantes.

Le timer annonce les changements d'état de façon accessible grâce aux zones dynamiques prévues dans l'interface.

## 7. Terminer et journaliser une séance

Lorsqu'une séance ou session est terminée, l'utilisateur peut renseigner son ressenti lorsque le formulaire est disponible :

- effort perçu ;
- feedback de difficulté ;
- notes de douleur éventuelles ;
- commentaire éventuel.

Ces informations alimentent les statistiques du dashboard.

Les notes de douleur ne constituent pas un diagnostic médical. Elles sont
associées au compte connecté et doivent être considérées comme des données
personnelles potentiellement sensibles. Consulter la page `Confidentialité`
avant de les renseigner.

## 8. Consulter le dashboard

1. Cliquer sur `Dashboard`.
2. Lire les indicateurs principaux :
   - séances créées ;
   - séances terminées ;
   - temps réalisé ;
   - effort moyen ;
   - dernière séance terminée ;
   - répartition par niveau ;
   - sports les plus pratiqués.

Si aucune séance n'existe, le dashboard propose de commencer par une première génération.

## 9. Paramétrer l'IA

La page de paramètres permet uniquement de choisir un modèle OpenAI parmi les
modèles proposés. OpenAI est le fournisseur de l'application et la clé API est
gérée par l'exploitant côté serveur. L'utilisateur ne peut ni saisir une clé,
ni choisir un autre fournisseur.

Si la lecture ou l'enregistrement des paramètres échoue, l'interface affiche
une erreur ; elle ne doit pas présenter une valeur de secours comme si elle
avait été enregistrée.

## 10. Supprimer une séance

1. Depuis la liste des séances, cliquer sur l'action de suppression.
2. Confirmer la suppression.
3. Vérifier que la liste est mise à jour.

Si l'utilisateur annule la confirmation, la séance est conservée.

## 11. Accessibilité utilisateur

L'application prévoit :

- navigation clavier ;
- focus visible ;
- labels de formulaire ;
- messages d'erreur associés aux champs ;
- états de chargement ;
- informations dynamiques pour le timer.

Pour vérifier l'accessibilité en démonstration, utiliser la touche `Tab` pour parcourir l'interface et contrôler que chaque action reste atteignable.

Le reflow a été contre-recetté en production avec un zoom Chromium natif à
200 % et 400 % sur huit routes, soit 16 contrôles réussis sur 16. Les 166
contextes composites de l'échantillon sont décidés dans B2-A37. Un parcours
technique NVDA, les correctifs `rc.5` et la validation NVDA déclarée par
l'utilisateur sont consignés dans B2-A41, sans revendication de conformité
RGAA exhaustive ni d'appréciation auditive détaillée.

## 12. Problèmes courants

| Problème | Cause possible | Action utilisateur |
|---|---|---|
| Redirection vers login | Session absente ou expirée | Se reconnecter |
| Génération impossible | IA indisponible, clé absente ou quota atteint | Réessayer plus tard ou vérifier les paramètres |
| Aucun résultat dans la liste | Aucun entraînement créé ou filtre trop restrictif | Réinitialiser les filtres ou générer une séance |
| Dashboard vide | Aucune séance créée ou terminée | Générer puis exécuter une séance |
| Accès refusé à une séance | Séance inexistante ou appartenant à un autre utilisateur | Revenir à la liste personnelle |

## 13. Parcours de démonstration recommandé

1. Se connecter.
2. Générer une séance courte.
3. Ouvrir le détail.
4. Démarrer le timer.
5. Revenir à la liste.
6. Filtrer les séances.
7. Ouvrir le dashboard.
8. Montrer la déconnexion.
