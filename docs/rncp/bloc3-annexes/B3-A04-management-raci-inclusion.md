# B3-A04 - Management, RASCI, charge et inclusion

> Compétence couverte : **C3.3.1 - Piloter l'équipe tout au long du projet**  
> Projet : **Alcide**  
> Candidat : **Kevin Marguet**  
> Date de consolidation : **2026-09-07**  
> Baseline observée : **`0.13.0-rc.8`**, branche `main`, commit `d950b6b`  
> Nature du projet : **projet individuel ; aucune équipe humaine de développement n'est revendiquée**

## 1. Verdict et règle d'honnêteté

Alcide a été conçu, développé, testé, déployé et documenté par Kevin. L'historique Git présente trois identités humaines correspondant à Kevin et trois commits Dependabot ; il ne prouve pas l'existence d'autres collaborateurs humains. Le projet démontre donc réellement :

- l'affectation et l'exécution de missions sous plusieurs casquettes ;
- l'auto-organisation, la priorisation et la maîtrise de gates qualité ;
- la communication asynchrone par Git, pull requests, revues de sprint, ADR, changelog, rapports d'anomalie et CI/CD ;
- l'automatisation de contrôles et du suivi de production.

Il ne démontre pas un management quotidien d'une équipe humaine, une gestion de conflit interpersonnel réelle, une délégation à des collaborateurs, une adaptation de poste effectivement accordée ni un collectif multiculturel. Ces éléments sont traités comme **reconstruction de posture** ou **organisation cible scénarisée**, jamais comme faits historiques.

Cette annexe utilise trois marqueurs :

- **[RÉEL]** : directement attesté par le dépôt ;
- **[RECONSTRUIT]** : analyse de gestion créée à partir de faits réels, mais non formalisée à l'époque ;
- **[CIBLE]** : dispositif applicable si Alcide est repris par une équipe ; il ne prouve aucune action passée.

La conclusion défendable devant le jury est : la compétence est préparée par une analyse complète, un RASCI honnête et une organisation cible opérationnelle, mais la limite d'expérience collective doit rester explicite.

## 2. Couverture des critères officiels

Le référentiel local, pages 12-13, demande l'affectation des missions, la prise en compte du handicap et d'un contexte multiculturel/international, des techniques de communication et de management, le respect du plan et le bon fonctionnement de l'équipe. Les critères portent aussi sur l'équilibre de charge, l'identification du style managérial, l'empathie, l'écoute, la bienveillance, le leadership, l'analyse critique d'une posture, des recommandations réalistes et des outils collaboratifs permettant le partage de ressources.

| Critère                                     | Réponse de l'annexe      | Nature de preuve                                              |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------- |
| Missions affectées                          | Sections 4 et 5          | Réel pour Kevin ; cible pour plusieurs rôles                  |
| RACI/RASCI                                  | Section 5                | Réel solo + cible multi-rôles                                 |
| Charge répartie et équilibrée               | Section 6                | Reconstruction quantitative ; limite solo assumée             |
| Styles managériaux identifiés et décrits    | Section 7                | Auto-management réel ; management d'équipe scénarisé          |
| Empathie, écoute, bienveillance, leadership | Sections 7, 11 et 12     | Protocole cible ; aucune interaction humaine inventée         |
| Analyse critique d'une posture              | Section 8                | Reconstruction fondée sur BUG-001 et l'évolution des tests    |
| Outils collaboratifs et partage             | Sections 9 et 10         | Réel et versionné                                             |
| Gestion de conflit                          | Section 11               | Conflit de rôles réel ; protocole interpersonnel cible        |
| Handicap                                    | Section 12               | Mesures cibles concrètes ; aucune situation réelle déclarée   |
| Multiculturel / international               | Section 13               | Contraintes réelles d'écosystème ; organisation humaine cible |
| Respect du plan et recommandations          | Sections 6, 10, 14 et 15 | Reconstruction et plan cible mesurable                        |

Sources réglementaires :

- `docs/rncp/Référentiel Expert en développement logiciel RNCP39583 (1).pdf`, pages 12-13 ;
- `docs/rncp/25 09 15  Réglement spécial de certification - Expert en développement logiciel RNCP39583 (1).pdf`, page 3.

## 3. Preuves d'organisation réellement disponibles

### 3.1 Contributeurs

La commande `git shortlog -sne HEAD` retourne :

| Identité Git                                                   | Commits | Interprétation                           |
| -------------------------------------------------------------- | ------: | ---------------------------------------- |
| `kevinmgt <kevinmarguet25@gmail.com>`                          |      81 | Kevin                                    |
| `Marguet Kevin <136594111+Kevinmrgt@users.noreply.github.com>` |      78 | Kevin via identité GitHub                |
| `Kevin MARGUET <kevin.marguet@azylis.net>`                     |       5 | Kevin via une autre configuration Git    |
| `dependabot[bot]`                                              |       3 | Automatisation, pas une personne managée |
| **Total**                                                      | **167** | **Un contributeur humain identifiable**  |

Les fusions de pull requests `#10`, `#26`, `#29`, `#47`, `#49`, `#50`, `#51`, `#54` à `#63` prouvent l'usage d'un flux de branches et de PR. Elles ne prouvent pas une revue par un pair indépendant : les identités humaines observées renvoient au même candidat, et plusieurs PR sont issues de Dependabot.

### 3.2 Nature et force des artefacts

| Artefact                                          | Fait démontré                                                         | Ce qu'il ne démontre pas                                                |
| ------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/sprints/sprint-01.md` à `sprint-12.md`      | objectifs, réalisations, métriques et prochaines étapes par incrément | réunion d'équipe réelle ; les dates de plusieurs sprints se chevauchent |
| `docs/adr/`                                       | décisions structurantes, options et conséquences                      | débat humain ou accord collectif sans commentaire/revue externe         |
| `CHANGELOG.md`                                    | communication des évolutions et correctifs par version                | information reçue ou comprise par un client réel                        |
| `.github/PULL_REQUEST_TEMPLATE.md`                | protocole attendu de description, validation, rollback et preuve      | utilisation systématique sur chaque PR passée                           |
| `.github/workflows/ci.yml`                        | contrôles partagés et bloquants sur push/PR                           | management ou revue humaine                                             |
| `.github/workflows/deploy-vercel.yml`             | responsabilités techniques de migration et déploiement                | délégation humaine                                                      |
| `.github/workflows/production-health-monitor.yml` | contrôle horaire, issue possible, simulation d'alerte isolée          | astreinte humaine ou traitement collectif d'un incident réel            |
| `docs/bloc4/bugs/BUG-001-coverage-threshold.md`   | problème, cause, correction, résultat et analyse ultérieure           | conflit interpersonnel                                                  |
| `docs/ci-cd.md`, `docs/deployment.md`             | transfert de procédures reproductibles                                | onboarding effectivement réalisé avec un collaborateur                  |

## 4. Missions réellement assumées

### 4.1 Carte des missions

| Casquette réellement tenue par Kevin | Missions observables                                                                               | Preuves                                                                         | Limite                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Chef de projet / Product Owner       | périmètre, priorisation Must/Should, objectifs d'incrément, jalons, arbitrages, cohérence RNCP     | `docs/sprints/`, `docs/rncp/bloc3-pilotage-projet-rncp39583.md`, `CHANGELOG.md` | planning initial et décisions de priorisation largement reconstruits après coup |
| Architecte                           | monorepo, séparation Web/API/shared, contrats Zod, stratégie auth, tests, cloud                    | ADR-001 à ADR-008                                                               | aucune validation d'architecture par un pair identifiée                         |
| Développeur full-stack               | Next.js, Hono, PostgreSQL/Drizzle, Auth.js, IA, UI, Timer, dashboard                               | `apps/web/`, `apps/api/`, `packages/shared/`                                    | pas de répartition entre plusieurs développeurs                                 |
| QA / responsable qualité             | tests unitaires, intégration PostgreSQL, Playwright, recettes, couverture, reflow et accessibilité | `.github/workflows/ci.yml`, suites de tests, annexes Bloc 2                     | l'indépendance auteur/testeur n'est pas assurée                                 |
| Référent sécurité / accessibilité    | ownership, TLS, CSP, secrets, quotas, RGAA/WCAG, NVDA                                              | `docs/security/`, CHANGELOG `0.13.0-rc.2` à `rc.8`, annexes B2                  | expertise et validation externes non démontrées                                 |
| DevOps / exploitant                  | Docker, migrations, Vercel/Neon, CI/CD, healthchecks, monitoring                                   | Dockerfiles, workflows, `docs/ci-cd.md`, preuves B2/B4                          | dépendances à des services externes ; aucune astreinte d'équipe                 |
| Mainteneur                           | anomalies, dépendances, recommandations, preuves MCO                                               | `docs/bloc4/`, Dependabot, commits du 27/07 au 20/08                            | support client humain réel non démontré                                         |
| Documentaliste / présentateur        | sprints, ADR, guides, dossiers RNCP et supports                                                    | `docs/`, `docs/rncp/`                                                           | production et auto-contrôle portés par la même personne                         |

### 4.2 Missions non réellement tenues par d'autres personnes

- aucun Scrum Master, QA, UX designer, DevOps, manager ou développeur distinct n'est identifié ;
- aucun commanditaire client réel n'est démontré ; les validations pédagogiques ou simulées sont signalées comme telles ;
- aucun utilisateur représentatif nommé n'est démontré ; une recette effectuée par le candidat ne devient pas un retour utilisateur indépendant ;
- Dependabot, GitHub Actions, Vercel et les assistants logiciels sont des outils ou automatisations, pas des membres d'équipe ;
- aucune donnée du dépôt ne permet d'identifier une situation de handicap ou une nationalité d'un collaborateur.

## 5. RASCI honnête

### 5.1 RASCI du projet réellement observé

Légende : **R** réalise, **A** assume le résultat, **S** apporte un support, **C** est consulté, **I** est informé, **-** non attribué ou non prouvé.

| Mission                         | Kevin                | Automatisation technique         | Commanditaire / client | Utilisateur externe | Commentaire probatoire                                           |
| ------------------------------- | -------------------- | -------------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------- |
| Cadrage et priorisation         | A/R                  | -                                | -                      | -                   | décisions documentées, consultation externe non prouvée          |
| Architecture et ADR             | A/R                  | -                                | -                      | -                   | options et décisions versionnées                                 |
| Développement Web/API/DB/IA     | A/R                  | S : CI                           | -                      | -                   | Git et code sources                                              |
| Tests et qualité                | A/R                  | S : CI, Playwright, axe          | -                      | -                   | pas de testeur indépendant                                       |
| Sécurité et accessibilité       | A/R                  | S : audit, CI, outils            | -                      | -                   | NVDA déclaré par le candidat, pas d'audit humain externe complet |
| Déploiement et migrations       | A/R                  | S : GitHub Actions, Vercel, Neon | -                      | -                   | workflows et preuves de production                               |
| Dépendances et MCO              | A/R                  | S : Dependabot, monitoring       | -                      | -                   | trois commits bot ; Kevin accepte et corrige                     |
| Documentation et restitution    | A/R                  | S : générateurs de documents     | -                      | -                   | documents versionnés                                             |
| Validation commanditaire finale | R : préparer la démo | S : production/seed              | **A non prouvé**       | C non prouvé        | écart à conserver ; ne pas attribuer une validation fictive      |

Ce tableau respecte le principe d'un seul `A` par mission lorsque la mission a réellement été assumée. Pour la validation commanditaire, l'absence de `A` est volontaire : elle rend visible le manque de preuve au lieu d'inventer un acteur.

### 5.2 RASCI d'organisation cible

Le tableau suivant est un **scénario d'organisation**, sans personne fictive. Les colonnes représentent des fonctions à pourvoir avant une reprise en équipe.

| Mission cible                         | CP / PO | Développeur full-stack | QA / accessibilité / sécurité | DevOps / MCO | Commanditaire | Représentant utilisateurs |
| ------------------------------------- | ------- | ---------------------- | ----------------------------- | ------------ | ------------- | ------------------------- |
| Besoin, valeur et périmètre           | R       | C                      | C                             | C            | A             | C                         |
| Architecture et contrats              | A       | R                      | C                             | S            | I             | I                         |
| Développement                         | A       | R                      | S                             | C            | I             | C                         |
| Stratégie et exécution des tests      | A       | S                      | R                             | C            | I             | C                         |
| Accessibilité et sécurité             | A       | S                      | R                             | C            | I             | C                         |
| Migration, déploiement, rollback      | A       | C                      | C                             | R            | I             | I                         |
| Démonstration et recette              | R       | S                      | R                             | S            | A             | C                         |
| MCO et incident                       | A       | S                      | C                             | R            | I             | I                         |
| Changelog et communication de version | A       | R                      | C                             | C            | I             | I                         |

Règles d'usage cible : une personne peut cumuler des rôles dans une petite structure, mais sa capacité n'est comptée qu'une fois ; une mission conserve un seul `A` ; l'auteur d'un changement sensible ne valide pas seul sa propre gate ; toute absence ou adaptation de capacité entraîne une réaffectation formalisée.

## 6. Répartition et charge

### 6.1 Répartition réelle reconstruite par casquette

Les chiffres proviennent de la charge équivalente du planning B3-A01. Ils ne sont pas des heures pointées. La répartition évite de compter plusieurs fois la même journée lorsque Kevin change de casquette.

| Casquette                          | Prévu B1 reconstruit | Réalisé reconstruit | Part du réalisé |             Écart | Lecture managériale                                                    |
| ---------------------------------- | -------------------: | ------------------: | --------------: | ----------------: | ---------------------------------------------------------------------- |
| Pilotage, produit et documentation |            11 JH-éq. |           14 JH-éq. |          15,7 % |                +3 | restitution et conformité plus importantes que prévu                   |
| Architecture et développement      |            36 JH-éq. |           42 JH-éq. |          47,2 % |                +6 | extensions programmes/settings, accès jury et correctifs UI            |
| QA, sécurité et accessibilité      |            14 JH-éq. |           20 JH-éq. |          22,5 % |                +6 | recettes authentifiées, intégration DB, reflow, focus et NVDA          |
| DevOps, production et MCO          |             9 JH-éq. |           13 JH-éq. |          14,6 % |                +4 | Vercel/serverless, migrations, healthchecks, monitoring et dépendances |
| **Total T01-T18**                  |        **70 JH-éq.** |       **89 JH-éq.** |       **100 %** | **+19 JH, +27 %** | charge exacte non vérifiable sans feuille de temps                     |

### 6.2 Équilibre réel

L'équilibre ne peut pas être évalué « entre membres » puisqu'il n'y a qu'une personne. Il peut être évalué entre capacité, casquettes et risques :

- capacité de référence reconstituée : environ 4 JH/semaine sur la période ;
- capacité théorique du 13 avril au 20 août : environ 74 JH ;
- charge réalisée reconstruite : 89 JH, soit une tension indicative de 15 JH ;
- près de la moitié de la charge porte sur le développement, mais QA/sécurité/accessibilité augmente à 22,5 %, signe d'un durcissement tardif ;
- les responsabilités `A` et `R` concentrées sur Kevin créent un risque de biais, de fatigue et de « bus factor 1 » ;
- les longues campagnes de juillet montrent que le temps de preuve et de contre-recette avait été sous-estimé.

Le projet individuel n'est donc pas présenté comme parfaitement équilibré. Les corrections utiles sont : limite WIP à une mission principale, réserve de 20 % pour contrôle/support, gel de périmètre avant restitution, et revue indépendante des changements sensibles dans une organisation réelle.

### 6.3 Capacité cible, sans personnes fictives

| Fonction à pourvoir           | Capacité indicative |       Charge maximale planifiée | Responsabilité dominante                   | Pourquoi                                          |
| ----------------------------- | ------------------: | ------------------------------: | ------------------------------------------ | ------------------------------------------------- |
| CP / PO                       |             0,3 ETP |                            70 % | valeur, priorité, décisions, communication | préserver 30 % pour imprévus et coordination      |
| Développeur full-stack        |             1,0 ETP |                            80 % | code et documentation technique            | 20 % pour revue, support et montée en compétences |
| QA / accessibilité / sécurité |             0,5 ETP |                            80 % | stratégie, recette, gates et preuve        | réduire l'auto-validation et intervenir tôt       |
| DevOps / MCO                  |             0,4 ETP |                            70 % | environnements, CD, supervision et reprise | conserver une capacité incident                   |
| Commanditaire et utilisateurs |            ponctuel | créneaux de validation réservés | arbitrage valeur et acceptation            | aucune charge de production supposée              |

Cette composition représente des rôles à staffer, pas des personnes existantes. La charge est équilibrée selon la capacité et les compétences, pas divisée à parts égales.

## 7. Styles managériaux

### 7.1 Styles réellement observables ou raisonnablement reconstruits

| Style        | Statut                       | Situation                                                  | Comportement                                                                           | Bénéfice                                | Risque / limite                                                     |
| ------------ | ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Directif     | **[RÉEL - auto-management]** | secrets, ownership, migration, CI rouge, healthchecks      | imposer une gate non négociable avant livraison                                        | décision rapide sur un risque critique  | aucune contradiction indépendante ; risque de surcontrôle           |
| Persuasif    | **[RECONSTRUIT]**            | choix d'architecture, tests, cloud et IA                   | exposer contexte, options, décision et conséquences dans les ADR                       | décision compréhensible et transférable | le document prouve l'argument, pas qu'une personne a été convaincue |
| Participatif | **[CIBLE]**                  | priorisation UX, accessibilité, douleur, journal de séance | atelier avec utilisateurs, QA et développement ; vote consultatif puis décision du `A` | meilleure prise en compte des usages    | coût de coordination ; pas appliqué avec une équipe réelle ici      |
| Délégatif    | **[CIBLE]**                  | composant borné ou campagne de tests maîtrisée             | confier résultat, critères, accès et échéance ; point de contrôle léger                | autonomie et montée en compétences      | aucun collaborateur humain n'a reçu de délégation dans Alcide       |

L'automatisation confiée à GitHub Actions ou Dependabot n'est pas qualifiée de style délégatif : déléguer une tâche à un outil ne démontre pas le management d'une personne.

### 7.2 Posture situationnelle cible

| Niveau d'autonomie sur la mission | Style dominant        | Action du manager                                             | Gate                                       |
| --------------------------------- | --------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Débutant / risque élevé           | Directif bienveillant | consigne précise, démonstration, binômage, petits lots        | revue obligatoire avant fusion             |
| Compétent mais peu sûr            | Persuasif / coaching  | expliquer le sens, écouter les objections, feedback fréquent  | critères partagés et décision tracée       |
| Compétent et engagé               | Participatif          | co-construire options et estimation                           | arbitrage collectif, `A` explicite         |
| Autonome et fiable                | Délégatif             | résultat attendu, marge de décision, disponibilité en support | contrôle au jalon, pas de micro-management |

La posture est déterminée par la maîtrise de la tâche et son risque, jamais par un diagnostic, une nationalité ou un stéréotype. Une adaptation de poste ne réduit pas a priori le niveau d'autonomie attendu.

## 8. Analyse critique d'une posture réelle - le conflit vitesse / qualité

### 8.1 Situation factuelle

**[RÉEL]** Le 13 avril, la CI échoue parce que la couverture statements est de 54,21 % pour un seuil de 70 %. `docs/bloc4/bugs/BUG-001-coverage-threshold.md` décrit deux causes : tests insuffisants et inclusion de fichiers dépendant de PostgreSQL. La réponse initiale ajoute 18 tests et exclut certaines couches, portant l'indicateur à 96,08 %.

L'addendum du 20 juillet apporte une critique essentielle : l'exclusion de `db`, `repositories`, `routes`, `app.ts` et `index.ts`, sans mesure Web/shared, a remis le gate historique au vert mais ne démontrait pas la majorité du code. La CI courante ajoute PostgreSQL et exécute des tests de repositories avec couverture dédiée.

### 8.2 Posture employée

**[RECONSTRUIT]** La posture se lit comme **directive et orientée résultat** : le seuil est non négociable, le candidat corrige immédiatement puis poursuit. Elle est adaptée à un blocage de pipeline et à une équipe d'une personne.

### 8.3 Analyse critique

| Dimension     | Ce qui a fonctionné                                     | Ce qui devait être amélioré                                           |
| ------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Leadership    | décision rapide, résultat mesurable, CI débloquée       | « CI verte » a momentanément remplacé « risque correctement couvert » |
| Écoute        | prise en compte du signal objectif de la CI             | aucune voix QA indépendante pour contester les exclusions             |
| Transparence  | bug documenté avec avant/après                          | portée des exclusions initialement présentée trop favorablement       |
| Charge        | ajout ciblé de tests sur les couches unitaires          | dette d'intégration DB repoussée, donc charge reportée en juillet     |
| Apprentissage | addendum ultérieur et CI PostgreSQL corrigent l'analyse | la critique aurait dû être écrite au moment de la décision            |

### 8.4 Posture recommandée en équipe

1. décrire le fait sans blâme : seuil 70 %, mesure 54,21 %, pipeline bloqué ;
2. écouter séparément développement et QA sur la testabilité et le risque ;
3. rendre visibles quatre options : ajouter des tests, installer PostgreSQL en CI, exclusion temporaire bornée, abaisser le seuil ;
4. écarter l'abaissement du seuil sans justification de risque ;
5. décider en deux temps : rétablir le gate sur les couches unitaires, puis créer une échéance ferme pour les tests DB ;
6. inscrire propriétaire, date, critère de clôture et dette résiduelle dans le ticket/ADR ;
7. vérifier à la rétrospective que l'indicateur mesure bien le risque attendu.

Cette recommandation combine directivité sur la gate, écoute des experts, transparence sur la dette et délégation claire. Elle est réalisable avec les outils déjà présents.

## 9. Communication et outils collaboratifs

### 9.1 Canaux réellement utilisés

| Canal / outil                  | Moment                                              | Objectif                                                                              | Ressource partagée                   | Preuve                                | Limite                                                         |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------- | -------------------------------------------------------------- |
| Git commits et branches        | à chaque incrément                                  | tracer auteur, date et intention                                                      | code et documentation                | historique Git                        | messages parfois français, parfois anglais ; qualité variable  |
| Pull requests                  | avant intégration de plusieurs lots de juillet/août | isoler un changement et déclencher les gates                                          | diff, discussion potentielle, checks | commits de merge et numéros de PR     | revue humaine indépendante non prouvée                         |
| Template de PR                 | à la préparation d'une PR                           | rappeler lint, typecheck, tests, coverage, build, healthchecks, changelog et rollback | checklist commune                    | `.github/PULL_REQUEST_TEMPLATE.md`    | présence du modèle, pas preuve d'usage historique systématique |
| Revue de sprint Markdown       | à chaque incrément documenté                        | communiquer objectifs, réalisations, métriques, prochaine étape                       | `docs/sprints/`                      | 12 fichiers versionnés                | plusieurs dates se chevauchent ; pas une réunion prouvée       |
| ADR                            | décision structurante                               | partager problème, options, choix et conséquences                                     | `docs/adr/`                          | 8 ADR                                 | absence de sign-off externe                                    |
| Changelog                      | release/candidate                                   | communiquer fonctionnalités, changements et sécurité                                  | `CHANGELOG.md`                       | versions `0.1.0` à `0.13.0-rc.8`      | ne prouve pas la lecture par les destinataires                 |
| CI GitHub Actions              | push/PR/manuel                                      | feedback commun et gate qualité                                                       | logs, rapports et artefacts          | `.github/workflows/ci.yml`            | outil automatisé, pas conversation humaine                     |
| Guides de déploiement et CI/CD | changement d'environnement                          | transfert, reprise et réduction de dépendance à l'auteur                              | Markdown versionné                   | `docs/deployment.md`, `docs/ci-cd.md` | onboarding réel non observé                                    |
| Rapports d'anomalie            | incident notable                                    | contexte, reproduction, cause, correction, validation                                 | `docs/bloc4/bugs/`                   | BUG-001/002                           | couverture partielle des incidents                             |
| Monitoring / issues            | horaire ou manuel                                   | alerter et partager un diagnostic                                                     | rapport et issue GitHub              | workflow monitoring                   | aucune astreinte d'équipe démontrée                            |

Aucun usage réel de Slack, Teams, email, réunion enregistrée ou entretien d'équipe n'est prouvé. Ils ne figurent donc pas dans la colonne « réellement utilisé ».

### 9.2 Règles de communication cible

- une décision durable va dans une ADR, pas uniquement dans un chat ;
- une tâche a un objectif, un responsable, une échéance, des critères d'acceptation et les dépendances ;
- une PR est petite, décrit le problème et lie l'anomalie ou la user story ;
- les objections portent sur faits, risques et critères, jamais sur la personne ;
- toute réunion a un ordre du jour écrit et un compte rendu avec décision/action/responsable/date ;
- un membre peut répondre à l'écrit ou en différé si la synchronisation n'est pas nécessaire ;
- l'information critique existe dans un espace partagé versionné, jamais seulement en message privé ;
- les secrets, données de santé ou besoins médicaux ne sont pas consignés dans Git.

## 10. Rituels et objectifs

### 10.1 Rituels observables

| Rituel                | Fréquence observable                                       | Objectif                                                 | Entrée / sortie                      | Nature                                                  |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Objectifs d'incrément | au début logique de chaque fichier sprint                  | limiter le périmètre et rendre le résultat vérifiable    | backlog -> liste d'objectifs         | Réel comme document ; temporalité parfois rétrospective |
| Revue d'incrément     | par version/sprint                                         | comparer objectifs, réalisations et métriques            | livrable -> revue Markdown/changelog | Réel comme artefact ; pas une réunion prouvée           |
| Gate CI               | chaque push sur `main`/`develop`, PR sur `main`, ou manuel | empêcher lint/typecheck/tests/build/audit non conformes  | commit -> statut/log/artefact        | Réel et automatisé                                      |
| Gate CD               | après une CI `main` réussie                                | migrer puis déployer API/Web et exécuter les smoke tests | SHA vert -> production validée       | Réel et automatisé                                      |
| Monitoring            | minute 17 de chaque heure ou manuel                        | vérifier santé et ouvrir une alerte en cas d'échec       | endpoints -> rapport/issue           | Réel et automatisé                                      |
| ADR                   | à chaque décision structurante identifiée                  | conserver contexte et conséquences                       | problème -> décision versionnée      | Réel                                                    |
| Changelog             | à chaque release/candidate                                 | informer des évolutions et correctifs                    | commits -> note de version           | Réel                                                    |

### 10.2 Cadence cible d'équipe

| Rituel cible               | Durée / fréquence              | Participants fonctionnels           | Objectif                                            | Critère d'efficacité                                       |
| -------------------------- | ------------------------------ | ----------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Point asynchrone           | 5 min, jours ouvrés            | fonctions actives                   | fait / à faire / blocage / besoin                   | blocage affecté sous un jour ouvré                         |
| Planification              | 45 min, début d'itération      | CP, Dev, QA, Ops                    | capacité, priorité, dépendances et adaptations      | charge <= 80 % de capacité disponible                      |
| Revue de risque            | 20 min, hebdomadaire           | CP, QA, Ops                         | sécurité, accessibilité, budget, délai              | chaque risque a propriétaire et prochaine action           |
| Revue de PR                | asynchrone, cible 1 jour ouvré | auteur + relecteur compétent        | qualité et transfert de connaissance                | aucun changement sensible auto-approuvé                    |
| Démonstration / validation | fin d'itération                | équipe, commanditaire, utilisateurs | accepter ou rejeter sur critères                    | décision et réserves consignées                            |
| Rétrospective              | 30 min, fin d'itération        | équipe                              | conserver, arrêter, essayer                         | une amélioration max avec responsable/date                 |
| Point individuel           | 30 min, mensuel ou au besoin   | manager + personne                  | charge, motivation, obstacles, besoins d'adaptation | action confidentielle suivie, sans donnée médicale inutile |

## 11. Gestion de conflit et maintien de l'implication

### 11.1 Ce qui est réel

Aucun conflit interpersonnel n'est documenté. Le conflit démontrable est un **conflit de contraintes porté par une même personne** : livrer vite versus maintenir couverture, sécurité, accessibilité et disponibilité. BUG-001, les correctifs Vercel et les contre-recettes de juillet montrent ces tensions, pas un désaccord entre collègues.

La motivation a été entretenue par des lots courts, des résultats visibles, des métriques, des versions et des jalons. Ce sont des mécanismes d'auto-motivation observables ; ils ne prouvent pas l'animation d'un collectif.

### 11.2 Protocole cible de résolution

Pour un désaccord humain - par exemple Dev souhaite livrer alors que QA bloque la release - le manager applique :

1. **sécuriser** : suspendre la décision irréversible et rappeler l'objectif partagé ;
2. **établir les faits** : critère attendu, mesure, impact utilisateur, délai et coût, sans attribuer de faute ;
3. **écouter** : temps de parole équivalent et reformulation de chaque besoin ;
4. **qualifier** : désaccord de fait, de priorité, de valeur, de rôle ou de comportement ;
5. **produire des options** : corriger, réduire le scope, accepter temporairement avec date, différer ;
6. **décider** : le `A` tranche avec critères explicites ; un risque sécurité/accessibilité critique ne se négocie pas ;
7. **tracer** : décision, actions, responsables, échéance et condition de réouverture ;
8. **suivre** : contrôle à 48 h ou à la prochaine revue, puis retour sur la qualité de la relation.

En cas de comportement blessant ou discriminatoire, la priorité devient la sécurité de la personne : entretien séparé, rappel des règles, consignation proportionnée et escalade RH/référent compétent. Une médiation ne doit jamais imposer à une personne de négocier sa dignité ou son accessibilité.

## 12. Handicap et inclusion concrète

### 12.1 Distinction indispensable

**[RÉEL]** Alcide comporte des contrôles d'accessibilité produit : navigation clavier, reflow, focus, axe et parcours NVDA. Cela améliore le logiciel et certains artefacts partagés.

**Non prouvé** : aucune personne de l'équipe n'a déclaré un handicap, aucune adaptation de poste réelle n'est consignée et aucune donnée médicale ne doit être déduite du dépôt. Une application accessible ne prouve pas, à elle seule, un management inclusif.

### 12.2 Processus cible avant affectation

1. proposer à toute personne un échange confidentiel sur ses conditions de réussite, sans exiger de diagnostic ;
2. recueillir le besoin fonctionnel : outil, rythme, environnement, format, communication, déplacement ;
3. co-construire l'adaptation avec la personne et, si nécessaire, RH/médecine du travail/référent handicap ;
4. réviser capacité, délai, dépendances et binômage dans le planning ;
5. tester concrètement l'outil ou l'aménagement avant la prise de tâche ;
6. consigner uniquement l'adaptation opérationnelle et son propriétaire, jamais le diagnostic dans Git ;
7. revoir l'efficacité à la fin de l'itération et à la demande de la personne.

### 12.3 Catalogue de mesures actionnables

| Besoin fonctionnel possible       | Adaptation de travail                                                                                                    | Effet planning / charge                                         | Validation avec la personne                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------- |
| Accès visuel                      | lecteur d'écran, fort contraste, zoom, Markdown structuré, texte alternatif, absence d'information uniquement en capture | temps de contrôle accessibilité et documents source disponibles | navigation autonome sur ticket, PR, CI et documentation |
| Accès auditif                     | ordre du jour, sous-titres/transcription, décisions écrites, chat, aucune alerte uniquement sonore                       | prévoir compte rendu et délai de réponse asynchrone             | information critique retrouvable sans audio             |
| Mobilité / motricité              | navigation clavier/commande vocale, périphérique adapté, raccourcis non obligatoires, moins de changements d'outil       | découpage de tâches, marge et limitation des réunions           | parcours de travail réalisable sans geste impossible    |
| Fatigue ou maladie chronique      | horaires flexibles, réunions courtes, pauses, priorités explicites, relais et absence planifiable                        | capacité calculée sur disponibilité réelle, réserve supérieure  | charge soutenable revue régulièrement                   |
| Attention / neurodiversité        | tâches petites, critères non ambigus, agenda préalable, focus sans interruption, une source de vérité                    | WIP 1, créneaux de concentration, moins de context switching    | personne confirme la clarté et la prévisibilité         |
| Dyslexie / traitement de l'écrit  | langage simple, police et espacement adaptés, synthèse vocale, schémas accompagnés de texte, temps supplémentaire        | délai de revue adapté, format alternatif                        | compréhension contrôlée sans infantilisation            |
| Anxiété sociale / prise de parole | contribution écrite, préparation des tours de parole, pas de mise en difficulté improvisée                               | décision asynchrone possible, délai de réponse                  | participation effective selon le canal choisi           |

Règles de management : demander « de quoi as-tu besoin pour réussir cette mission ? », ne pas diagnostiquer, ne pas présumer une incapacité, ne pas retirer automatiquement les tâches à forte valeur et ne pas faire porter à la personne seule le coût de l'adaptation.

### 12.4 Mesures directement activables avec les outils Alcide

- toutes les décisions clés en Markdown ou dans une PR, compatibles avec recherche et lecture différée ;
- modèles de tâche/PR avec objectif, contexte, critères et commandes ;
- tests clavier, reflow et lecteurs d'écran intégrés à la Definition of Done pertinente ;
- enregistrements de CI et logs textuels plutôt qu'un statut transmis oralement ;
- environnement Docker et scripts racine pour limiter les manipulations manuelles ;
- horaires de réponse asynchrones et absence de réunion obligatoire quand une décision écrite suffit ;
- binômage et suppléance sur déploiement/incident afin d'éviter une dépendance unique.

## 13. Contexte multiculturel et international

### 13.1 Faits réels

- le produit et les documents utilisateurs sont principalement en français ;
- le code, les API, la documentation des bibliothèques et une partie des commits utilisent l'anglais ;
- GitHub Actions s'exécute sur des runners internationaux et les services GitHub, Vercel, Neon, Google et OpenAI ont un contexte mondial ;
- les horodatages de production/CI et le fuseau du candidat peuvent différer ;
- aucune équipe humaine internationale ou multiculturelle n'est attestée.

Les fournisseurs internationaux constituent une contrainte technique et linguistique, pas une preuve de management multiculturel.

### 13.2 Convention cible

| Sujet                | Règle cible                                                                                               | Risque évité                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Langue               | français pour produit/support local ; anglais simple pour code/API ; glossaire bilingue des termes métier | incompréhension et exclusion par jargon            |
| Décisions            | résumé écrit, contexte, options et conséquence ; traduction des décisions critiques si nécessaire         | décisions réservées aux locuteurs les plus rapides |
| Temps                | ISO 8601, UTC pour systèmes, fuseau explicite pour réunions ; jamais « demain matin » sans date           | erreurs de date et fuseau                          |
| Synchronisation      | créneaux tournants, asynchrone par défaut, enregistrement/compte rendu                                    | pénalisation d'un fuseau ou rythme de travail      |
| Prise de parole      | agenda préalable, tour de contribution écrit/oral, reformulation                                          | domination par aisance linguistique                |
| Feedback             | faits, impact, attente ; éviter humour local, idiomes et jugement culturel                                | conflit culturel ou interprétation personnelle     |
| Jours non travaillés | calendrier partagé et capacité ajustée aux congés/fêtes locales                                           | surcharge et délais irréalistes                    |
| Accessibilité        | formats alternatifs et langage clair pour tous, sans supposer le besoin                                   | double exclusion handicap/langue                   |

## 14. Veille au respect du plan et indicateurs managériaux

### 14.1 Contrôle réellement disponible

- objectifs/réalisations/métriques dans les revues de sprint ;
- statuts de CI et CD sur commits/PR ;
- jalons et écarts du planning B3-A01 ;
- anomalies et addenda quand une preuve ancienne devient insuffisante ;
- healthchecks et monitoring horaire pour le service livré.

### 14.2 Tableau de bord cible d'équipe

| Indicateur               | Formule / source                                             | Seuil d'alerte                       | Action manager                                     |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------- |
| Charge individuelle      | charge affectée / capacité disponible                        | > 80 % planifié ou > 100 % constaté  | réduire scope, réaffecter, ajuster délai           |
| WIP                      | tâches en cours par personne                                 | > 2                                  | terminer ou bloquer avant démarrage supplémentaire |
| Âge d'un blocage         | date courante - date de signalement                          | > 1 jour ouvré                       | nommer un support et une échéance                  |
| Temps de revue PR        | fusion - demande de revue                                    | > 1 jour ouvré cible                 | trouver un relecteur ou réduire la PR              |
| Auto-validation sensible | PR sécurité/DB/CI sans second regard                         | > 0 en organisation multi-personne   | imposer un approbateur compétent                   |
| Actions de rétrospective | actions closes / actions prévues                             | < 80 %                               | limiter à une action prioritaire                   |
| Adaptation efficace      | validation qualitative par la personne                       | réponse négative ou absence de revue | ajuster avec la personne et le référent approprié  |
| Répartition de parole    | participants ayant contribué / présents                      | déséquilibre récurrent               | canal écrit, tour de table, animation adaptée      |
| Satisfaction équipe      | question courte 1-5 + commentaire optionnel                  | < 3 deux fois                        | entretien, analyse charge/conflit/outils           |
| Bus factor               | nombre de personnes capables d'exécuter une mission critique | 1                                    | binômage, runbook, exercice de reprise             |

Les indicateurs RH ne doivent pas devenir des outils de surveillance individuelle. Ils déclenchent une conversation sur le système de travail, pas une sanction automatique.

## 15. Recommandations réalistes et ordonnées

| Priorité | Action                                                                                             | Responsable fonctionnel cible | Échéance                          | Critère de succès                                       |
| -------- | -------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- | ------------------------------------------------------- |
| P0       | conserver dans l'oral la mention « projet individuel » et les trois niveaux Réel/Reconstitué/Cible | CP                            | avant gel Bloc 3                  | aucune équipe ou validation fictive dans le support     |
| P0       | faire relire une PR sensible par une personne compétente si une équipe est disponible              | CP / QA                       | prochaine évolution critique      | approbation distincte de l'auteur                       |
| P0       | calculer la charge sur capacité réelle et réserver 20 % de marge                                   | CP                            | prochaine planification           | aucun rôle au-dessus de 80 % planifié                   |
| P1       | installer le point asynchrone fait/à faire/blocage et une revue hebdomadaire des risques           | CP                            | première itération d'équipe       | blocages affectés sous un jour ouvré                    |
| P1       | appliquer le processus d'adaptation avant l'affectation, sans stocker de donnée médicale dans Git  | manager / RH / référent       | dès onboarding                    | adaptation testée et validée par la personne            |
| P1       | adopter le glossaire bilingue, ISO 8601/UTC et les décisions écrites                               | CP                            | première itération internationale | décisions comprises sans présence synchrone             |
| P1       | utiliser le protocole de conflit section 11 et consigner décision/actions                          | manager                       | premier désaccord significatif    | décision suivie, relation revue à 48 h                  |
| P2       | mesurer bus factor et organiser un exercice de reprise du déploiement                              | Ops / CP                      | sous un mois                      | une seconde fonction exécute le runbook sans aide orale |

## 16. Script court pour l'oral

> « Alcide est un projet individuel. Git confirme un seul contributeur humain, sous trois identités, plus Dependabot. Je ne prétends donc pas avoir animé une équipe réelle. J'ai réellement assumé les missions de chef de projet, développeur, QA, DevOps et documentaliste, avec Git, PR, ADR, sprints, CI/CD et changelog comme système asynchrone partagé. Mon RASCI réel montre cette concentration et laisse volontairement la validation commanditaire non attribuée faute de preuve. Le RASCI multi-rôles est une organisation cible, pas une équipe inventée. »

> « Ma posture réelle a surtout été directive en auto-management sur les gates critiques. BUG-001 montre sa force et sa limite : j'ai rétabli rapidement la CI, mais les exclusions de couverture ont masqué une dette d'intégration ensuite corrigée. En équipe, j'emploierais une posture situationnelle : directif sur les exigences non négociables, persuasif pour expliquer, participatif sur les options produit, délégatif avec un collaborateur autonome. J'adapte charge, outils, formats et calendrier aux besoins fonctionnels d'une personne, sans présumer son handicap, et j'organise l'international en asynchrone avec décisions écrites, dates ISO et langage clair. »

## 17. Audit final critère par critère

| Contrôle                                                | État                | Preuve / limite                                                   |
| ------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| Missions réellement assumées identifiées                | Couvert             | section 4, code/docs/Git                                          |
| Aucun collaborateur fictif                              | Couvert             | identité Git explicitée, rôles cibles non nommés                  |
| RACI/RASCI honnête                                      | Couvert             | RASCI réel avec validation externe manquante + RASCI cible        |
| Répartition et équilibre de charge                      | Couvert avec limite | 70/89 JH-éq. reconstruits ; aucune timesheet                      |
| Style managérial identifié et décrit                    | Couvert             | directif réel en auto-management ; autres styles qualifiés        |
| Principes d'écoute, empathie, bienveillance, leadership | Couvert en cible    | posture situationnelle, conflit et inclusion                      |
| Analyse critique d'une posture                          | Couvert             | BUG-001, force, biais, correction et recommandation               |
| Recommandations réalistes                               | Couvert             | section 15, responsables, échéances et critères                   |
| Outils collaboratifs avec partage                       | Couvert             | GitHub, PR, sprints, ADR, CI/CD, guides et monitoring             |
| Objectifs et rituels                                    | Couvert             | réel automatisé/documentaire + cadence cible                      |
| Gestion de conflit                                      | Couvert avec limite | conflit de rôles réel ; aucun conflit interpersonnel prouvé       |
| Handicap pris en compte concrètement                    | Couvert en cible    | processus, catalogue, effet planning, validation ; aucun cas réel |
| Collaboration asynchrone                                | Couvert             | outils réels et règles cibles                                     |
| Contexte multiculturel/international                    | Couvert avec limite | contraintes réelles ; aucune équipe internationale prouvée        |
| Respect du plan                                         | Couvert             | gates réelles, B3-A01 et indicateurs cibles                       |

## 18. Index des preuves

| Objet                       | Source locale                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exigences C3.3.1            | `docs/rncp/Référentiel Expert en développement logiciel RNCP39583 (1).pdf`, pages 12-13                                                          |
| Auteurs et historique       | `git shortlog -sne HEAD`, `git log --merges`                                                                                                     |
| Missions et chronologie     | `docs/sprints/`, `docs/bloc4/compte-rendu-activite.md`                                                                                           |
| Charge et planning          | `docs/rncp/bloc3-annexes/B3-A01-planning-previsionnel-realise.md`                                                                                |
| Décisions et argumentation  | `docs/adr/`                                                                                                                                      |
| Communication des versions  | `CHANGELOG.md`                                                                                                                                   |
| Protocole PR                | `.github/PULL_REQUEST_TEMPLATE.md`                                                                                                               |
| Gates qualité partagées     | `.github/workflows/ci.yml`                                                                                                                       |
| Déploiement et transfert    | `.github/workflows/deploy-vercel.yml`, `docs/ci-cd.md`, `docs/deployment.md`                                                                     |
| Monitoring / alerte         | `.github/workflows/production-health-monitor.yml`, `docs/rncp/bloc4-annexes/`                                                                    |
| Analyse critique couverture | `docs/bloc4/bugs/BUG-001-coverage-threshold.md`                                                                                                  |
| Accessibilité produit       | `apps/web/tests/e2e/`, `docs/rncp/bloc2-annexes/B2-A36-audit-accessibilite-final-2026-07-21.md`, `B2-A41-parcours-nvda-production-2026-07-22.md` |

## 19. Conclusion C3.3.1

La preuve historique établit une organisation individuelle disciplinée, des responsabilités multiples réellement assumées et une collaboration asynchrone outillée. Elle ne permet pas d'affirmer qu'une équipe humaine a été managée. Le RASCI cible, la posture situationnelle, le protocole de conflit, le plan d'inclusion et les règles multiculturelles montrent une organisation directement activable sans travestir le passé. La défense orale doit conserver cette frontière : **expérience réelle de coordination de rôles et d'outils ; management humain analysé et scénarisé, non inventé**.
