# Livrable Bloc 3 RNCP39583 — Pilotage du projet Alcide

> Bloc : **Coordonner et piloter un projet de développement d'applications logicielles**
> Candidat : Kevin
> Consolidation : **2026-09-07**
> Baseline applicative : **`0.13.0-rc.8`**
> SHA contrôlé : **`d950b6b790a8b11153995bf817b7cb0d583d36da`** (`d950b6b`)
> Format : oral individuel de 45 minutes, dont 30 minutes de présentation et 15 minutes d'échange

## 0. Objet, sources et règle de sincérité

Ce livrable consolide les preuves Bloc 3. Les annexes font foi pour le détail,
les calculs, les commandes, les limites et la qualification des preuves.

| Compétence              | Réponse principale                                                                                  | Statut documentaire au 2026-09-07                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| C.3.1 — Planification   | [B3-A01](bloc3-annexes/B3-A01-planning-previsionnel-realise.md)                                     | Planning prévu/réalisé, charges, dépendances, ressources et RACI couverts ; reconstruction signalée           |
| C3.2.1 — Pilotage       | [B3-A02](bloc3-annexes/B3-A02-tableau-pilotage-2026-09-07.md)                                       | Tableau actuel mesurable avec seuils, responsables, fréquence, tendance et décisions                          |
| C3.2.2 — Arbitrage      | [B3-A03](bloc3-annexes/B3-A03-cas-arbitrage-vercel-neon.md)                                         | Cas Vercel/Neon documenté avec options, pondération, logigramme et résultat                                   |
| C3.3.1 — Équipe         | [B3-A04](bloc3-annexes/B3-A04-management-raci-inclusion.md)                                         | Missions, RASCI, charge, communication, management, handicap et multiculturalité couverts sans équipe fictive |
| C3.3.2 — Compétences    | [B3-A05](bloc3-annexes/B3-A05-grille-competences-plan-developpement.md)                             | Grille 0–4, écarts, besoins RH et plan de développement mesurable                                             |
| C3.4.1 — Comptes rendus | [B3-A06](bloc3-annexes/B3-A06-comptes-rendus-validation-satisfaction.md)                            | CR et dispositif de validation/satisfaction, limites réelles explicites                                       |
| C3.4.2 — Démonstration  | [B3-A07](bloc3-annexes/B3-A07-demonstration-version-actuelle.md) et `bloc3-script-demo-logiciel.md` | Répétition datée, neuf captures, conducteur 6 min 30 et plans B ; validation réelle encore à recueillir       |

Règles de lecture :

- une preuve du dépôt ou un contrôle daté est distingué d'une reconstruction ;
- le projet étant individuel, aucun collaborateur ni pilotage d'équipe réel
  n'est inventé ;
- les comptes rendus pédagogiques ne deviennent pas des échanges client réels ;
- une formation planifiée n'est pas présentée comme suivie ;
- une mesure ponctuelle de production ne constitue ni un SLA ni un test de charge.

## 1. Projet et baseline démontrée

| Élément             | État actuel vérifiable                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Produit             | Application Web full-stack de génération, sauvegarde, exécution et suivi d'entraînements et programmes sportifs |
| Architecture        | Next.js, Hono, TypeScript, PostgreSQL/Drizzle, Auth.js, Zod, pnpm monorepo                                      |
| IA actuelle         | Appels OpenAI côté serveur ; `docs/adr/ADR-008-openai-server-side.md` remplace le choix Mistral historique      |
| Hébergement         | Web et API Vercel, base Neon PostgreSQL ; Docker conservé comme option de portabilité                           |
| Version             | `0.13.0-rc.8`                                                                                                   |
| Empreinte           | SHA `d950b6b790a8b11153995bf817b7cb0d583d36da`                                                                  |
| Contrôles unitaires | 261/261 : Shared 14, API 179, Web 68                                                                            |
| Production          | 150/150 réponses valides sur la campagne bornée du 2026-09-07                                                   |

La version `0.12.0`, les 70 tests et le smoke Chromium 24/24 du 2026-05-07
sont conservés uniquement comme **baseline historique**. Ils ne décrivent plus
l'état présenté au jury.

## 2. Méthodologie et planification — C.3.1

### 2.1 Cadre méthodologique

Le projet a suivi une démarche itérative légère, inspirée de Scrum et adaptée à
un contexte solo. Les traces réelles sont les sprints, le changelog, les ADR,
les anomalies, les tests et les gates CI/CD. Le dépôt ne prouve pas un Scrum
d'équipe complet ni un planning initial exhaustif.

| Élément               | Application                                                   | Source                                          |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Incréments            | Objectifs et résultats documentés par sprint                  | `docs/sprints/`                                 |
| Priorisation          | Fonctionnel, sécurité, accessibilité, qualité puis production | B3-A01 et changelog                             |
| Définition de terminé | Code, tests, typecheck, lint, build et documentation          | `.github/workflows/ci.yml`, `docs/ci-cd.md`     |
| Décisions             | ADR et cas d'arbitrage                                        | `docs/adr/`, B3-A03                             |
| Validation            | Recettes, CI/CD, production et points de validation           | `docs/bloc2/cahier-recettes.md`, B3-A02, B3-A06 |

### 2.2 Planning

B3-A01 contient la WBS, le tableau prévu/réalisé, les dépendances, le Gantt,
les jalons, le chemin critique, les marges, les charges et l'affectation.

| Phase              | Résultat observé                                           | Dépendance structurante   |
| ------------------ | ---------------------------------------------------------- | ------------------------- |
| Fondations         | Monorepo, contrats et architecture                         | Choix de stack            |
| MVP                | Authentification, génération, persistance, liste et détail | Contrats partagés et DB   |
| Qualité            | Tests, sécurité, accessibilité et recettes                 | MVP fonctionnel           |
| Production         | CI/CD, Vercel/Neon, health/readiness                       | Build et migrations       |
| Consolidation RNCP | Annexes, support oral et démonstration                     | Baseline technique stable |

Limite probatoire : plusieurs dates et charges prévisionnelles ont dû être
reconstruites à partir de l'historique. Cette reconstruction est balisée dans
B3-A01 ; elle ne doit pas être présentée comme un Gantt tenu depuis le départ.

## 3. Ressources, charge et coûts

### 3.1 Ressources réelles et cibles

| Nature     | Réel                                                                  | Besoin cible                                                                            |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Humain     | Kevin cumule pilotage, produit, développement, QA, sécurité et DevOps | Séparer produit/projet, frontend/UX, backend/data/IA, QA/AppSec, SRE et expertise sport |
| Technique  | Poste Windows, Node/pnpm, Git, Docker, GitHub Actions                 | Conserver des environnements reproductibles et contrôlés                                |
| Cloud      | Vercel, Neon et OpenAI configurés                                     | Budgets, quotas, alertes et export de consommation                                      |
| Continuité | Une personne, documentation et runbooks                               | Au moins deux personnes capables de reprendre chaque chemin critique                    |

Les capacités, niveaux minimaux et renforts sont détaillés dans B3-A04 et
B3-A05. Il s'agit d'une organisation cible, non de recrutements réalisés.

### 3.2 Limites de charge et coût

- aucune feuille de temps exploitable ne prouve la charge réelle ;
- aucune facture Vercel, Neon, OpenAI ou GitHub n'est jointe ;
- le budget initial et les hypothèses peuvent être cités, mais l'écart
  réel/prévisionnel reste N/D ;
- le terme « free tier » ne doit pas être transformé en coût réel nul ;
- B3-A02 fixe les KPI, seuils et actions nécessaires pour instrumenter ces
  données.

## 4. Outil de suivi et tableau de pilotage — C3.2.1

L'outil de suivi réel est un système d'artefacts versionnés : `docs/sprints/`,
Git, changelog, ADR, fiches d'anomalie, CI/CD et mesures de production. Il
n'existe pas de preuve d'un board Jira/GitHub Projects maintenu pendant toute la
période. B3-A02 consolide ces sources dans un tableau de bord daté.

### 4.1 État actuel

| Axe                         |                                 Mesure au 2026-09-07 | Seuil/décision                               |
| --------------------------- | ---------------------------------------------------: | -------------------------------------------- |
| Tests                       |                                          **261/261** | 100 % attendus : vert                        |
| Shared                      |      100 % lignes, 92,85 % branches, 100 % fonctions | Seuil lignes 70 % atteint                    |
| API                         |  89,72 % lignes, 80,91 % branches, 95,77 % fonctions | Seuil atteint                                |
| Web                         |  77,32 % lignes, 79,44 % branches, 82,99 % fonctions | Seuil atteint, couverture non exhaustive     |
| Types/lint/build/politiques |                                              Réussis | Vert                                         |
| Smoke E2E courant           |                **54/54** avec `workers=1` en 4,4 min | Vert local en série                          |
| Historique E2E              | **53/54**, puis relance ciblée du cas échoué **1/1** | L'intermittence parallèle reste documentée   |
| Audit dépendances           |                         **0 complet / 0 production** | Vert local après overrides qualifiés         |
| Production                  |                         **150/150** réponses valides | Vert sur cette mesure bornée uniquement      |
| p95 production maximal      |                                            246,42 ms | Sous le seuil de 1 000 ms sur cette campagne |
| Coûts réels                 |                                                  N/D | Instrumenter exports et rapprochement        |
| Facteur de continuité       |                                                    1 | Rouge : cible >= 2                           |

### 4.2 Traçabilité

- SHA local, `origin/main`, CI et CD : `d950b6b…` ;
- CI réussie : run `32393765258` ;
- CD réussie : run `32394435200` ;
- monitoring réussi le 2026-09-07 : run `34084157427` ;
- commandes, horaires, codes de sortie et résultats complets : B3-A02 section 11.

## 5. Arbitrage — C3.2.2

B3-A03 formalise le choix d'une cible Vercel Web/API + Neon avec Docker comme
portabilité. L'annexe présente le contexte, l'écart, les options crédibles, les
critères pondérés, le calcul, le logigramme, la décision, les risques, le plan
d'action et le résultat constaté.

Ce cas est présenté comme un arbitrage de projet réel appuyé par des preuves,
pas comme une justification rétrospective limitée à une préférence technique.

## 6. Pilotage d'équipe — C3.3.1

Le projet est individuel. La preuve réelle porte donc sur l'organisation des
missions et des casquettes, non sur le management de collaborateurs inexistants.

B3-A04 apporte :

- une carte des missions réellement assumées ;
- un RASCI réel et un RASCI d'organisation cible ;
- une répartition de charge reconstruite et ses limites ;
- les styles managériaux observables ou recommandés selon la situation ;
- un protocole cible de communication et de résolution de conflit ;
- des adaptations concrètes liées au handicap ;
- une convention de travail multiculturelle/internationale ;
- des rituels et indicateurs de respect du plan.

Le terme « cible » est obligatoire à l'oral pour tout dispositif non exécuté
avec une équipe réelle.

## 7. Besoins en compétences — C3.3.2

B3-A05 remplace la liste générique de technologies par une évaluation mesurable.

| Indicateur                          |                                Résultat |
| ----------------------------------- | --------------------------------------: |
| Compétences évaluées                |                                      17 |
| Niveau 3                            |                                       5 |
| Niveau 2                            |                                       9 |
| Niveau 1                            |                                       3 |
| Niveau 4 prouvé                     |                                       0 |
| Écarts P0                           | 2 : AppSec/dépendances et stabilité E2E |
| Besoins de renfort formalisés       |                                       5 |
| Actions de développement planifiées |                                      10 |

Les niveaux sont une auto-évaluation étayée du candidat, pas une évaluation de
manager. Les besoins sont prêts à transmettre à un rôle RH cible, mais aucune
transmission ni embauche réelle n'est revendiquée. Toutes les formations sont
planifiées ; aucune inscription, réussite ou certification n'est inventée.

## 8. Communication, comptes rendus et satisfaction — C3.4.1

B3-A06 distingue les faits techniques, les comptes rendus reconstitués et les
éléments à obtenir après démonstration. Il planifie les points de validation,
présente les évolutions et décisions, fournit une grille de test utilisateur et
définit SAT-01 à SAT-07.

État actuel :

- les versions, contrôles et décisions techniques sont traçables ;
- les comptes rendus destinés au jury ne prouvent pas des échanges client réels ;
- aucune enquête de satisfaction ni validation commanditaire réelle n'est
  renseignée au 2026-09-07 ;
- une validation doit mentionner version, SHA, périmètre, réserves, décision,
  rôle du validateur et date.

## 9. Registre des risques et décisions

| Risque actuel                      | Signal                                              | Maîtrise                                     | Décision                                              |
| ---------------------------------- | --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| Dépendances transitives            | 2 high + 1 low historiques ; audits courants à 0    | Correctif commité en `7fc5f01`               | Faire valider le commit par la CI distante            |
| Smoke E2E intermittent             | Historique 53/54 puis 1/1 ; courant 54/54 sérialisé | `workers=1`, traces et historique conservés  | Garder la série ; diagnostiquer avant le parallélisme |
| Continuité                         | Une seule personne couvre les chemins critiques     | ADR, runbooks, seed, documentation           | Organiser une passation réelle et un renfort          |
| Coûts non instrumentés             | Réel N/D                                            | Budget initial et seuils proposés            | Exporter consommations/factures et rapprocher le réel |
| Validation client absente          | SAT non renseignée                                  | B3-A06 prépare critères et compte rendu      | Faire tester puis recueillir décision et réserves     |
| Démonstration dépendante du réseau | IA/OAuth/production externes                        | Script, données préparées, local et captures | Répéter le plan A et le plan B                        |

Ordre courant décidé dans B3-A02 : CI du commit `7fc5f01`, coûts/charge,
passation, puis validation client.

## 10. Démonstration — C3.4.2

Le script `docs/rncp/bloc3-script-demo-logiciel.md` existe. Il est complété par
B3-A07, `docs/rncp/bloc3-annexes/B3-A07-demonstration-version-actuelle.md`, qui
regroupe la répétition datée, les neuf captures et les conditions de GO/NO-GO.

La démonstration doit :

1. annoncer `0.13.0-rc.8` et vérifier le SHA `d950b6b` ;
2. contrôler Web, liveness et readiness ;
3. montrer un parcours fonctionnel court avec un vocabulaire commanditaire ;
4. basculer sur le plan B si IA, OAuth ou réseau bloque ;
5. présenter les captures comme secours, jamais comme preuve d'un live ;
6. demander une validation explicite avec la réserve de CI du correctif et les
   limites non techniques.

## 11. Gate de présentation au jury

| Contrôle   | Référence actuelle                             | Condition d'annonce                                     |
| ---------- | ---------------------------------------------- | ------------------------------------------------------- |
| Baseline   | `0.13.0-rc.8` / `d950b6b`                      | Vérifier à nouveau avant oral                           |
| Tests      | 261/261                                        | Donner date et SHA                                      |
| Couverture | Shared 100 %, API 89,72 %, Web 77,32 % lignes  | Ne pas confondre avec couverture fonctionnelle complète |
| Production | 150/150, p95 max 246,42 ms                     | Dire « mesure bornée », pas SLA/test de charge          |
| Audit      | 0 complet / 0 production après overrides       | Dire « vert local, CI du correctif attendue »           |
| E2E        | 54/54 avec `workers=1`; historique 53/54 + 1/1 | Ne pas prétendre que le parallélisme est corrigé        |
| Client     | Aucun score/avis réel                          | Recueillir via B3-A06                                   |
| A07        | Présente et contrôlée                          | Rejouer la gate J-2 et recueillir la validation réelle  |

## 12. Limites probatoires à conserver

- planning initial incomplet et charges en partie reconstruites ;
- absence de timesheets, de factures et de coûts réels rapprochés ;
- projet solo, sans management, délégation ou recrutement réellement exécuté ;
- aucune formation du plan présentée comme suivie ;
- absence de validation et de satisfaction client réelles ;
- campagne production ponctuelle, sans garantie de disponibilité future ;
- correctif audit rattaché au commit `7fc5f01`, sans CI distante à ce stade ;
- échec E2E parallèle historique conservé, cause de concurrence non supprimée ;
- anciennes métriques de mai utiles comme histoire, non comme état actuel.

## Conclusion Bloc 3

Le dossier couvre désormais les sept compétences du Bloc 3 au moyen d'annexes
spécialisées et reliées. La preuve technique actuelle est solide sur les tests,
la couverture et la campagne de production. Les vulnérabilités sont remédiées
localement et le smoke sérialisé est à 54/54. La décision de gel reste
conditionnelle à une CI distante verte sur `7fc5f01` ; la concurrence E2E, la
continuité à une personne et l'absence de validation client restent des limites
actives, pas des preuves à masquer.
