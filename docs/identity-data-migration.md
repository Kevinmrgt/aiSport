# Identités Google et données historiques

La migration `0007_stable_google_identity` remplace l'unicité de l'adresse
e-mail par une identité unique `(provider, provider_account_id)` dans
`accounts`. L'e-mail devient un attribut de contact non unique. Deux sujets
Google distincts ayant la même adresse ne partagent pas leurs données ; un
sujet qui change d'adresse conserve son UUID applicatif.

Les cookies antérieurs à cette liaison sont invalidés : une nouvelle
connexion Google est nécessaire. Le callback conserve le
`providerAccountId` de Google, jamais l'identifiant aléatoire de l'objet
utilisateur Auth.js. Les appels internes transmettent ce sujet stable.

## Préparer la migration

Avant application sur la base hébergée : identifier sa branche et sa
révision, restaurer une sauvegarde sur une cible distincte, vérifier le
journal Drizzle et inventorier les lignes `accounts`. Un doublon de sujet
fournisseur fait échouer la nouvelle unicité ; aucun doublon n'est supprimé
automatiquement. Le schéma et les données du domaine public ne doivent pas
être supposés identiques à ceux d'une base locale neuve.

Les utilisateurs historiques sans liaison fournisseur restent en place,
avec leurs séances et journaux. Une connexion dont l'adresse correspond à
une telle ligne est refusée avec `IDENTITY_LINK_REQUIRED`. Cette protection
évite une réattribution silencieuse par e-mail. Ne pas contourner ce refus
en copiant arbitrairement l'adresse ou en inventant un sujet Google.

## Rapprochement contrôlé d'un compte existant

Un opérateur doit vérifier avec le titulaire le sujet Google réellement
authentifié et l'UUID du compte historique. Préparer **un seul mapping** dans
un fichier privé hors Git, par exemple sous `tmp/` :

```json
{
  "userId": "UUID-du-compte-historique",
  "subject": "sujet-Google-verifie",
  "expectedEmail": "adresse-historique-verifiee"
}
```

Avec `DATABASE_URL` explicitement positionnée sur la cible vérifiée,
exécuter depuis `apps/api` :

```powershell
pnpm exec tsx scripts/link-legacy-google-identity.ts --file ../../tmp/mapping-prive.json
```

Le mode par défaut est un contrôle sans écriture. Après vérification de la
cible et du mapping, ajouter `--apply` à la même commande. L'opération est
transactionnelle et refuse une adresse attendue différente, un utilisateur
absent ou une identité déjà liée. Elle ne modifie ni l'UUID applicatif ni
les données qui en dépendent. Elle n'affiche pas de sujet ou d'adresse.
Vérifier ensuite une connexion neuve, l'accès aux données conservées et le
refus d'accès depuis un autre compte ; conserver une preuve expurgée et
effacer le fichier de mapping selon la procédure interne.

## Intégrité et compatibilité

`0008_data_integrity` ajoute des index de pagination avec UUID comme
départage et des contraintes `CHECK NOT VALID`. Les nouvelles écritures sont
contrôlées immédiatement ; les éventuelles valeurs historiques invalides
ne sont ni supprimées ni corrigées aveuglément par la migration. Sur une
copie restaurée, inventorier et traiter ces valeurs, puis valider les
contraintes retenues avec `ALTER TABLE ... VALIDATE CONSTRAINT ...` avant
de considérer l'historique qualifié.

Les documents JSON sont validés à la lecture. Un document incompatible
renvoie `STORED_DATA_INVALID` (422), avec un message destiné à l'utilisateur,
au lieu de provoquer une erreur de rendu ou de réécrire ses consignes.
Il reste supprimable par son propriétaire. Les programmes historiques ne
sont plus normalisés ou transformés pendant la lecture.

Chaque liste avec son comptage, et chaque ensemble de statistiques, est lu
dans une transaction `REPEATABLE READ READ ONLY`. Cela rend cohérentes les
lectures d'un même endpoint ; deux endpoints du dashboard restent des
instantanés indépendants. La pagination garde des numéros de page avec
`OFFSET` : l'ordre est stable à données figées mais les insertions entre
deux consultations peuvent toujours déplacer les pages. Une navigation par
curseur reste à décider d'après les volumes mesurés.
