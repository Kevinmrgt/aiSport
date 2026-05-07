# Audit final de conformité RNCP39583 - SportCoach IA / aiSport

> Date d'audit : 2026-05-07  
> Projet : SportCoach IA / aiSport  
> Répertoire audité : `C:\Users\kevin\OneDrive\Documents\Dev\aiSport`  
> Périmètre : PDF officiels RNCP/YNOV, livrables `docs/rncp`, documents projet, code source, configuration CI/CD, tests et preuves de production disponibles.

## 1. Synthèse exécutive

### Verdict global

**Verdict global : Risqué, conformité partielle.**

Le projet couvre une très grande partie des attentes RNCP39583, mais il ne peut pas être déclaré pleinement OK avant dépôt/soutenance. Les livrables principaux existent et sont substantiels, le code soutient réellement une partie importante des preuves techniques, et les commandes qualité locales passent. En revanche, plusieurs exigences éliminatoires restent fragilisées par des preuves reconstituées, simulées, incohérentes avec la production, ou non encore matérialisées.

Le risque n'est pas un manque massif de travail. Le risque est plus précis : le jury peut refuser une compétence si la preuve attendue n'est pas explicite, actuelle, cohérente et directement vérifiable.

### Probabilité estimée de conformité par bloc

Ces pourcentages sont une estimation d'audit, pas une garantie de jury.

| Bloc | Verdict audit | Probabilité estimée | Risque principal |
|---|---:|---:|---|
| Bloc 1 - Cadrage | OK avec réserves | 80-85% | Commanditaire et demande client fictifs, budget hypothétique |
| Bloc 2 - Conception et développement | Partiel haut | 70-75% | Recettes incohérentes, E2E authentifié fragile, manuel utilisateur absent, audit sécurité high |
| Bloc 3 - Pilotage et démonstration | Partiel proche OK | 60-65% | Pilotage reconstitué, absence de vrai outil de suivi, version live API incohérente |
| Bloc 4 - MCO | Partiel solide | 60-70% | Supervision/alerting externe non prouvé, support client simulé, rollback DB non prouvé |

### Principaux risques restants

| Risque | Bloc | Niveau jury | Pourquoi |
|---|---|---:|---|
| API production `/health` répond `version:"0.1.0"` alors que le dossier annonce `0.12.0` | B3/B4 | Élevé | Fragilise la démonstration de la dernière version et la cohérence documentaire |
| Alerting externe non prouvé | B4 | Élevé | `C4.1.2` est éliminatoire, les healthchecks seuls ne suffisent pas à prouver un système d'alerte |
| Outil de suivi projet reconstitué | B3 | Moyen/Élevé | `C3.2.1` est éliminatoire ; un dépôt Git ne remplace pas toujours un tableau de pilotage |
| Planning prévisionnel initial non prouvé | B3 | Élevé | `C3.1` est éliminatoire ; le planning est surtout reconstruit a posteriori |
| Cahier de recettes partiellement incohérent | B2 | Moyen/Élevé | `C2.3.1` est éliminatoire ; des scénarios ne collent pas au code réel |
| Audit dépendances high | B2/B4 | Moyen/Élevé | `pnpm audit --audit-level=high` échoue, et le job CI audit est non bloquant |

## 2. Tableau global de couverture

| Bloc | Exigence officielle | Preuve projet | Livrable associé | Statut | Risque jury | Action recommandée |
|---|---|---|---|---|---|---|
| B1 | Cartographier parties prenantes | Cartographie + RACI, acteurs techniques et jury identifiés | `bloc1-cadrage-projet-rncp39583.md` | OK | Faible/Moyen | Assumer le contexte solo/fictif à l'oral |
| B1 | Analyser demande initiale et besoin client | Besoin clair et problématique utilisateur | `bloc1-cadrage-projet-rncp39583.md` | Partiel | Moyen | Ne pas revendiquer d'entretien client réel ; présenter comme cas commanditaire réaliste |
| B1 | Opportunités, menaces, risques | SWOT, registre de risques, mitigations | `bloc1-cadrage-projet-rncp39583.md` | OK | Faible | Garder les risques majeurs prêts pour les questions |
| B1 | Faisabilité, veille, comparaison solutions | Comparatifs Next.js/Hono/PostgreSQL/Mistral/Vercel-Neon/GitHub Actions | `bloc1-cadrage-projet-rncp39583.md`, ADR | OK | Faible/Moyen | Citer les ADR et cadrer la veille tarifaire comme hypothèse |
| B1 | Architecture, charge, coûts, argumentaire | Architecture logique, 81 JH / 567 h, budget estimé, préconisation client | `bloc1-cadrage-projet-rncp39583.md`, support oral | OK/Partiel | Moyen | Préparer justification JH/TJM/marge ; ne pas survendre l'ouverture commerciale |
| B1 | Oral 20 min + 10 min échange | Plan minuté 12 slides, questions préparées | `bloc1-support-oral-20min.md` | OK | Faible | Préparer preuves code/ADR en appoint |
| B2 | Environnements test/déploiement et CI | pnpm monorepo, Docker, GitHub Actions, Vercel/Neon | `dossier-professionnel-rncp39583.md`, `.github/workflows/*`, `docs/deployment.md` | OK/Partiel | Moyen | Produire capture CI verte finale et clarifier CD conditionnelle |
| B2 | Prototype/UI | Pages Next.js, formulaires, dashboard, captures `.codex` | `dossier-professionnel-rncp39583.md`, `apps/web` | Partiel | Moyen | Ajouter captures/storyboard ou prototype annoté |
| B2 | Développement sécurisé et accessible | Hono, Auth.js, `SERVICE_SECRET`, Zod, headers, tests axe | Code API/Web, `owasp-review.md`, tests Playwright | Partiel | Moyen/Élevé | Corriger ou justifier vulnérabilités high ; limiter promesse sécurité |
| B2 | Tests unitaires | `pnpm test` OK : API 69 tests, Web 1 test | `apps/api/tests`, `apps/web/components/Timer.test.ts` | OK | Faible | Joindre sortie finale ou capture CI |
| B2 | Couverture | `pnpm test:coverage` OK côté orchestrateur : 81.57% API | `apps/api/coverage` | Partiel | Moyen | Préciser que la couverture est API uniquement, pas Web/DB |
| B2 | Tests E2E/accessibilité | 56 tests listés Playwright, smoke documenté | `apps/web/tests/e2e`, `playwright.config.ts` | Partiel | Moyen | Relancer E2E complets ou distinguer clairement smoke passé vs suite complète listée |
| B2 | Cahier de recettes | 33 scénarios documentés | `docs/bloc2/cahier-recettes.md` | Partiel | Moyen/Élevé | Corriger CR-013, CR-040, CR-044 pour coller au code réel |
| B2 | Plan de correction bugs | BUG-001/BUG-002 réels, changelog | `docs/bloc4/bugs/*`, `CHANGELOG.md` | Partiel | Moyen | Ajouter un plan global Bloc 2 reliant anomalie, priorité, correction, non-régression |
| B2 | Documentation technique/utilisateur/MAJ | Déploiement et runbook présents | `docs/deployment.md`, `bloc4-runbook-maintenance.md` | Partiel | Moyen | Ajouter manuel utilisateur autonome ou section finale complète |
| B3 | Planning | Planning détaillé, jalons, vue Mermaid | `bloc3-pilotage-projet-rncp39583.md` | Partiel | Élevé | Ajouter preuve prévisionnelle ou assumer reconstruction avec justification |
| B3 | Outil de suivi et pilotage | Sprints, changelog, ADR, bugs, CI, tableau consolidé | `bloc3-pilotage-projet-rncp39583.md`, `docs/sprints` | Partiel | Moyen/Élevé | Ajouter capture/export GitHub Projects/Kanban ou tableau de suivi signé |
| B3 | Ressources, missions, management | Ressources, RACI, projet individuel expliqué | `bloc3-pilotage-projet-rncp39583.md` | Partiel | Moyen | Cadrer comme mise en situation solo, pas management réel |
| B3 | Arbitrages et communication | ADR, comptes rendus reconstitués, indicateurs | `bloc3-pilotage-projet-rncp39583.md` | Partiel | Moyen | Identifier un arbitrage lié à dérive/écart avec outil d'aide à décision |
| B3 | Validation, satisfaction | Grille de validation et satisfaction | `bloc3-pilotage-projet-rncp39583.md` | Partiel | Moyen | Préparer grille signable ou retour commanditaire pilote |
| B3 | Oral 30 min + démo + 15 min échange | Support 30 min, script démo complet, plans B | `bloc3-support-oral-30min.md`, `bloc3-script-demo-logiciel.md` | OK/Partiel | Élevé | Redéployer API ou éviter d'exposer la version live incohérente |
| B4 | Mises à jour dépendances | Dependabot + procédure MCO | `.github/dependabot.yml`, `bloc4-mco-rncp39583.md` | Partiel | Moyen | Montrer une PR Dependabot traitée ou simuler proprement le cycle |
| B4 | Supervision et healthchecks | API `/health`, Web `/api/health`, runbook | `bloc4-mco-rncp39583.md`, routes health | Partiel | Élevé | Ajouter monitoring externe + capture d'alerte ; rendre health Web non cacheable |
| B4 | Alerting | Alertes CI indirectes ; alerting externe recommandé | `bloc4-mco-rncp39583.md` | Manquant/Partiel | Élevé | Mettre en place UptimeRobot/Better Stack/Vercel Monitoring ou preuve équivalente |
| B4 | Consignation anomalies | Processus incidents + modèle fiche anomalie | `bloc4-processus-incidents.md`, `bloc4-fiche-anomalie-modele.md` | OK | Faible | Conserver tickets et captures |
| B4 | Correctifs et journal versions | BUG-001/BUG-002, changelog `0.1.0` à `0.12.0` | `CHANGELOG.md`, `docs/bloc4/bugs/*` | OK | Faible/Moyen | Lier chaque bug à tests de non-régression |
| B4 | Rollback | Rollback Vercel documenté, DB recommandé | `bloc4-runbook-maintenance.md`, `bloc4-mco-rncp39583.md` | Partiel | Moyen | Produire preuve rollback Vercel et stratégie backup Neon |
| B4 | Support client | Cas support explicitement simulé | `bloc4-mco-rncp39583.md`, `bloc4-processus-incidents.md` | Partiel | Moyen | Produire un ticket support pilote daté ou garder la mention simulation |

## 3. Résultat par agent

### Agent 1 - Exigences officielles RNCP

**Verdict : Partiel, pas OK global.**

L'agent a lu les quatre PDF officiels présents dans `docs/rncp` et a extrait les règles structurantes : 4 blocs, seuil de validation de bloc à 50% des compétences acquises, zéro compétence éliminatoire non acquise, dépôts sur DigiformaCertif, retard rendant le livrable non recevable, contrôle anti-plagiat au-dessus de 10%, absence justifiable sous 48 h, règles de rattrapage/ajournement.

Points clés :

- B1 : oral 30 min, dont 20 min présentation et 10 min échange.
- B2 : dossier écrit individuel + code source, maximum 30 pages.
- B3 : oral 45 min, dont 30 min présentation et 15 min échange, avec démonstration logicielle.
- B4 : dossier écrit individuel, maximum 20 pages.
- Compétences éliminatoires : B1 `C1.1.1`, `C1.2.2`, `C1.3.2`, `C1.4.1`, `C1.6`; B2 `C2.2.1`, `C2.2.2`, `C2.2.3`, `C2.3.1`; B3 `C3.1`, `C3.2.1`, `C3.4.2`; B4 `C4.1.2`, `C4.2.1`, `C4.3.2`.

### Agent 2 - Bloc 1 cadrage

**Verdict : OK avec réserves.**

Les livrables couvrent les attendus : parties prenantes, demande, objectifs, enjeux, SWOT, risques, faisabilité, veille, comparaisons, architecture, charge, budget, argumentaire client, support oral. Les réserves portent sur le caractère fictif du commanditaire, l'absence d'entretien réel, les coûts hypothétiques et l'impact environnemental non métrique.

### Agent 3 - Bloc 2 conception et développement

**Verdict : Partiel haut.**

Le code soutient réellement le dossier : monorepo pnpm, Next.js, Hono, Auth.js, Drizzle/PostgreSQL, Zod, Mistral, CI/CD, tests et accessibilité. Les écarts restants sont importants : E2E authentifié fragile ou simulé, pas de tests DB, cahier de recettes incohérent sur certains scénarios, audit sécurité high, rate limit in-memory, manuel utilisateur absent.

### Agent 4 - Bloc 3 pilotage et démonstration

**Verdict : Partiel proche OK.**

Le support oral et le script de démo sont solides. Le pilotage reste fragile car il est souvent reconstitué depuis le dépôt : planning prévisionnel initial non prouvé, outil de suivi projet non matérialisé par un vrai board, comptes rendus client reconstitués, satisfaction non réelle. La démo est aussi fragilisée par l'API live qui répond `version:"0.1.0"`.

### Agent 5 - Bloc 4 MCO

**Verdict : Partiel solide.**

Le dossier MCO, le runbook, le processus d'incidents, les fiches anomalies, le changelog et les correctifs sont sérieux. Le risque principal est éliminatoire : supervision/alerting externe non prouvé sur `C4.1.2`. Le support client est simulé et le rollback DB reste une procédure recommandée, non démontrée.

### Agent 6 - Cohérence documentaire et preuves

**Verdict : Partiel.**

Le socle est majoritairement cohérent, mais plusieurs contradictions restent à corriger :

- production API `/health` en `0.1.0` vs docs/packages en `0.12.0`;
- `bloc3-support-oral-30min.md` mentionne encore une incohérence `0.12.0` / `0.13.0`;
- références à `vercel.json` racine alors que seuls `apps/api/vercel.json` et `apps/web/vercel.json` existent;
- `docs/bloc4/veille-technologique.md` recommande encore Vercel + Railway, alors que la cible courante est Vercel + Neon;
- certains liens ADR sont abrégés et ne pointent pas vers les noms exacts.

### Agent 7 - Vérification technique finale

**Verdict : Partiel technique.**

L'agent technique indépendant a lancé `pnpm test`, `pnpm lint`, `pnpm typecheck` avec succès. Il n'a pas relancé `pnpm test:coverage` pour éviter d'écrire dans `apps/api/coverage`. Côté orchestrateur, `pnpm test:coverage` a bien été lancé et a réussi.

## 4. Analyse par bloc

### Bloc 1 - Cadrer un projet

**Verdict bloc : OK avec réserves.**

Le livrable `bloc1-cadrage-projet-rncp39583.md` et le support oral `bloc1-support-oral-20min.md` répondent bien à la structure attendue. Les compétences éliminatoires semblent couvertes sur le plan documentaire.

Points validés :

- cartographie des parties prenantes;
- analyse de la demande et des utilisateurs;
- objectifs, enjeux, contraintes;
- SWOT et risques;
- faisabilité et décision de lancement;
- veille et comparaison solutions;
- architecture et flux;
- estimation charge/coûts;
- préconisation client.

Écarts :

- pas de commanditaire réel ni entretien client prouvé;
- coûts IA/cloud hypothétiques;
- diagnostic d'existant limité, acceptable pour un projet greenfield mais à expliquer;
- impact environnemental qualitatif.

Action avant oral : présenter le projet comme un cas client réaliste et un pilote limité, pas comme une commande commerciale déjà contractualisée.

### Bloc 2 - Concevoir et développer

**Verdict bloc : Partiel haut.**

Le code réel est le point fort du dossier. Les preuves techniques existent et les commandes qualité locales passent. Le bloc reste néanmoins partiel car plusieurs preuves RNCP sont trop faibles ou incohérentes.

Points validés :

- architecture monorepo pnpm;
- API Hono structurée en routes/controllers/services/repositories;
- Web Next.js App Router;
- Auth.js et `SERVICE_SECRET`;
- PostgreSQL/Drizzle;
- schémas Zod partagés;
- services IA Mistral avec validation/retry;
- CI/CD GitHub Actions;
- tests unitaires API/Web;
- coverage API supérieure à 80%.

Écarts :

- E2E authentifié fragile, fixture session vide;
- suite E2E complète listée mais non relancée pendant cet audit;
- pas de tests d'intégration DB automatisés;
- repositories/routes/db exclus du coverage;
- `docs/bloc2/cahier-recettes.md` contient des scénarios à corriger (`CR-013`, `CR-040`, `CR-044`);
- manuel utilisateur final absent comme livrable autonome;
- `pnpm audit --audit-level=high` échoue.

Action avant dépôt : corriger les recettes incohérentes, ajouter un manuel utilisateur court, produire preuve E2E finale, et justifier/corriger les vulnérabilités high.

### Bloc 3 - Coordonner et piloter

**Verdict bloc : Partiel proche OK, mais fragile sur éliminatoires.**

Les livrables `bloc3-pilotage-projet-rncp39583.md`, `bloc3-support-oral-30min.md` et `bloc3-script-demo-logiciel.md` sont utiles et bien structurés. Le problème est la nature des preuves : beaucoup de pilotage est reconstruit depuis l'historique projet.

Points validés :

- méthodologie itérative;
- planning détaillé;
- ressources;
- RACI et gestion projet solo;
- arbitrages techniques;
- communication;
- indicateurs qualité;
- script de démo détaillé et plans B;
- support oral 30 min.

Écarts :

- planning prévisionnel initial non prouvé;
- pas de vrai outil de suivi type GitHub Projects/Jira/Trello exporté;
- comptes rendus client et satisfaction reconstitués;
- management d'équipe simulé dans un projet individuel;
- API production annonce `version:"0.1.0"` alors que le dossier parle de `0.12.0`;
- une réponse du support oral mentionne encore `0.12.0` / `0.13.0`.

Action avant soutenance : redéployer l'API ou retirer le champ version de la démo, produire une capture/export de board projet, et assumer clairement le pilotage reconstitué d'un projet individuel.

### Bloc 4 - Maintien en condition opérationnelle

**Verdict bloc : Partiel solide.**

Le dossier MCO est sérieux, mais `C4.1.2` reste le risque majeur : healthchecks et logs ne prouvent pas seuls un système de supervision/alerting.

Points validés :

- dépendances critiques identifiées;
- Dependabot configuré;
- CI/CD comme garde-fou;
- healthchecks API/Web;
- processus d'incidents;
- modèle de fiche anomalie;
- BUG-001/BUG-002 documentés;
- changelog exploitable;
- runbook complet;
- rollback Vercel documenté.

Écarts :

- alerting externe non prouvé;
- Web `/api/health` servi depuis cache Vercel avec timestamp `2026-05-04T14:12:15.247Z`;
- API `/health` annonce `0.1.0`;
- `pnpm audit` high non traité;
- support client simulé;
- rollback DB/backup Neon non prouvé.

Action avant dépôt : ajouter une preuve d'alerte externe, rendre le healthcheck Web dynamique/non cacheable, corriger la version API, et produire au moins un ticket support pilote.

## 5. Analyse administrative

| Élément | Exigence officielle consolidée | Statut projet | Risque |
|---|---|---|---|
| Dépôt | Livrables et supports à déposer sur DigiformaCertif avant échéance | Non vérifié localement | Élevé si oubli/retard |
| Retard | Tout retard rend le livrable non recevable | À gérer hors dépôt local | Élevé |
| Fraude/plagiat | Dossier écrit soumis anti-plagiat ; seuil cité : 10% | Aucun contrôle anti-plagiat local fourni | Moyen |
| Bloc 1 | Oral 30 min : 20 min présentation + 10 min échange | Support oral présent | Faible |
| Bloc 2 | Dossier écrit individuel + code source, max 30 pages | Dossier RNCP présent, page count non vérifié en PDF | Moyen |
| Bloc 3 | Oral 45 min : 30 min présentation + 15 min échange, avec démo | Support + script présents | Moyen |
| Bloc 4 | Dossier écrit individuel, max 20 pages | Dossier MCO présent, page count non vérifié en PDF | Moyen |
| Rattrapage | Règles croisées ambiguës entre supports ; ne pas compter dessus | Non applicable avant jury | Moyen |
| Absence | Justificatif sous 48 h | Hors périmètre code | Faible |

Action administrative recommandée : générer les PDF finaux des dossiers écrits et vérifier le nombre de pages avant dépôt.

## 6. Vérification technique

### Commandes lancées par l'orchestrateur

| Commande | Résultat | Détails utiles | Impact RNCP |
|---|---|---|---|
| `pnpm test` | Succès, exit 0, environ 16 s | API : 11 fichiers, 69 tests passés ; Web : 1 fichier, 1 test passé ; total 70 tests | Preuve forte tests unitaires |
| `pnpm test:coverage` | Succès, exit 0, environ 10 s | API : 69 tests ; coverage globale 81.57% statements/lines, 78.6% branches, 89.23% functions | Preuve coverage API, partielle car pas Web/DB |
| `pnpm lint` | Succès, exit 0, environ 15 s | Web : aucune erreur/warning ESLint ; API : OK | Preuve qualité statique |
| `pnpm typecheck` | Succès, exit 0, environ 15 s | `shared`, `api`, `web` : `tsc --noEmit` OK | Preuve TypeScript |
| `pnpm --filter web exec playwright test --list` | Succès, exit 0 | 56 tests listés dans 5 fichiers, projets Chromium + Firefox | Preuve d'existence E2E, pas d'exécution |
| `pnpm audit --audit-level=high` | Échec, exit 1 | 12 vulnérabilités : 9 moderate, 3 high (`glob`, deux advisories Next.js/RSC) | Risque sécurité B2/B4 |

### Vérifications production effectuées

| URL | Résultat au 2026-05-07 | Impact |
|---|---|---|
| `https://ai-sport-api.vercel.app/health` | HTTP 200, `{"status":"ok","timestamp":"2026-05-07T09:55:37.519Z","version":"0.1.0"}` | Contradiction forte avec version locale `0.12.0` |
| `https://ai-sport-web.vercel.app/api/health` | HTTP 200, `X-Vercel-Cache: HIT`, timestamp `2026-05-04T14:12:15.247Z` | Healthcheck Web peu probant comme liveness runtime |

### Nuance Agent 7

L'agent technique indépendant n'a pas lancé `pnpm test:coverage` pour éviter de modifier `apps/api/coverage`. L'orchestrateur l'a lancé avant consolidation. Cette nuance doit être conservée si le rapport est présenté : elle montre que la couverture a été actualisée, mais qu'elle écrit des artefacts.

## 7. Liste finale des points bloquants potentiels

Uniquement les éléments pouvant faire échouer un bloc ou une compétence éliminatoire :

| Point bloquant potentiel | Bloc | Compétence concernée | Pourquoi c'est bloquant | Correction minimale |
|---|---|---|---|---|
| API live expose `version:"0.1.0"` | B3/B4 | `C3.4.2`, cohérence MCO | La démo peut ne pas apparaître comme dernière version | Redéployer API ou neutraliser/justifier le champ version |
| Absence de preuve d'alerting externe | B4 | `C4.1.2` éliminatoire | Healthcheck sans alerte ne prouve pas supervision opérationnelle | Créer monitoring externe + capture alerte/notification |
| Planning prévisionnel initial absent | B3 | `C3.1` éliminatoire | Le pilotage peut être jugé reconstruit après coup | Ajouter preuve datée ou expliquer formellement la reconstruction |
| Outil de suivi projet non matérialisé | B3 | `C3.2.1` éliminatoire | Le jury peut refuser un simple suivi par dépôt Git | Ajouter board/export backlog/Kanban ou tableau de pilotage daté |
| Cahier de recettes incohérent | B2 | `C2.3.1` éliminatoire | Des recettes erronées fragilisent la validation logicielle | Corriger CR-013, CR-040, CR-044 |
| Audit sécurité high non traité | B2/B4 | Sécurité/MCO | Le dossier ne doit pas annoncer une sécurité pleinement maîtrisée | Corriger Next/glob si possible ou documenter risque/mitigation |

## 8. Liste finale des améliorations non bloquantes

| Amélioration | Bénéfice |
|---|---|
| Ajouter un manuel utilisateur autonome | Renforce `C2.4.1` |
| Ajouter un ticket support pilote | Renforce `C4.3.3` |
| Ajouter capture CI verte finale | Renforce B2/B4 |
| Relancer E2E complets Chromium + Firefox | Renforce accessibilité et recettes |
| Harmoniser `Railway` vers `Neon` dans la veille citée | Réduit les contradictions |
| Corriger références `vercel.json` racine | Évite liens cassés |
| Corriger ligne `0.12.0` / `0.13.0` dans support Bloc 3 | Évite question inutile |
| Ajouter preuve de rollback Vercel et stratégie backup Neon | Renforce MCO |
| Ajouter mesure coût IA réelle ou estimation à partir de logs | Renforce Bloc 1 |
| Préparer une grille de validation commanditaire signable | Renforce Bloc 3 |

## 9. Verdict final

### Le projet couvre-t-il tout ce qui est demandé ?

**Non, pas encore totalement.** Il couvre la majorité des attendus, et il est nettement plus avancé qu'un dossier simplement déclaratif. Mais à date, il reste des preuves faibles ou incohérentes sur des compétences éliminatoires, surtout en Bloc 3 et Bloc 4.

### Quels blocs sont sécurisés ?

**Bloc 1 est le plus sécurisé**, sous réserve d'assumer le caractère fictif du commanditaire et des coûts.  
**Bloc 2 est techniquement solide**, mais il doit être présenté comme partiel tant que les recettes, la sécurité high, l'E2E authentifié et le manuel utilisateur ne sont pas consolidés.

### Quels blocs restent fragiles ?

**Bloc 3 reste fragile** sur le pilotage réel : planning prévisionnel, outil de suivi, comptes rendus et satisfaction. La démo est aussi fragilisée par la version API live.  
**Bloc 4 reste fragile** sur l'alerting externe, le support client réel, le rollback DB et l'audit sécurité.

### Que faut-il corriger avant dépôt ou soutenance ?

Priorité absolue :

1. Redéployer l'API pour que `/health` expose `0.12.0`, ou retirer ce champ de la preuve de démo.
2. Mettre en place une preuve d'alerting externe avec capture.
3. Corriger les recettes `CR-013`, `CR-040`, `CR-044`.
4. Produire une preuve de suivi projet datée : board, export backlog, ou tableau de pilotage.
5. Corriger ou justifier les 3 vulnérabilités high.
6. Harmoniser les contradictions documentaires : `vercel.json` racine, Railway/Neon, `0.12.0`/`0.13.0`.
7. Générer les PDF finaux et vérifier les limites de pages avant dépôt DigiformaCertif.

**Conclusion stricte : le projet est défendable, mais pas encore verrouillé.** Avec les corrections ci-dessus, il peut basculer d'un état "risqué/partiel" vers un état "conforme avec réserves maîtrisées".
