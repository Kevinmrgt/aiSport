# B3-A05 — Grille de compétences et plan de développement

> Projet : Alcide  
> Bloc : RNCP39583 — Bloc 3  
> Compétence ciblée : **C3.3.2 — Évaluer les besoins en compétences de
> l'équipe, transmettre les besoins de recrutement au service RH, planifier la
> montée en compétences et orienter vers des formations adaptées**  
> Date de consolidation : **2026-09-07**  
> Baseline documentaire et technique : `0.13.0-rc.8`, SHA
> `d950b6b790a8b11153995bf817b7cb0d583d36da`  
> Responsable de l'évaluation dans le projet réel : Kevin

## 1. Statut, périmètre et règle d'authenticité

Alcide est un projet individuel. La grille n'évalue donc pas des collaborateurs
qui n'existent pas et ne constitue ni une appréciation RH officielle, ni une
certification de niveau. Elle sépare strictement :

| Nature                                 | Ce qui est affirmé                                                                       | Ce qui n'est pas affirmé                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Preuve réelle du dépôt**             | Une compétence a été mobilisée dans un artefact, un contrôle ou une livraison vérifiable | L'identité, l'ancienneté ou le niveau professionnel complet de l'auteur ne sont pas déduits d'un fichier isolé |
| **Auto-évaluation étayée du candidat** | Kevin estime son autonomie au regard des preuves listées et de l'échelle commune         | Il ne s'agit ni d'une note de manager, ni d'un diplôme, ni d'une validation par les pairs                      |
| **Organisation cible**                 | Les rôles et niveaux nécessaires à un pilote professionnel sont modélisés                | Aucune personne, équipe, embauche ou disponibilité réelle n'est inventée                                       |
| **Plan de développement**              | Les actions sont planifiées avec critères de réussite                                    | Aucune formation n'est présentée comme commencée, réussie ou certifiée                                         |
| **Transmission RH cible**              | Un besoin prêt à transmettre est formalisé                                               | Aucun service RH réel n'a reçu ou approuvé la demande                                                          |

Les pièces historiques restent utilisées selon leur date. Les résultats
techniques actuels et les lacunes sécurité/E2E proviennent du tableau B3-A02 du
2026-09-07.

## 2. Méthode d'évaluation commune

### 2.1 Échelle de niveau 0 à 4

| Niveau | Libellé         | Critères observables cumulés                                                                                                           |
| :----: | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
|   0    | Non mobilisé    | Aucun artefact ni exercice probant ; accompagnement complet nécessaire                                                                 |
|   1    | Notions         | Vocabulaire et enjeux identifiés ; réalise une tâche simple avec procédure ou supervision                                              |
|   2    | Opérationnel    | Réalise seul des tâches délimitées ; produit un résultat testable ; connaît les limites et sait demander une revue                     |
|   3    | Autonome projet | Conçoit, met en œuvre, contrôle et justifie une solution de bout en bout ; traite les incidents courants ; résultat reproductible      |
|   4    | Référent        | Définit les standards, accompagne et évalue d'autres personnes, arbitre les cas complexes et démontre un retour d'expérience collectif |

Règles de cotation :

1. le niveau retenu est le plus haut dont **tous** les critères sont soutenus
   par au moins une preuve ;
2. un document déclaratif seul ne permet pas de dépasser le niveau 1 ;
3. du code et des tests reproductibles peuvent soutenir les niveaux 2 ou 3 ;
4. en l'absence de mentorat, revue de pairs ou évaluation d'équipe, le niveau 4
   n'est attribué à personne ;
5. une preuve partielle, historique ou comportant un risque résiduel réduit le
   niveau ou est explicitement signalée ;
6. `écart = niveau cible − niveau actuel`. Un écart de 0 doit malgré tout être
   maintenu par la pratique et la veille.

### 2.2 Priorisation des lacunes

| Priorité | Règle                                                                    |
| :------: | ------------------------------------------------------------------------ |
|    P0    | Écart bloquant pour sécurité, gel, démonstration ou continuité immédiate |
|    P1    | Écart de 2 niveaux, ou compétence indispensable au pilote sous 30 jours  |
|    P2    | Écart de 1 niveau sans risque immédiat, à fermer avant industrialisation |
|    P3    | Maintien/veille d'une compétence au niveau cible                         |

### 2.3 Cycle d'évaluation

L'évaluation cible se déroule à l'arrivée dans l'équipe, après 30 jours, puis à
chaque trimestre. La personne s'auto-évalue, le responsable de rôle demande une
démonstration ou une revue d'artefact, et le responsable projet valide le
niveau. Les besoins de formation et de renfort sont revus avec le rôle RH. Les
informations médicales ou diagnostics éventuels ne figurent jamais dans cette
grille projet.

## 3. Grille mesurable du candidat sur le projet réel

Le niveau actuel ci-dessous est une **auto-évaluation de Kevin étayée par les
preuves**, pas une évaluation indépendante. La cible 3 correspond à l'autonomie
attendue sur le pilote Alcide ; le niveau 4 n'est pas requis pour tous les rôles.

| Rôle fonctionnel assumé      | Compétence évaluée                                                        | Niveau actuel et nature               | Preuve réelle vérifiable                                                                                             | Niveau cible | Écart | Lacune démontrée                                                                     | Priorité |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | :----------: | :---: | ------------------------------------------------------------------------------------ | :------: |
| Chef de projet               | Planifier, ordonnancer, suivre les dépendances                            | **2 — auto-évaluation étayée**        | `docs/sprints/`, `B3-A01-planning-previsionnel-realise.md`                                                           |      3       |   1   | Planning d'origine incomplet ; plusieurs dates ont dû être reconstruites             |    P2    |
| Chef de projet               | Piloter par KPI, risques et décisions                                     | **2 — auto-évaluation étayée**        | `B3-A02-tableau-pilotage-2026-09-07.md`, `docs/adr/`                                                                 |      3       |   1   | Tableau consolidé seulement en fin de projet ; rituel collectif non pratiqué         |    P2    |
| Chef de projet / FinOps      | Budgéter, collecter le réel et prévoir l'atterrissage                     | **1 — notions prouvées**              | Budget prévisionnel dans `bloc1-cadrage-projet-rncp39583.md` ; coût réel déclaré N/D dans B3-A02                     |      3       |   2   | Aucun export de facture/usage, coût IA unitaire ou écart réel/prévu                  |    P1    |
| Product owner                | Recueillir, prioriser et faire valider le besoin client                   | **1 — notions prouvées**              | Priorités et recettes dans `docs/bloc2/cahier-recettes.md`; B3-A06 indique qu'aucun avis client réel n'est collecté  |      3       |   2   | Pas d'entretien client, score de satisfaction ou arbitrage de backlog en équipe      |    P1    |
| Manager                      | Déléguer, évaluer, donner du feedback et gérer une équipe inclusive       | **1 — scénario documenté uniquement** | Projet solo ; limites déclarées dans le CRA et les livrables Bloc 3                                                  |      3       |   2   | Aucun collaborateur réel évalué, aucune délégation ni transmission RH exécutée       |    P1    |
| Architecte / full-stack      | Concevoir une architecture TypeScript en couches et des contrats partagés | **3 — auto-évaluation étayée**        | `docs/adr/ADR-001-monorepo-pnpm.md`, `ADR-002-hono-backend.md`, `apps/api/src/`, `apps/web/`, `packages/shared/src/` |      3       |   0   | Maintenir les ADR et faire relire les choix par un pair                              |    P3    |
| Développeur frontend         | Implémenter Next.js, Auth.js, formulaires et parcours métier              | **3 — auto-évaluation étayée**        | `apps/web/app/`, `apps/web/components/`, B2-A42 et B2-A43                                                            |      3       |   0   | Version de Next.js décrite de façon historique dans certains anciens documents       |    P3    |
| UX / accessibilité           | Concevoir et tester clavier, focus, reflow, sémantique et lecteur d'écran | **2 — opérationnel prouvé**           | `apps/web/tests/e2e/`, B2-A36, B2-A37, B2-A41 ; campagne NVDA réelle avec limites                                    |      3       |   1   | Pas d'audit RGAA exhaustif ni d'évaluation indépendante par une personne concernée   |    P2    |
| Développeur backend          | Concevoir API Hono, services, erreurs, quotas et ownership                | **3 — auto-évaluation étayée**        | `apps/api/src/controllers/`, `services/`, `repositories/`; 179 tests API actuels dans B3-A02                         |      3       |   0   | Maintien des contrôles et revue externe nécessaires                                  |    P3    |
| Ingénieur data               | Concevoir schéma, migrations et tests PostgreSQL                          | **2 — opérationnel prouvé**           | `apps/api/src/db/`, `apps/api/drizzle/`, B2-A19 ; intégration PostgreSQL en CI                                       |      3       |   1   | Sauvegarde/restauration Neon, capacité et reprise après incident non exercées        |    P2    |
| Ingénieur IA                 | Encadrer une génération structurée, les retries, timeouts et coûts        | **2 — opérationnel prouvé**           | `ADR-008-openai-server-side.md`, `workout-ai.service.ts`, `program-ai.service.ts`, tests d'indisponibilité           |      3       |   1   | Pas de jeu d'évaluation métier versionné, suivi tokens/coût ni validation par coach  |    P2    |
| QA automatisation            | Concevoir tests unitaires/composants et seuils de couverture              | **3 — auto-évaluation étayée**        | `vitest.config.ts` des trois packages ; 261/261 et couvertures actuelles dans B3-A02                                 |      3       |   0   | Préserver les seuils et revoir les zones Web faiblement couvertes                    |    P3    |
| QA E2E                       | Maintenir une suite multi-navigateurs fiable                              | **2 — opérationnel avec réserve**     | `apps/web/playwright.config.ts`; run actuel 53/54 puis relance ciblée 1/1 dans B3-A02                                |      3       |   1   | Flake/timeout Auth.js Chromium à diagnostiquer ; une relance ne vaut pas un run vert |    P0    |
| AppSec                       | Appliquer OWASP, auth, secrets, audit et revue des risques                | **2 — opérationnel avec réserve**     | `docs/security/owasp-review.md`, B2-A35, B2-A42 ; audit actuel à 2 high + 1 low dans B3-A02                          |      3       |   1   | Avis transitifs courants et risques résiduels CSP, rate limit distribué, données     |    P0    |
| DevOps                       | Construire une CI/CD séquencée, migrations et déploiements                | **3 — auto-évaluation étayée**        | `.github/workflows/ci.yml`, `deploy-vercel.yml`, `docs/ci-cd.md`; CI/CD au SHA courant                               |      3       |   0   | Absence de validation humaine obligatoire sur l'environnement production             |    P3    |
| SRE / exploitation           | Superviser, corréler, alerter et gérer les incidents                      | **2 — opérationnel prouvé**           | `.github/workflows/production-health-monitor.yml`, health/readiness, B3-A02                                          |      3       |   1   | Logs `console.*`, pas de traces corrélées, SLO mensuel ni exercice d'incident        |    P2    |
| Documentation / transmission | Produire ADR, procédures, recettes et passation                           | **2 — opérationnel prouvé**           | `docs/adr/`, `docs/deployment.md`, `docs/ci-cd.md`, `docs/rncp/`                                                     |      3       |   1   | Aucun tiers n'a encore exécuté le runbook de reprise de bout en bout                 |    P1    |

### Synthèse chiffrée

| Indicateur           | Valeur | Lecture                                                                         |
| -------------------- | -----: | ------------------------------------------------------------------------------- |
| Compétences évaluées |     17 | Couverture des rôles réels et des responsabilités nécessaires au pilote         |
| Niveau 3             |      5 | Architecture, frontend, backend, QA unitaire, DevOps                            |
| Niveau 2             |      9 | Planning, pilotage KPI, accessibilité, data, IA, E2E, AppSec, SRE, transmission |
| Niveau 1             |      3 | FinOps, produit/client et management/évaluation d'équipe                        |
| Écarts P0            |      2 | AppSec/dépendances et stabilité E2E                                             |
| Écarts P1            |      4 | FinOps, relation client, management, passation                                  |
| Niveau 4 prouvé      |      0 | Cohérent avec l'absence d'équipe et de mentorat évalué                          |

## 4. Équipe cible et couverture requise

Il s'agit d'un **scénario d'organisation pour un pilote professionnel**, pas de
l'équipe actuelle. Les quotités sont des besoins de capacité, non des contrats
ou recrutements réalisés.

| Rôle cible                           | Capacité indicative | Compétences minimales requises                                                | Niveau minimal | Couverture actuelle par Kevin                              | Risque de couverture                            |
| ------------------------------------ | ------------------: | ----------------------------------------------------------------------------- | :------------: | ---------------------------------------------------------- | ----------------------------------------------- |
| Responsable produit / projet         |             0,5 ETP | backlog, planning, budget, risques, validation client, animation inclusive    |       3        | Partielle, niveaux 1–2                                     | Élevé : pilotage et réalisation sont concentrés |
| Développeur frontend / UX accessible |               1 ETP | Next.js, Auth.js, composants, WCAG/RGAA, tests clavier/lecteur d'écran        |       3        | Technique couverte ; audit indépendant absent              | Moyen                                           |
| Développeur backend / data / IA      |               1 ETP | Hono, PostgreSQL, migrations, ownership, génération structurée, évaluation IA |       3        | Couverture technique partielle à complète                  | Moyen                                           |
| QA automation / AppSec               |             0,5 ETP | stratégie de test, Playwright, OWASP, dépendances, recette indépendante       |       3        | Couvert par l'auteur lui-même, sans séparation de contrôle | Critique                                        |
| DevOps / SRE                         |             0,2 ETP | CI/CD, sauvegarde/restauration, SLO, logs/traces, réponse incident            |       3        | CI/CD couverte ; SRE niveau 2                              | Élevé avant commercialisation                   |
| Expert métier sport                  |   2 jours par jalon | validation des séances, sécurité d'usage sportif, critères d'utilité          |    3 métier    | Non couvert par une preuve professionnelle                 | Critique pour validation métier                 |

Principes de composition : au moins deux personnes doivent pouvoir relire et
reprendre chaque chemin critique ; l'auteur d'un changement de sécurité ou de
production ne doit pas être l'unique validateur ; l'expert sport intervient sur
le contenu, sans recevoir de responsabilité technique fictive.

## 5. Besoins prêts à transmettre au rôle RH cible

### 5.1 Fiche de transmission

| Champ              | Valeur                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Émetteur cible     | Responsable produit/projet Alcide                                                                                                 |
| Destinataire cible | Rôle RH / Talent Acquisition de l'organisation future                                                                             |
| Statut réel        | **Préparé dans le cadre RNCP, non transmis à un service RH réel**                                                                 |
| Motif              | Séparer réalisation et contrôle, réduire le facteur de continuité à 1 et combler les lacunes AppSec, SRE, accessibilité et métier |
| Déclencheur        | Décision de lancer un pilote avec utilisateurs externes ou engagement de niveau de service                                        |
| Réponse attendue   | Validation du mode de renfort, calendrier, budget, sourcing et modalités d'intégration accessibles                                |

### 5.2 Demandes de recrutement ou renfort

| ID    | Besoin cible                          | Mode recommandé                                         | Mission et compétences de sélection                                                                              | Priorité | Date de besoin cible    | Critère de recrutement/renfort réussi                                                               |
| ----- | ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | :------: | ----------------------- | --------------------------------------------------------------------------------------------------- |
| RH-01 | QA automation / AppSec indépendant    | Renfort 0,5 ETP ou prestation de revue                  | Playwright multi-navigateurs, OWASP, supply chain JS, tests API/DB ; reproduire un échec et proposer une gate    |    P0    | Avant gel pilote        | Audit dépendances à 0, smoke complet stable et rapport de revue contradictoire accepté              |
| RH-02 | Expert métier sport                   | Vacation/prestation 2 jours par jalon                   | Évaluer cohérence, progressivité, contre-indications et utilité des séances sans se substituer à un avis médical |    P0    | Avant validation client | Jeu de critères signé, échantillon évalué et réserves tracées                                       |
| RH-03 | DevOps/SRE                            | Renfort fractionné 0,2 ETP                              | Vercel/Neon, PostgreSQL, OpenTelemetry, sauvegarde/reprise, SLO et réponse incident                              |    P1    | Avant ouverture externe | Exercice de restauration, traces corrélées et alerte testée avec compte rendu                       |
| RH-04 | UX/accessibilité                      | Revue spécialisée ponctuelle puis 0,2 ETP selon backlog | WCAG/RGAA, clavier, NVDA, conception inclusive, tests avec utilisateurs                                          |    P1    | Avant pilote public     | Audit indépendant sur parcours critiques, écarts priorisés et contre-recette                        |
| RH-05 | Responsable produit/projet ou adjoint | Renfort 0,5 ETP si Kevin reste principal développeur    | budget réel, backlog, facilitation, reporting client, gestion de capacité et inclusion                           |    P1    | Au lancement pilote     | Budget réel mensuel, décisions de priorité et validations client tenus sans dépendre du développeur |

Le rôle RH cible doit vérifier les compétences par exercice ou portfolio, prévoir
un entretien accessible, ne demander aucune information médicale et transmettre
au manager uniquement les aménagements nécessaires avec l'accord de la personne.

## 6. Plan de développement des compétences

Toutes les actions ci-dessous sont **planifiées et non réalisées**, sauf les
preuves projet déjà citées. Les dates sont des objectifs internes à replanifier
si la date de soutenance est antérieure.

| ID / priorité | Public et lacune                      | Formation ou mise en situation précise                                                                                                       | Modalité / charge                                              | Responsable du suivi                     | Échéance cible              | Critère de réussite mesurable                                                                                | Preuve attendue                                                     |  Statut  |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | :------: |
| F-01 / P0     | Kevin — AppSec dépendances            | Atelier interne « remédiation supply chain pnpm » : lire chaque advisory, `pnpm why`, choisir update/override, tester la compatibilité       | 1 jour, sandbox puis PR                                        | Responsable AppSec cible ; Kevin exécute | 2026-09-10                  | Audit `low` à 0 vulnérabilité, tests/types/lint/build verts, décision documentée                             | PR, sortie audit JSON, CI du SHA                                    | Planifié |
| F-02 / P0     | Kevin — fiabilité Playwright/Auth.js  | Laboratoire « diagnostic d'un test E2E intermittent » sur `auth.spec.ts` : trace, vidéo, chronologie serveur, isolation puis répétition      | 1 jour, pair review si renfort disponible                      | Lead QA cible ; Kevin exécute            | 2026-09-12                  | 3 runs consécutifs de `pnpm test:e2e:smoke` à 54/54 sans relance ciblée                                      | Trois journaux/artefacts Playwright et cause ou risque accepté      | Planifié |
| F-03 / P2     | Kevin — pilotage outillé              | Parcours guidé GitHub Docs « Planning and tracking with Projects », appliqué à Alcide                                                        | 4 h asynchrones + atelier 2 h                                  | Responsable projet cible                 | 2026-09-18                  | Board avec >= 15 éléments, responsable, priorité, effort, dates, dépendances, vue roadmap et export          | Capture/export daté et revue de 20 min                              | Planifié |
| F-04 / P1     | Kevin — FinOps/budget                 | Autoformation FinOps Framework : Planning & Estimating, Forecasting, Budgeting, puis cas Alcide                                              | 6 h asynchrones + exercice 3 h                                 | Responsable projet + rôle Finance cible  | 2026-09-25                  | Imports Vercel/Neon/IA/GitHub rapprochés ; budget, forecast et réel ; seuil d'écart 10 % et alertes 80/100 % | Tableau mensuel sourcé et décision d'écart                          | Planifié |
| F-05 / P2     | Rôle backend/data — exploitation DB   | Guide officiel « Getting started with Testcontainers for Node.js », adapté aux repositories Drizzle/PostgreSQL                               | 2 jours en binôme backend/QA                                   | Lead backend cible                       | 2026-10-02                  | Tests isolés couvrant CRUD, pagination, ownership et rollback ; succès CI reproductible                      | Suite versionnée, rapport de couverture intégration                 | Planifié |
| F-06 / P2     | Rôle SRE — observabilité              | OpenTelemetry « Getting Started by Example — Node.js », puis instrumentation d'un environnement non productif Alcide                         | 2 jours, laboratoire                                           | Lead SRE cible                           | 2026-10-09                  | Trace corrélée Web→API→DB/IA simulée, identifiant de requête, erreur visible sans secret, alerte de test     | Capture trace, procédure de masquage, CR d'alerte                   | Planifié |
| F-07 / P2     | Frontend, QA, PM — accessibilité      | W3C WAI « Digital Accessibility Foundations »                                                                                                | 16–20 h, autoformation à rythme choisi ; certificat facultatif | Référent accessibilité cible             | 2026-10-30                  | Modules terminés et audit pratique de 5 parcours avec clavier + NVDA ; 0 blocage critique non assigné        | Journal d'apprentissage, grille d'audit et contre-recette           | Planifié |
| F-08 / P1     | Kevin — management/évaluation         | Atelier interne scénarisé « déléguer et faire progresser l'équipe Alcide » : brief, critères, feedback SBI, revue de charge, plan individuel | 2 demi-journées + observation par un pair si disponible        | Manager cible / RH cible                 | 2026-10-16                  | Deux missions affectées par critères, une simulation de feedback, un plan à 30 jours et rétrospective        | Supports anonymisés et grille observateur ; aucune personne fictive | Planifié |
| F-09 / P1     | Product owner — découverte/validation | Mise en situation « entretien et test utilisateur Alcide » avec un participant réel consentant                                               | Préparation 2 h, test 1 h, analyse 2 h                         | Responsable produit cible                | Avant prochain jalon        | 5 tâches observées, SAT-01 à SAT-07 renseignés, décisions et actions priorisées                              | B3-A06 complété et accord de conservation de la trace               | Planifié |
| F-10 / P1     | Toute équipe cible — continuité       | Exercice de passation : un tiers repart d'un poste propre, lance le runbook, le smoke et le plan B de démo                                   | 1 jour en binôme                                               | Responsable projet + SRE cible           | J-2 avant soutenance/pilote | Tiers autonome, aucun secret partagé dans le dépôt, écarts corrigés ou acceptés                              | Compte rendu de passation horodaté                                  | Planifié |

### Ressources pédagogiques externes retenues

Pages officielles vérifiées le 2026-09-07 :

- GitHub Docs — Planning and tracking with Projects :
  `https://docs.github.com/en/issues/planning-and-tracking-with-projects` ;
- FinOps Foundation — Framework, Planning & Estimating, Forecasting et
  Budgeting : `https://www.finops.org/framework/` ;
- Testcontainers — Getting started with Testcontainers for Node.js :
  `https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/` ;
- OpenTelemetry — Getting Started by Example, JavaScript/Node.js :
  `https://opentelemetry.io/docs/languages/js/getting-started/` ;
- W3C WAI — Digital Accessibility Foundations :
  `https://www.w3.org/WAI/courses/foundations-course/`.

Ces ressources sont des orientations de formation. Leur présence dans le plan
ne prouve ni inscription, ni achèvement, ni obtention d'un certificat.

## 7. Adaptations des formations liées au handicap

### 7.1 Principes

- ne présumer aucun handicap et ne demander aucun diagnostic au participant ;
- recueillir en entretien confidentiel les **besoins fonctionnels** et les
  préférences, avec le rôle RH/référent handicap cible et le consentement de la
  personne ;
- rendre accessibles par défaut supports, outils, exercices et évaluations ;
- adapter le canal, le rythme et l'environnement sans diminuer les critères de
  compétence ;
- autoriser la personne à réviser l'aménagement en cours de formation ;
- conserver l'information d'aménagement dans un espace RH restreint, jamais
  dans le dépôt public ou les comptes rendus techniques.

### 7.2 Catalogue d'aménagements

| Besoin fonctionnel exprimé                   | Adaptations possibles                                                                                                                          | Application au plan                                           | Critère de réussite inchangé                                         | Responsable cible                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Vision / lecteur d'écran                     | HTML structuré, alternatives textuelles, fort contraste, fichiers non scannés, accès clavier, code lisible par lecteur d'écran                 | F-03 à F-10 ; vérifier préalablement les plateformes externes | Livrable et démonstration attendus identiques                        | Formateur + référent accessibilité |
| Audition                                     | Sous-titres, transcription, consignes écrites, chat, interprétariat si convenu, absence d'évaluation fondée uniquement sur l'oral              | Vidéos W3C/techniques et ateliers F-01/F-08                   | Même exercice pratique et même seuil                                 | Formateur + RH/référent handicap   |
| Motricité / fatigue                          | Navigation clavier ou commande vocale, poste ergonomique, temps fractionné, pauses, délai adapté                                               | Laboratoires F-01/F-02/F-05/F-06                              | Même qualité de preuve ; calendrier adapté                           | Manager + formateur                |
| Cognition, attention ou neurodiversité       | Agenda préalable, consignes courtes, tâches découpées, environnement calme, enregistrement autorisé, binômage choisi                           | F-03/F-04/F-08/F-10                                           | Même critères, évalués en plusieurs séquences si nécessaire          | Manager + formateur                |
| Maladie chronique / disponibilité variable   | Asynchrone, replay, plages flexibles, rattrapage, charge hebdomadaire plafonnée                                                                | Toutes les autoformations                                     | Même production finale, échéance replanifiée                         | Manager + RH cible                 |
| Expression écrite/orale ou langue de travail | Glossaire, exemples, temps de préparation, réponse écrite ou orale équivalente, relecture non punitive sur la forme hors objectif linguistique | F-04, F-08, F-09                                              | Maîtrise métier évaluée, pas une aisance de présentation non requise | Formateur + manager                |
| Anxiété / contexte psychosocial              | Objectifs annoncés, évaluation formative avant certificative, droit à une pause, feedback factuel et privé                                     | Ateliers observés F-08/F-09/F-10                              | Démonstration des compétences sur la même grille                     | Manager + RH cible                 |

### 7.3 Contrôle d'accessibilité avant chaque action

Le responsable de formation cible confirme cinq points : support accessible,
outil testable au clavier, sous-titres/transcription si média, possibilité
d'asynchrone ou de pause, et canal confidentiel pour demander un aménagement.
Si la plateforme externe n'est pas compatible, un support équivalent accessible
est proposé ; la personne ne perd ni accès à la formation ni possibilité de
faire valider la compétence.

## 8. Suivi du plan et mesure d'efficacité

| Moment          | Mesure                                                              | Responsable                       | Seuil de décision                                                  |
| --------------- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Avant formation | Auto-évaluation 0–4 + démonstration initiale + besoin d'aménagement | Participant + responsable de rôle | Baseline signée ; désaccord explicité                              |
| À chaud         | Exercice pratique et accessibilité perçue                           | Formateur                         | 100 % des critères critiques ; aucun blocage d'accès non traité    |
| À 30 jours      | Preuve appliquée dans Alcide                                        | Responsable de rôle               | Livrable accepté en revue ; sinon tutorat ou action complémentaire |
| À 90 jours      | Niveau réévalué sur la même échelle                                 | Manager + participant             | Gain attendu atteint ou plan révisé avec cause                     |
| Trimestriel     | Couverture des rôles et facteur de continuité                       | Responsable projet + RH cible     | Deux personnes sur chaque chemin critique ou renfort déclenché     |

KPI du plan :

- taux de formations achevées dans les délais ;
- taux de critères pratiques réussis ;
- progression moyenne de niveau, sans convertir automatiquement une présence
  en progression ;
- pourcentage de compétences critiques couvertes par au moins deux personnes ;
- délai de fermeture des écarts P0/P1 ;
- taux de demandes d'aménagement satisfaites, publié uniquement sous forme
  agrégée et sans donnée de santé.

## 9. Inventaire des preuves et chemins contrôlés

| Domaine                 | Chemins de preuve utilisés                                                                                                                                                                                                                               | Ce qu'ils prouvent                               | Limite                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Pilotage                | `docs/sprints/`, `docs/rncp/bloc3-annexes/B3-A01-planning-previsionnel-realise.md`, `docs/rncp/bloc3-annexes/B3-A02-tableau-pilotage-2026-09-07.md`, `docs/adr/`                                                                                         | Planification consolidée, KPI, décisions         | Une part du pilotage est rétrospective        |
| Produit/client          | `docs/bloc2/cahier-recettes.md`, `docs/rncp/bloc3-annexes/B3-A06-comptes-rendus-validation-satisfaction.md`                                                                                                                                              | Critères de recette et formulaire de validation  | Aucun avis client réel collecté au 2026-09-07 |
| Architecture/full-stack | `apps/web/`, `apps/api/`, `packages/shared/`, `docs/adr/ADR-001-monorepo-pnpm.md`, `docs/adr/ADR-002-hono-backend.md`, `docs/adr/ADR-008-openai-server-side.md`                                                                                          | Conception et implémentation du produit          | Ne prouve pas le niveau hors du projet        |
| Qualité                 | `apps/web/playwright.config.ts`, fichiers `vitest.config.ts`, `docs/rncp/bloc3-annexes/B3-A02-tableau-pilotage-2026-09-07.md`, `.github/workflows/ci.yml`                                                                                                | Tests, couvertures, gates                        | E2E actuel instable sur un scénario           |
| Data                    | `apps/api/src/db/`, `apps/api/drizzle/`, `docs/rncp/bloc2-annexes/B2-A19-postgresql-integration-2026-07-20.md`                                                                                                                                           | Schéma, migrations et PostgreSQL réel            | Reprise/sauvegarde production non exercée     |
| Sécurité                | `docs/security/owasp-review.md`, `docs/rncp/bloc2-annexes/B2-A35-recettes-securite-finales-2026-07-21.md`, `docs/rncp/bloc2-annexes/B2-A42-acces-jury-securise-2026-07-23.md`, `docs/rncp/bloc3-annexes/B3-A02-tableau-pilotage-2026-09-07.md`           | Contrôles OWASP/auth et audit actuel             | 2 high + 1 low au contrôle courant            |
| Accessibilité           | `apps/web/tests/e2e/`, `docs/rncp/bloc2-annexes/B2-A36-audit-accessibilite-final-2026-07-21.md`, `docs/rncp/bloc2-annexes/B2-A37-controles-accessibilite-humains-2026-07-21.md`, `docs/rncp/bloc2-annexes/B2-A41-parcours-nvda-production-2026-07-22.md` | Automatisation, contrôles clavier, campagne NVDA | Pas de conformité RGAA exhaustive             |
| DevOps/SRE              | `.github/workflows/ci.yml`, `.github/workflows/deploy-vercel.yml`, `.github/workflows/production-health-monitor.yml`, `docs/ci-cd.md`                                                                                                                    | Livraison séquencée, health/readiness et alerte  | Télémétrie et exercice incident incomplets    |
| Management/RH           | `docs/bloc4/compte-rendu-activite.md` et présente annexe                                                                                                                                                                                                 | Contexte solo et organisation cible              | Aucune équipe ni transmission RH réelle       |

## 10. Audit critère par critère de C3.3.2

| Attendu                                       | Couverture dans l'annexe                                               | Preuve de complétude  |                     Statut                      |
| --------------------------------------------- | ---------------------------------------------------------------------- | --------------------- | :---------------------------------------------: |
| Évaluer les besoins en compétences            | Échelle 0–4, 17 compétences, actuel/cible/écart/priorité               | Sections 2 et 3       |                     Couvert                     |
| Définir les besoins de l'équipe               | Rôles, capacité, niveau minimal et risques de couverture               | Section 4             |          Couvert comme scénario cible           |
| Transmettre les besoins de recrutement aux RH | Fiche émetteur/destinataire/statut et cinq demandes actionnables       | Section 5             |   Prêt à transmettre, non transmis réellement   |
| Identifier la montée en compétences           | Chaque lacune P0–P2 est reliée à une action                            | Sections 3 et 6       |                     Couvert                     |
| Orienter vers des formations adaptées         | Dix actions avec modalité, charge, responsable, date et ressource      | Section 6             |           Couvert, toutes planifiées            |
| Mesurer la réussite                           | Critère observable et preuve attendue par action, revues à 30/90 jours | Sections 6 et 8       |                     Couvert                     |
| Prendre en compte le handicap                 | Principes, catalogue, contrôle préalable et confidentialité            | Section 7             | Couvert sans présumer de situation individuelle |
| Distinguer réel et cible                      | Statut d'authenticité, limites dans chaque tableau                     | Sections 1, 3, 4 et 5 |                     Couvert                     |

## 11. Limites à annoncer au jury

- Il n'y a pas d'équipe réelle évaluée : seule l'auto-évaluation étayée de
  Kevin est présentée.
- Les niveaux ne sont pas des certifications et n'ont pas encore été validés
  par un manager ou un pair.
- Les besoins RH sont un dossier cible prêt à transmettre, pas une demande
  réellement envoyée ni un recrutement effectué.
- Toutes les formations sont planifiées ; aucune présence, réussite ou
  certification n'est revendiquée.
- Aucun handicap n'est attribué à qui que ce soit. Les aménagements sont une
  politique de formation à personnaliser de manière confidentielle.
- L'évaluation doit être mise à jour après correction des écarts P0, exercice
  de passation et première validation utilisateur réelle.

## Conclusion C3.3.2

La grille transforme une liste générique de technologies en un dispositif
mesurable : échelle stable, niveaux actuels étayés, cibles par rôle, écarts
priorisés, besoins RH actionnables, formations précises, preuves de réussite et
aménagements accessibles. Elle montre aussi les limites du contexte solo : les
besoins les plus urgents ne sont pas d'ajouter une nouvelle fonctionnalité,
mais d'obtenir un contrôle QA/AppSec indépendant, une validation métier sport,
une pratique réelle du management et une continuité opérationnelle à plus
d'une personne.
