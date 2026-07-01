# Suivi d'orchestration - Bloc 2 RNCP39583

> Registre opérationnel à tenir par l'orchestrateur. Une mission ne passe à `Validé` que si les livrables, les contrôles et la revue orchestrateur sont terminés.

Plan de référence : `docs/rncp/bloc2-plan-orchestration-agents-rncp39583.md`

## Statuts autorisés

- `À faire`
- `En cours`
- `En revue`
- `Validé`
- `Bloqué`

## Tableau de suivi

| Mission | Priorité | Statut | Agent | Périmètre principal | Livrable attendu | Contrôle obligatoire | Validation orchestrateur |
|---|---:|---|---|---|---|---|---|
| B2-M00 - État initial et gel des faits | P0 | Validé | Codex | Lecture seule | Synthèse initiale | `git status`, chiffres tests, écarts connus | Dépôt à jour avec `origin/main`, workspace local déjà modifié |
| B2-M01 - Mapping officiel Bloc 2 | P0 | Validé | Codex | `docs/rncp/` | Table C2.x -> preuves | Toutes compétences C2.1.1 à C2.4.1 présentes | Couvert dans le dossier Bloc 2 |
| B2-M02 - Structure dossier final | P0 | Validé | Codex | `docs/rncp/bloc2-dossier-*.md` | Squelette 30 pages | 16 attendus officiels couverts | Dossier principal créé |
| B2-M03 - Environnements et performance | P1 | Validé | Codex | `docs/deployment.md`, `docs/ci-cd.md`, dossier B2 | Tableau qualité/performance | Critères mesurables ou marqués à vérifier | Build, tests, coverage et healthchecks documentés ; mesures IA réelles à garder comme limite |
| B2-M04 - Intégration continue | P1 | En revue | Codex | `docs/ci-cd.md`, dossier B2 | Protocole CI | Cohérence avec `.github/workflows/ci.yml` | Protocole décrit ; capture CI verte à annexer |
| B2-M05 - Prototype et storyboard | P0 | En revue | Codex | dossier B2, annexes | Parcours prototype + captures à produire | Routes réelles, C2.2.1 couvert | Storyboard créé ; captures à produire |
| B2-M06 - Architecture maintenable | P1 | Validé | Codex | dossier B2 | Section architecture | Couches réelles et chemins existants | Section créée |
| B2-M07 - Frameworks et paradigmes | P2 | Validé | Codex | dossier B2, ADR si besoin | Tableau stack/paradigmes | Aucune techno inventée | Tableau créé |
| B2-M08 - Tests unitaires et couverture | P0 | Validé | Codex | dossier B2, cahier recettes | Synthèse tests | Chiffres harmonisés, C2.2.2 couvert | `pnpm test` : 71 passés ; coverage API 82.33% |
| B2-M09 - Sécurité applicative | P0 | Validé | Codex | dossier B2, OWASP, cahier recettes | Tableau risques/mesures/preuves | Audit high traité ou justifié, C2.2.3 couvert | Audit high vert ; 0 high/critical |
| B2-M10 - Accessibilité et handicap | P0 | Validé | Codex | dossier B2, cahier recettes | Section accessibilité | Tests non relancés marqués à relancer | Smoke Playwright/axe : 48 passés ; `generate.spec.ts` hors smoke |
| B2-M11 - Version fonctionnelle et historique | P1 | Validé | Codex | dossier B2, CHANGELOG, deployment | Historique + post-déploiement | Version cohérente partout | Version 0.12.0 documentée ; build Next 15.5.18 validé |
| B2-M12 - Cahier de recettes | P0 | Validé | Codex | `docs/bloc2/cahier-recettes.md` | Cahier corrigé | CR-013, CR-040, CR-044 traités, C2.3.1 couvert | CR-013 reste à relancer en condition réelle |
| B2-M13 - Plan correction bogues | P0 | Validé | Codex | `docs/rncp/bloc2-plan-correction-*.md` | Plan global bugs | Anomalies reliées à recette + non-régression | Plan créé |
| B2-M14 - Manuel de déploiement | P1 | En revue | Codex | `docs/deployment.md`, dossier B2 | Procédure autonome | Variables, commandes, healthchecks, rollback | Référencé ; contrôle externe restant |
| B2-M15 - Manuel utilisateur | P0 | Validé | Codex | `docs/rncp/bloc2-manuel-utilisateur-*.md` | Guide utilisateur | Fonctionnalités réelles seulement | Manuel créé |
| B2-M16 - Manuel de mise à jour | P0 | Validé | Codex | `docs/rncp/bloc2-manuel-mise-a-jour.md` | Procédure update | Code, dépendances, DB, rollback distingués | Manuel créé |
| B2-M17 - Harmonisation documentaire | P0 | Validé | Codex | README, docs, RNCP | Patch cohérence | `rg` sans anciens chiffres contradictoires | Valeurs canoniques du 2026-06-30 dans les documents courants ; historiques conservés |
| B2-M18 - Pack de preuves et annexes | P1 | Validé | Codex | `docs/rncp/bloc2-annexes/` | Index annexes | Chaque annexe datée, sourcée, liée à C2.x | Annexes tests, coverage, smoke E2E, audit et qualité créées |
| B2-M19 - Revue finale Bloc 2 | P0 | Validé | Codex | Tous livrables B2 | Rapport final | 4 éliminatoires OK ou bloquées explicitement | Éliminatoires Bloc 2 couvertes ; limites restantes documentées |

## Journal des décisions

| Date | Mission | Décision | Justification | Impact | Validé par |
|---|---|---|---|---|---|
| 2026-06-30 | B2-M02 | Créer un dossier Bloc 2 autonome | Les preuves étaient dispersées dans le dossier professionnel et la matrice | Centralise les attendus officiels | Codex |
| 2026-06-30 | B2-M12 | Garder CR-013 en relance réelle | La coupure IA réelle n'a pas été rejouée pendant cette passe | Évite d'annoncer une preuve non vérifiée | Codex |
| 2026-06-30 | B2-M17 | Conserver certains anciens chiffres dans les historiques | Les changelogs et audits historiques ne doivent pas être réécrits comme s'ils étaient contemporains | Les valeurs canoniques sont dans les documents courants | Codex |

## Journal des contrôles

| Date | Mission | Commande ou contrôle | Résultat | Écart détecté | Action suivante |
|---|---|---|---|---|---|
| 2026-06-30 | B2-M12 | Relecture CR-013, CR-040, CR-044 | Corrigé documentaire | CR-013 non rejoué en coupure réelle | Relancer en environnement contrôlé si exigé |
| 2026-06-30 | B2-M13 | Création plan correction bogues | Fichier créé puis mis à jour | CR-013 reste une relance réelle | Annexer les preuves de contrôle |
| 2026-06-30 | B2-M08 | `pnpm test` | OK : 71 tests passés | Aucun | Conserver annexe B2-A08 |
| 2026-06-30 | B2-M08 | `pnpm test:coverage` | OK : 82.33% statements API | Aucun | Conserver annexe B2-A09 |
| 2026-06-30 | B2-M09 | `pnpm audit --audit-level=high` | OK : 0 high/critical ; 2 low et 4 moderate restants | Vulnérabilités low/moderate à suivre | Conserver annexe B2-A11 |
| 2026-06-30 | B2-M10 | `pnpm test:e2e:smoke` | OK : 48 tests passés Chromium/Firefox | `generate.spec.ts` hors smoke | Relancer E2E complet si le total 56 est annoncé |
| 2026-06-30 | B2-M19 | `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check` | OK | Aucun | Conserver annexe B2-A16 |

## Critères de validation finale

| Critère | Statut | Preuve |
|---|---|---|
| Dossier Bloc 2 principal créé | Validé | `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md` |
| 16 attendus officiels couverts | Validé | Dossier principal, sections 2 à 14 |
| C2.2.1 prototype validé | En revue | Storyboard créé, captures à produire |
| C2.2.2 tests unitaires validé | Validé | `pnpm test` 71 passés ; coverage API 82.33% |
| C2.2.3 développement sécurisé/accessibilité validé | Validé | Audit high vert ; smoke E2E/axe 48 passés |
| C2.3.1 cahier de recettes validé | Validé | `docs/bloc2/cahier-recettes.md`, CR-013 à relancer en réel |
| Plan de correction des bogues créé | Validé | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md` |
| Manuel utilisateur créé | Validé | `docs/rncp/bloc2-manuel-utilisateur-alcide.md` |
| Manuel de mise à jour créé | Validé | `docs/rncp/bloc2-manuel-mise-a-jour.md` |
| Chiffres de tests harmonisés | Validé | Valeurs canoniques 2026-06-30 ajoutées ; historiques conservés |
| E2E relancés ou clairement marqués à relancer | Validé | Smoke validé ; `generate.spec.ts` marqué hors smoke |
| Pack de preuves prêt | Validé | Annexes B2-A08 à B2-A11 et B2-A16 créées |
