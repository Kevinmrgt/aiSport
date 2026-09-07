# Index des annexes — Bloc 3 RNCP39583

> Projet : Alcide  
> Consolidation : **2026-09-07**  
> Baseline technique validée : **`0.13.0-rc.8`**, SHA **`0a2caff`**

Ces annexes spécialisent les preuves du livrable
`docs/rncp/bloc3-pilotage-projet-rncp39583.md`. Leur statut distingue les
preuves actuelles, les reconstructions historiques, les scénarios cibles et les
validations techniques et simulation pédagogique du commanditaire fictif.

| Annexe                                                     | Compétence | Contenu                                                                                                                                    | Statut au 2026-09-07                                           |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| [B3-A01](B3-A01-planning-previsionnel-realise.md)          | C.3.1      | Méthode, WBS, planning prévu/réalisé, dépendances, jalons, charges, ressources et RACI                                                     | Présente ; reconstruction et limites signalées                 |
| [B3-A02](B3-A02-tableau-pilotage-2026-09-07.md)            | C3.2.1     | KPI d'avancement, délais, qualité, coûts, risques, charge/RH, seuils, responsables, fréquence, tendance, décisions et journal de contrôles | Présente et datée ; CI/CD et gate technique clôturées          |
| [B3-A03](B3-A03-cas-arbitrage-vercel-neon.md)              | C3.2.2     | Arbitrage Vercel/Neon : options, critères pondérés, logigramme, décision, risques et résultat                                              | Présente                                                       |
| [B3-A04](B3-A04-management-raci-inclusion.md)              | C3.3.1     | Missions, RASCI réel/cible, charge, styles managériaux, communication, conflit, handicap et contexte multiculturel                         | Présente ; contexte solo conservé                              |
| [B3-A05](B3-A05-grille-competences-plan-developpement.md)  | C3.3.2     | Grille 0–4, preuves/niveaux/cibles/écarts, besoins RH, formations, critères de réussite et adaptations handicap                            | Présente ; auto-évaluation et scénario cible distingués        |
| [B3-A06](B3-A06-comptes-rendus-validation-satisfaction.md) | C3.4.1     | Comptes rendus, points de validation, indicateurs de satisfaction et grille commanditaire                                                  | `PV-SIM-01` ; validation simulée, aucun avis humain revendiqué |
| [B3-A07](B3-A07-demonstration-version-actuelle.md)         | C3.4.2     | Démonstration de la version actuelle et preuves/captures de secours                                                                        | Gate GO ; CI/CD, production, répétition et plan B tracés       |

## Baseline commune à contrôler avant export

| Contrôle          |                                                          Valeur de référence |
| ----------------- | ---------------------------------------------------------------------------: |
| Version           |                                                                `0.13.0-rc.8` |
| SHA               |                                   `0a2caffc314bbb4697baf2fbbfe39ec74248e038` |
| Tests             |                                         261/261 : Shared 14, API 179, Web 68 |
| Couverture lignes |                                       Shared 100 %, API 89,72 %, Web 77,32 % |
| Production        |              150/150 réponses valides post-CD ; p95 maximal mesuré 378,64 ms |
| Audit             |                           0 complet / 0 production, localement et dans la CI |
| E2E               | 54/54 en 4,4 min avec `workers=1` ; historique 53/54 puis relance ciblée 1/1 |

Les commandes, résultats, dates, limites et sources de ces mesures figurent
dans B3-A02. Les captures sous `preuves-demo-2026-09-07/` appartiennent au
chantier B3-A07 ; cet index ne les modifie pas.

## Documents de présentation reliés

- livrable consolidé : `docs/rncp/bloc3-pilotage-projet-rncp39583.md` ;
- support oral : `docs/rncp/bloc3-support-oral-30min.md` ;
- script de démonstration : `docs/rncp/bloc3-script-demo-logiciel.md` ;
- matrice : `docs/rncp/matrice-conformite-rncp39583.md`.

## Limites communes

- planning initial et charges partiellement reconstruits ;
- coûts réels et timesheets non disponibles ;
- projet solo, sans équipe ou transmission RH réellement exécutée ;
- formations seulement planifiées ;
- validation commanditaire simulée, sans avis ni satisfaction humaine réels ;
- mesure production ponctuelle, sans valeur de SLA ;
- session OAuth dédiée expirée, à renouveler seulement si le parcours Google
  est retenu le jour J ;
- concurrence E2E historique non supprimée, malgré la gate sérialisée verte.
