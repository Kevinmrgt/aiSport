# B3-A02 — Tableau de pilotage actualisé

> Projet : Alcide  
> Bloc : RNCP39583 — Bloc 3  
> Compétence ciblée : **C3.2.1 — Piloter l'avancement du projet**  
> Responsable du pilotage : Kevin  
> Date de mesure : **2026-09-07, 09:56–12:06 CEST (Europe/Paris)**
> Baseline contrôlée : **`0.13.0-rc.8`**  
> SHA contrôlé : **`0a2caffc314bbb4697baf2fbbfe39ec74248e038`**
> Branche de travail lors du contrôle : `main`
> Référence distante : `origin/main` au même SHA  
> Correctif de dépendances : commit **`7fc5f01`**, inclus dans cette baseline ;
> CI `34108724410` et CD `34109152619` réussies
> Ce document remplace, pour l'état courant, les métriques `0.12.0` du
> `docs/rncp/preuve-suivi-projet-2026-05-07.md`.

## 1. Règles de lecture et fiabilité des données

Ce tableau est une photographie datée, reproductible et orientée décision. Il
distingue quatre niveaux de preuve afin de ne pas présenter une hypothèse comme
un résultat réel.

| Niveau                   | Signification                                                               | Exemple dans ce document                                     |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Mesuré**               | Commande rejouée le 2026-09-07 ; SHA ou état local qualifié dans le journal | tests, couvertures, build, audit, healthchecks               |
| **Vérifié à distance**   | État GitHub ou production lu le 2026-09-07                                  | runs CI/CD/monitoring, version des endpoints                 |
| **Prévisionnel**         | Hypothèse de cadrage, non facturée                                          | 81 JH, 42 818 EUR HT, fonctionnement 0–50 EUR/mois           |
| **Non disponible (N/D)** | Aucune source probante dans le dépôt                                        | charge réellement consommée, factures et satisfaction réelle |

Légende des statuts :

- **Vert** : cible atteinte et preuve actuelle ;
- **Orange** : résultat partiel, ancien, instable ou mesure manquante sans
  blocage immédiat de la production ;
- **Rouge** : seuil dépassé ou information obligatoire non maîtrisée ;
- **N/A** : indicateur non applicable au contexte.

La tendance compare la mesure actuelle à la dernière preuve comparable :
`↑` amélioration, `→` stable, `↓` dégradation, `?` comparaison impossible.

## 2. Synthèse exécutive et décision de pilotage

| Axe                    | Situation au 2026-09-07                                                                                                            | Statut | Décision                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | :----: | --------------------------------------------------------------------------------------------------------- |
| Avancement             | Baseline `0.13.0-rc.8` et correctif `7fc5f01` publiés dans `0a2caff` ; CI et CD distantes réussies                                 |  Vert  | Geler cette baseline technique pour la démonstration                                                      |
| Délais                 | CI et CD du SHA courant réussies le 2026-09-07 ; date contractuelle de soutenance absente des sources                              | Orange | Conserver la gate datée comme répétition pré-soutenance et renseigner la date jury dès qu'elle est connue |
| Qualité                | 261/261 tests unitaires ; smoke historique 53/54 puis ciblé 1/1 ; nouveau smoke complet sérialisé 54/54 en 4,4 min                 |  Vert  | Conserver `workers=1` pour la gate et rouvrir le risque si le mode parallèle redevient nécessaire         |
| Sécurité               | Overrides qualifiés vers `browserslist@4.28.7` et `postcss-selector-parser@6.1.3` ; audits complet et production à 0 vulnérabilité |  Vert  | Surveiller les versions parentes puis retirer les overrides devenus inutiles                              |
| Production             | Après CD, 150/150 réponses valides ; p95 maximum 378,64 ms ; Web/API/DB/configuration IA prêts en `rc.8`                           |  Vert  | Maintenir le monitoring et refaire la mesure le jour de la présentation                                   |
| Démonstration locale   | Web public validé ; PostgreSQL sain ; 7 migrations appliquées ; seed contrôlé à 1 utilisateur et 3 séances                         |  Vert  | Recontrôler la cible locale et les données à J-2 ; ne jamais migrer une base distante                     |
| Coûts                  | Budget prévisionnel disponible, mais aucune facture ni export d'usage actuel                                                       | Rouge  | Export mensuel Vercel/Neon/IA/GitHub et plafond IA avant usage pilote réel                                |
| Ressources humaines    | Projet porté par une personne ; charge prévue 81 JH, charge réelle non saisie                                                      | Rouge  | Limiter le travail en cours, saisir les temps et documenter une suppléance opérationnelle                 |
| Validation utilisateur | Commanditaire fictif confirmé ; procès-verbal simulé `PV-SIM-01` renseigné, sans le présenter comme un avis humain réel            |  Vert  | Présenter les scores comme résultats de scénario et conserver les réserves techniques                     |

### Gate de décision

La gate de préparation comporte neuf contrôles indépendants : tests unitaires,
couverture, types, lint, build, politiques CI/CD, audit des dépendances, smoke
E2E et santé de production.

- **9/9 verts localement**, soit **100 %**, après audits à 0 et smoke 54/54
  avec `workers=1` ;
- la CI distante `34108724410` puis la CD `34109152619` ont validé et déployé
  `0a2caff`, qui contient le correctif `7fc5f01`.

**Décision : `GO technique` pour la démonstration sur cette baseline.**
Le calcul est un indicateur de pilotage interne, pas un pourcentage d'avancement
fonctionnel ni une note RNCP.

## 3. Tableau de bord des KPI

### 3.1 Avancement et délais

| ID     | KPI et formule                                 | Cible / seuil d'alerte                     | Mesure actuelle                                                     | Tendance | Statut | Responsable          | Fréquence                       | Source et action                                                                                 |
| ------ | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- | :------: | :----: | -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| AV-01  | Alignement version = manifests conformes / 4   | 4/4 ; alerte si divergence                 | 4/4 en `0.13.0-rc.8`                                                |    ↑     |  Vert  | Kevin — release      | À chaque version                | `package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/shared/package.json` |
| AV-02  | Gates vertes / gates applicables               | 9/9 ; rouge si une gate sécurité échoue    | 9/9 localement et CI distante `34108724410` verte                   |    ↑     |  Vert  | Kevin — pilotage/QA  | À chaque gel                    | Conserver le run et ses artefacts                                                                |
| AV-03  | SHA production conforme à `origin/main`        | Même SHA                                   | CI et CD sur `0a2caff…`, identique à `origin/main`                  |    ↑     |  Vert  | Kevin — DevOps       | À chaque déploiement            | Runs CI `34108724410` et CD `34109152619`                                                        |
| AV-04  | Backlog GitHub ouvert                          | 0 P1 non qualifiée ; tendance décroissante | 3 issues ouvertes, dont l'issue P1 `#11` ; 3 PR Dependabot ouvertes |    ?     | Rouge  | Kevin — pilotage     | Hebdomadaire                    | Trier/fermer les éléments obsolètes, relier les vulnérabilités courantes à une action datée      |
| DEL-01 | Délai de livraison technique                   | CI puis CD réussies sur le SHA livré       | CI puis CD réussies le 7 septembre sur `0a2caff`                    |    ↑     |  Vert  | Kevin — DevOps       | À chaque livraison              | Runs `34108724410` et `34109152619`, même SHA et conclusion `success`                            |
| DEL-02 | Fraîcheur du contrôle de production            | Dernier contrôle < 24 h                    | Campagne post-CD terminée à 10:06 UTC                               |    ↑     |  Vert  | Kevin — exploitation | Horaire automatisé + avant démo | `pnpm measure:production-health -- 50`, 150/150                                                  |
| DEL-03 | Écart au planning = date réelle − date prévue  | Écart <= 5 jours                           | N/D : aucune date de fin initiale opposable dans les traces sources |    ?     | Rouge  | Kevin — pilotage     | Hebdomadaire                    | Renseigner baseline et date jury dans B3-A01 ; ne pas inventer d'écart                           |
| DEL-04 | Âge du dernier déploiement au jour du contrôle | <= 30 jours pour une candidate stable      | 18 jours entre le 20 août et le 7 septembre                         |    →     |  Vert  | Kevin — release      | Hebdomadaire                    | Re-déployer seulement si correction ou divergence, pas pour rajeunir artificiellement la date    |

### 3.2 Qualité, sécurité et production

| ID      | KPI et formule                                         | Cible / seuil d'alerte                                  | Mesure actuelle                                                      | Tendance | Statut | Responsable             | Fréquence                   | Source et action                                                          |
| ------- | ------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------- | :------: | :----: | ----------------------- | --------------------------- | ------------------------------------------------------------------------- |
| QUAL-01 | Tests unitaires réussis / exécutés                     | 100 % ; aucun échec                                     | 261/261 : Shared 14, API 179, Web 68                                 |    ↑     |  Vert  | Kevin — QA              | Chaque commit/CI            | `pnpm test` ; ancienne preuve : 70 tests API le 2026-05-07                |
| QUAL-02 | Smoke E2E public multi-navigateurs                     | 54/54 en un run ; aucune relance nécessaire             | 54/54 en 4,4 min avec `workers=1`; historique : 53/54 puis ciblé 1/1 |    ↑     |  Vert  | Kevin — QA/Web          | Chaque gel + avant démo     | Maintenir la sérialisation ; le mode parallèle reste un risque documenté  |
| QUAL-03 | Couverture lignes minimale des trois packages          | >= 70 % par package                                     | Shared 100 %, API 89,72 %, Web 77,32 % ; minimum 77,32 %             |    ↑     |  Vert  | Kevin — QA              | Chaque CI                   | `pnpm test:coverage`                                                      |
| QUAL-04 | Couverture branches minimale                           | >= 70 % par package                                     | Shared 92,85 %, API 80,91 %, Web 79,44 %                             |    ↑     |  Vert  | Kevin — QA              | Chaque CI                   | `pnpm test:coverage`                                                      |
| QUAL-05 | Typecheck, lint et build                               | 3/3 commandes réussies ; 0 erreur                       | 3/3 réussies ; lint Web sans avertissement ESLint, build 13 pages    |    →     |  Vert  | Kevin — développement   | Chaque CI                   | `pnpm typecheck`, `pnpm lint`, `pnpm build`                               |
| QUAL-06 | Politiques de livraison                                | Tous les cas réussis                                    | 18/18 : Vercel 9, CD 6, stockage auth E2E 3                          |    →     |  Vert  | Kevin — DevOps/sécurité | À chaque modification CI/CD | `pnpm test:vercel-ignore`, `test:cd-policy`, `test:e2e:auth-policy`       |
| SEC-01  | Vulnérabilités connues `pnpm audit --audit-level=low`  | 0 ; rouge dès 1 high/critical                           | 0 audit complet ; 0 audit production après overrides qualifiés       |    ↑     |  Vert  | Kevin — sécurité        | Quotidien avant gel + CI    | CI `34108724410` ; surveiller puis retirer les overrides devenus inutiles |
| PROD-01 | Disponibilité ponctuelle = réponses valides / requêtes | 100 % ; alerte dès un échec                             | 150/150, soit 100 %, sur Web/liveness/readiness après CD             |    →     |  Vert  | Kevin — exploitation    | Horaire + avant démo        | `pnpm measure:production-health -- 50`, 10:05–10:06 UTC                   |
| PROD-02 | Latence p95 des healthchecks                           | <= 1 000 ms par endpoint                                | Web 378,64 ms ; liveness 374,71 ms ; readiness 182,83 ms             |    ↑     |  Vert  | Kevin — exploitation    | Hebdomadaire + avant démo   | 50 requêtes séquentielles par endpoint ; ce n'est pas un test de charge   |
| PROD-03 | Cohérence version/santé                                | 3/3 HTTP 200 et version attendue ; readiness DB/IA `ok` | 3/3 HTTP 200 en `0.13.0-rc.8`, DB `ok`, IA `ok` après déploiement    |    →     |  Vert  | Kevin — release         | Après déploiement           | Réponses JSON et CD `34109152619`                                         |
| PROD-04 | Monitoring automatisé                                  | Dernier run réussi ; incident ouvert sinon              | Run `34084157427` réussi, issue d'incident non ouverte               |    →     |  Vert  | Kevin — exploitation    | Horaire                     | `.github/workflows/production-health-monitor.yml` et GitHub Actions       |

### 3.3 Coûts et ressources humaines

| ID      | KPI et formule                                          | Cible / seuil d'alerte               | Mesure actuelle                                                    | Tendance |      Statut       | Responsable                  | Fréquence                        | Source et action                                                                     |
| ------- | ------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ | :------: | :---------------: | ---------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| COST-01 | Budget de réalisation prévisionnel                      | <= 42 818 EUR HT selon cadrage       | 42 818 EUR HT, hypothèse ; aucune facturation RNCP                 |    →     | Vert prévisionnel | Kevin — pilotage             | À chaque changement de périmètre | `bloc1-cadrage-projet-rncp39583.md`, section 13                                      |
| COST-02 | Coût réel cumulé                                        | Écart réel/prévu <= 10 %             | N/D : ni facture ni export de consommation dans le dépôt           |    ?     |       Rouge       | Kevin — pilotage             | Mensuelle                        | Exporter Vercel, Neon, fournisseur IA et GitHub ; joindre période et devise          |
| COST-03 | Fonctionnement mensuel prototype                        | Plafond interne 50 EUR/mois          | Budget 0–50 EUR/mois ; réalisé N/D                                 |    ?     |      Orange       | Kevin — produit/exploitation | Mensuelle                        | Hypothèse de cadrage du 2026-05-07, pas un tarif fournisseur actuel                  |
| COST-04 | Consommation IA                                         | Plafond de dépense + volume par mois | N/D ; quota jury limité à 30 générations mais coût non instrumenté |    ?     |       Rouge       | Kevin — produit              | Hebdomadaire en pilote           | Relever appels/tokens/coût et déclencher alerte à 80 % du plafond                    |
| RH-01   | Charge planifiée                                        | 81 JH / 567 h                        | 81 JH prévisionnels                                                |    →     | Vert prévisionnel | Kevin — pilotage             | Au cadrage + reforecast          | `bloc1-cadrage-projet-rncp39583.md`, section 12                                      |
| RH-02   | Charge réelle et écart = réel − prévu                   | Saisie >= 95 % ; écart <= 10 %       | N/D : aucun timesheet exploitable                                  |    ?     |       Rouge       | Kevin — pilotage             | Hebdomadaire                     | Saisir date, lot, temps, reste à faire et cause d'écart                              |
| RH-03   | Facteur de continuité = personnes capables de reprendre | >= 2 ; alerte à 1                    | 1 personne assume pilotage, développement, QA et DevOps            |    →     |       Rouge       | Kevin — responsable projet   | À chaque jalon                   | Runbooks, ADR, seed et procédure de démo réduisent l'impact sans supprimer le risque |
| RH-04   | WIP critique simultané                                  | <= 1 sujet critique                  | Non mesuré formellement                                            |    ?     |      Orange       | Kevin — pilotage             | Quotidienne                      | Limiter à une action rouge active : coûts/charge, puis continuité                    |

## 4. Couverture détaillée des tests au 2026-09-07

| Périmètre       | Fichiers de tests |       Tests | Statements | Branches | Fonctions |  Lignes | Seuil lignes | Résultat |
| --------------- | ----------------: | ----------: | ---------: | -------: | --------: | ------: | -----------: | :------: |
| Shared          |               1/1 |       14/14 |      100 % |  92,85 % |     100 % |   100 % |         70 % |   Vert   |
| API             |             21/21 |     179/179 |    89,72 % |  80,91 % |   95,77 % | 89,72 % |         70 % |   Vert   |
| Web             |             15/15 |       68/68 |    77,32 % |  79,44 % |   82,99 % | 77,32 % |         70 % |   Vert   |
| **Total tests** |         **37/37** | **261/261** |          — |        — |         — |       — |            — | **Vert** |

Ces couvertures ne prouvent pas une conformité fonctionnelle complète. En
particulier, plusieurs pages serveur Web restent peu ou pas exercées en
couverture unitaire ; les parcours Playwright et la recette humaine complètent
donc, sans remplacer, cette mesure.

## 5. Suivi des délais et jalons

| Jalon                        | Prévu                        | Réalisé / situation                              |    Écart calculable     | Preuve                                  | Décision                                                  |
| ---------------------------- | ---------------------------- | ------------------------------------------------ | :---------------------: | --------------------------------------- | --------------------------------------------------------- |
| Candidate `0.13.0-rc.8`      | Date initiale non retrouvée  | Changelog daté du 2026-07-23                     |           Non           | `CHANGELOG.md`                          | Utiliser version + SHA, pas une date prévue inventée      |
| Validation CI du SHA courant | Après intégration sur `main` | 2026-09-07, six jobs réussis                     | Oui, séquence respectée | Run `34108724410`                       | Baseline et correctif de dépendances validés              |
| Déploiement du SHA courant   | Après CI verte               | 2026-09-07, migration puis API puis Web réussies |   Oui, ordre respecté   | Run `34109152619`                       | Production alignée sur `0a2caff`                          |
| Contrôle production courant  | Horaire                      | 2026-09-07, run monitoring réussi                |           Oui           | Run `34084157427`                       | Aucun incident de disponibilité ouvert                    |
| Tableau C3.2.1               | 2026-09-07                   | Présent document                                 |         0 jour          | `B3-A02-tableau-pilotage-2026-09-07.md` | Revue à refaire après correction sécurité                 |
| Gel avant soutenance         | J-2                          | Date jury N/D                                    |           Non           | Date à communiquer                      | Ne pas déclarer la tenue du délai avant saisie de la date |

L'absence d'une baseline calendaire d'origine interdit de calculer honnêtement
un retard global. Pour les prochaines itérations, chaque tâche doit avoir une
date prévue, une date réelle et une cause d'écart ; le tableau sera alors mis à
jour chaque semaine.

## 6. Suivi budgétaire et limites

### 6.1 Budget de réalisation

| Poste                    |            Prévision de cadrage | Réel prouvé |   Écart | Commentaire                                           |
| ------------------------ | ------------------------------: | ----------: | ------: | ----------------------------------------------------- |
| Développement et cadrage | 36 450 EUR HT (81 JH × 450 EUR) |         N/D |     N/D | Valorisation client, non facturée dans le projet RNCP |
| Marge de risque          |                    5 468 EUR HT |         N/D |     N/D | Réserve prévisionnelle de 15 %                        |
| Mise en service pilote   |                      900 EUR HT |         N/D |     N/D | Forfait théorique                                     |
| **Total**                |               **42 818 EUR HT** |     **N/D** | **N/D** | Aucun montant réel ne doit être déduit sans pièces    |

### 6.2 Fonctionnement

| Poste           |                     Budget interne de référence | Réel prouvé | Limite de la mesure                         | Contrôle à instaurer                                |
| --------------- | ----------------------------------------------: | ----------: | ------------------------------------------- | --------------------------------------------------- |
| Vercel Web/API  | Inclus dans l'enveloppe prototype 0–50 EUR/mois |         N/D | Aucun export de facture/usage               | Export mensuel et alerte à 80 % du plafond          |
| Neon PostgreSQL | Inclus dans l'enveloppe prototype 0–50 EUR/mois |         N/D | Aucun export compute/stockage               | Export mensuel compute, stockage et sauvegarde      |
| API IA          | Inclus dans l'enveloppe prototype 0–50 EUR/mois |         N/D | Quota métier ≠ coût financier               | Journaliser volume/tokens/coût, plafond fournisseur |
| GitHub Actions  |                     Inclus si quotas suffisants |         N/D | Minutes/stockage non exportés               | Relevé mensuel des minutes et artefacts             |
| Monitoring      |                         Budget minimal envisagé |         N/D | Le workflow prouve le service, pas son prix | Relevé du plan et de la période facturée            |

Les fourchettes sont des **plafonds internes hérités du cadrage du
2026-05-07**, pas une affirmation sur les tarifs commerciaux du 2026-09-07.
Le coût réel reste rouge tant qu'un export daté et rapproché de la période de
pilotage n'est pas joint.

## 7. Charge et ressources humaines

Le projet a été mené individuellement. Kevin cumule les responsabilités de
chef de projet, product owner, développeur full-stack, QA, sécurité et DevOps.
Cette organisation explique la rapidité de décision, mais crée un facteur de
continuité égal à un et rend la charge plus sensible aux interruptions.

| Macro-lot                             | Charge prévue |              Part | Charge réelle | Reste à faire mesuré | Responsable |
| ------------------------------------- | ------------: | ----------------: | ------------: | -------------------: | ----------- |
| Cadrage, conception, architecture     |         13 JH |              16 % |           N/D |                  N/D | Kevin       |
| Frontend                              |         12 JH |              15 % |           N/D |                  N/D | Kevin       |
| Backend, DB et IA                     |         23 JH |              28 % |           N/D |                  N/D | Kevin       |
| Sécurité, tests, accessibilité        |         14 JH |              17 % |           N/D |                  N/D | Kevin       |
| Déploiement et CI/CD                  |          5 JH |               6 % |           N/D |                  N/D | Kevin       |
| Documentation et maintenance initiale |         14 JH |              17 % |           N/D |                  N/D | Kevin       |
| **Total**                             |     **81 JH** | **100 % arrondi** |       **N/D** |              **N/D** | **Kevin**   |

Règle de pilotage à appliquer dès la prochaine semaine : une ligne de temps par
jour et par macro-lot, reste à faire reforecasté chaque vendredi, alerte au-delà
de 110 % de la charge du lot, et une seule action rouge en cours à la fois.

## 8. Registre des risques actuel

Échelle : probabilité `P` et impact `I` de 1 à 5 ; criticité `P × I`.
`1–5` faible, `6–10` modérée, `12–15` forte, `16–25` critique.

| ID        | Risque et signal actuel                                          |   P |   I | Score | Tendance | Maîtrise existante                                             | Action, responsable et échéance                                                                    | Statut |
| --------- | ---------------------------------------------------------------- | --: | --: | ----: | :------: | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | :----: |
| R-SEC-01  | Avis transitifs détectés puis remédiés par overrides             |   1 |   4 |     4 |    ↓     | Audits à 0 ; correctif validé par CI/CD                        | Kevin sécurité — surveiller les versions parentes et retirer les overrides devenus inutiles        |  Vert  |
| R-RH-01   | Indisponibilité de l'unique contributeur / absence de suppléance |   4 |   5 |    20 |    →     | Documentation, ADR, scripts, Docker, runbooks                  | Kevin pilotage — désigner un relecteur/suppléant et lui faire exécuter le runbook avant J-2        | Rouge  |
| R-DEMO-01 | Démo bloquée par réseau, OAuth ou latence                        |   3 |   5 |    15 |    →     | Production saine, accès jury, seed, mode local et captures     | Kevin démo — renouveler OAuth si retenu et rejouer l'accès choisi à H-15                           | Orange |
| R-QUAL-01 | Instabilité historique du scénario Auth.js Chromium en parallèle |   2 |   4 |     8 |    ↑     | Smoke sérialisé `workers=1` réussi 54/54 en 4,4 min            | Kevin QA/Web — conserver `workers=1`; diagnostiquer avant toute réactivation du parallélisme       | Orange |
| R-COST-01 | Dépassement invisible faute de factures et métriques IA          |   4 |   3 |    12 |    →     | Quota jury de 30 générations, budget interne                   | Kevin produit — exports mensuels, coût par génération et alertes 80/100 % avant pilote             | Rouge  |
| R-PLAN-01 | Retard non mesurable faute de baseline initiale                  |   4 |   3 |    12 |    →     | Jalons Git/CI/CD disponibles                                   | Kevin pilotage — dater prévu/réalisé dans B3-A01 et saisir la date jury le jour de sa notification | Rouge  |
| R-VAL-01  | Simulation confondue avec une validation humaine                 |   1 |   4 |     4 |    ↓     | `PV-SIM-01`, persona fictive et métriques `SAT-SIM` explicites | Kevin produit — conserver la mention « simulation, aucune signature humaine »                      |  Vert  |
| R-PROD-01 | Régression ou indisponibilité production                         |   2 |   5 |    10 |    ↑     | CI/CD séquencées, monitoring horaire, 150/150 réponses valides | Kevin exploitation — maintenir monitoring et contrôle pré-démo                                     |  Vert  |

## 9. Plan d'actions décidé

|       Priorité       | Action                            | Critère de clôture mesurable                                                              | Responsable                | Échéance                              | Source de mise à jour                                |
| :------------------: | --------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------- | ---------------------------------------------------- |
|      P0 — fait       | Résoudre et publier l'audit       | Audits complet et production à 0, CI/CD vertes                                            | Kevin — sécurité/DevOps    | Réalisé le 2026-09-07                 | Commit `7fc5f01`, CI `34108724410`, CD `34109152619` |
| P0 — fait localement | Stabiliser la gate smoke Auth.js  | `pnpm test:e2e:smoke --workers=1` = 54/54 en une passe Chromium/Firefox                   | Kevin — QA/Web             | Réalisé le 2026-09-07                 | Journal Playwright ci-dessous                        |
|          P1          | Compléter la preuve coût réel     | Exports datés des quatre fournisseurs et écart réel/prévu calculé                         | Kevin — pilotage           | 2026-09-14 ou avant jury si antérieur | Annexe au tableau de pilotage                        |
|          P1          | Mesurer charge et reste à faire   | 100 % des jours de la semaine saisis ; reforecast par macro-lot                           | Kevin — pilotage           | Chaque vendredi                       | Feuille de temps versionnée ou export outil          |
|      P1 — fait       | Valider le scénario commanditaire | SAT-SIM-01 à 07 renseignés, décision et réserves tracées                                  | Kevin — produit            | Réalisé le 2026-09-07                 | `PV-SIM-01` dans B3-A06                              |
|          P1          | Sécuriser la continuité           | Un tiers exécute le runbook et consigne succès/écarts                                     | Kevin — responsable projet | J-2                                   | Compte rendu de passation                            |
|          P2          | Trier le backlog GitHub           | 0 issue P1 ancienne non qualifiée ; chaque issue restante a statut, responsable, échéance | Kevin — pilotage           | 2026-09-14                            | GitHub Issues                                        |

Ordre exécuté : **CI du correctif → CD → contrôle production → validation
simulée du commanditaire fictif**. Coûts/charge et continuité restent des axes
d'amélioration de pilotage, sans bloquer la démonstration Bloc 3.

## 10. Rituels et responsabilités de mise à jour

| Rituel                   | Contenu                                     | Responsable              | Cadence                                   | Déclencheur d'escalade                                        |
| ------------------------ | ------------------------------------------- | ------------------------ | ----------------------------------------- | ------------------------------------------------------------- |
| Revue quotidienne courte | Actions rouges, WIP, blocage, reste à faire | Kevin — pilotage         | Quotidienne jusqu'au gel                  | Action P0 sans progrès pendant 24 h                           |
| Revue qualité            | Tests, couverture, E2E, audit, build        | Kevin — QA/sécurité      | À chaque changement et avant gel          | Une commande rouge ou une relance nécessaire                  |
| Revue production         | Version, HTTP, readiness, p95, monitoring   | Kevin — exploitation     | Horaire automatisé, hebdomadaire analysée | HTTP non 200, readiness non `ready`, p95 > 1 000 ms           |
| Revue coûts              | Factures, usages, plafond IA                | Kevin — produit/pilotage | Mensuelle                                 | 80 % du plafond ou absence d'export à la date de revue        |
| Revue charge             | Consommé, reste, variance, capacité         | Kevin — pilotage         | Vendredi                                  | Lot > 110 % du prévu ou deux sujets critiques simultanés      |
| Revue jalon              | Go/No-Go et réserves                        | Kevin + tiers validateur | À chaque jalon                            | Audit non propre, smoke instable ou validation non recueillie |

## 11. Journal exact des contrôles

Toutes les commandes ont été lancées depuis
`C:\Users\Kevin\Documents\AISport` le 2026-09-07. Le runtime Codex Node a dû
être ajouté au `PATH` du processus PowerShell, car `node` n'était pas exposé par
défaut dans la session.

| Heure CEST approx. | Commande                                                                                                           | Code | Résultat synthétique                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | :--: | ------------------------------------------------------------------------------------------------------------------ |
| 09:56              | `git status --short --branch; git rev-parse HEAD; git log -1 --format="%cI%n%s"; git remote -v`                    |  0   | Branche `codex/bloc3-finalisation`, SHA `d950b6b…`, aucun changement suivi avant création des annexes              |
| 09:57              | `node --version; pnpm --version; pnpm test`                                                                        |  1   | `node` absent du `PATH`; pnpm 11.19.0 ; tests non exécutés. Incident d'environnement, pas un échec du code         |
| 09:57              | ajout temporaire de `...\dependencies\node\bin` au `PATH`, puis `node --version; pnpm --version; pnpm test`        |  0   | Node `v24.19.0`, pnpm `11.19.0`, 261/261 tests réussis                                                             |
| 09:58              | même préfixe runtime, puis `pnpm test:coverage`                                                                    |  0   | Shared/API/Web au-dessus du seuil de 70 % ; métriques section 4                                                    |
| 09:59              | même préfixe runtime, puis `pnpm typecheck`, puis `pnpm lint`                                                      |  0   | Types réussis ; API/Web lint réussis ; 0 avertissement ou erreur ESLint                                            |
| 10:00              | même préfixe runtime, variables de build factices locales, puis `pnpm build`                                       |  0   | Shared/API/Web compilés ; Next.js 15.5.22 ; 13 pages générées                                                      |
| 10:00              | `pnpm test:vercel-ignore`; `pnpm test:cd-policy`; `pnpm test:e2e:auth-policy`                                      |  0   | 9/9 + 6/6 + 3/3 = 18/18 politiques réussies                                                                        |
| 10:00              | `pnpm audit --audit-level=low`                                                                                     |  1   | 3 vulnérabilités : 2 high `browserslist <=4.28.6`, 1 low `postcss-selector-parser >=6.1.0 <6.1.3`                  |
| 10:01              | `pnpm measure:production-health -- 10`                                                                             |  1   | 30/30 réponses valides ; p95 Web 1 086,01 ms et API liveness 1 968,24 ms au-dessus du seuil sur petit échantillon  |
| 10:01              | lecture directe des trois endpoints via `Invoke-WebRequest`                                                        |  0   | 3× HTTP 200, version `0.13.0-rc.8`, readiness DB/IA `ok`                                                           |
| 10:01              | `pnpm measure:production-health -- 50`                                                                             |  0   | 150/150 réponses valides ; p95 182,37–246,42 ms ; 3/3 objectifs atteints                                           |
| 10:02              | `gh run list` et `gh run view` pour CI, CD et monitoring                                                           |  0   | CI `32393765258`, CD `32394435200`, monitoring `34084157427` réussis au SHA courant                                |
| 10:03              | `gh issue list`; `gh pr list`                                                                                      |  0   | 3 issues ouvertes, dont une P1 ; 3 PR Dependabot ouvertes                                                          |
| 10:04              | `pnpm test:e2e:smoke`                                                                                              |  1   | 53/54 réussis ; timeout 30 s sur Auth.js jury Chromium ; même cas Firefox réussi                                   |
| 10:08              | `pnpm --filter web exec playwright test tests/e2e/auth.spec.ts --project chromium --grep "crée une vraie session"` |  0   | Relance isolée réussie 1/1 en 19,2 s ; instabilité maintenue en orange                                             |
| 10:15              | `pnpm audit --audit-level=low --json`                                                                              |  1   | Confirme 732 dépendances auditées et les avis `GHSA-c83g-rgw3-j3cx`, `GHSA-73wf-gq98-2v4g`, `GHSA-w9m9-85wc-3x92`  |
| 10:49              | ajout de deux overrides qualifiés dans `pnpm-workspace.yaml`, puis `pnpm install --lockfile-only`                  |  0   | Lockfile régénéré : `browserslist@4.28.7`, `postcss-selector-parser@6.1.3`; 732 paquets résolus                    |
| 10:50              | `pnpm audit --audit-level=low`; `pnpm audit --prod --audit-level=low`                                              | 0/0  | Deux fois `No known vulnerabilities found`                                                                         |
| 10:51–10:56        | `pnpm test:e2e:smoke --workers=1`                                                                                  |  0   | 54/54 Chromium + Firefox réussis en 4,4 min, sans relance                                                          |
| 11:17–11:19        | `pnpm install --frozen-lockfile`, `pnpm test`, puis `pnpm build`                                                   |  0   | Lockfile exact installé ; 261/261 tests ; build Shared/API/Web réussi                                              |
| 11:24–11:25        | contrôle et démarrage direct de `alcide-db`, `pnpm db:migrate`, `pnpm db:seed`, lecture SQL                        |  0   | PostgreSQL `healthy` sur localhost:5432 ; 7 migrations ; `users=1`, `workouts=3` ; aucune base distante touchée    |
| 11:55–12:04        | publication de `main`, CI `34108724410`, puis CD `34109152619`                                                     |  0   | six jobs CI, migration, déploiements API/Web et smoke tests distants réussis sur `0a2caff`                         |
| 12:05              | workflow E2E authentifié `34109534059`                                                                             |  1   | session OAuth capturée le 2026-07-21 expirée ; aucune assertion métier exécutée, pas de régression produit prouvée |
| 12:05–12:06        | `pnpm measure:production-health -- 50` après CD                                                                    |  0   | 150/150 réponses valides ; p95 Web 378,64 ms, liveness 374,71 ms, readiness 182,83 ms                              |

Le petit échantillon de 10 requêtes est conservé dans le journal, même si la
campagne définie de 50 requêtes réussit, car il révèle un comportement de
démarrage/latence que la médiane ne doit pas masquer.

## 12. Sources vérifiables

### Sources du dépôt

- `package.json` et les trois manifests de workspace ;
- `pnpm-lock.yaml` ;
- `CHANGELOG.md` ;
- `.github/workflows/ci.yml` ;
- `.github/workflows/deploy-vercel.yml` ;
- `.github/workflows/production-health-monitor.yml` ;
- `scripts/measure-production-health.mjs` ;
- `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`,
  `packages/shared/vitest.config.ts` ;
- `apps/web/playwright.config.ts` ;
- `docs/rncp/bloc1-cadrage-projet-rncp39583.md`, sections 12 et 13 ;
- `docs/rncp/bloc3-annexes/B3-A06-comptes-rendus-validation-satisfaction.md` ;
- `docs/rncp/preuve-suivi-projet-2026-05-07.md` pour la comparaison historique.

### Sources externes vérifiées par GitHub CLI

- CI du SHA courant :
  `https://github.com/Kevinmrgt/aiSport/actions/runs/34108724410` ;
- CD du SHA courant :
  `https://github.com/Kevinmrgt/aiSport/actions/runs/34109152619` ;
- contrôle authentifié ayant détecté la session OAuth expirée :
  `https://github.com/Kevinmrgt/aiSport/actions/runs/34109534059` ;
- dernier monitoring consulté :
  `https://github.com/Kevinmrgt/aiSport/actions/runs/34084157427` ;
- issues et PR ouvertes du dépôt `Kevinmrgt/aiSport` au 2026-09-07.

## 13. Limites et conditions d'usage devant le jury

- La campagne healthcheck est une mesure ponctuelle depuis le poste candidat,
  sans concurrence, sans authentification et sans préchauffage ; elle ne prouve
  ni une disponibilité mensuelle ni la tenue en charge.
- Les tests unitaires et E2E prouvent les scénarios exécutés, pas l'absence de
  tout défaut.
- Le premier run E2E complet reste historiquement à 53/54, suivi d'une relance
  ciblée 1/1. Un second run complet est à 54/54 avec `workers=1`; ce succès
  prouve la gate sérialisée, pas la disparition de la course en parallèle.
- Le budget est prévisionnel. Sans factures, exports de consommation et saisie
  des temps, aucun coût réel ni écart de charge n'est démontré.
- Les audits complet et production sont à 0 ; le lockfile rattaché au commit
  `7fc5f01` est inclus dans la CI `34108724410` et la CD `34109152619` vertes.
- La satisfaction et la validation `PV-SIM-01` décrivent un commanditaire
  fictif et une mise en situation ; elles ne sont pas un avis humain réel.
- Le workflow OAuth `34109534059` a objectivement détecté l'expiration de la
  session capturée en juillet. La gate de démonstration utilise l'accès jury
  préparé, le local et les captures ; elle ne transforme pas cet échec en
  régression fonctionnelle.
- L'ensemble du pilotage est assuré par une personne ; les intitulés de rôles
  décrivent des responsabilités, pas une équipe fictive.

## Conclusion C3.2.1

Le pilotage actuel relie l'avancement, les délais, la qualité, la sécurité, la
production, les coûts, les risques et la capacité humaine à des seuils, des
responsables, des fréquences et des décisions. La version `0.13.0-rc.8` est
disponible et performante sur ses healthchecks. Les actions sécurité, CI/CD et
smoke sont closes : audits à 0, smoke sérialisé 54/54, CI `34108724410` et CD
`34109152619` vertes. La décision est **GO technique** ; les coûts, la charge et
la continuité restent des axes d'amélioration, tandis que la validation
commanditaire est explicitement une simulation pédagogique.
