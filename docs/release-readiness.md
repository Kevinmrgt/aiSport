# Travaux avant ouverture publique

La cible confirmée est le dépôt aiSport actuel sur `www.alcideai.fr`.
L'[audit initial du 29 octobre 2026](audits/2026-10-29/README.md) décrit
le candidat avant corrections ; ses alertes constituent un état historique.
La [validation des corrections](audits/2026-10-29/remediation-validation.md)
et la [contre-revue](audits/2026-10-29/remediation-review.md) donnent les
preuves locales disponibles. Le site public n'est pas encore ce candidat.

| Domaine                   | Corrections disponibles                                                                                               | Preuve encore nécessaire avant ouverture                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dépendances               | Versions et lockfile actualisés ; audit complet sans vulnérabilité connue lors du contrôle.                           | CI sur la révision livrée.                                                                        |
| Identité et données       | Identité Google par sujet stable, absence de rapprochement automatique par email, validations et isolation SQL.       | Connexion Google réelle et décision explicite sur les comptes historiques à rattacher.            |
| IA et coûts               | Validation des réponses, arrêt des erreurs permanentes, quotas persistants, réservations atomiques et idempotence.    | Génération avec le fournisseur réel, budget accepté et revue sportive des contenus.               |
| Vie privée                | Export, suppression du compte, révocation des sessions, purge paramétrable et retrait des nouvelles notes de douleur. | Identité légale, base de traitement, transferts et durées approuvées ; contrats des prestataires. |
| Sécurité Web              | CSP à nonce pour les scripts, limites de requête, erreurs et journaux expurgés.                                       | Vérification sur les domaines et variables effectifs de production.                               |
| Sauvegardes et migrations | Archive chiffrée, restauration isolée, répétition des migrations et verrou PostgreSQL commun.                         | Restauration de la base cible, accès de secours à la clé et qualification du retour arrière.      |
| Exploitation              | Santé Web/API avec SHA, contrôle des deux alias, préconditions de livraison et surveillance documentées.              | Correspondance projet/domaine/base, réception réelle des alertes et coûts/quotas des offres.      |
| UX et accessibilité       | Formulaires, déconnexion mobile, minuterie restaurable, journal idempotent et pages légales.                          | Recette finale sur la révision déployée, dont OAuth et contrôle au lecteur d'écran.               |

La [procédure de production](production-runbook.md) sépare la vérification
en lecture seule, la répétition sur copie et l'application des migrations.
Le mode `verify` ne modifie pas la base source. Les préconditions de livraison
ne doivent pas être marquées satisfaites sans preuves réelles.

La table historique `generation_quotas` reste présente pour compatibilité des
migrations. Le nouveau contrôle repose sur les tables de budgets persistants ;
supprimer l'ancienne table exige une migration distincte avec sauvegarde.
