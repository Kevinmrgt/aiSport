# Support oral Bloc 3 RNCP39583 — Alcide

> Épreuve : **Coordonner et piloter un projet de développement d'applications logicielles**
> Format : **45 minutes**, dont **30 minutes de présentation** et **15 minutes d'échange**
> État présenté : **2026-09-07**
> Baseline : **`0.13.0-rc.8`**, SHA court **`d950b6b`**
> Fil conducteur : 22 minutes de pilotage, 7 minutes de démonstration, 1 minute de conclusion

## 1. Règle de présentation

Le support sépare systématiquement les preuves réelles du dépôt et des
contrôles du 2026-09-07, les reconstructions documentaires, les scénarios
d'organisation cible liés au contexte solo et les validations client encore à
recueillir. La version `0.12.0` et les mesures du 2026-05-07 restent des repères
historiques ; elles ne doivent plus être annoncées comme l'état actuel.

## 2. Plan minuté et correspondance avec les annexes

|       Temps | Slide | Message clé                                                    | Annexe principale           | Preuve à afficher                                       |
| ----------: | ----: | -------------------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
|   0:00–1:00 |     1 | Le Bloc 3 évalue le pilotage puis la démonstration             | Matrice et présent livrable | Compétences C.3.1 à C3.4.2                              |
|   1:00–2:15 |     2 | Alcide est déployé, versionné et traçable                      | **B3-A07**                  | `0.13.0-rc.8`, SHA `d950b6b`, URLs Web/API              |
|   2:15–4:15 |     3 | La méthode itérative est adaptée au projet solo                | **B3-A01**                  | Cadre méthodologique et sources datées                  |
|   4:15–7:00 |     4 | Le planning distingue prévu, réalisé et reconstruit            | **B3-A01**                  | WBS, Gantt, dépendances, jalons et écarts               |
|   7:00–8:30 |     5 | Ressources, capacité et limites sont chiffrées                 | **B3-A01**, **B3-A05**      | Charge reconstruite, ressources réelles et équipe cible |
|  8:30–10:30 |     6 | Les missions réelles et cibles ne sont pas confondues          | **B3-A04**                  | RASCI réel/cible, charge, inclusion                     |
| 10:30–13:30 |     7 | Le dépôt et le tableau daté forment l'outil de suivi           | **B3-A01**, **B3-A02**      | Sprints, ADR, CI/CD, KPI, risques et décisions          |
| 13:30–16:00 |     8 | Les deux gates techniques ont été remédiées localement         | **B3-A02**                  | Audits à 0 ; E2E 54/54 ; commit `7fc5f01`, CI attendue  |
| 16:00–18:00 |     9 | Un arbitrage est démontré par options, pondération et décision | **B3-A03**                  | Matrice Vercel/Neon, logigramme, résultat               |
| 18:00–19:45 |    10 | La communication est cadencée et orientée décision             | **B3-A04**, **B3-A06**      | Rituels, comptes rendus et validations                  |
| 19:45–21:30 |    11 | Les besoins de management et de compétences sont mesurés       | **B3-A04**, **B3-A05**      | Échelle 0–4, écarts, besoins RH, formations             |
| 21:30–22:30 |    12 | Les limites client et satisfaction sont explicites             | **B3-A06**                  | CR réels/reconstitués, grille SAT non renseignée        |
| 22:30–23:00 |    13 | Transition : du pilotage à la validation par l'usage           | Script de démo + **B3-A07** | Baseline et plan de secours                             |
| 23:00–29:00 |    14 | Démonstration du parcours commanditaire                        | Script de démo + **B3-A07** | Production, parcours critique, captures de secours      |
| 29:00–30:00 |    15 | Décision conditionnelle et prochaines actions                  | **B3-A02**, **B3-A06**      | Gates, limites et validation à obtenir                  |

Chemins des annexes : `docs/rncp/bloc3-annexes/B3-A01-…` à
`docs/rncp/bloc3-annexes/B3-A07-demonstration-version-actuelle.md`.

## 3. Contenu à présenter par slide

### Slide 1 — Cadre Bloc 3

Message : « Je présente comment le projet a été planifié, piloté, arbitré et
coordonné, puis je démontre la dernière baseline contrôlée. »

- rappeler les trois compétences éliminatoires : C.3.1, C3.2.1 et C3.4.2 ;
- annoncer que chaque affirmation renvoie à une annexe datée ;
- afficher la matrice de conformité actualisée.

### Slide 2 — Projet et baseline

Message : « Alcide génère, sauvegarde et permet d'exécuter des entraînements et
programmes personnalisés. »

- application Next.js/Hono/PostgreSQL, authentification Auth.js ;
- génération IA actuelle côté serveur avec OpenAI et validation Zod ;
- baseline `0.13.0-rc.8`, SHA `d950b6b` ;
- Web, API, DB et configuration IA déclarés prêts lors de la mesure actuelle.

Ne pas présenter Mistral comme le fournisseur courant : l'ADR Mistral est une
décision historique, remplacée par `docs/adr/ADR-008-openai-server-side.md`.

### Slide 3 — Méthode

Message : « Une démarche itérative légère a permis de livrer et contrôler des
incréments, mais le dépôt ne prouve pas un Scrum d'équipe complet. »

- sprints, changelog, ADR et gates CI comme traces réelles ;
- méthode adaptée à une personne assumant plusieurs casquettes ;
- distinction entre chronologie observée et planification reconstruite.

### Slide 4 — Planning et jalons

Afficher B3-A01 : WBS et dépendances, charges prévues et reconstruites, Gantt
consolidé, jalons, chemin critique, marges et règles de replanification.

Dire explicitement : « Je ne possède pas de Gantt initial exhaustif. La
chronologie réalisée est prouvée ; certaines prévisions sont reconstruites et
étiquetées comme telles. »

### Slide 5 — Ressources

- réel : Kevin assume pilotage, développement, QA et DevOps ;
- technique : monorepo pnpm, GitHub Actions, Vercel, Neon, OpenAI ;
- limites : aucun timesheet exploitable ni facture consolidée ;
- cible : séparation produit, frontend/UX, backend/data/IA, QA/AppSec et SRE.

### Slide 6 — Missions, management et inclusion

Afficher les deux RASCI de B3-A04 :

- réel : une personne, responsabilités cumulées ;
- cible : rôles distribués sans inventer de collaborateur ;
- handicap : recueillir le besoin fonctionnel, adapter canal, rythme et outils,
  maintenir les critères de résultat et protéger la confidentialité ;
- multiculturel : langage clair, écrits de décision, horaires et fuseaux pris
  en compte dans l'organisation cible.

### Slide 7 — Outil de suivi

Message : « Il n'existe pas de preuve d'un board externe tenu pendant tout le
projet. Le suivi vérifiable combine sprints, Git, ADR, anomalies, CI/CD et
tableau de pilotage daté. »

Afficher B3-A02 et expliquer responsables, fréquence, seuil, tendance, source
et décision pour chaque KPI.

### Slide 8 — Tableau de bord actuel

| KPI au 2026-09-07 |                              Résultat | Lecture                                                                       |
| ----------------- | ------------------------------------: | ----------------------------------------------------------------------------- |
| Tests             |                           **261/261** | Shared 14, API 179, Web 68                                                    |
| Shared            |       100 % lignes ; 92,85 % branches | Seuil lignes 70 % atteint                                                     |
| API               |     89,72 % lignes ; 80,91 % branches | Seuil atteint                                                                 |
| Web               |     77,32 % lignes ; 79,44 % branches | Seuil atteint, couverture non exhaustive                                      |
| Production        |          **150/150** réponses valides | p95 maximal 246,42 ms sur cette mesure bornée                                 |
| Audit dépendances |          **0 complet / 0 production** | Overrides qualifiés, futur SHA/CI encore attendu                              |
| Smoke E2E courant | **54/54** avec `workers=1` en 4,4 min | Gate locale verte et reproductible en série                                   |
| Historique E2E    |     **53/54**, puis cas ciblé **1/1** | L'échec intermittent n'est pas effacé ; le parallélisme reste à diagnostiquer |

Conclusion : les neuf contrôles sont verts localement. Le gel final reste
conditionné par une CI validant le commit `7fc5f01` et son lockfile ; coûts,
charge, continuité et validation client restent des réserves distinctes.

### Slide 9 — Arbitrage

Présenter le cas B3-A03, pas une simple liste d'ADR :

1. écart entre besoin de démonstration et environnement initial ;
2. options comparées puis critères pondérés ;
3. Vercel Web/API + Neon retenus, Docker conservé pour la portabilité ;
4. risques, responsabilités, plan d'action et résultat constaté.

### Slide 10 — Communication

- preuves réelles : Git, sprints, ADR, CI/CD et documentation ;
- organisation cible : daily court, revue hebdomadaire, gate de livraison,
  rétrospective et décisions écrites ;
- comptes rendus B3-A06 : statut réel, reconstitué ou à compléter visible.

### Slide 11 — Compétences

- grille B3-A05 : 17 compétences sur une échelle commune 0–4 ;
- 5 au niveau 3, 9 au niveau 2, 3 au niveau 1 ; aucun niveau 4 revendiqué ;
- anciens écarts P0 AppSec/E2E remédiés localement ; CI du correctif encore attendue ;
- cinq besoins de renfort prêts pour un rôle RH cible, non transmis réellement ;
- dix actions de développement planifiées, aucune formation déclarée suivie.

### Slide 12 — Validation et satisfaction

- les évolutions sont traçables et la validation technique actuelle est mesurée ;
- aucun avis client réel ni score SAT n'est revendiqué au 2026-09-07 ;
- la grille SAT-01 à SAT-07 de B3-A06 doit être renseignée avec version, SHA,
  identité/rôle du validateur, réserves et décision.

### Slide 13 — Transition vers la démo

Phrase : « Les annexes montrent comment la baseline a été pilotée. Je vais
maintenant vérifier sa valeur d'usage sur un parcours court, puis demander une
validation explicite sans masquer les deux gates encore ouvertes. »

### Slide 14 — Démonstration

Suivre strictement le script de démonstration détenu séparément :

1. contrôler version et health/readiness ;
2. ouvrir l'accueil, l'authentification et une route protégée ;
3. parcourir génération, liste, détail/timer et dashboard selon le script ;
4. utiliser des données préparées si l'IA ou le réseau est indisponible ;
5. présenter les captures B3-A07 comme secours, pas comme exécution live.

### Slide 15 — Décision et conclusion

Conclusion exacte : « La baseline `0.13.0-rc.8` au SHA `d950b6b` est accessible
et les contrôles unitaires/production sont probants. Je ne prononce pas seul
une validation commanditaire. Je demande cette validation après démonstration,
avec une réserve de traçabilité : le lockfile corrigé est commité en `7fc5f01`
mais attend une CI verte. L'échec E2E parallèle historique reste documenté. »

## 4. Questions probables du jury

### Où est le vrai outil de suivi ?

Le suivi réel est distribué dans des artefacts versionnés. B3-A02 le consolide
avec KPI, seuils, responsables, fréquence, tendance, décisions et sources. Il
n'existe pas de preuve d'un board externe tenu sur toute la période.

### Le planning était-il réellement prévisionnel ?

Partiellement. B3-A01 sépare les éléments datés et observés des hypothèses
reconstruites. Cette limite est conservée au lieu de transformer la chronologie
Git en faux planning initial.

### Comment piloter une équipe sur un projet solo ?

Aucune équipe réelle n'est inventée. B3-A04 prouve les casquettes assumées et
modélise une organisation cible. B3-A05 distingue l'auto-évaluation du candidat,
les preuves réelles et les besoins futurs de recrutement ou de formation.

### Pourquoi conserver l'ancien échec alors que le smoke est vert ?

Le premier run complet a produit 53/54 avec un timeout Auth.js Chromium, puis le
cas a réussi seul 1/1. Le run complet sérialisé suivant réussit 54/54 en
4,4 minutes. La gate `workers=1` est verte ; le document conserve néanmoins
l'historique et ne prétend pas avoir corrigé le parallélisme lui-même.

### La production est-elle garantie disponible ?

Non. La mesure bornée du 2026-09-07 produit 150/150 réponses valides et un p95
maximal de 246,42 ms. Ce n'est ni un SLA, ni un test de charge, ni une garantie
future.

### La satisfaction client est-elle prouvée ?

Non. B3-A06 fournit le dispositif et les critères ; ils restent à faire
renseigner par un validateur réel après démonstration.

## 5. Checklist avant l'oral

- [ ] annoncer `0.13.0-rc.8` et vérifier le SHA `d950b6b` ;
- [ ] ouvrir les annexes B3-A01 à B3-A06 et vérifier B3-A07 ;
- [ ] ouvrir le script de démonstration sans le modifier depuis ce support ;
- [ ] vérifier URLs, `/health`, `/ready` et `/api/health` ;
- [ ] préparer le compte de démonstration sans exposer de secret ;
- [ ] rejouer tests, couverture, typecheck, lint et build ;
- [ ] rejouer l'audit et annoncer son résultat exact ;
- [ ] rejouer le smoke complet, sans le remplacer par une relance ciblée ;
- [ ] préparer le plan B local/données et les captures B3-A07 ;
- [ ] chronométrer la démonstration à 6–7 minutes ;
- [ ] ouvrir la grille de validation B3-A06 ;
- [ ] conserver les limites : coûts réels N/D, planning partiellement
      reconstruit, équipe solo, aucune satisfaction client réelle.

```bash
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
pnpm audit --audit-level=low
pnpm test:e2e:smoke
pnpm measure:production-health -- 50
```

Les résultats de référence sont consignés dans B3-A02. Toute nouvelle
exécution doit être présentée avec sa date, son SHA et son résultat propre.
