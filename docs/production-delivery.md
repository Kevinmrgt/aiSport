# Livraison du candidat de production — 29 octobre 2026

**Mise à jour du 30 octobre :** le propriétaire a choisi de ne conserver que
son compte administrateur et a demandé la livraison. La procédure de
[production fermée](production-admin-release.md) décrit la nouvelle base,
l'import du compte seul et la liaison Google contrôlée. Le rapport ci-dessous
conserve les preuves et constats de l'audit précédent. Une recette ultérieure
a reproduit une liste périmée après suppression malgré une réponse RSC correcte :
le bouton exécute désormais la mutation dans une Action React et s'appuie sur
la réponse du serveur, sans rafraîchissement concurrent supplémentaire.

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
- [Plan de transition des données de l'offre précédente](production-data-transition-plan.md).

Les builds API et Web ont réussi après correction des noms Unicode transmis
dans les headers. La suite des scripts de politique et exploitation compte
49 tests réussis après ajout du contrôle de lignée SQL, du diagnostic expurgé,
de la comparaison des cibles configurées et de l'empreinte
réellement répétée sur restauration. La couverture Web après correction
du minuteur passe avec 93 tests, 79,69 % des lignes et 71,44 % des branches.
Les tests de suppression
ont mis en évidence une vue cliente périmée malgré un DELETE réussi ; le
rafraîchissement après succès est couvert par des régressions ciblées.
La première CI a aussi révélé une remise à zéro du minuteur pendant
l'enregistrement du journal : l'identité des tableaux RSC déclenchait le reset.
La régression reproduit le défaut avant correction ; le reset dépend maintenant
des changements réels de séance ou de contenu. La contre-recette locale
du build `GBB64nJhG5rrSvc-o82ay` réussit les six scénarios, runner inchangé.
Les résultats finaux navigateur sont consignés dans le rapport de recette.
Le smoke public de production réussit ses **50 tests Chromium et Firefox**
avec deux workers, après correction du nom accessible de la marque.
La [CI Linux du correctif applicatif](https://github.com/Kevinmrgt/aiSport/actions/runs/40908876175)
est entièrement réussie sur `7cc8c9c`, y compris Docker Web/API, les
363 tests unitaires, les couvertures SQL et les six recettes synthétiques.
Les contrôles du dernier commit sont visibles dans
[les checks de la PR](https://github.com/Kevinmrgt/aiSport/pull/82/checks).

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
bases doivent être vérifiés sur les connexions retenues. L'inventaire distant
a confirmé les projets `ai-sport-web` (`apps/web`) et `ai-sport-api` (`apps/api`),
Node 24 et le domaine vérifié `www.alcideai.fr`. Tous deux servent encore
`fd750f0`. La base pointée par le secret GitHub de migration a été sauvegardée
et restaurée sur PostgreSQL 17, puis les migrations ont été refusées :
12 migrations appliquées, seulement les sept premières communes. Voir le
[run en lecture seule](https://github.com/Kevinmrgt/aiSport/actions/runs/40908873473).
Cette source contient les tables historiques de l'autre offre. La comparaison
initiale avec la connexion Vercel a donné des empreintes SQL différentes ;
l'adresse/port acceptant la connexion ne garantit pas une identité logique
stable chez un hébergeur. Ce résultat ne permet donc pas d'affirmer que la
sauvegarde GitHub qualifie la base effectivement configurée sur Vercel.
Le diagnostic compare également les configurations et inspecte la lignée
Vercel en lecture seule, sans jamais exporter les URL ni les secrets.
Le [dernier diagnostic](https://github.com/Kevinmrgt/aiSport/actions/runs/40910408866),
sur `bdcbd8b`, confirme aussi **12 migrations et sept communes sur la
connexion configurée sur Vercel**. Les hôtes de connexion diffèrent, le nom
de base et le rôle concordent ; cela ne prouve pas une identité logique
commune et n'autorise pas à modifier les secrets pour les aligner d'office.
La sauvegarde qualifiée reste celle de la connexion GitHub. La compatibilité
SQL du candidat avec la connexion Vercel est refusée indépendamment de
cette question d'identité. La correspondance stable et la conversion des
données doivent être établies avant la bascule. Les anciens cookies
de test et la réussite locale ne constituent pas ces preuves.

`main` est désormais protégé : PR, six checks GitHub Actions identifiés,
branche à jour et conversations résolues ; protection appliquée également
aux administrateurs, force push et suppression interdits. Aucun approbateur
supplémentaire n'est imposé. La PR de remplacement est
[le brouillon 82](https://github.com/Kevinmrgt/aiSport/pull/82).
