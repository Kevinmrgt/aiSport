# Données personnelles : opérations à qualifier avant ouverture

Le candidat ajoute `GET /account/export` et `DELETE /account` pour le compte
authentifié. L'effacement supprime les dépendances par cascade, y compris les
journaux conservés après suppression d'une séance. L'export ne contient ni
jetons OAuth, ni clés API chiffrées, ni données d'autres comptes. Les nouveaux
`painNotes` non vides sont refusés ; les anciennes notes restent exportables
et effaçables. Les demandes médicales restent hors périmètre.

## Révocation des sessions

Chaque connexion Google émet `authIssuedAt` en millisecondes, transmis par
le Web avec `x-auth-issued-at`. Le secret interservices protège cette
assertion. Les anciens cookies sans ce champ imposent une reconnexion. À
l'effacement, un HMAC du sujet et la date de révocation sont conservés 35
jours, au-delà des 30 jours de session. Aucun e-mail ni sujet brut ne figure
dans ce registre. Une nouvelle connexion postérieure à l'effacement peut
créer un nouveau compte vide ; un ancien cookie ne le recrée pas. Le rejet
couvre également les 30 secondes de décalage d'horloge tolérées à l'entrée.
Après un effacement, attendre une minute avant une nouvelle connexion couvre
les horloges Web et API décalées dans les deux sens ; le message de refus
et l'interface expliquent cette attente de sécurité.

La vérification est répétée sous le verrou du sujet utilisé par la résolution
d'identité : une requête d'authentification concurrente à l'effacement ne
doit pas réinsérer les données avec une ancienne session.

Configurer de préférence un `PRIVACY_REVOCATION_SECRET` aléatoire dédié et
stable. Le défaut est `SERVICE_SECRET`. Si cette clé change sans reprise des
marqueurs, faire également tourner `AUTH_SECRET` pour invalider tous les
cookies antérieurs ; sinon les marqueurs ne seraient plus retrouvés. Ne
jamais inscrire ces secrets dans les commandes de documentation ou les logs.

## Conservation proposée

`RETENTION_INACTIVE_DAYS` vaut 365 par défaut, entre 30 et 3650 jours. C'est
une proposition technique, pas une durée légale imposée. Le responsable doit
valider la politique et la synchroniser entre Web et API. L'activité
authentifiée met à jour `users.updated_at`.

La commande suivante fait uniquement une simulation :

```powershell
pnpm --filter api exec tsx scripts/retention.ts
```

Elle exige un `DATABASE_URL` explicitement fourni dans l'environnement et
ne charge pas automatiquement `.env`. L'effacement exige les deux options
`--apply --confirm-retention`. Chaque lot est borné à 100 comptes et ne
journalise que des comptages. L'inactivité est revérifiée sous verrou avant
suppression ; un compte redevenu actif est conservé.

Planifier et vérifier cette tâche sur l'environnement final avant ouverture.
Le développement du script ne prouve pas son exécution régulière. Les
sauvegardes et journaux d'hébergement ont des politiques distinctes à
confirmer sur les comptes réels. Avant remise en service d'une restauration,
réappliquer les effacements intervenus depuis le point restauré à partir d'un
registre d'effacement protégé et plus récent, et vérifier les dépendances.

## Informations publiques nécessaires

Les pages `/confidentialite`, `/mentions-legales` et `/conditions` utilisent :

- `LEGAL_OPERATOR_NAME` : identité et mentions adaptées au statut réel ;
- `LEGAL_CONTACT_EMAIL` : adresse fonctionnelle surveillée ;
- `LEGAL_HOSTING_NAME` et `LEGAL_HOSTING_CONTACT` : hébergement vérifié ;
- `LEGAL_PROCESSING_BASIS` : fondements des finalités effectivement retenues ;
- `LEGAL_TRANSFERS_NOTICE` : régions, destinataires et garanties réellement vérifiés.

Aucune valeur n'est inventée. Les pages signalent l'évaluation privée tant
que les informations manquent. La publication de coordonnées, la
qualification des finalités, contrats/transferts, le public visé et la
politique de conservation restent des décisions du responsable.

Les cookies techniques de connexion ne justifient pas à eux seuls un bandeau
publicitaire ; refaire l'inventaire du déploiement final.

Sources officielles consultées le 29 octobre 2026 :
[information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence),
[effacement](https://www.cnil.fr/fr/comprendre-mes-droits/le-droit-leffacement-supprimer-vos-donnees-en-ligne).
Les mécanismes livrés ne constituent pas à eux seuls une certification de conformité.
