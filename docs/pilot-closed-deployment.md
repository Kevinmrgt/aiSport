# Livraison des protections avec pilote fermé

État au 31 octobre 2026 : **déployé et vérifié en production, pilote inactif et inscriptions fermées**.

Le candidat réunit les incidents techniques (`0014_technical_incidents`) et les
protections financières du pilote (`0015_pilot_protections`). Il conserve les
quatorze migrations historiques, l'identité Google et les données existantes.
L'ouverture du pilote, les invitations, une recette IA payante et la publication
de nouvelles coordonnées légales ne font pas partie de cette livraison.

## Exception SQL bornée

La grammaire additive générale de `production-admin-release.mjs` reste inchangée :
elle refuse les fonctions libres, les triggers, les modifications de données et
les changements destructifs. L'exception suivante identifie un seul artefact :

| Propriété            | Valeur obligatoire                                                         |
| -------------------- | -------------------------------------------------------------------------- |
| Tag et fichier       | `0015_pilot_protections.sql`                                               |
| Position du journal  | 15, soit la seizième migration                                             |
| Timestamp            | `1793453127096`                                                            |
| SHA-256 du SQL exact | `18d9f8d8c852d9a5e8aaabb07020b713a5d0a803ccea446b0e4f84c2b273cb2e`         |
| Tables nouvelles     | `pilot_admissions`, `pilot_attempts`, `pilot_control`, `pilot_invitations` |

Le lanceur compare le contenu complet avant de le découper aux séparateurs
Drizzle, en conservant les corps PL/pgSQL. Changer un seul octet, le tag, la
position ou le timestamp refuse l'exception. Aucun `CREATE OR REPLACE` ni trigger
applicatif sur une table historique n'est autorisé par cet artefact.
La migration `0014` suit la grammaire additive ordinaire.

Avant toute écriture de ce suffixe, les noms des quatre tables, des deux fonctions
et des quatre triggers doivent être absents du schéma public. Les contrôles
habituels restent actifs : lignée exacte, même verrou de session, preuve de copie
restaurée, transaction, conservation du catalogue et des empreintes de toutes
les lignes historiques, et même propriétaire Google. Avant le commit, les quatre
tables du pilote doivent être vides. Une mise à jour déjà migrée et la validation
de la preuve de sauvegarde exigent également cette fermeture.

La somme de contrôle du préfixe historique de quatorze migrations
(tags, timestamps et hashes SQL) est figée dans les tests :
`4958561b11e708f78dd4ec1f92f589979f3add95446383fba364d0a64164ceee`.
Elle a été comparée au préfixe inchangé d'`origin/main`.

## Qualification locale sur une vraie copie

```powershell
node --test scripts/production-admin-release.test.mjs
node scripts/qualify-pilot-closed-update.mjs
node scripts/qualify-pilot-protections.mjs
```

Les tests du lanceur comptent **87 réussites, aucun échec et aucun test ignoré**.
Ils couvrent notamment les variantes SQL, le faux hash, le nom et la date
incorrects, les collisions, une preuve de fermeture manquante ou falsifiée, les
changements de données/catalogue/Google, le suffixe différent de celui répété,
le rollback et les préconditions CI/sauvegarde existantes.

Le helper crée uniquement un conteneur neuf à partir de l'image PostgreSQL 16
déjà disponible, avec `--pull=never` et un port limité à `127.0.0.1`. Il ne reçoit
aucune URL distante et ne reprend aucune clé applicative de l'environnement.
Il crée deux sources synthétiques, avec respectivement quatorze et quinze
migrations appliquées, chacune contenant un seul administrateur, un sujet Google
fictif, des historiques de séances/programmes/journaux, des réglages, des crédits
et de la comptabilité de génération ; le second cas contient aussi un incident.

Chaque scénario exporte réellement le snapshot PostgreSQL en lecture seule avec
`pg_dump`, chiffre le dump par le même AES-256-GCM que les outils de production,
le déchiffre temporairement puis exécute `pg_restore --single-transaction` dans
deux bases vides distinctes. Les inventaires et les hashes du dump sont comparés.
Les copies utilisent ensuite la vraie fonction `applyAdditiveLiveUpdate`.
La readiness réelle passe de schéma manquant à schéma présent, sans appel IA.
Une panne injectée avant le dernier trigger doit annuler tout le suffixe et
conserver le préfixe de migrations et les données restaurées. La source est
comparée à son état initial ; le conteneur et ses volumes sont retirés.

Preuves finales du **31 octobre 2026**, sur PostgreSQL **16.15 avec `fsync=on`** :

| Contrôle exécuté                                      | Résultat                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| Copie chiffrée, préfixe 14 → 16                       | Réussite ; données et catalogue préservés, pilote vide                |
| Copie chiffrée, préfixe 15 → 16                       | Réussite ; incident existant également préservé, pilote vide          |
| Readiness sur chaque copie                            | Schéma manquant avant migration, présent après ; aucun appel IA       |
| Panne injectée sur chaque seconde copie               | Rollback intégral, journal et données du préfixe conservés            |
| PostgreSQL réunissant incidents et pilote             | **92/92 tests, 12/12 suites, aucun échec ni test ignoré**             |
| Couverture statements / branches / fonctions / lignes | **86,91 % / 79,80 % / 92,50 % / 91,63 %**                             |
| Seuils exigés                                         | 80 % / 70 % / 90 % / 80 %, tous satisfaits                            |
| Sources pendant chaque exécution                      | Empreintes inchangées                                                 |
| Nettoyage                                             | Conteneurs et volumes retirés ; aucune base de qualification restante |

La répétition sur copie s'est déroulée de **14:17:26 à 14:17:43 UTC**.
Preuve locale non versionnée :
`tmp/pilot-closed-update/a1bbce81-ca91-46c0-8a2f-3cc2d05af5b0/evidence.json`,
SHA-256
`65fc3e73cdd56ed243a5417fd513e7e23bb68db42bdff314d35e24df3f645740`.

La suite PostgreSQL complète s'est déroulée de **14:18:49 à 14:19:51 UTC**.
Preuve locale non versionnée :
`tmp/pilot-qualification/6cdd9092-084f-4e7f-8975-f3d4a713ff04/evidence.json`,
SHA-256
`14c0ed99815a04987fbbedaa486c98a9287e60787a041bf0992fa9c035157f82`.
La couverture détaillée et les diagnostics expurgés restent dans ce répertoire.

Ces exécutions partaient du commit
`37bee4a9d8d151dba449c8f7e7ed1092f0ef8aa6` avec un worktree modifié ; ce SHA
seul ne désigne pas le code qualifié. L'empreinte des migrations réconciliées est
`61407e40631b6b72be2e5dadfcec02495a2f841135a8162a6106e676de5a37ee`.
L'empreinte des sources dans la preuve de copie est
`dee26a0124abae8d1390842ed8351e45501472b4aa1b97ca53f30d61f13906d2` ;
celle du périmètre de la couverture PostgreSQL est
`10955079bdcb2946c800dc27db46fc534724a6a989dc8263cdd9d745de669e68`.
Leurs listes de fichiers sont définies dans les deux lanceurs respectifs.
Une exécution rouge ou ignorée ne valide pas la livraison.

## Contrôles de livraison fermée

Le workflow existant conserve la CI réussie sur le SHA exact, la sauvegarde
chiffrée archivée avant écriture, la restauration isolée et les compensations de
déploiement. Le mode de cette livraison est `update` et sa confirmation de pilote
fermé est `keep-pilot-inactive-without-spend`. Les confirmations de recette réelle
et de publication restent vides.

Le contrôle en lecture seule avant la livraison doit vérifier le plan Hobby de
l'équipe Vercel exacte, les deux accès `admin-only`, la même unique allowlist,
la simulation Stripe désactivée et le pilote absent ou vide. Le contrôle après
livraison exige les quatre tables vides et la révision exacte dans les deux
configurations. Les URLs servies et la readiness restent vérifiées par le
lanceur de livraison.

Ce rapport distingue les preuves synthétiques locales des preuves distantes.
Le SHA candidat, la CI, la sauvegarde/restauration de la vraie cible, les deux
déploiements et leurs contrôles finaux sont consignés par le chef lors de leur
exécution. Aucun contrôle local présenté ici ne prétend établir une connexion
Google neuve ni une génération réelle chez le fournisseur.

## Livraison distante vérifiée

La révision applicative déployée est
`dade429d84d258382b83a96acc5e92a24eb93333`.
La [CI complète](https://github.com/Kevinmrgt/aiSport/actions/runs/41211290335)
est réussie sur ce SHA : typage, lint, audit de sécurité, couvertures unitaires et
PostgreSQL, parcours publics, construction, recette authentifiée compilée et
images Docker API/Web. La recette authentifiée compte neuf contrôles réussis et
zéro appel IA réel ; ses cinq appels sont des réponses locales simulées.
Elle vérifie aussi les refus avant activation puis sans invitation, le tarif de
5 € et les souscriptions fermées. L'ancien coupe-circuit global est initialisé
explicitement dans cette seule base de recette locale neuve.

Le [déploiement contrôlé](https://github.com/Kevinmrgt/aiSport/actions/runs/41211889161)
est réussi en mode `update`, avec la confirmation de pilote fermé et les deux
confirmations de recette IA réelle et de publication légale laissées vides.

| Preuve distante | Résultat |
| --- | --- |
| Contrôle préalable puis final de l'hébergement | Plan Vercel Hobby confirmé |
| Accès API et Web | `admin-only`, même unique allowlist ; API protégée sans authentification : 401 |
| Sauvegarde de la cible réelle | Chiffrée, archivée avant migration ; restauration intégrale vérifiée sur copie isolée |
| Migration sur copie puis cible réelle | 14 → 16 ; incidents puis protections pilote, hashes exacts |
| Conservation | Même base, toutes les données et le catalogue existants préservés, identité Google conservée |
| État final du pilote | Désactivé ; 0 activation, 0 invitation, 0 admission et 0 tentative |
| Stripe | Simulation désactivée ; les protections TEST sont dans la révision servie |
| API canonique | `/health/ready` : `ready`, schéma et base OK, SHA exact |
| Web canonique | `/api/health` : `ok`, SHA exact |
| Dépense | Aucun achat, provisionnement payant, paiement ou appel IA réel lancé |

Les deux contrôles publics ont été relus après la réussite du workflow. La
variable de supervision `PROD_EXPECTED_REVISION` désigne maintenant ce SHA ;
`ENABLE_GHA_VERCEL_CD` reste `false`. Cette lecture de santé ne certifie pas la
cadence du planificateur ni une nouvelle connexion OAuth.

Les artefacts du run conservent séparément la sauvegarde chiffrée
`closed-admin-backup-41211889161-1` et les preuves expurgées
`closed-admin-evidence-41211889161-1` pendant 30 jours. Les copies locales des
preuves expurgées et la lecture de santé sont dans
`tmp/pilot-release/production-41211889161/` ; aucun secret ni dump déchiffré
n'est versionné. L'empreinte de la sauvegarde chiffrée est
`97292b19eecd628aacf6c93b97df94a311fa29c77159964f845f9322fc99c6d6`.

Le plafond applicatif de 20 USD sur 720 heures et les limites serveur sont
déployés. Aucune fenêtre de pilote n'a été démarrée et aucun droit d'accès
pilote n'a été créé. Les 720 heures commenceront uniquement lors d'une
activation opérateur explicite ultérieure.
