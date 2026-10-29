# Travaux avant ouverture publique

Le nettoyage du dépôt ne constitue pas une qualification d'ouverture
commerciale. Cette liste conserve les risques et anomalies utiles au produit.

| Sujet                           | État et action attendue                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dépendances                     | Audit du 29/10/2026 : 20 alertes de production (4 critiques, 7 élevées, 9 modérées) sur le lockfile antérieur inchangé. Corriger et qualifier les mises à jour avant mise en ligne ; le nettoyage ne traite pas cette migration. |
| Budget de génération            | Les comptes Google n'ont pas de plafond total. Définir budget, limites par compte et suivi des coûts avant une ouverture large.                                                                                                  |
| Limitation distribuée           | Le limiteur général utilise une mémoire de processus ; définir un contrôle cohérent entre instances.                                                                                                                             |
| Données personnelles            | Définir durées de conservation, accès/export et suppression de compte ; vérifier les traitements annoncés, dont les notes de douleur.                                                                                            |
| Sauvegardes                     | Documenter et tester une restauration PostgreSQL sur une cible distincte.                                                                                                                                                        |
| Observabilité                   | Préparer corrélation, masquage et alertes adaptées ; le monitoring actuel ne teste que la santé Web/API.                                                                                                                         |
| CSP                             | `unsafe-inline` reste un risque résiduel à réévaluer avec une politique à nonce.                                                                                                                                                 |
| Accessibilité, suppression (P2) | Confirmer l'annonce de succès après suppression, son ordre et le retour du focus avec NVDA.                                                                                                                                      |
| Accessibilité, déconnexion (P2) | Contre-recetter l'annonce du titre et le focus de destination ; ajouter une annonce de navigation si nécessaire.                                                                                                                 |
| Infrastructure                  | Revoir offres, quotas et coûts réels pour l'usage prévu.                                                                                                                                                                         |
| Recette finale                  | Vérifier OAuth réel, parcours IA et isolation des utilisateurs sur la révision livrée.                                                                                                                                           |

La table historique `generation_quotas` est conservée pour compatibilité des
migrations ; elle ne plafonne plus aucun parcours. Sa suppression éventuelle
sera une migration séparée avec sauvegarde, sans réécriture de l'historique.
