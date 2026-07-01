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
| B2-BUG-001 | Cahier de recettes CR-013 | P0 | Scénario "Erreur API OpenAI" marqué seulement "à tester en conditions réelles" | Recette manuelle non finalisée malgré tests unitaires d'erreur IA | Reformuler le scénario : preuve unitaire disponible, test manuel à relancer si coupure réelle | `workout-ai.service.test.ts`, génération avec `OPENAI_API_KEY` absente ou API indisponible en environnement contrôlé | Corrigé documentaire ; relance réelle ouverte |
| B2-BUG-002 | Cahier de recettes CR-040 | P1 | JSON attendu du healthcheck API incomplet | Route API renvoie aussi `timestamp` et `version` | Aligner résultat attendu sur le code réel | `apps/api/tests/health.routes.test.ts`, `curl /health` | Corrigé |
| B2-BUG-003 | Cahier de recettes CR-044 | P1 | Dashboard attendu trop ancien : barres par niveau/top sports seulement | Dashboard réel affiche aussi séances terminées, durée, effort moyen et feedback | Aligner scénario avec l'interface actuelle | Démo `/dashboard`, tests E2E à créer ou relancer | Corrigé |
| B2-BUG-004 | Audit final Bloc 2 | P1 | E2E complets listés mais non relancés | Preuve d'exécution absente de l'audit récent | Relancer le smoke public/accessibilité et isoler ce qui reste hors périmètre | `pnpm test:e2e:smoke` : 48 tests passés le 2026-06-30 ; `generate.spec.ts` reste à relancer pour le total complet | Corrigé partiel |
| B2-BUG-005 | Audit final Bloc 2 | P1 | Audit sécurité high à vérifier | Dépendances potentiellement vulnérables selon audit historique | Lancer `pnpm audit --audit-level=high`, corriger ou justifier | Audit 2026-06-30 : 0 high/critical, 2 low et 4 moderate restants | Corrigé |
| B2-BUG-006 | Documentation Bloc 2 | P1 | Manuel utilisateur absent comme livrable autonome | Preuves dispersées dans README/dossier | Créer `bloc2-manuel-utilisateur-alcide.md` | Relecture des routes et fonctionnalités réelles | Corrigé |
| B2-BUG-007 | Documentation Bloc 2 | P1 | Manuel de mise à jour absent comme livrable autonome | Procédures dispersées dans CI/CD, deployment et changelog | Créer `bloc2-manuel-mise-a-jour.md` | Relecture des scripts et workflows | Corrigé |
| B2-BUG-008 | Documentation Bloc 2 | P2 | Pack d'annexes non indexé | Preuves non centralisées | Créer index d'annexes Bloc 2 | Vérifier présence des pièces ou statut "à produire" | Corrigé |

## 5. Fiches bugs réelles déjà disponibles

| Fiche | Résumé | Lien avec Bloc 2 |
|---|---|---|
| `docs/bloc4/bugs/BUG-001-coverage-threshold.md` | Seuil de couverture insuffisant puis correction | Qualité, non-régression, C2.2.2 |
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

Actions restantes recommandées :

1. Conserver les sorties datées `pnpm test`, `pnpm test:coverage`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e:smoke` et `pnpm audit --audit-level=high`.
2. Relancer `generate.spec.ts` ou le `pnpm test:e2e` complet si le dossier annonce 56 exécutions E2E réussies.
3. Relancer CR-013 en coupure IA réelle si une preuve manuelle est demandée.
4. Annexer les captures prototype, CI verte et healthchecks datés au pack Bloc 2.
