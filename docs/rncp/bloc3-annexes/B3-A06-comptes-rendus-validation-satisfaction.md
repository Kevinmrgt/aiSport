# B3-A06 - Comptes rendus, validations et satisfaction

> Projet : Alcide  
> Bloc : RNCP39583 - Bloc 3  
> Compétence ciblée : C3.4.1  
> Responsable : Kevin  
> Date de consolidation : 2026-09-07  
> Référence Git de validation : `0a2caff`

## 1. Statut et règle d'authenticité

Le projet ayant été conduit individuellement, il n'existe pas de procès-verbaux
historiques signés par un client. Le commanditaire est un **acteur fictif de la
mise en situation RNCP** : `COM-SIM`, responsable d'une petite structure
sportive locale. Les trois comptes rendus ci-dessous sont des reconstructions
pédagogiques datées, produites le 2026-09-07 à partir de traces réelles du
dépôt. Les dates de jalon ne sont pas présentées comme des dates de réunions
avec une personne réelle.

Cette distinction permet de montrer la communication et la validation attendues
sans attribuer les réponses simulées à un client humain.

| Nature                                                         | Statut                              | Utilisation à l'oral                            |
| -------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Commits, revues de sprint, tests, CI/CD, recettes et livrables | Preuves réelles                     | Démontrer les évolutions et les contrôles       |
| Comptes rendus ci-dessous                                      | Reconstruction à partir des preuves | Montrer la structure de communication au client |
| Avis, score ou signature d'un commanditaire humain             | Non collecté au 2026-09-07          | Ne pas revendiquer de satisfaction réelle       |
| Validation du commanditaire fictif `COM-SIM`                   | Simulation déclarée `PV-SIM-01`     | Présenter la décision et ses réserves           |

## 2. Planification des points de validation

| Point | Jalon de preuve          | Objet soumis à validation | Critères de sortie                                                                   | Décision constatée ou attendue                                                            | Preuve                                                                      |
| ----- | ------------------------ | ------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| PV-01 | 2026-04-13 au 2026-04-16 | MVP fonctionnel           | Génération, consultation, persistance, authentification, tests et exécution locale   | Passage du MVP vers la consolidation qualité et déploiement                               | `docs/sprints/sprint-01.md` à `sprint-12.md`, commits `f09aad3` à `aecd2f7` |
| PV-02 | 2026-07-20 au 2026-07-23 | Version de recette jury   | CI/CD, sécurité, accessibilité, recettes, accès jury, quota et version `0.13.0-rc.8` | Version candidate documentée ; poursuite des corrections de dépendances et du dossier MCO | `CHANGELOG.md`, B2-A28 à B2-A43, commits `c378519` à `2d18af6`              |
| PV-03 | 2026-09-07               | Validation simulée Bloc 3 | Preuves de pilotage, démo reproductible, plans de secours, cohérence version/SHA     | `COM-SIM` valide sous réserves dans `PV-SIM-01`                                           | Annexes B3-A01 à B3-A07, CI `34108724410`, CD `34109152619`                 |

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

Les annexes, les commandes locales, la CI/CD et la production ont été
recontrôlées. Le scénario passe en **GO pour présentation** ; la décision
`PV-SIM-01` est celle du commanditaire fictif et non un avis client réel.

## 6. Indicateurs de satisfaction simulés

Les indicateurs combinent preuves observables et perception jouée par `COM-SIM`.
Ils sont préfixés `SAT-SIM` et ne constituent ni une enquête ni une mesure
d'utilisateur réel.

| ID         | Indicateur                                | Cible                          | Résultat du scénario                     | Source probante                                           |
| ---------- | ----------------------------------------- | ------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| SAT-SIM-01 | Couverture des cinq tâches critiques      | Au moins 4/5                   | 5/5 couvertes par le plan A ou le plan B | script, seed, captures et tests                           |
| SAT-SIM-02 | Compréhension de la proposition de valeur | Au moins 4/5                   | 5/5 simulé                               | introduction et vocabulaire métier du support             |
| SAT-SIM-03 | Utilité perçue de l'entraînement          | Au moins 4/5                   | 4/5 simulé                               | séance structurée, programme et suivi                     |
| SAT-SIM-04 | Acceptabilité de l'attente technique      | p95 inférieur à 1 000 ms       | Oui ; p95 maximal 378,64 ms              | campagne post-CD 150/150 ; hors génération IA             |
| SAT-SIM-05 | Clarté des informations et erreurs        | Au moins 4/5                   | 4/5 simulé                               | interface simplifiée, tests de messages et de formulaires |
| SAT-SIM-06 | Accessibilité du parcours                 | Aucun blocage critique/sérieux | Conforme dans les scénarios exécutés     | E2E public, axe, clavier, reflow et tests composants      |
| SAT-SIM-07 | Décision du commanditaire fictif          | Validé ou sous réserve         | **Validé sous réserves**                 | procès-verbal simulé `PV-SIM-01` ci-dessous               |

## 7. PV-SIM-01 — validation du commanditaire fictif

> Mise en situation pédagogique : aucun participant humain, aucune signature et
> aucune satisfaction réelle ne sont revendiqués.

**Date :** 2026-09-07

**Rôle simulé :** `COM-SIM`, responsable d'une petite structure sportive locale

**Version et SHA acceptés :** `0.13.0-rc.8` / `0a2caffc314bbb4697baf2fbbfe39ec74248e038`

**Mode :** production publique fraîchement déployée, preuves locales et captures de secours

| Tâche                                            | Décision simulée      | Preuve ou réserve                                                                              |
| ------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------- |
| Comprendre l'objectif d'Alcide                   | Acceptée              | proposition de valeur exprimée sans jargon technique                                           |
| Se connecter                                     | Acceptée sous réserve | formulaire jury disponible et logique d'auth couverte par les tests ; session OAuth CI expirée |
| Générer ou ouvrir un entraînement                | Acceptée              | formulaire et données de démonstration couverts par tests, seed et captures                    |
| Consulter les exercices et utiliser le timer     | Acceptée              | séances seedées, composants et scénario de secours                                             |
| Enregistrer la session et consulter le dashboard | Acceptée              | persistance, feedback et dashboard couverts par les preuves de recette                         |

| Question                             | Réponse simulée                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Proposition de valeur comprise (1-5) | 5                                                                                |
| Entraînement jugé utile (1-5)        | 4                                                                                |
| Temps d'attente acceptable (oui/non) | Oui pour la navigation et les healthchecks ; génération IA non chronométrée      |
| Interface et messages clairs (1-5)   | 4                                                                                |
| Principal point positif              | Parcours centré sur la séance et le suivi, avec détails techniques masqués       |
| Principal point à améliorer          | Rafraîchir la session OAuth dédiée avant toute démonstration reposant sur Google |

**Décision simulée :** validé sous réserves.

**Réserves :** utiliser l'accès jury confidentiel ou le plan B local ; ne pas
présenter le run OAuth `34109534059` comme vert tant que sa session de test
datée du 2026-07-21 n'a pas été renouvelée ; ne pas promettre de conseil médical
ni de SLA.

**Trace :** `[SIMULATION COM-SIM — aucune signature humaine]`.

## 8. Règle de mise à jour

Après chaque point de validation :

1. enregistrer la version et le SHA présentés ;
2. joindre la trace de retour avec consentement et anonymisation adaptée ;
3. pour une future recette humaine, calculer SAT-01 à SAT-07 sans remplacer les
   valeurs manquantes par des estimations ; conserver le préfixe `SAT-SIM` pour
   toute valeur issue d'une simulation ;
4. transformer chaque réserve en action du tableau de pilotage avec responsable et échéance ;
5. consigner la décision finale et sa justification.

## 9. Preuves sources

- `docs/sprints/`
- `CHANGELOG.md`
- `docs/rncp/bloc2-annexes/`
- `docs/rncp/preuve-suivi-projet-2026-05-07.md`
- `docs/rncp/bloc3-pilotage-projet-rncp39583.md`
- CI GitHub Actions `34108724410` et CD `34109152619` sur `0a2caff`
- workflow authentifié `34109534059`, échec pré-scénario sur session OAuth expirée
- historique Git des commits cités
