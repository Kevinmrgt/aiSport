# Plan de support oral Bloc 3 RNCP39583 - SportCoach IA

> Épreuve : **Bloc 3 - Coordonner et piloter un projet de développement d'applications logicielles**  
> Format officiel : **45 minutes**, dont **30 minutes de présentation** et **15 minutes d'échange avec le jury**  
> Objectif du support : prouver le pilotage du projet et terminer par une démonstration exploitable de la dernière version logicielle.

---

## 1. Intention de présentation

Message central à faire passer :

> SportCoach IA n'est pas seulement une application développée : c'est un projet logiciel piloté par incréments, avec méthode, planning, suivi, arbitrages, indicateurs, gestion des risques, validations et version démontrable.

Angle recommandé :

- parler d'abord de **pilotage projet**, pas de code ;
- utiliser le code seulement comme preuve d'un choix, d'un indicateur ou d'une validation ;
- assumer le contexte individuel : une seule personne a porté plusieurs rôles projet ;
- distinguer les preuves réelles des éléments reconstitués pour la soutenance ;
- insister sur les compétences éliminatoires C.3.1, C3.2.1 et C3.4.2.

Nombre conseillé de slides : **15 slides**.

Découpage recommandé :

- **22 minutes** de présentation pilotage ;
- **8 minutes** de démonstration logicielle ;
- **15 minutes** d'échange avec le jury.

---

## 2. Plan minuté sur 30 minutes

| Temps | Slide | Titre | Message clé | Preuves à afficher ou citer |
|---:|---:|---|---|---|
| 0:00-1:00 | 1 | Contexte Bloc 3 | L'épreuve évalue le pilotage et la démonstration, pas uniquement le développement | PDF règlement spécial, `docs/rncp/matrice-conformite-rncp39583.md` |
| 1:00-2:30 | 2 | Projet en une minute | SportCoach IA génère et suit des entraînements personnalisés par IA | `README.md`, `package.json`, URL Vercel |
| 2:30-4:30 | 3 | Méthode projet | Approche itérative inspirée Scrum, adaptée à un projet individuel | `docs/sprints/`, `CHANGELOG.md` |
| 4:30-7:00 | 4 | Planning et jalons | Le projet est structuré en phases : fondations, MVP, qualité, déploiement, démo | Tableau planning Bloc 3, `docs/sprints/sprint-01.md` à `sprint-12.md` |
| 7:00-8:30 | 5 | Ressources | Les ressources humaines, techniques et cloud sont identifiées | `package.json`, `docker-compose.yml`, `.github/workflows/`, `docs/deployment.md` |
| 8:30-10:30 | 6 | Rôles et RACI | Projet solo : le candidat assume les rôles chef de projet, dev, QA, DevOps | RACI du livrable Bloc 3, `docs/bloc4/compte-rendu-activite.md` |
| 10:30-13:00 | 7 | Outil de suivi | Le suivi est versionné : sprints, changelog, ADR, bugs, CI/CD | `docs/sprints/`, `CHANGELOG.md`, `docs/adr/`, `docs/bloc4/bugs/` |
| 13:00-15:00 | 8 | Tableau de bord | Les KPI pilotent qualité, avancement, risques et validation | `pnpm test`, `pnpm test:coverage`, Playwright Chromium, CI |
| 15:00-18:00 | 9 | Arbitrages | Les décisions structurantes sont argumentées par options, critères et impacts | `ADR-001` à `ADR-007`, `BUG-001` |
| 18:00-19:30 | 10 | Communication | Revues, ADR, changelog et comptes rendus reconstitués assurent la traçabilité | `docs/sprints/`, `docs/ci-cd.md`, `docs/rncp/bloc3-pilotage-projet-rncp39583.md` |
| 19:30-21:00 | 11 | Compétences et management | Les besoins en compétences sont identifiés malgré le contexte individuel | Grille compétences Bloc 3, plan de montée en compétences |
| 21:00-22:30 | 12 | Risques et validations | Les risques IA, auth, CI, déploiement et démo sont suivis avec plans de secours | Registre risques Bloc 3, `seed.ts`, healthchecks |
| 22:30-23:00 | 13 | Transition démo | La démonstration valide la dernière version logicielle devant le commanditaire | `bloc3-script-demo-logiciel.md` |
| 23:00-29:00 | 14 | Démonstration | Auth, génération, consultation, timer, session, dashboard, healthchecks | Application web, API healthcheck, données seed si besoin |
| 29:00-30:00 | 15 | Validation finale | Le projet est livrable sous conditions connues et limites explicites | Liste écarts/preuves à produire |

---

## 3. Détail conseillé par slide

### Slide 1 - Contexte Bloc 3

Message clé : "Je présente le pilotage du projet et je termine par une démonstration de la dernière version."

À dire :

- oral individuel de 45 minutes ;
- 30 minutes de présentation, 15 minutes d'échange ;
- compétences éliminatoires : C.3.1 planification, C3.2.1 pilotage, C3.4.2 démonstration.

À afficher :

- intitulé officiel : **Coordonner et piloter un projet de développement d'applications logicielles** ;
- format officiel : **30 min présentation + 15 min jury**.

### Slide 2 - Projet en une minute

Message clé : "SportCoach IA aide un utilisateur à générer, sauvegarder, exécuter et suivre des entraînements personnalisés."

À dire :

- application full-stack ;
- IA Mistral validée par Zod ;
- données utilisateur en PostgreSQL ;
- version de référence : `0.12.0`.

Preuves :

- `README.md` ;
- `package.json` ;
- `CHANGELOG.md`.

### Slide 3 - Méthode projet

Message clé : "Le projet a été piloté par incréments courts avec revues et traçabilité."

À dire :

- méthode itérative inspirée Scrum ;
- adaptation au contexte solo ;
- définition de terminé : code + tests + documentation + changelog ;
- priorités Must/Should/Could.

Preuves :

- `docs/sprints/` ;
- `CHANGELOG.md` ;
- `docs/bloc4/compte-rendu-activite.md`.

### Slide 4 - Planning et jalons

Message clé : "Les travaux ont été ordonnancés en phases et dépendances."

À afficher :

- diagramme Mermaid ou tableau planning du livrable Bloc 3 ;
- 6 phases : fondations, MVP, qualité, déploiement, documentation, version démontrable.

À dire :

- les dates exactes doivent être lues avec prudence ;
- la preuve forte est la progression des livrables, versions et fichiers sprint ;
- le planning prévisionnel a été consolidé pour la soutenance à partir des preuves.

### Slide 5 - Ressources

Message clé : "Les ressources nécessaires sont identifiées : humaines, techniques, cloud et outillage."

À afficher :

- tableau ressources humaines et techniques ;
- architecture courte : Web Vercel, API Vercel, DB Neon, IA Mistral.

Preuves :

- `docs/ci-cd.md` ;
- `docs/deployment.md` ;
- `docker-compose.yml` ;
- `.env.example`.

### Slide 6 - Rôles et RACI

Message clé : "Le projet est individuel, mais les responsabilités projet sont clarifiées."

À dire :

- le candidat a assumé plusieurs rôles : chef de projet, dev, QA, DevOps ;
- le RACI explique comment ces rôles seraient distribués en équipe ;
- prise en compte handicap : documentation asynchrone, tâches découpées, outils accessibles.

Preuves :

- RACI Bloc 3 ;
- `docs/bloc4/compte-rendu-activite.md`.

### Slide 7 - Outil de suivi

Message clé : "Le suivi est versionné dans le dépôt."

À afficher :

- sprints pour l'avancement ;
- changelog pour les versions ;
- ADR pour les décisions ;
- bugs pour les incidents ;
- CI/CD pour les gates qualité.

Phrase utile :

> Je n'ai pas de capture Kanban externe à présenter. J'ai donc consolidé le suivi à partir d'artefacts versionnés. Pour une équipe réelle, je compléterais par GitHub Projects ou Jira.

### Slide 8 - Tableau de bord

Message clé : "Les décisions de pilotage s'appuient sur des indicateurs mesurables."

À afficher :

| KPI | Valeur |
|---|---:|
| Tests unitaires | 70 passants |
| Coverage API statements | 81.57% |
| Smoke E2E Chromium | 24 passants |
| Sprints | 12 |
| ADR | 7 |
| Bugs documentés | 2 |

À préciser :

- `pnpm test` et `pnpm test:coverage` ont été relancés le 2026-05-07 ;
- Firefox Playwright n'était pas installé localement, donc le smoke complet cross-browser doit être relancé avant soutenance.

### Slide 9 - Arbitrages

Message clé : "Les arbitrages ont été documentés, justifiés et reliés à leurs impacts projet."

Arbitrages à présenter :

- monorepo pnpm ;
- Next.js + Hono + PostgreSQL/Drizzle ;
- Mistral AI ;
- Vercel/Neon + Docker ;
- auth service-to-service ;
- stratégie tests.

Focus oral recommandé : choisir **2 arbitrages longs** et citer les autres rapidement.

Arbitrage long 1 : Mistral AI  
Pourquoi : illustre coût, risque fournisseur, validation Zod, plan B.

Arbitrage long 2 : Vercel/Neon + Docker  
Pourquoi : illustre démonstration live, CD, migrations et plan de secours local.

### Slide 10 - Communication

Message clé : "La communication projet est tracée par des documents courts et orientés décision."

À dire :

- les revues de sprint servent de comptes rendus d'activité ;
- les ADR justifient les choix ;
- le changelog communique les évolutions ;
- les comptes rendus client sont reconstitués pour la soutenance et ne sont pas des échanges réels.

Preuves :

- `docs/sprints/` ;
- `docs/adr/` ;
- `CHANGELOG.md`.

### Slide 11 - Compétences et management

Message clé : "Le projet a nécessité une grille de compétences même en contexte solo."

À afficher :

- compétences mobilisées : full-stack, IA, DB, tests, DevOps, sécurité, accessibilité ;
- compétences à renforcer : Kanban, budget, tests DB, monitoring, management d'équipe.

À dire :

- en équipe réelle, les missions seraient affectées selon RACI ;
- le style managérial varierait selon la situation : directif sur sécurité, participatif sur UX, factuel sur bugs.

### Slide 12 - Risques et validations

Message clé : "Les risques majeurs sont suivis et associés à des plans de secours."

Risques à citer :

- IA indisponible ;
- OAuth ou réseau bloqué pendant la démo ;
- données utilisateur mal isolées ;
- régression CI ;
- incohérence documentaire.

Preuves :

- `apps/api/src/db/seed.ts` pour plan B ;
- healthchecks ;
- tests ownership ;
- fiches BUG.

### Slide 13 - Transition vers la démo

Message clé : "Je passe de la preuve de pilotage à la validation par l'usage."

Phrase de transition :

> Après avoir présenté comment le projet a été planifié, suivi, arbitré et validé, je vais montrer la dernière version logicielle sur un parcours utilisateur court. L'objectif est de parler comme face à un commanditaire : ce que l'utilisateur fait, ce qui est validé, et quels risques restent maîtrisés.

### Slide 14 - Démonstration

Scénario cible :

1. Ouvrir l'application ou la version locale.
2. Montrer l'authentification ou l'état protégé.
3. Générer une séance.
4. Consulter la séance et lancer le timer.
5. Enregistrer une session terminée.
6. Montrer le dashboard.
7. Montrer paramètres IA.
8. Montrer healthchecks API/Web.

À éviter :

- expliquer longuement le code ;
- passer plus de 8 minutes ;
- attendre une génération IA longue sans plan B.

### Slide 15 - Validation finale

Message clé : "Le projet est démontrable et validable, avec des limites connues."

À dire :

- version de référence : `0.12.0` ;
- tests unitaires et coverage passants ;
- smoke Chromium validé ;
- plans de secours prêts ;
- preuves à finaliser : board de suivi, harmonisation version/sprints, Firefox Playwright, monitoring externe.

---

## 4. Questions probables du jury et réponses préparées

### Question 1 - Où est votre vrai outil de suivi projet ?

Réponse :

> Le dépôt ne contient pas de capture d'un outil externe type Jira. Le suivi réel est versionné par les revues de sprint, le changelog, les ADR, les fiches bugs et la CI/CD. Pour une équipe réelle, je compléterais ce système par GitHub Projects afin d'avoir un board visuel avec statuts, responsables, échéances et priorités.

### Question 2 - Comment démontrez-vous la compétence C.3.1 si le planning est surtout rétrospectif ?

Réponse :

> Les preuves initiales sont effectivement plus rétrospectives que prévisionnelles. Pour sécuriser le Bloc 3, j'ai consolidé un planning par phases, jalons et dépendances à partir des sprints existants. Je présente cela comme une reconstruction de pilotage, et je signale l'écart plutôt que de prétendre disposer d'un Gantt initial complet.

### Question 3 - Comment avez-vous piloté une équipe alors que le projet est individuel ?

Réponse :

> Le projet est individuel ; je ne prétends pas avoir piloté une équipe réelle. J'explique les rôles assumés par le candidat et je fournis un RACI cible pour montrer comment les missions seraient affectées dans une équipe. J'aborde aussi le style managérial, la prise en compte du handicap et les compétences à renforcer.

### Question 4 - Quel arbitrage a eu le plus d'impact ?

Réponse :

> L'arbitrage le plus impactant est le couple Mistral AI + validation Zod. Il répond au coeur métier, mais crée un risque de sortie invalide ou de dépendance fournisseur. La décision a été prise car Mistral offrait un JSON mode et un coût adapté au prototype. L'impact est maîtrisé par un service dédié, un retry, des schémas Zod partagés et un plan B avec données seedées.

### Question 5 - Comment suivez-vous la qualité ?

Réponse :

> Par des indicateurs mesurables : tests unitaires, coverage, smoke E2E, build, lint/typecheck, bugs documentés, healthchecks et changelog. Le 2026-05-07, `pnpm test` passe avec 70 tests unitaires et `pnpm test:coverage` donne 81.57% de statements API, au-dessus du seuil CI de 70%.

### Question 6 - Que faites-vous si l'IA ne répond pas pendant la démo ?

Réponse :

> Je bascule sur les données de démonstration seedées. Le script `apps/api/src/db/seed.ts` crée trois entraînements variés sans dépendre de Mistral. Je peux ainsi montrer liste, détail, timer, suivi de session et dashboard. J'explique ensuite comment la génération IA est sécurisée côté backend.

### Question 7 - Pourquoi Vercel/Neon ?

Réponse :

> Pour disposer d'une version live démontrable, avec une base PostgreSQL managée et une CD traçable. Les migrations sont séparées du build via un workflow manuel, ce qui évite qu'un build applicatif modifie la base sans validation explicite. Docker reste disponible comme plan de portabilité et de démo locale.

### Question 8 - Quels sont les principaux écarts restants ?

Réponse :

> Les principaux écarts sont documentaires et de pilotage : absence de board Kanban externe, comptes rendus client reconstitués, indicateurs de satisfaction non issus d'une enquête réelle, incohérence `0.12.0`/`0.13.0`, et navigateur Playwright Firefox à installer pour relancer le smoke cross-browser.

### Question 9 - Comment obtenez-vous la validation du commanditaire ?

Réponse :

> Je propose une validation en fin de démo sur critères : parcours utilisateur compréhensible, génération ou consultation d'une séance, timer utilisable, dashboard cohérent, healthchecks disponibles, sécurité ownership expliquée. Les limites restantes sont listées avec des actions de correction.

### Question 10 - Quelle suite donneriez-vous au projet ?

Réponse :

> Priorité 1 : harmoniser la documentation et finaliser le board de suivi. Priorité 2 : installer le monitoring externe et relancer tous les E2E cross-browser. Priorité 3 : ajouter des tests d'intégration DB et un rate limit partagé Redis/Upstash pour un usage production multi-instance.

---

## 5. Checklist avant l'oral

À préparer la veille :

- vérifier que `package.json` et `CHANGELOG.md` indiquent bien la version à présenter ;
- ouvrir les trois fichiers Bloc 3 ;
- préparer les URLs Web/API et les healthchecks ;
- préparer un compte de démonstration ;
- préparer la démo locale avec `.env`, migrations et seed ;
- lancer `pnpm test` ;
- lancer `pnpm test:coverage` ;
- installer Firefox Playwright et relancer le smoke complet si possible ;
- préparer 3 captures alternatives : page d'accueil, détail séance/timer, dashboard ;
- avoir `docs/adr/ADR-003-mistral-ai.md`, `ADR-004`, `ADR-007`, `docs/ci-cd.md` ouverts ou faciles à retrouver.

Commande de validation minimale :

```bash
pnpm test
pnpm test:coverage
pnpm --filter web exec playwright test tests/e2e/home.spec.ts tests/e2e/auth.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/axe.spec.ts --project=chromium
```

Commande E2E complète après installation navigateurs :

```bash
pnpm --filter web exec playwright install chromium firefox
pnpm test:e2e:smoke
```
