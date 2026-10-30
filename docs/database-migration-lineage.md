# Compatibilité de la lignée PostgreSQL

Le migrateur verrouillé vérifie le registre `drizzle.__drizzle_migrations`
après prise du verrou PostgreSQL et avant tout appel à Drizzle. Chaque ligne
du registre doit correspondre, dans l'ordre, au préfixe exact des migrations
candidates : même horodatage du journal et même SHA-256 du texte SQL.
Une base vide peut démarrer sans registre. Une base contenant des tables
sans historique appliqué est refusée ; aucun baseline automatique n'est créé.

L'export `inspectDatabaseMigrationLineage(client, folder)` fournit le même
diagnostic en lecture seule, sans bloquer une sauvegarde : `compatible`,
`appliedMigrations` et `matchedPrefix`. Une lignée compatible ajoute
`pendingMigrations` ; une lignée incompatible ajoute uniquement le motif
fixe `history_divergent` ou `history_missing`. Les empreintes, horodatages,
noms et données du registre ne figurent jamais dans ce résultat. Une erreur
du pilote ou de lecture des fichiers reste une erreur ; elle ne devient pas
un verdict de divergence. Le consommateur doit expurger ces erreurs avec
le même traitement que les autres opérations PostgreSQL.

Cette vérification est nécessaire parce que Drizzle choisit les migrations
en comparant uniquement le dernier horodatage appliqué. Des migrations
issues de deux branches peuvent donc être cumulées sans erreur SQL.
Les suffixes locaux `0007_stable_google_identity` à
`0012_budget_scope_not_null` diffèrent de ceux de `origin/main`
(`0007_beta_testers` à `0011_admin_workspace`). Le numéro seul ne prouve
pas une compatibilité. Les migrations communes sont `0000` à `0006`.

Un refus impose une revue des données sur une restauration isolée. Il ne
faut ni supprimer les tables supplémentaires, ni réécrire le registre,
ni renuméroter les migrations pour contourner le contrôle. Le choix d'une
conversion éventuelle doit préserver les utilisateurs et leurs données.
Le snapshot local ne prend pas en charge les données des fonctionnalités
bêta, de facturation et d'administration de l'autre branche dans son
export de compte ou ses règles de conservation. En particulier, les
événements d'administration historiques peuvent conserver des adresses
et du JSON après suppression d'un utilisateur via leur clé étrangère
`ON DELETE SET NULL`.

Les empreintes suivent exactement le lecteur Drizzle installé, y compris
les fins de ligne. Un changement de contenu d'une migration déjà appliquée
est refusé et doit être examiné à partir de l'artefact candidat réel.
La garde vérifie l'historique déclaré ; elle ne prouve pas l'absence de
changements SQL manuels et ne remplace pas la restauration ou les contrôles
de confidentialité sur les données réelles.

Contrôles unitaires : `node --test scripts/db-migration-lineage.test.mjs`.
Ils couvrent les préfixes compatibles, les divergences, les lignes absentes
ou dupliquées, les tables sans historique et la concordance des empreintes
avec Drizzle.
