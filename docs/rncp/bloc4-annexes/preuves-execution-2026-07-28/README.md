# B4-P01 - Simulation de supervision GitHub du 2026-07-28

> Preuve d'exécution C4.1.2. Cette séquence est une **simulation déclarée** :
> aucun endpoint de production n'a été sondé ni modifié.

## Déroulé vérifié

| Étape                 | Référence                                                                                        | Résultat constaté                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Alerte simulée        | [Run 30348338556](https://github.com/Kevinmrgt/aiSport/actions/runs/30348338556)                 | Échec volontaire du contrôle `simulate_alert`; artefact téléversé; étape d'ouverture/mise à jour de l'issue réussie. |
| Issue de test         | [Issue #64](https://github.com/Kevinmrgt/aiSport/issues/64)                                      | Issue `[TEST] Production healthcheck alert simulation` créée/commentée avec le label `monitoring-test`.              |
| Rétablissement simulé | [Run 30348419565](https://github.com/Kevinmrgt/aiSport/actions/runs/30348419565)                 | Succès du contrôle `simulate_recovery`; étape de fermeture de l'issue réussie.                                       |
| Clôture               | [Commentaire de reprise](https://github.com/Kevinmrgt/aiSport/issues/64#issuecomment-5102600764) | L'issue est clôturée automatiquement après la simulation de rétablissement.                                          |

## Fichiers conservés

- `production-health.md` : rapport de l'alerte simulée du run `30348338556`.
- `simulate-recovery/production-health.md` : rapport de rétablissement du run `30348419565`.

Ces rapports déclarent explicitement le mode de simulation et l'absence de
sonde ou de modification de la production. Ils complètent le protocole
[`bloc4-supervision-preuve.md`](../../bloc4-supervision-preuve.md), sans être
présentés comme une indisponibilité réelle.

## Limite

Cette annexe ne remplace pas un run de monitoring en mode `production`. Un
passage vert sur les endpoints réels doit être ajouté séparément avant remise
si le dossier affirme l'exécution effective de cette supervision de production.
