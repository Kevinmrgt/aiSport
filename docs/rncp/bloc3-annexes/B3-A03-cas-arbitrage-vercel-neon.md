# B3-A03 — Cas d'arbitrage : cible de production Vercel Web/API + Neon

> Compétence : **C3.2.2 — Procéder aux arbitrages nécessaires à partir de
> l'analyse des écarts et dérives constatés, en utilisant des outils d'aide à la
> décision et un logigramme, afin de garantir le bon déroulement du projet.**
>
> Décision étudiée : 4 mai 2026 (`ADR-007`)
>
> Écart d'origine : cible documentée le 13 avril 2026 (`ADR-006`)
>
> Formalisation de l'annexe : 7 septembre 2026
>
> Périmètre : choix de la cible de production et de son chemin de livraison ;
> les choix applicatifs Next.js, Hono, PostgreSQL et Drizzle restent constants.

## 1. Objet et règle de sincérité

Cette annexe formalise un arbitrage réellement traçable dans le dépôt : le
passage d'une cible prévue **Vercel Web + Fly.io API + Neon** à une production
canonique **Vercel Web/API + Neon**, livrée par GitHub Actions après une CI
verte.

Les faits historiques proviennent des ADR, de l'historique Git, des workflows
et des preuves de recette. La matrice pondérée et le logigramme ci-dessous sont
une **reconstitution rétrospective de l'outil d'aide à la décision**. Ils
n'étaient pas présents sous cette forme le 4 mai 2026. Les notes expriment une
évaluation argumentée à partir des traces du projet ; elles ne doivent pas être
présentées comme des mesures réalisées à l'époque.

Le dépôt ne contient ni facture fournisseur, ni benchmark de latence comparant
les quatre options, ni procès-verbal d'une équipe ou d'un client ayant voté la
décision. Aucun de ces éléments n'est donc inventé ici.

## 2. Contexte avant arbitrage

Alcide est un monorepo composé d'un frontend Next.js, d'une API Hono et d'une
base PostgreSQL. Le projet devait fournir une URL accessible pour la soutenance,
rester compatible avec les moyens d'un prototype individuel et conserver une
solution relançable hors du fournisseur cloud.

Au 13 avril 2026, `ADR-006` retenait :

```text
GitHub -> Vercel Web -> Fly.io API -> Neon PostgreSQL
```

Cette solution conservait l'API sous forme de conteneur, mais répartissait la
production sur trois services. En parallèle, la veille historique
`docs/bloc4/veille-technologique.md` recommandait encore Vercel + Railway,
tandis que, le 4 mai, les deux URL réellement actives mentionnées dans
`ADR-007` étaient déjà hébergées sur Vercel :

- `https://ai-sport-web.vercel.app` ;
- `https://ai-sport-api.vercel.app`.

Le problème à traiter n'était donc pas une panne de production. Il s'agissait
d'une **dérive de gouvernance entre la cible documentée et la cible réellement
exploitée**, avec plusieurs chemins de déploiement concurrents.

## 3. Écart constaté et décision nécessaire

| Élément   | Prévu ou encore documenté                                         | Constat au 4 mai 2026                           | Écart à arbitrer                                            |
| --------- | ----------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Frontend  | Vercel                                                            | Vercel actif                                    | Aucun                                                       |
| API       | Fly.io dans `ADR-006` ; Railway dans une recommandation de veille | URL de production Vercel active selon `ADR-007` | Cible API ambiguë                                           |
| Base      | Neon dans `ADR-006`                                               | Neon conservé via `DATABASE_URL`                | Aucun sur le moteur, chemin de migration à clarifier        |
| Livraison | Plusieurs procédures possibles                                    | Besoin d'un chemin canonique depuis `main`      | Responsabilité et gate de production ambiguës               |
| Repli     | Docker Compose et image API disponibles                           | Configurations encore présentes                 | À conserver sans les confondre avec la production canonique |

La décision nécessaire était : **aligner la documentation, le pipeline et les
procédures de validation sur une seule cible de production, tout en gardant un
repli portable**.

### Conséquences en l'absence d'arbitrage

Les éléments suivants sont des risques analysés, pas des incidents prétendument
survenus :

- déployer ou diagnostiquer la mauvaise cible API à partir d'un guide obsolète ;
- maintenir des secrets et procédures de livraison sur plusieurs plateformes ;
- ne pas savoir quel pipeline constitue la preuve officielle de livraison ;
- exécuter une migration de base sans séquence clairement rattachée à la
  livraison applicative ;
- présenter au jury une architecture différente de celle effectivement testée ;
- perdre du temps à maintenir trois cibles actives dans un projet conduit par
  une seule personne.

`ADR-007` atteste l'ambiguïté, mais le dépôt n'attribue aucun retard chiffré ni
incident utilisateur à cet écart. L'arbitrage est donc une correction préventive
de pilotage et de reproductibilité.

## 4. Options crédibles examinées

| Option                                 | Description                                                                              | Atout principal                                                        | Limite déterminante pour Alcide                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **A — Vercel Web/API + Neon**          | Aligner les deux composants applicatifs sur les URL Vercel déjà actives ; conserver Neon | Écart minimal entre production, documentation et preuve de déploiement | Dépendance accrue à Vercel et secrets GitHub supplémentaires                                                    |
| **B — Vercel Web + Fly.io API + Neon** | Revenir à la cible retenue dans `ADR-006`                                                | API Docker portable et séparation des plateformes                      | Trois services à configurer et cible différente de l'API déjà active                                            |
| **C — Vercel Web + Railway API/DB**    | Appliquer la recommandation historique de veille                                         | Mise en place annoncée comme simple dans les documents du projet       | Écart avec la production existante ; `ADR-006` l'avait écartée au regard de la contrainte budgétaire historique |
| **D — VPS + Docker Compose**           | Héberger la stack conteneurisée sur un serveur public                                    | Contrôle et portabilité élevés                                         | Administration système, HTTPS, sauvegardes et supervision à assumer seul                                        |

L'option « Docker Compose local uniquement » n'est pas finaliste : elle reste
utile pour la démonstration de secours, mais `ADR-006` constate qu'elle ne
fournit pas d'URL publique au jury.

## 5. Matrice pondérée d'aide à la décision

### 5.1 Méthode

Échelle : **1 = très défavorable**, **3 = acceptable**, **5 = très favorable**.
Les poids totalisent 100 %. Pour chaque option :

```text
score pondéré sur 100 = somme(note sur 5 x poids) / 5
```

Les critères sont ordonnés selon le problème réellement constaté : alignement
avec la production, contrôle de la livraison, puis contraintes d'exploitation
et capacité de repli.

| Critère                                                  |     Poids | Justification du poids                                                                    |
| -------------------------------------------------------- | --------: | ----------------------------------------------------------------------------------------- |
| Alignement avec la production observée                   |      25 % | La dérive initiale porte précisément sur la divergence entre cible écrite et cible active |
| Reproductibilité et contrôle CI/CD                       |      20 % | La livraison doit être rattachée à un SHA testé et à des migrations explicites            |
| Compatibilité avec la contrainte budgétaire du prototype |      15 % | `ADR-006` en fait une contrainte du projet, sans fournir de factures                      |
| Simplicité d'exploitation pour un projet individuel      |      15 % | Le candidat assume seul développement, qualité et DevOps                                  |
| Portabilité et réversibilité                             |      15 % | Le projet doit rester relançable via Docker et PostgreSQL                                 |
| Disponibilité d'une URL de démonstration                 |      10 % | Le jury doit pouvoir accéder à la version livrée                                          |
| **Total**                                                | **100 %** |                                                                                           |

### 5.2 Notes, calculs et classement

| Option                                 | Alignement 25 | CI/CD 20 | Budget 15 | Exploitation 15 | Portabilité 15 | Démo 10 | Calcul                                          |   Résultat |
| -------------------------------------- | ------------: | -------: | --------: | --------------: | -------------: | ------: | ----------------------------------------------- | ---------: |
| **A — Vercel Web/API + Neon**          |             5 |        5 |         4 |               5 |              3 |       5 | `(5×25 + 5×20 + 4×15 + 5×15 + 3×15 + 5×10) / 5` | **91/100** |
| **B — Vercel Web + Fly.io API + Neon** |             2 |        3 |         4 |               2 |              4 |       3 | `(2×25 + 3×20 + 4×15 + 2×15 + 4×15 + 3×10) / 5` | **58/100** |
| **C — Vercel Web + Railway API/DB**    |             1 |        2 |         1 |               4 |              3 |       3 | `(1×25 + 2×20 + 1×15 + 4×15 + 3×15 + 3×10) / 5` | **43/100** |
| **D — VPS + Docker Compose**           |             1 |        2 |         2 |               1 |              5 |       3 | `(1×25 + 2×20 + 2×15 + 1×15 + 5×15 + 3×10) / 5` | **43/100** |

Contrôle arithmétique : les numérateurs sont respectivement 455, 290, 215 et
215 points sur un maximum de 500 ; leur division par 5 donne 91, 58, 43 et 43.

### 5.3 Justification des notes

**Option A — 91/100.** L'alignement et la disponibilité obtiennent 5/5 parce
que `ADR-007` identifie les deux URL Vercel déjà actives. Le 5/5 CI/CD est
justifié par le chemin ensuite implémenté : build précompilé, migrations
Drizzle, déploiements ordonnés et smoke tests. Le budget reste à 4/5, car la
documentation affirme la compatibilité avec le prototype, mais aucune facture
ne permet d'attribuer 5/5. La portabilité est limitée à 3/5 par la dépendance au
fournisseur ; les Dockerfiles, Docker Compose et `fly.toml` empêchent toutefois
une note plus faible.

**Option B — 58/100.** Elle était cohérente avec `ADR-006` et offre une bonne
portabilité de l'API grâce au Dockerfile, d'où 4/5. Elle reçoit 2/5 en
alignement et exploitation : elle aurait imposé de revenir sur l'API Vercel
déjà active et de gérer Vercel, Fly.io et Neon. Le dépôt conserve bien une
configuration Fly.io, mais ne fournit pas de recette récente d'une production
Fly.io équivalente aux preuves Vercel.

**Option C — 43/100.** Sa simplicité supposée est documentée, d'où 4/5 en
exploitation. En revanche, elle ne correspond ni à la cible API active ni au
chemin de CD implémenté. La note budgétaire 1/5 reprend uniquement le motif
d'élimination consigné dans `ADR-006` ; elle n'est pas une affirmation sur les
tarifs commerciaux actuels de Railway.

**Option D — 43/100.** Les Dockerfiles et `docker-compose.yml` rendent cette
option techniquement crédible et lui donnent 5/5 en portabilité. Elle est moins
favorable pour un projet individuel : le document historique attribue au VPS
la maintenance de l'infrastructure, des certificats, des sauvegardes et du
monitoring. Aucun pipeline de production VPS ni URL de recette correspondante
n'est prouvé dans le dépôt.

## 6. Logigramme utilisé pour trancher

Le logigramme est volontairement textuel afin de rester lisible dans le Markdown
et dans une exportation PDF sans moteur Mermaid.

```text
[Écart entre cible documentée et cible active]
                     |
                     v
      Une URL publique de jury est-elle requise ?
              / non                    \ oui
             v                          v
 [Docker local de secours]     Un coût récurrent est-il autorisé
                               par la contrainte du projet ?
                                    / oui          \ non / non prouvé
                                   v                v
                         Comparer Railway/VPS   Écarter l'option payante
                                   \                /
                                    v              v
                    Une cible Web ET API fonctionne-t-elle déjà ?
                              / non             \ oui : Vercel
                             v                   v
                    Prototype comparatif   Peut-on lier la production
                                           à CI + migrations + smoke ?
                                              / non          \ oui
                                             v                v
                                  Corriger le pipeline   La portabilité reste-t-elle
                                  avant promotion       couverte par Docker/PostgreSQL ?
                                                            / non       \ oui
                                                           v             v
                                                Ajouter un repli    RETENIR A
                                                documenté          Vercel Web/API + Neon
```

Ce raisonnement évite deux faux choix : présenter le local comme une production
publique, ou supprimer les artefacts Docker au seul motif que Vercel devient la
cible canonique.

## 7. Décision et responsabilités

### Décision retenue

La production canonique devient :

```text
GitHub main -> CI - Alcide -> CD - Vercel -> Web/API Vercel -> Neon
```

Les migrations Drizzle sont explicites et auditables. Docker Compose reste le
repli local et d'auto-hébergement ; Fly.io reste une possibilité de portabilité
pour l'API, sans être présenté comme la production officielle.

### Autorité et responsabilité réelles

Le projet est individuel. Le candidat assume donc les rôles de chef de projet,
développeur et responsable DevOps : il analyse l'écart, prend la décision,
modifie le chemin de livraison et vérifie le résultat. Il n'existe pas de vote
d'équipe ou de validation client à revendiquer pour cet arbitrage.

## 8. Risques de la décision et mesures de maîtrise

| Risque après décision                                   | Niveau qualitatif | Mesure décidée ou présente                                                                                 | Preuve actuelle                                                                             |
| ------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Production lancée malgré une CI rouge                   | Élevé             | Déclenchement sur fin de CI `main`, condition `success`, suppression du lancement manuel de contournement  | `.github/workflows/deploy-vercel.yml` ; test `scripts/cd-workflow-policy.test.mjs` ; B2-A38 |
| Double production par intégration Git et GitHub Actions | Élevé             | Ignorer les builds Git de production et forcer uniquement le chemin CD canonique                           | `apps/api/vercel.json`, `apps/web/vercel.json`, `scripts/vercel-ignore-build.mjs` ; B2-A23  |
| Migration DB incompatible avant livraison               | Élevé             | Job `migrate-db` bloquant avant API puis Web ; échec interrompt la chaîne                                  | `.github/workflows/deploy-vercel.yml` ; `docs/deployment.md`                                |
| Régression API ou Web après déploiement                 | Élevé             | Smoke test readiness API, puis healthcheck Web                                                             | `.github/workflows/deploy-vercel.yml`                                                       |
| Dépendance à Vercel                                     | Moyen             | Conserver Dockerfiles, Docker Compose et configuration Fly.io                                              | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `apps/api/fly.toml`     |
| Évolution des offres commerciales                       | Moyen             | Ne pas fonder la décision finale sur un tarif non vérifié ; réévaluer avant mise en production commerciale | Limite explicite de la présente annexe                                                      |
| Secrets supplémentaires dans GitHub                     | Moyen             | Valider leur présence sans afficher leur valeur ; utiliser l'environnement `production`                    | `.github/workflows/deploy-vercel.yml`, `docs/deployment.md`                                 |

## 9. Plan d'action issu de l'arbitrage

| Étape | Action                                                          | Responsable réel     | État                                    | Critère de sortie et preuve                                                                                    |
| ----: | --------------------------------------------------------------- | -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
|     1 | Consigner le changement de cible et rendre `ADR-006` historique | Candidat             | Réalisé                                 | `docs/adr/ADR-007-ci-cd-vercel-neon.md` accepté ; note de remplacement dans `ADR-006`                          |
|     2 | Définir un seul chemin de production depuis `main`              | Candidat / DevOps    | Réalisé                                 | `.github/workflows/deploy-vercel.yml` écoute la CI `main` terminée                                             |
|     3 | Rendre les builds Vercel reproductibles                         | Candidat / DevOps    | Réalisé                                 | `vercel pull`, `vercel build --prod`, puis `vercel deploy --prebuilt --prod` pour API et Web                   |
|     4 | Ordonner migration, API, Web et contrôles post-déploiement      | Candidat / DevOps    | Réalisé, renforcé en juillet            | `migrate-db` -> `deploy-api` -> `deploy-web`, avec smoke tests                                                 |
|     5 | Empêcher le contournement et le double déploiement              | Candidat / QA-DevOps | Réalisé, renforcé en juillet            | B2-A23 : une seule production aboutie par projet ; B2-A38 : 6/6 tests de politique et aucune CD après CI rouge |
|     6 | Conserver une solution de repli                                 | Candidat             | Réalisé                                 | Dockerfiles, `docker-compose.yml`, `apps/api/fly.toml` et procédure alternative de `docs/deployment.md`        |
|     7 | Rejouer la recette sur la version candidate                     | Candidat / QA        | Réalisé sur `0.13.0-rc.8` le 23 juillet | B2-A43 : CI `29999207578`, CD `29999526386`, migrations/API/Web/smoke réussis, healthchecks HTTP 200           |

Le workflow initial du 4 mai autorisait encore un lancement manuel et séparait
les migrations. Le tableau distingue donc la **décision de cible** de son
durcissement progressif en juillet ; il ne projette pas l'état final sur la
première implémentation.

## 10. Résultat constaté

Les résultats vérifiables sont :

1. La documentation actuelle nomme une seule production canonique : Vercel
   pour le Web et l'API, Neon pour PostgreSQL.
2. Le workflow courant applique les migrations avant de déployer l'API, puis le
   Web ; les deux services ont un smoke test.
3. La preuve B2-A23 consigne, sur le SHA
   `4151b80cc6d164c38549e753f7b960ec4914f519`, une CI réussie
   (`29740673466`), une CD réussie (`29740979781`) et une seule production
   aboutie par projet après annulation des productions automatiques concurrentes.
4. La preuve négative B2-A38 consigne une CI réellement rouge sur une PR isolée
   (`29856584668`), aucun run CD associé et des inventaires Vercel production
   inchangés avant/après. Le test de politique du workflow obtient 6/6.
5. La recette B2-A43 consigne la livraison `0.13.0-rc.8` : CI
   `29999207578`, CD `29999526386`, migrations, API, Web et smoke tests réussis,
   puis healthchecks Web/API en HTTP 200.
6. La réversibilité n'a pas été supprimée : la stack Docker locale et la
   configuration Fly.io de l'API restent présentes.

Ainsi, l'arbitrage a réduit l'écart entre l'architecture annoncée, le pipeline
de livraison et l'environnement effectivement démontrable. Il a aussi donné un
critère observable de bon déroulement : **aucune promotion si la CI n'est pas
verte, puis migration et smoke tests obligatoires dans la chaîne canonique**.

## 11. Limites et réévaluation

- La matrice chiffrée est rétrospective ; la preuve contemporaine de décision
  reste `ADR-007` et le commit d'implémentation.
- Aucun coût réel par mois n'est démontré. Les mentions de gratuité ou de prix
  dans `ADR-006` sont des hypothèses historiques du projet, pas une vérification
  tarifaire valable au 7 septembre 2026.
- Aucun benchmark contrôlé ne compare latence, disponibilité ou cold start
  entre Vercel, Fly.io, Railway et VPS.
- Aucune production récente sur Fly.io, Railway ou VPS n'a été recettée dans le
  dépôt ; leurs notes sont fondées sur la faisabilité et les artefacts présents,
  pas sur une équivalence de service démontrée.
- Neon demeure un fournisseur externe commun aux options A et B. Le dépôt
  documente migrations et reprise, mais pas un exercice complet de restauration
  après sinistre.
- Le projet solo ne prouve ni concertation d'équipe ni validation contractuelle
  du commanditaire sur ce choix.

L'arbitrage doit être rouvert si l'une des conditions suivantes devient vraie :
coût incompatible avec le budget validé, impossibilité de satisfaire les
exigences de données ou de disponibilité, échec répété du chemin canonique,
besoin d'une infrastructure dédiée, ou disparition du repli Docker.

## 12. Registre précis des preuves

| Preuve dans le dépôt                                                                       | Ce qu'elle démontre                                                                                             | Limite de la preuve                                                         |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `docs/adr/ADR-006-deployment-architecture.md`                                              | Cible initiale Vercel Web + Fly.io API + Neon, options Railway/VPS/local, contrainte historique et repli Docker | ADR devenue historique ; certaines hypothèses tarifaires sont datées        |
| `docs/adr/ADR-007-ci-cd-vercel-neon.md`                                                    | Écart explicite entre anciens documents et URL actives ; décision Vercel Web/API + Neon                         | Ne contient pas la matrice pondérée                                         |
| Commit `ce337b4`                                                                           | État de `ADR-006` au 13 avril 2026                                                                              | Prouve le document versionné, pas un déploiement Fly.io recetté             |
| Commit `2dedcb5`                                                                           | Ajout d'`ADR-007` et du workflow de CD le 4 mai 2026                                                            | Première implémentation ensuite durcie                                      |
| `.github/workflows/deploy-vercel.yml`                                                      | Gate CI, migration, ordre API/Web, builds précompilés, smoke tests                                              | Configuration ; son exécution est prouvée séparément par les runs consignés |
| `.github/workflows/ci.yml`                                                                 | Contrôles qualité et tests de politique avant livraison                                                         | Ne prouve pas seule la promotion en production                              |
| `apps/api/vercel.json`, `apps/web/vercel.json`                                             | Configurations Vercel distinctes et commande d'ignorance des productions Git concurrentes                       | Dépend de la configuration distante Vercel                                  |
| `scripts/cd-workflow-policy.test.mjs`, `scripts/vercel-ignore-policy.test.mjs`             | Tests automatisés des règles de non-contournement et d'ignorance                                                | Tests de politique, pas recette métier                                      |
| `docs/rncp/bloc2-annexes/B2-A23-securite-dependances-et-cd-2026-07-20.md`                  | Une CI/CD réussie et une seule production aboutie par projet                                                    | Preuve datée de `0.13.0-rc.2`                                               |
| `docs/rncp/bloc2-annexes/B2-A38-preuve-negative-ci-cd-2026-07-21.md`                       | Absence de CD après CI rouge, inventaires inchangés, test de politique 6/6                                      | Test négatif volontairement isolé hors `main`                               |
| `docs/rncp/bloc2-annexes/B2-A43-simplification-interface-recette-production-2026-07-23.md` | CI/CD, healthchecks et recette navigateur sur `0.13.0-rc.8`                                                     | Ne compare pas les fournisseurs alternatifs                                 |
| `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/api/fly.toml`    | Repli local/auto-hébergé et portabilité de l'API                                                                | Présence d'artefacts, pas preuve d'une production alternative récente       |
| `docs/deployment.md`, `docs/ci-cd.md`                                                      | Procédures actuelles, cibles, secrets attendus, migrations, contrôles et rollback                               | Documents opérationnels à revalider à chaque changement d'infrastructure    |

Commandes locales de vérification historique :

```powershell
git show ce337b4:docs/adr/ADR-006-deployment-architecture.md
git show 2dedcb5:docs/adr/ADR-007-ci-cd-vercel-neon.md
git show 2dedcb5:.github/workflows/deploy-vercel.yml
git log --date=short --format="%h %ad %s" -- docs/adr .github/workflows/deploy-vercel.yml
```

## 13. Trame orale courte pour le jury

> En avril, le plan de déploiement retenait Vercel pour le Web, Fly.io pour
> l'API et Neon pour PostgreSQL. Début mai, j'ai constaté que la documentation
> citait encore Fly.io ou Railway alors que les deux URL réellement actives
> étaient sur Vercel. Le risque n'était pas une panne déjà survenue, mais
> l'absence d'une cible et d'une preuve de livraison uniques. J'ai comparé
> quatre options selon six critères pondérés. L'alignement avec la production et
> la reproductibilité CI/CD pesaient 45 % ; Vercel Web/API + Neon obtient
> 91/100. J'ai donc canonisé cette cible tout en conservant Docker et Fly.io
> comme replis. Le résultat est vérifiable : la CI verte déclenche une chaîne
> migration, API, Web et smoke tests ; une CI rouge testée sur une PR isolée n'a
> produit aucun déploiement. La limite est que la matrice est rétrospective et
> qu'aucun comparatif de coûts réels ou de performances fournisseurs n'a été
> mesuré.

## 14. Couverture de C3.2.2

| Attendu                                | Élément de cette annexe                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Analyser un écart ou une dérive        | Sections 2 et 3 : divergence entre cible documentée et production active       |
| Mesurer les conséquences               | Section 3 : risques projet explicités sans inventer d'incident ni de retard    |
| Examiner des solutions crédibles       | Section 4 : quatre options et une option locale non finaliste                  |
| Utiliser un outil d'aide à la décision | Section 5 : critères, poids, notes justifiées, formule et calculs contrôlables |
| Utiliser un logigramme                 | Section 6 : chemin de décision complet avec critères d'arrêt et de repli       |
| Prendre et appliquer l'arbitrage       | Sections 7 à 9 : décision, responsabilités, risques et plan d'action           |
| Vérifier le bon déroulement            | Section 10 : runs positifs, preuve négative, healthchecks et maintien du repli |
| Rester critique sur la preuve          | Section 11 : données non mesurées et conditions de réouverture                 |
