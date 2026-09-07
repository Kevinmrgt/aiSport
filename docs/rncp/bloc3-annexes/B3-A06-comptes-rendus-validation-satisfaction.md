# B3-A06 - Comptes rendus, validations et satisfaction

> Projet : Alcide  
> Bloc : RNCP39583 - Bloc 3  
> Compétence ciblée : C3.4.1  
> Responsable : Kevin  
> Date de consolidation : 2026-09-07  
> Référence Git de consolidation : `d950b6b`

## 1. Statut et règle d'authenticité

Le projet ayant été conduit individuellement, il n'existe pas de procès-verbaux historiques signés par un client. Les trois comptes rendus ci-dessous sont des **reconstructions pédagogiques datées**, produites le 2026-09-07 à partir de traces réelles du dépôt. Les dates de jalon correspondent aux dates des preuves Git ; elles ne sont pas présentées comme des dates de réunions client.

Cette distinction permet de montrer comment l'avancement aurait été communiqué au commanditaire sans fabriquer d'échange, de validation ou de satisfaction utilisateur.

| Nature                                                         | Statut                              | Utilisation à l'oral                            |
| -------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Commits, revues de sprint, tests, CI/CD, recettes et livrables | Preuves réelles                     | Démontrer les évolutions et les contrôles       |
| Comptes rendus ci-dessous                                      | Reconstruction à partir des preuves | Montrer la structure de communication au client |
| Avis, score ou signature d'un commanditaire                    | Non collecté au 2026-09-07          | Ne pas revendiquer de satisfaction réelle       |
| Validation finale de démonstration                             | À recueillir                        | Faire compléter la grille de la section 7       |

## 2. Planification des points de validation

| Point | Jalon de preuve          | Objet soumis à validation           | Critères de sortie                                                                         | Décision constatée ou attendue                                                            | Preuve                                                                      |
| ----- | ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| PV-01 | 2026-04-13 au 2026-04-16 | MVP fonctionnel                     | Génération, consultation, persistance, authentification, tests et exécution locale         | Passage du MVP vers la consolidation qualité et déploiement                               | `docs/sprints/sprint-01.md` à `sprint-12.md`, commits `f09aad3` à `aecd2f7` |
| PV-02 | 2026-07-20 au 2026-07-23 | Version de recette jury             | CI/CD, sécurité, accessibilité, recettes, accès jury, quota et version `0.13.0-rc.8`       | Version candidate documentée ; poursuite des corrections de dépendances et du dossier MCO | `CHANGELOG.md`, B2-A28 à B2-A43, commits `c378519` à `2d18af6`              |
| PV-03 | 2026-09-07               | Préparation de la validation Bloc 3 | Preuves de pilotage actuelles, démo reproductible, plans de secours, cohérence version/SHA | Validation pédagogique à obtenir après répétition chronométrée                            | Annexes B3-A01 à B3-A07 et script de démonstration actualisé                |

## 3. Compte rendu CR-01 - Jalon MVP

**Date du jalon de preuve :** 2026-04-16  
**Compte rendu reconstruit le :** 2026-09-07  
**Objet :** valider le socle fonctionnel et autoriser la phase de consolidation.

### État d'avancement communiqué

- monorepo Web/API/Shared installé et contrats TypeScript partagés ;
- génération, consultation et suppression d'entraînements disponibles ;
- authentification et cloisonnement utilisateur intégrés ;
- premiers tests unitaires et E2E, contrôles de sécurité et accessibilité ;
- Docker, healthchecks et documentation de déploiement préparés ;
- dashboard, timer et suivi de session intégrés dans la version `0.12.0`.

### Décisions et arbitrages

| Décision                                                      | Motif                                                     | Action résultante                                | Responsable                        | Statut  |
| ------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ | ---------------------------------- | ------- |
| Conserver une architecture monorepo                           | Synchroniser schémas, types et versions entre Web et API  | Maintenir `packages/shared` comme contrat commun | Kevin - architecture/développement | Réalisé |
| Traiter qualité et sécurité avant enrichissements secondaires | Réduire le risque de régression sur le parcours principal | Ajouter Vitest, Playwright, axe et revue OWASP   | Kevin - QA/sécurité                | Réalisé |
| Conserver un plan B local                                     | Limiter le risque de démonstration lié au cloud et à l'IA | Docker Compose et données de seed                | Kevin - DevOps                     | Réalisé |

### Validation

**Validation technique prouvée :** les incréments et leurs livrables sont tracés dans les revues de sprint et l'historique Git.  
**Validation client réelle :** non collectée.  
**Conclusion de jalon proposée :** socle MVP acceptable pour entrer en phase de recette et de durcissement, sous réserve de produire les preuves de qualité et de déploiement.

## 4. Compte rendu CR-02 - Recette jury `0.13.0-rc.8`

**Date du jalon de preuve :** 2026-07-23  
**Compte rendu reconstruit le :** 2026-09-07  
**Objet :** présenter les améliorations de recette et décider si la version peut servir de référence au jury.

### Évolutions communiquées

- finalisation du dossier et des annexes Bloc 2 ;
- accès jury temporaire sécurisé ;
- quota persistant de 30 générations pour l'identité jury ;
- correction des écarts de recette, de sécurité, d'accessibilité et de dépendances ;
- retrait des informations internes de fournisseur, modèle et coût IA de l'interface utilisateur ;
- publication de la candidate `0.13.0-rc.8` dans `package.json` et `CHANGELOG.md`.

### Décisions et actions

| Décision                                      | Indicateur utilisé                                          | Action                                              | Responsable | Preuve                                       |
| --------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------- | -------------------------------------------- |
| Limiter l'usage de l'identité jury            | Risque de consommation IA non bornée                        | Quota persistant partagé séances/programmes         | Kevin       | `CHANGELOG.md`, commit `5929f3b`             |
| Simplifier l'interface jury                   | Compréhension métier prioritaire sur les détails techniques | Masquer prix, fournisseur et modèle IA              | Kevin       | `CHANGELOG.md`, commit `7619eb8`             |
| Conserver une preuve de recette reproductible | Exigence de traçabilité RNCP                                | Publier dossier, annexes, CI et preuves d'exécution | Kevin       | commit `2d18af6`, `docs/rncp/bloc2-annexes/` |

### Validation

**Validation technique prouvée :** les changements, tests et preuves sont versionnés dans le dépôt.  
**Validation client réelle :** non collectée.  
**Conclusion de jalon proposée :** `0.13.0-rc.8` constitue la référence applicative déclarée ; la démonstration doit toutefois annoncer aussi le SHA exact et vérifier que la production correspond à cette référence.

## 5. Compte rendu CR-03 - Préparation de la validation Bloc 3

**Date du point :** 2026-09-07  
**Objet :** transformer les traces techniques en preuves de pilotage conformes et préparer la validation finale.

### Situation présentée

| Axe                  | Constat au démarrage du point               | Décision                                                                           | Critère de clôture                              |
| -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| Planning C3.1        | Planning surtout rétrospectif               | Produire un planning prévu/réalisé avec charges, dépendances, ressources et écarts | Annexe B3-A01 complète et sourcée               |
| Pilotage C3.2.1      | Tableau figé au 2026-05-07                  | Recalculer les KPI et couvrir délais, coûts, risques, qualité et RH                | Annexe B3-A02 datée, commandes et SHA consignés |
| Arbitrage C3.2.2     | Plusieurs ADR mais aucun cas unique complet | Formaliser l'arbitrage Vercel/Neon avec matrice pondérée et logigramme             | Annexe B3-A03                                   |
| Management C3.3.1    | Contexte solo et preuves dispersées         | Distinguer responsabilités réelles et organisation cible                           | Annexe B3-A04                                   |
| Compétences C3.3.2   | Grille générique                            | Mesurer actuel/cible et planifier les actions de formation ou recrutement          | Annexe B3-A05                                   |
| Communication C3.4.1 | CR et satisfaction non formalisés           | Produire trois CR honnêtes et une grille de validation                             | Présente annexe B3-A06                          |
| Démonstration C3.4.2 | Script daté de mai                          | Rejouer sur la version actuelle et constituer les preuves de secours               | Annexe B3-A07 et script actualisé               |

### Décision du point

La livraison Bloc 3 reste **conditionnelle** jusqu'à la mise à jour des annexes, la validation des commandes locales, la vérification de la production et une répétition chronométrée. Aucun avis de commanditaire n'est présumé.

## 6. Indicateurs de satisfaction mis en place

Les indicateurs combinent réussite observable, perception et validation de livraison. Les résultats ne doivent être renseignés qu'après un test réel.

| ID     | Indicateur                                    | Mode de mesure                                                   |               Cible de validation | Résultat au 2026-09-07 | Source attendue             |
| ------ | --------------------------------------------- | ---------------------------------------------------------------- | --------------------------------: | ---------------------- | --------------------------- |
| SAT-01 | Taux de tâches critiques accomplies sans aide | 5 tâches : connexion, génération, consultation, timer, dashboard |                            >= 4/5 | Non mesuré             | Grille signée section 7     |
| SAT-02 | Compréhension de la proposition de valeur     | Note de 1 à 5 après la démo                                      |                            >= 4/5 | Non mesuré             | Questionnaire section 7     |
| SAT-03 | Utilité perçue de l'entraînement généré       | Note de 1 à 5                                                    |                            >= 4/5 | Non mesuré             | Questionnaire section 7     |
| SAT-04 | Acceptabilité du temps d'attente              | Chronométrage et oui/non                                         |           <= 45 s et avis positif | Non mesuré             | Chronomètre + questionnaire |
| SAT-05 | Clarté des informations et erreurs            | Note de 1 à 5                                                    |                            >= 4/5 | Non mesuré             | Questionnaire section 7     |
| SAT-06 | Accessibilité perçue du parcours              | Oui/non + commentaire ; navigation clavier si pertinente         |                     Aucun blocage | Non mesuré             | Grille d'observation        |
| SAT-07 | Décision du commanditaire                     | Validé / validé sous réserve / refusé                            | Validé ou sous réserve documentée | À recueillir           | Procès-verbal section 7     |

## 7. Grille de test utilisateur et validation commanditaire

> Cette section est un formulaire prêt à l'emploi. Tant qu'elle n'est pas complétée par une personne identifiée, elle ne constitue pas un retour réel.

**Date :** ....................................  
**Rôle du participant :** utilisateur test / commanditaire pédagogique / autre : ........................  
**Version et SHA testés :** ....................................  
**Mode :** production / local / captures de secours

| Tâche                                            | Réussie seul | Réussie avec aide | Échec | Temps ou remarque |
| ------------------------------------------------ | :----------: | :---------------: | :---: | ----------------- |
| Comprendre l'objectif d'Alcide                   |     [ ]      |        [ ]        |  [ ]  |                   |
| Se connecter                                     |     [ ]      |        [ ]        |  [ ]  |                   |
| Générer ou ouvrir un entraînement                |     [ ]      |        [ ]        |  [ ]  |                   |
| Consulter les exercices et utiliser le timer     |     [ ]      |        [ ]        |  [ ]  |                   |
| Enregistrer la session et consulter le dashboard |     [ ]      |        [ ]        |  [ ]  |                   |

| Question                             | Note / réponse |
| ------------------------------------ | -------------- |
| Proposition de valeur comprise (1-5) |                |
| Entraînement jugé utile (1-5)        |                |
| Temps d'attente acceptable (oui/non) |                |
| Interface et messages clairs (1-5)   |                |
| Principal point positif              |                |
| Principal point à améliorer          |                |

**Décision :** [ ] validé [ ] validé sous réserve [ ] refusé  
**Réserves ou actions :** ................................................................................  
**Nom/fonction ou identifiant anonymisé :** ....................................  
**Signature ou trace de validation :** ....................................

## 8. Règle de mise à jour

Après chaque point de validation :

1. enregistrer la version et le SHA présentés ;
2. joindre la trace de retour avec consentement et anonymisation adaptée ;
3. calculer SAT-01 à SAT-07 sans remplacer les valeurs manquantes par des estimations ;
4. transformer chaque réserve en action du tableau de pilotage avec responsable et échéance ;
5. consigner la décision finale et sa justification.

## 9. Preuves sources

- `docs/sprints/`
- `CHANGELOG.md`
- `docs/rncp/bloc2-annexes/`
- `docs/rncp/preuve-suivi-projet-2026-05-07.md`
- `docs/rncp/bloc3-pilotage-projet-rncp39583.md`
- historique Git des commits cités
