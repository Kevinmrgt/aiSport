# Checklist de preuves MCO — Bloc 4 RNCP39583

> Projet : Alcide / alcide
>
> Référence documentaire : `0.13.0-rc.3`
>
> Dernière mise à jour : 2026-07-28

Cette checklist sépare volontairement la **preuve versionnée dans le dépôt** de la **preuve d'exécution à joindre**. Une configuration GitHub, un template ou du code de healthcheck ne valent pas capture d'un run, d'une issue ou d'une alerte réellement reçue.

## 1. Éléments déjà versionnés dans le dépôt

| Élément                     | Référence                                                                                                                     | Ce qui est établi sans capture                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monitoring horaire          | [production-health-monitor.yml](../../.github/workflows/production-health-monitor.yml)                                        | Le workflow est planifié chaque heure à `:17` et peut être lancé manuellement. Il contrôle l'API sur `/health/ready` (`status: ready`) et le Web sur `/api/health` (`status: ok`).                                         |
| Rapport du monitoring       | même workflow                                                                                                                 | Un artefact `production-health-report` est configuré avec `if: always()`, y compris après un échec.                                                                                                                        |
| Canal de signalement GitHub | même workflow                                                                                                                 | En échec, le workflow est configuré pour ouvrir ou commenter une issue `Production healthcheck failed` avec le label `monitoring`; en succès, il ferme l'issue ouverte correspondante après commentaire de rétablissement. |
| API health/readiness        | [health.routes.ts](../../apps/api/src/routes/health.routes.ts)                                                                | `/health` est un liveness check ; `/health/ready` expose la readiness, retourne 200/`ready` ou 503/`not_ready`, et inclut les contrôles.                                                                                   |
| Web health                  | [route.ts](../../apps/web/app/api/health/route.ts)                                                                            | `/api/health` retourne `status: ok`. Les healthchecks API et Web sont `Cache-Control: no-store, max-age=0` et leur repli de version source est `0.13.0-rc.3`.                                                              |
| Collecte des anomalies      | [template anomalie](../../.github/ISSUE_TEMPLATE/anomaly_report.yml), [fiches BUG](../bloc4/bugs/)                            | Le template impose source, environnement, composant, criticité, reproduction, impact, correctif et validation.                                                                                                             |
| Cas support                 | [template support](../../.github/ISSUE_TEMPLATE/support_case.yml)                                                             | Le template structure la contribution du support, des parties prenantes, la résolution et la validation.                                                                                                                   |
| Non-régression et versions  | [CI](../../.github/workflows/ci.yml), [PR checklist](../../.github/PULL_REQUEST_TEMPLATE.md), [CHANGELOG](../../CHANGELOG.md) | La CI comporte un audit bloquant au niveau `low`; la checklist PR et le changelog structurent la traçabilité.                                                                                                              |

## 2. Ce qui n'est pas affirmé

- Aucun monitor Better Stack n'est présenté comme créé ou actif.
- Aucun destinataire e-mail/mobile d'alerte n'est présenté comme configuré.
- La simulation déclarée de supervision du 2026-07-28 est disponible dans [B4-P01](bloc4-annexes/preuves-execution-2026-07-28/README.md) : run d'alerte, artefact, issue GitHub de test, run de rétablissement et fermeture automatique. Elle ne constitue pas un run de monitoring en mode `production`.
- Aucun retour de support client réel n'est présenté ; le cas décrit dans le dossier MCO est une simulation tant qu'une pièce datée ne le prouve pas.

Le canal de signalement actuellement documenté est donc **GitHub Actions → artefact → GitHub Issue**. La réception d'une notification par une personne dépend des paramètres de notification GitHub et devra être montrée séparément si elle est invoquée au jury.

## 3. Pièces à joindre avant remise

| Priorité  | Pièce à obtenir                                                | Comment l'obtenir / condition                                                                                                                               | Apport jury                                                                                              |
| --------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0        | Run vert `Monitoring - Production health` en mode `production` | Lancer le workflow sans simulation ou attendre son passage horaire ; capturer le nom, la date, les deux étapes de contrôle et le statut succès.             | Montre l'exécution effective des sondes contre la production.                                            |
| P0        | Artefact `production-health-report` du run de production       | Ouvrir ou télécharger l'artefact ; conserver le rapport qui contient les URLs, statuts et payloads JSON.                                                    | Prouve les réponses réelles des sondes, pas seulement le YAML.                                           |
| P0        | Run CI final vert                                              | Capturer le run lié à la révision remise, avec lint, types, tests, build et audit.                                                                          | Prouve la non-régression de la version remise.                                                           |
| P0        | Cohérence de version                                           | Vérifier que le dossier, `package.json`, `CHANGELOG.md` et `docs/deployment.md` référencent `0.13.0-rc.3` comme candidate documentaire.                     | Sécurise C4.3.2 et évite une version contradictoire.                                                     |
| P1        | Anomalie consignée                                             | Joindre BUG-001/BUG-002 ou créer une issue via le template ; pour une mise en situation, écrire visiblement « simulation déclarée ».                        | Montre le cycle C4.2.1 sans faire passer une simulation pour un incident.                                |
| P1        | Cas support                                                    | Créer un ticket à partir du template support seulement si le cas est clairement réel ou clairement simulé, daté et relié à sa validation.                   | Couvre C4.3.3 avec transparence.                                                                         |
| P1        | Smoke tests de production                                      | À joindre uniquement si le dossier affirme un déploiement de la candidate ; associer le run CD et les réponses `/health/ready` et `/api/health`.            | Relie livraison et état opérationnel.                                                                    |
| Fait      | Simulation d'issue automatique                                 | [B4-P01](bloc4-annexes/preuves-execution-2026-07-28/README.md) : issue de test #64 ouverte/commentée puis fermée par le workflow, sans sonde de production. | Prouve le circuit GitHub de signalement et de rétablissement, en tant que simulation déclarée.           |
| P2        | Backup/branche Neon                                            | À produire avant une migration sensible, pas en l'absence de migration.                                                                                     | Rend le rollback DB démontrable.                                                                         |
| Optionnel | Better Stack ou équivalent                                     | Ne l'ajouter que s'il est effectivement configuré sur les mêmes endpoints, avec seuil et destinataire visibles.                                             | Ajoute un second canal d'alerte indépendant ; ce n'est pas un prérequis si GitHub est le canal présenté. |

## 4. Préparation d'un ticket support pilote

Si aucun vrai retour client n'est disponible, le ticket doit être qualifié de **mise en situation simulée** dans son titre ou son premier paragraphe. Exemple de sujet :

`[SUPPORT] [SIMULATION DÉCLARÉE] Génération IA trop lente sur programme 8 semaines`

Le ticket doit renseigner le canal, le contexte, le diagnostic (logs IA, timeout, validation Zod ou fournisseur), le contournement/correctif, le test de validation et la limite de la simulation. Il ne doit pas être présenté comme un message d'utilisateur réel.

## 5. Définition de prêt pour le dossier Bloc 4

Le dossier est prêt à remettre lorsque les quatre conditions suivantes sont satisfaites :

1. le code et la documentation renvoient tous à `0.13.0-rc.3` ;
2. un run vert de monitoring et son artefact sont joints ;
3. une anomalie et un cas support sont traçables, avec une distinction visible entre réel et simulation ;
4. toute affirmation de déploiement, d'alerte externe, d'issue automatique ou de rollback est accompagnée de sa pièce, sinon formulée comme capacité configurée ou recommandation.

Les éléments P2 et optionnels améliorent le dossier, mais ne doivent pas retarder la remise ni être inventés pour compléter une capture.
