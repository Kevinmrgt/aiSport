# Plan de correction des bogues - Bloc 2 RNCP39583

> Compétence ciblée : C2.3.2 - Élaborer un plan de correction des bogues à partir de l'analyse des anomalies et des régressions détectées au cours de la recette.

## 1. Objectif

Ce plan décrit comment les anomalies détectées pendant la recette, les tests automatisés, la CI ou la revue documentaire sont qualifiées, corrigées et vérifiées sur Alcide.

Il complète :

- le cahier de recettes : `docs/bloc2/cahier-recettes.md` ;
- les fiches bugs existantes : `docs/bloc4/bugs/` ;
- le journal de version : `CHANGELOG.md`.

## 2. Processus de correction

| Étape | Action | Sortie attendue |
|---|---|---|
| 1. Détection | Identifier l'anomalie via recette, test, CI, audit sécurité, retour utilisateur ou revue documentaire | Ticket, ligne du plan ou fiche bug |
| 2. Qualification | Définir gravité, impact, périmètre et compétence RNCP concernée | Priorité P0 à P3 |
| 3. Reproduction | Décrire les préconditions, données et étapes | Procédure reproductible |
| 4. Analyse | Identifier cause racine et fichiers concernés | Hypothèse technique vérifiable |
| 5. Correction | Modifier uniquement le périmètre nécessaire | Patch code ou documentation |
| 6. Non-régression | Ajouter ou relancer test/recette | Commande ou scénario CR |
| 7. Validation | Vérifier résultat attendu, CI et cohérence documentaire | Statut corrigé |
| 8. Traçabilité | Mettre à jour cahier de recettes, changelog ou dossier RNCP | Preuve exploitable jury |

## 3. Niveaux de priorité

| Priorité | Définition | Délai cible |
|---|---|---|
| P0 | Bloque une compétence éliminatoire ou un parcours critique | Avant dépôt |
| P1 | Fragilise une preuve importante ou une fonctionnalité centrale | Avant soutenance |
| P2 | Amélioration qualité ou cohérence documentaire | Dès que possible |
| P3 | Confort, reformulation, amélioration mineure | Opportuniste |

## 4. Registre des anomalies Bloc 2

| ID | Source | Priorité | Anomalie | Cause probable | Correction attendue | Test de non-régression | Statut |
|---|---|---:|---|---|---|---|---|
| B2-BUG-001 | Cahier de recettes CR-013 | P0 | Panne OpenAI non exécutée dans une recette navigateur | La preuve unitaire avait été assimilée à une recette réelle | Conserver la preuve unitaire et exécuter un parcours contrôlé avec réponse OpenAI simulée en erreur | test service + Playwright authentifié avec erreur simulée | Ouvert jusqu'à exécution |
| B2-BUG-002 | Ancien cahier CR-040 ; nouveau CR-060 | P1 | JSON attendu du healthcheck API incomplet | Route API renvoie aussi `timestamp` et `version` | Aligner résultat attendu sur le code réel | `apps/api/tests/health.routes.test.ts`, `curl /health` | Correctif et test locaux ; à figer sur le SHA final |
| B2-BUG-003 | Ancien cahier CR-044 ; nouveaux CR-040/041 | P1 | Dashboard attendu trop ancien : barres par niveau/top sports seulement | Dashboard réel affiche aussi séances terminées, durée, effort moyen et feedback | Aligner scénario avec l'interface actuelle | Démo `/dashboard`, tests E2E à créer ou relancer | Documentation corrigée ; recette dashboard à exécuter |
| B2-BUG-004 | Audit du 2026-07-20 | P0 | E2E authentifiés redirigés vers `/login` et exclus du smoke | Fixture `storageState` vide et setup d'auth inexistant | Remplacer la fausse fixture par un mode de test explicite et sûr, puis exécuter les parcours cœur | `pnpm test:e2e:authenticated` | Faux positif supprimé ; vrai parcours OAuth non exécuté |
| B2-BUG-005 | CI GitHub | P1 | Audit sécurité en erreur mais workflow global vert | `continue-on-error` au niveau job et step | Rendre `pnpm audit --audit-level=high` bloquant | validation YAML + audit local + nouveau run CI | Correctif local ; nouveau run CI attendu |
| B2-BUG-006 | Documentation Bloc 2 | P1 | Manuel utilisateur absent comme livrable autonome | Preuves dispersées dans README/dossier | Créer `bloc2-manuel-utilisateur-alcide.md` | Relecture des routes et fonctionnalités réelles | Document présent ; à figer avec le pack final |
| B2-BUG-007 | Documentation Bloc 2 | P1 | Manuel de mise à jour absent comme livrable autonome | Procédures dispersées dans CI/CD, deployment et changelog | Créer `bloc2-manuel-mise-a-jour.md` | Relecture des scripts et workflows | Document présent ; clone vierge non testé |
| B2-BUG-008 | Documentation Bloc 2 | P2 | Pack d'annexes non indexé | Preuves non centralisées | Créer index d'annexes Bloc 2 | Vérifier présence des pièces ou statut "à produire" | Index présent ; annexes du SHA final à produire |
| B2-BUG-009 | Coverage | P0 | 88 % annoncé alors que DB, repositories, routes, Web et shared sont exclus | Périmètre d'instrumentation réduit pour franchir le seuil CI | Mesurer séparément tout le code, ajouter tests Web/shared/DB/routes, publier les exclusions | `pnpm test:coverage`, rapports API/Web/shared | Partiel : API/Web/PostgreSQL mesurés ; shared non isolé et routes déclaratives exclues |
| B2-BUG-010 | Sorties IA | P0 | Séances/programmes JSON valides mais incohérents en durée ou structure acceptés | Schémas sans invariants métier transverses | Valider durée, nombre et numérotation semaines/séances avec cas répétitions | tests schémas + services IA | Correctif et tests locaux ; CI finale attendue |
| B2-BUG-011 | Session logs | P0 | Un journal peut référencer le workout/programme d'un autre utilisateur | FK vérifie l'existence mais pas l'ownership | Introduire un service qui charge la ressource avec `userId` avant insertion | tests service ownership 403/404 | Vérifié localement par tests unitaires et PostgreSQL ; CI finale attendue |
| B2-BUG-012 | Timer | P1 | Temps réalisé incluant les pauses et dérive de `setTimeout` | Calcul basé sur temps mural depuis le premier démarrage | Accumuler uniquement le temps actif avec horloge monotone/date de reprise | tests pause/reprise/suspension/fin | Correctif et tests locaux ; recette humaine à exécuter |
| B2-BUG-013 | Accessibilité | P0 | Tests limités aux pages publiques et interactions modales incomplètes | Fixture auth absente et tests automatiques assimilés à RGAA | Corriger focus/Échap/onglets/Timer et auditer l'échantillon authentifié | tests composants, Playwright, axe et audit manuel | Partiel : preuves publiques locales ; authentifié et audit humain non exécutés |
| B2-BUG-014 | Ancien cahier de recettes | P0 | Fonctions programmes/settings/journaux absentes et résultats des anciens CR-021/CR-030 faux | Inspection du code confondue avec exécution | Reconstituer l'inventaire et rejouer chaque scénario avec preuve | cahier v2 + artefacts datés | Inventaire reconstruit ; recette complète non exécutée |
| B2-BUG-015 | Versionnement | P1 | Dossier, branche, production et commit de référence différents ; aucun tag | Pack généré après le SHA présenté et changelog incomplet | Fusionner, valider puis déployer un SHA unique ; taguer ce SHA après vérification et renseigner le manifeste | `git rev-parse`, tag, healthchecks et run CI/CD | Ouvert jusqu'au déploiement |
| B2-BUG-016 | Docker | P1 | Manuel demandait `drizzle-kit`/`tsx` dans l'image runtime qui ne les contient pas | Confusion stage builder/runtime | Ajouter services outillage `migrate`/`seed` et corriger les commandes | `docker compose config`, build et exécution migration/seed | Corrigé et validé localement dans B2-A22 ; clone vierge et CI à rejouer |
| B2-BUG-017 | UI erreurs | P1 | Panne API transformée en 404 ou valeurs par défaut silencieuses ; suppression sans erreur visible | Gestion générique de toutes les exceptions | Distinguer 404/403/5xx, timeout et afficher les échecs de mutation | tests server-api/pages/composants | Correctif et tests locaux ; recette navigateur métier attendue |
| B2-BUG-018 | Sécurité production | P1 | CSP permissive et rate limit mémoire présenté comme contrôle complet | Configuration dev appliquée en production et état par instance | Durcir CSP ; présenter le rate limit distribué comme risque tant qu'aucun store partagé n'est configuré | headers production + test multi-instance à prévoir | Partiel |
| B2-BUG-019 | Données personnelles | P1 | Notes de douleur stockées sans information claire ni politique d'exploitation | Fonction ajoutée sans documentation privacy dédiée | Informer l'utilisateur et définir finalité, conservation et droits ; ne pas prétendre export/suppression s'ils n'existent pas | revue page confidentialité et flux session | Information locale présente ; durée automatique absente et déploiement à prouver |
| B2-BUG-020 | Recette clavier 2026-07-20 | P1 | Le lien d'évitement changeait le fragment sans focaliser systématiquement le contenu principal | La cible `main` n'était pas focalisable programmatiquement | Ajouter `tabIndex={-1}` à `main#main-content` | Playwright Chromium et Firefox, trois pages publiques | Corrigé localement ; 6/6 contrôles finaux réussis |
| B2-BUG-021 | Recette nom accessible 2026-07-20 | P2 | Le bouton Google était annoncé « Continuer avec Google G » | Lettre décorative incluse dans l'arbre d'accessibilité | Masquer le décor avec `aria-hidden="true"` | Playwright Chromium et Firefox | Corrigé localement ; 2/2 contrôles finaux réussis |
| B2-BUG-022 | Inspection des captures 320 px 2026-07-20 | P1 | Texte clair sur fond clair sur la page de connexion et pied de page peu contrasté | Styles pensés pour des surfaces sombres appliqués sur le fond vert clair | Ajouter un panneau sombre et assombrir le texte du footer | Captures 320 px Chromium/Firefox ; mesure de contraste manuelle encore requise | Correction visuelle appliquée ; audit manuel ouvert |

## 5. Fiches bugs réelles déjà disponibles

| Fiche | Résumé | Lien avec Bloc 2 |
|---|---|---|
| `docs/bloc4/bugs/BUG-001-coverage-threshold.md` | Incident historique : seuil franchi surtout par exclusions ; ne clôt pas C2.2.2 | Contre-exemple utile et origine de B2-BUG-009 |
| `docs/bloc4/bugs/BUG-002-readme-utf16.md` | Encodage README incorrect | Traçabilité documentaire, C2.4.1 |

Ces fiches sont des preuves utiles, mais le présent document reste le plan global Bloc 2 car il relie recette, priorité, correction et test de non-régression.

## 6. Critères de clôture d'une anomalie

Une anomalie est clôturée lorsque :

- la cause est identifiée ;
- le correctif est appliqué ;
- le cahier de recettes ou le test concerné est mis à jour ;
- une commande ou une vérification manuelle est consignée ;
- le statut final est explicite : corrigé, accepté, reporté ou non reproductible.

## 7. Suivi avant dépôt

Actions restantes avant dépôt :

1. Fermer tous les P0 par un test de non-régression réellement réussi.
2. Conserver les sorties brutes datées de lint, typecheck, tests, couvertures,
   build, audit, PostgreSQL, Playwright public/authentifié et Docker.
3. Exécuter le cahier de recettes complet, y compris erreurs IA, ownership,
   programmes, settings, journaux et accessibilité authentifiée.
4. Effectuer l'audit manuel RGAA sur l'échantillon représentatif.
5. Fusionner, taguer, déployer et vérifier un SHA unique.
6. Renseigner le manifeste, régénérer les PDF et joindre les preuves finales.
