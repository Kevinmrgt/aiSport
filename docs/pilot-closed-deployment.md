# Livraison des protections avec pilote fermé

État : qualification locale en cours ; **déploiement non encore effectué**.

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

Les preuves finales de copie et de couverture PostgreSQL sont ajoutées ici après
leur exécution sur le candidat stable. Une exécution rouge ou ignorée ne valide
pas la livraison.

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
