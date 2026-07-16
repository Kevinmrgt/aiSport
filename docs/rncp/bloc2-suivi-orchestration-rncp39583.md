# Suivi d'orchestration - Bloc 2 RNCP39583

> Registre opérationnel à tenir par l'orchestrateur. Une mission ne passe à `Validé` que si les livrables, les contrôles et la revue orchestrateur sont terminés.

Plan de référence : `docs/rncp/bloc2-plan-orchestration-agents-rncp39583.md`

## Validation finale et addendum post-fix 2026-07-16

Annexes de référence :

- B2-A17 : validation historique production OpenAI du 2026-07-15 ;
- B2-A18 : validation finale post-fix Vercel du 2026-07-16.

| Mission | Statut final | Preuve de contrôle |
|---|---|---|
| B2-M03 - Environnements et performance | Validé | Healthchecks Web/API production HTTP 200 le 2026-07-16, version `0.12.0` |
| B2-M04 - Intégration continue | Validé avec action config | CI `CI - Alcide` verte run `29489995458` ; monitoring production vert run `29496100988` ; `VERCEL_TOKEN` GitHub à renouveler pour le CD custom |
| B2-M05 - Prototype et storyboard | Validé | Routes production observées et générations réelles : `/generate`, `/programs/generate`, `/workouts/[id]`, `/programs/[id]`, `/settings`, `/dashboard` |
| B2-M08 - Tests unitaires et couverture | Validé | CI tests/coverage verte ; 70 tests API + 1 test Web passés ; coverage API 88.1% statements |
| B2-M09 - Sécurité applicative | Validé | `POST /workouts/generate` protégé ; appels directs sans secret en 401 attendus |
| B2-M10 - Accessibilité et handicap | Validé documentaire | Smoke Playwright/axe déjà annexé ; composants clés documentés |
| B2-M12 - Cahier de recettes | Validé | CR reliés aux preuves, génération séance et génération programme validées en production |
| B2-M14 - Manuel de déploiement | Validé | Healthchecks et variables serveur contrôlés ; warning SSL suivi comme durcissement |
| B2-M18 - Pack de preuves et annexes | Validé | Annexes B2-A17 et B2-A18 ajoutées à l'index des preuves |
| B2-M19 - Revue finale Bloc 2 | Validé | Décision finale : Bloc 2 validable techniquement au 2026-07-16 |

Points suivis mais non bloquants : CR-013 non rejoué en coupure IA réelle, E2E automatisé complet `generate.spec.ts` non relancé localement car Node/pnpm ne sont pas exploitables dans le terminal, secret GitHub `VERCEL_TOKEN` à renouveler pour le workflow CD custom, warning PostgreSQL SSL à durcir en `sslmode=verify-full`, favicon statique à ajouter.

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
| B2-M04 - Intégration continue | P1 | Validé | Codex | `docs/ci-cd.md`, dossier B2 | Protocole CI + preuve production | Cohérence avec `.github/workflows/ci.yml` et production Vercel | CI verte run `29489995458` ; monitoring vert run `29496100988` ; secret `VERCEL_TOKEN` à renouveler pour relancer le CD GitHub custom |
| B2-M05 - Prototype et storyboard | P0 | Validé | Codex | dossier B2, annexes | Parcours prototype + routes production | Routes réelles, C2.2.1 couvert | Storyboard créé ; routes production observées ; captures UI possibles en complément |
| B2-M06 - Architecture maintenable | P1 | Validé | Codex | dossier B2 | Section architecture | Couches réelles et chemins existants | Section créée |
| B2-M07 - Frameworks et paradigmes | P2 | Validé | Codex | dossier B2, ADR si besoin | Tableau stack/paradigmes | Aucune techno inventée | Tableau créé |
| B2-M08 - Tests unitaires et couverture | P0 | Validé | Codex | dossier B2, cahier recettes | Synthèse tests | Chiffres harmonisés, C2.2.2 couvert | CI tests/coverage verte ; 71 tests passés ; coverage API 88.1% dernière mesure |
| B2-M09 - Sécurité applicative | P0 | Validé | Codex | dossier B2, OWASP, cahier recettes | Tableau risques/mesures/preuves | Audit high traité ou justifié, C2.2.3 couvert | Audit high vert ; 0 high/critical |
| B2-M10 - Accessibilité et handicap | P0 | Validé | Codex | dossier B2, cahier recettes | Section accessibilité | Tests non relancés marqués à relancer | Smoke Playwright/axe : 48 passés ; `generate.spec.ts` hors smoke |
| B2-M11 - Version fonctionnelle et historique | P1 | Validé | Codex | dossier B2, CHANGELOG, deployment | Historique + post-déploiement | Version cohérente partout | Version 0.12.0 documentée ; build Next 15.5.18 validé |
| B2-M12 - Cahier de recettes | P0 | Validé | Codex | `docs/bloc2/cahier-recettes.md` | Cahier corrigé | CR-013, CR-040, CR-044 traités, C2.3.1 couvert | CR-013 reste à relancer en condition réelle |
| B2-M13 - Plan correction bogues | P0 | Validé | Codex | `docs/rncp/bloc2-plan-correction-*.md` | Plan global bugs | Anomalies reliées à recette + non-régression | Plan créé |
| B2-M14 - Manuel de déploiement | P1 | Validé | Codex | `docs/deployment.md`, dossier B2 | Procédure autonome | Variables, commandes, healthchecks, rollback | Healthchecks production contrôlés ; warning SSL suivi en durcissement |
| B2-M15 - Manuel utilisateur | P0 | Validé | Codex | `docs/rncp/bloc2-manuel-utilisateur-*.md` | Guide utilisateur | Fonctionnalités réelles seulement | Manuel créé |
| B2-M16 - Manuel de mise à jour | P0 | Validé | Codex | `docs/rncp/bloc2-manuel-mise-a-jour.md` | Procédure update | Code, dépendances, DB, rollback distingués | Manuel créé |
| B2-M17 - Harmonisation documentaire | P0 | Validé | Codex | README, docs, RNCP | Patch cohérence | `rg` sans anciens chiffres contradictoires | Valeurs canoniques du 2026-06-30 dans les documents courants ; historiques conservés |
| B2-M18 - Pack de preuves et annexes | P1 | Validé | Codex | `docs/rncp/bloc2-annexes/` | Index annexes | Chaque annexe datée, sourcée, liée à C2.x | Annexes tests, coverage, smoke E2E, audit et qualité créées |
| B2-M19 - Revue finale Bloc 2 | P0 | Validé | Codex | Tous livrables B2 | Rapport final | 4 éliminatoires OK ou bloquées explicitement | Éliminatoires Bloc 2 couvertes ; limites restantes documentées |

## Journal des décisions

| Date | Mission | Décision | Justification | Impact | Validé par |
|---|---|---|---|---|---|
| 2026-07-16 | B2-M19 | Clore le Bloc 2 post-fix Vercel | CI main verte, monitoring production vert, générations séance et programme validées en production | Bloc 2 prêt à remettre avec B2-A18 comme annexe finale | Codex + agents Dalton/Pascal/Beauvoir |
| 2026-07-16 | B2-M04 | Garder le CD GitHub custom en action configuration | `CD - Vercel` run `29490217892` échoue sur `VERCEL_TOKEN` invalide, tandis que production et monitoring sont OK | Transparence jury sans bloquer la conformité produit | Codex |
| 2026-07-16 | B2-M05 | Valider le prototype en navigateur connecté | `/generate` et `/programs/generate` ont produit une séance et un programme réels | Supprime la limite précédente sur le programme | Codex |
| 2026-07-16 | B2-M18 | Fermer la PR Dependabot hors périmètre | PR #25 rouge isolée, non retenue pour le dépôt Bloc 2 | Etat GitHub plus lisible pour le jury | Codex |
| 2026-07-15 | B2-M19 | Valider techniquement le Bloc 2 | Production Vercel Web/API prête, OpenAI côté serveur prouvé, tests/typecheck/build relancés | Bloc 2 présentable comme validable avec preuves B2-A17 | Codex |
| 2026-07-15 | B2-M04 | Clore l'intégration continue côté production | Les deux deployments production sont `READY` sur le même commit | La preuve CI/CD est complétée par l'état Vercel réel | Codex |
| 2026-07-15 | B2-M04 | Identifier l'action propriétaire GitHub | Le workflow `CD - Vercel` échoue car `VERCEL_TOKEN` est invalide | Renouvellement du secret requis côté GitHub | Codex |
| 2026-07-15 | B2-M14 | Garder le warning SSL comme durcissement non bloquant | L'application répond en production ; la configuration doit être explicitée en `sslmode=verify-full` | Action de configuration à traiter hors blocage RNCP | Codex |
| 2026-06-30 | B2-M02 | Créer un dossier Bloc 2 autonome | Les preuves étaient dispersées dans le dossier professionnel et la matrice | Centralise les attendus officiels | Codex |
| 2026-06-30 | B2-M12 | Garder CR-013 en relance réelle | La coupure IA réelle n'a pas été rejouée pendant cette passe | Évite d'annoncer une preuve non vérifiée | Codex |
| 2026-06-30 | B2-M17 | Conserver certains anciens chiffres dans les historiques | Les changelogs et audits historiques ne doivent pas être réécrits comme s'ils étaient contemporains | Les valeurs canoniques sont dans les documents courants | Codex |

## Journal des contrôles

| Date | Mission | Commande ou contrôle | Résultat | Écart détecté | Action suivante |
|---|---|---|---|---|---|
| 2026-07-16 | B2-M04 | `gh run view 29489995458` | OK : CI `main` verte sur `533f17b`, lint/typecheck, audit, tests/coverage, smoke/accessibilité, build, Docker | Aucun | Conserver B2-A18 |
| 2026-07-16 | B2-M04 | `gh run view 29496100988` | OK : monitoring production vert | Aucun | Conserver B2-A18 |
| 2026-07-16 | B2-M04 | `gh run view 29490217892` | Echec CD custom : `VERCEL_TOKEN` invalide au `vercel pull` | Action propriétaire GitHub/Vercel | Renouveler `VERCEL_TOKEN` si CD custom requis |
| 2026-07-16 | B2-M03 | `GET https://ai-sport-api.vercel.app/health` | OK : 200, `status:"ok"`, version `0.12.0` | Aucun | Conserver B2-A18 |
| 2026-07-16 | B2-M03 | `GET https://ai-sport-web.vercel.app/api/health` | OK : 200, `status:"ok"`, version `0.12.0` | Aucun | Conserver B2-A18 |
| 2026-07-16 | B2-M05 | Navigateur connecté `/generate` | OK : génération séance réelle, détail `/workouts/f1d03237-7987-4fef-b8b8-145edc26ec61`, timer visible | Aucun | Conserver captures B2-A18 |
| 2026-07-16 | B2-M05 | Navigateur connecté `/programs/generate` | OK : génération programme réelle, détail `/programs/e818c9a6-f09c-4387-972f-b8d2fc59327b`, 9 séances planifiées | Aucun | Conserver captures B2-A18 |
| 2026-07-15 | B2-M03 | `GET https://ai-sport-api.vercel.app/health` | OK : 200, `status:"ok"`, version `0.12.0` | Aucun | Conserver B2-A17 |
| 2026-07-15 | B2-M03 | `GET https://ai-sport-web.vercel.app/api/health` | OK : 200, `status:"ok"`, version `0.12.0` | Aucun | Conserver B2-A17 |
| 2026-07-15 | B2-M05 | Logs Web Vercel production | OK : `/generate`, `/settings`, `/programs`, `/programs/generate`, `/workouts`, `/dashboard` répondent | Aucun bloquant | Captures UI possibles si le jury les demande |
| 2026-07-15 | B2-M09 | Logs API Vercel `POST /workouts/generate` | OK : 201, `provider: 'openai'`, durée < 7 s | Aucun | Conserver B2-A17 |
| 2026-07-15 | B2-M04 | `gh run list` et logs workflows | CI verte ; CD bloqué par `VERCEL_TOKEN`; monitoring pointait sur anciens domaines | Secret GitHub à renouveler ; URLs monitoring corrigées | Relancer workflows après push/config |
| 2026-07-15 | B2-M08 | Vitest API/Web via Node embarqué Codex | OK : 70 tests API + 1 test Web passés | `pnpm` indisponible localement | Relancer via `pnpm` quand l'environnement local est réparé |
| 2026-07-15 | B2-M08 | Coverage API | OK : 88.1% statements, 95.08% functions | Aucun | Conserver B2-A17 |
| 2026-07-15 | B2-M19 | Typecheck API/Web/shared + build API/Web + `git diff --check` | OK | Aucun | Dossier Bloc 2 validable |
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
| Validation finale production OpenAI | Validé | B2-A17 : deployments Vercel `READY`, healthchecks 200, génération séance 201 avec `provider: 'openai'` ; B2-A18 : validation post-fix Vercel 2026-07-16 |
| Dossier Bloc 2 principal créé | Validé | `docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md` |
| 16 attendus officiels couverts | Validé | Dossier principal, sections 2 à 14 |
| C2.2.1 prototype validé | Validé | Storyboard créé, routes production observées, génération séance et programme réelles ; captures B2-A18 |
| C2.2.2 tests unitaires validé | Validé | CI tests/coverage verte ; `pnpm test` 71 passés ; coverage API 88.1% dernière mesure |
| C2.2.3 développement sécurisé/accessibilité validé | Validé | Audit high vert ; smoke E2E/axe 48 passés |
| C2.3.1 cahier de recettes validé | Validé | `docs/bloc2/cahier-recettes.md`, CR-013 à relancer en réel |
| Plan de correction des bogues créé | Validé | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md` |
| Manuel utilisateur créé | Validé | `docs/rncp/bloc2-manuel-utilisateur-alcide.md` |
| Manuel de mise à jour créé | Validé | `docs/rncp/bloc2-manuel-mise-a-jour.md` |
| Chiffres de tests harmonisés | Validé | Valeurs canoniques 2026-06-30 ajoutées ; historiques conservés |
| E2E relancés ou clairement marqués à relancer | Validé | Smoke validé ; `generate.spec.ts` marqué hors smoke |
| Pack de preuves prêt | Validé | Annexes B2-A08 à B2-A11 et B2-A16 créées |
