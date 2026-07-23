# B2-A43 - Simplification de l'interface et recette de production rc.8

## Objectif

Fermer B2-BUG-047 en retirant du front les informations d'exploitation qui
n'aident pas l'utilisateur à préparer son entraînement :

- fournisseur et nom du modèle ;
- prix ou coût estimé ;
- volume technique de sortie ;
- formulaire de modification de la configuration du moteur.

La configuration, l'allowlist et les secrets restent gérés côté serveur.

## Correction livrée

Le formulaire `/generate` ne récupère plus les paramètres IA pour son
affichage et ne présente plus les métriques `Modele`, `Estime` et `Sortie`.
La route `/settings`, libellée `Coach` dans la navigation, présente désormais
le fonctionnement de l'accompagnement en langage métier : objectif, durée,
contraintes, progression et utilisation du timer.

Les composants et utilitaires devenus sans usage côté front ont été retirés.
Des tests de non-exposition empêchent la réintroduction des termes techniques
et tarifaires sur le formulaire de séance et la page Coach.

## Validation automatisée et livraison

| Contrôle | Résultat |
| --- | --- |
| Tests locaux | 261/261 : 14 shared, 179 API et 68 Web |
| Lint, types et build | réussis localement |
| CI principale | `29999207578`, six jobs réussis |
| Commit applicatif | `f817073de7ed7220fbbc38d396f1d181811012bd` |
| CD Vercel | `29999526386`, migration, API, Web et smoke tests réussis |
| Healthchecks | Web et API HTTP 200 en `0.13.0-rc.8` |

## Recette dans le navigateur intégré

La recette a été exécutée le 23 juillet 2026 dans Chromium sur
[https://ai-sport-web.vercel.app](https://ai-sport-web.vercel.app) :

1. ouverture de `/login` ;
2. saisie des identifiants temporaires dans `Accès jury` ;
3. session Auth.js créée et redirection vers `/generate` ;
4. compteur visible : `29 generations restantes sur 30` ;
5. absence de `OpenAI`, `GPT`, `modele`, `provider`, `prix`, `cout`,
   `estime` et `sortie` dans le contenu principal de `/generate` ;
6. même compteur `29/30` sur `/programs/generate` ;
7. page `/settings` ouverte avec le titre `Mon coach Alcide` et absence des
   mêmes termes techniques ou tarifaires ;
8. aucune erreur JavaScript ni erreur console pendant les contrôles ;
9. déconnexion réussie et retour à l'accueil.

Aucune nouvelle génération n'a été déclenchée pendant cette contre-recette :
le solde global du compte jury reste à 29/30.

## Conclusion

B2-BUG-047 est clos sur la baseline `0.13.0-rc.8`. L'utilisateur voit les
informations utiles au parcours sportif, tandis que les choix de modèle,
fournisseur et coût restent des responsabilités d'exploitation côté serveur.
