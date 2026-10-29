# Livraison du candidat de production — 29 octobre 2026

La cible choisie est le code local aiSport sur www.alcideai.fr.
Ce document rassemble la préparation technique ; il ne certifie pas
l'ouverture du service public.

## Corrections et preuves

Les agents ont traité séparément sécurité/dépendances, identité/données,
IA, budgets/idempotence, confidentialité, UX, exploitation, recette et revue.
Les détails et résultats sont conservés dans :

- [Audit initial](audits/2026-10-29/README.md), état historique avant correction.
- [Validation des corrections](audits/2026-10-29/remediation-validation.md) :
  lint, types, 358 tests unitaires du monorepo, 27 tests SQL avec couverture.
- [Relecture indépendante](audits/2026-10-29/remediation-review.md).
- [Recette locale avec sessions et IA synthétiques](testing-local-production.md).
- [Procédure de livraison et de restauration](production-runbook.md).

Les builds API et Web ont réussi après correction des noms Unicode transmis
dans les headers. La suite des scripts de politique et exploitation compte
40 tests réussis après ajout du contrôle de lignée SQL et de l'empreinte
réellement répétée sur restauration. La couverture Web après correction
de suppression passe avec 89 tests, 78,67 % des lignes et 70,30 % des branches.
Les tests de suppression
ont mis en évidence une vue cliente périmée malgré un DELETE réussi ; le
rafraîchissement après succès est couvert par des régressions ciblées.
Les résultats finaux navigateur sont consignés dans le rapport de recette.
Le smoke public de production réussit ses **50 tests Chromium et Firefox**
avec deux workers, après correction du nom accessible de la marque.

## Divergence avec le service hébergé

Le candidat local est issu de cb9037f et de sa base d950b6b. Le main distant
fd750f0 comporte 37 commits supplémentaires sur une autre branche d'évolution,
avec bêta, Stripe et administration. Leurs migrations 0007 à 0011 diffèrent
des nouvelles migrations de ce candidat.

La PR conserve cet historique distant comme parent, tout en présentant
le contenu du dépôt local choisi. Ce rapprochement des historiques Git
n'intègre pas les fonctionnalités de l'autre version et ne convertit aucune
donnée. Les retraits correspondants sont visibles dans la comparaison de la PR.

Le migrateur refuse désormais tout registre SQL qui n'est pas un préfixe
exact (hash et timestamp) de son propre historique. Un numéro de migration
identique ou un contrôle de compte des lignes ne suffit pas. Aucune réécriture
du registre, suppression des tables ou intégration implicite de l'autre produit
n'est autorisée par cette vérification.

La [contre-recette de lignée SQL](database-migration-lineage.md) a réellement
vérifié sur PostgreSQL 16 la migration du préfixe commun, le refus du schéma
de main sans modification de son registre, et le refus d'une base non vide
sans historique. Son conteneur distinct a été supprimé après contrôle.

La procédure distante en mode verify lit la source, crée une archive chiffrée
et tente restauration et migrations sur une copie isolée. Elle n'applique pas
de migration à la source. Une divergence réelle doit être résolue par un plan
de reprise des données approuvé, puis répétée sur copie. La PR reste en brouillon.

## Informations ou preuves restant nécessaires

Le propriétaire doit fournir ou valider les informations réelles de l'éditeur,
du contact, de l'hébergeur, de la base de traitement et des transferts, ainsi
que les durées de conservation et contrats des prestataires. Aucun texte
factice ne remplace ces décisions.

Une connexion Google neuve sur le domaine final, des générations avec le
fournisseur réel, la revue sportive des réponses et la réception des alertes
doivent être attestées sur la révision et l'environnement retenus. Le budget
de fonctionnement et l'accès de secours à la clé de sauvegarde restent à
confirmer. Une clé chiffrante existe dans les secrets GitHub ; son existence
ne démontre pas une conservation indépendante pour reprise d'urgence.

Les droits effectifs sur Vercel et la correspondance des projets, domaines et
bases sont à établir par métadonnées en lecture seule. Les anciens cookies
de test et la réussite locale ne constituent pas ces preuves.
