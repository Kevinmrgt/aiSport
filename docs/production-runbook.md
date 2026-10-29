# Livraison, sauvegarde et reprise d'Alcide

La cible est le dépôt aiSport courant sur `https://www.alcideai.fr`.
Ce document décrit les outils livrés ; il ne certifie pas qu'une restauration
de la base hébergée, une connexion Google ou une revue sportive humaine a
déjà réussi. Les preuves réelles appartiennent au rapport de livraison.

## Vérification sans écriture sur la base source

Le workflow `DB - Drizzle migrations` choisit **verify** par défaut. Après
publication de la branche candidate, le mainteneur peut lancer :

```powershell
gh workflow run db-migrate.yml --ref BRANCHE_CANDIDATE -f mode=verify -f revision=SHA_COMPLET
```

Le SHA doit être exactement celui du code à vérifier. Ce mode :

1. Installe le lockfile figé et contrôle le SHA et la présence de la clé de sauvegarde.
2. Lit le catalogue et les comptages dans une transaction `REPEATABLE READ READ ONLY`.
3. Exporte un snapshot PostgreSQL et lance `pg_dump` sur ce même snapshot.
4. Chiffre le dump en AES-256-GCM, supprime le clair, produit un manifeste.
5. Crée sur le runner une base PostgreSQL isolée de même version majeure.
6. Vérifie que cette cible est distincte et vide, déchiffre temporairement,
   restaure en transaction et compare noms de tables et comptages.
7. Applique les migrations candidates **sur la copie** et vérifie la
   conservation des comptages utilisateurs/séances/programmes/journaux.
8. Supprime le clair déchiffré et le conteneur de ce run. Conserve uniquement
   l'archive chiffrée, le manifeste et les preuves expurgées.

Les versions PostgreSQL 16 à 18 sont prises en charge par les images
officielles correspondantes, téléchargées par le runner. Les identifiants
passent par l'environnement, jamais par les arguments `pg_dump`/`pg_restore`.
Les erreurs brutes du pilote ou des outils ne sont pas recopiées dans les
journaux, car elles pourraient contenir une URL ou une ligne utilisateur.

La preuve contient l'empreinte de la source et de la cible, le hash du dump,
la date, la durée, le nombre de tables comparées et le résultat de la
répétition des migrations. L'empreinte des migrations couvre les fichiers
SQL et le journal présents dans le candidat. Une réussite sur une base
neuve de développement ne remplace pas cet exercice sur une copie de
l'existant réel.

## Configuration nécessaire

Secrets GitHub :

| Nom                                                                               | Usage                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                    | Connexion à la source, TLS vérifié pour l'hébergement distant.                                                                              |
| `MIGRATION_DATABASE_URL`                                                          | Connexion directe à la même base si `DATABASE_URL` est un pooler. Les verrous de session ne sont pas fiables avec un pooler transactionnel. |
| `BACKUP_ENCRYPTION_KEY`                                                           | Exactement 32 octets aléatoires encodés en base64 ; conserver un accès de secours indépendant des archives.                                 |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID`, `VERCEL_WEB_PROJECT_ID` | Chaîne Vercel existante.                                                                                                                    |
| `VERCEL_AUTOMATION_BYPASS_SECRET`                                                 | Facultatif pour les URLs de déploiement protégées. Le contrôle de redirection ne le transfère pas à un domaine personnalisé.                |

Variables GitHub publiques :

| Nom                                                | Usage                                                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `LEGAL_OPERATOR_NAME`                              | Identité réelle de l'éditeur.                                                                        |
| `LEGAL_CONTACT_EMAIL`                              | Contact public opérationnel, vérifié par le responsable.                                             |
| `LEGAL_HOSTING_NAME`, `LEGAL_HOSTING_CONTACT`      | Identification et contact vérifiés de l'hébergeur.                                                   |
| `LEGAL_PROCESSING_BASIS`, `LEGAL_TRANSFERS_NOTICE` | Fondements et garanties de transfert effectivement vérifiés ; mêmes valeurs que les pages publiques. |
| `PRODUCTION_RESTORE_EVIDENCE_JSON`                 | Contenu authentique de `restore-evidence.json`, produit par l'exercice réussi.                       |
| `PRODUCTION_RELEASE_CHECKLIST_JSON`                | Attestations réelles de la révision et de la cible, format ci-dessous.                               |
| `PROD_API_HEALTH_URL`, `PROD_WEB_HEALTH_URL`       | Facultatifs ; valeurs par défaut API Vercel et Web `www.alcideai.fr`.                                |
| `PROD_EXPECTED_REVISION`                           | Facultatif ; impose ce SHA aux sondes de surveillance.                                               |

Les coordonnées légales ne sont ni déduites du nom GitHub, ni inventées.
Leur absence bloque le préflight de production, pas les tests locaux.
Une clé de sauvegarde ne doit jamais être journalisée ni ajoutée au dépôt.

## Checklist de release

Le JSON ci-dessous est un **gabarit refusé par le préflight**. Tous les
booléens commencent à `false` ; ils ne passent à `true` qu'après une preuve
réelle. Remplacer le SHA, la date, l'empreinte et le responsable après
vérification ; ne pas enregistrer de cookie, nom d'utilisateur de test ou
contenu sensible.

```json
{
  "revision": "SHA_COMPLET_DU_CANDIDAT",
  "canonicalWebOrigin": "https://www.alcideai.fr",
  "oauthCallbackOrigin": "https://www.alcideai.fr",
  "databaseIdentity": "EMPREINTE_SOURCE_DE_LA_PREUVE_RESTAURATION",
  "performedAt": "DATE_ISO_DE_LA_RECETTE",
  "reviewer": "RESPONSABLE_REEL",
  "checks": {
    "targetMapping": false,
    "legacyDataReview": false,
    "oauthFreshLogin": false,
    "twoUserIsolation": false,
    "aiWorkoutProgram": false,
    "alertsReceived": false,
    "providerContracts": false,
    "sportsReview": false,
    "dataPolicyReviewed": false
  }
}
```

La correspondance doit couvrir domaine → projet Web → API → base et
redirection OAuth. Examiner l'existant distant, notamment les éventuels
crédits/abonnements des parcours retirés, avant remplacement. La recette
utilise deux comptes de test et un budget IA borné. Une session restaurée
ne prouve pas une connexion Google neuve. Une sortie JSON valide ne prouve
pas une validation sportive compétente. Une issue créée ne prouve pas que
l'alerte a été reçue.

Le préflight exige une preuve de restauration et une checklist datant de
moins de sept jours, la même empreinte de migrations et le SHA exact pour
la checklist. Modifier le schéma invalide la preuve ; modifier le candidat
invalide la checklist. Les documents privés de prestataires peuvent rester
hors dépôt, avec une référence interne à la vérification.

## Livraison et retour arrière

Le CD réagit uniquement à une CI réussie sur `main` et à
`ENABLE_GHA_VERCEL_CD=true`. Avant toute écriture : préflight, sauvegarde
fraîche chiffrée et conservation de son artefact. Les migrations utilisent
un verrou consultatif PostgreSQL de session commun aux outils de release.
Les workflows DB et CD partagent aussi un groupe de concurrence.

Le mode manuel **migrate** vérifie le SHA actuel de `main`, une CI réussie
sur ce SHA et le même préflight. Il ne sert pas à contourner une CI échouée.
Ne pas lancer directement `drizzle-kit migrate` sur la production.

Le build et le runtime Vercel reçoivent `APP_REVISION`. Après API puis Web,
les contrôles exigent JSON, bon service, état attendu, date récente et SHA
du candidat sur l'URL créée et le domaine final. Une readiness positive
indique schéma minimal présent, connexion et clé IA configurée, sans appel
payant. Elle ne remplace pas la recette métier.

Conserver les identifiants des déploiements précédents et le journal des
migrations. Si le Web échoue après livraison de l'API, revenir à un couple
compatible avec le schéma actuel ; un rollback Vercel ne restaure pas la
base. Les scripts fournis refusent toute restauration en place : préparer
une cible distincte, la vérifier, puis organiser la bascule et ses accès.
Fixer et mesurer RPO, RTO, délai d'alerte et responsable d'intervention.

Les artefacts Actions expirent après trente jours ; ils ne constituent pas
à eux seuls une stratégie de sauvegarde indépendante ou périodique.
Organiser la cadence, le stockage durable nécessaire, l'accès à la clé et
le renouvellement des exercices selon les objectifs du service.

## Exécution locale contrôlée

Les scripts acceptent `DATABASE_URL`, `BACKUP_FILE` absolu,
`BACKUP_ENCRYPTION_KEY`, puis `RESTORE_DATABASE_URL`,
`RESTORE_CONFIRM=isolated-empty-database` et `RESTORE_EVIDENCE_FILE` absolu.
`RESTORE_APPLY_CANDIDATE_MIGRATIONS=1` active la répétition sur la cible.
Les chemins de sortie doivent être nouveaux : aucun fichier existant n'est
écrasé. Des outils natifs `pg_dump`/`pg_restore` de la bonne version sont
nécessaires, ou, sous Linux, `PG_TOOLS_DOCKER_IMAGE=postgres:16-alpine`
(adapter uniquement à la version majeure constatée). Docker est alors
utilisé avec le réseau du runner et un montage limité au dossier du backup.

```powershell
node scripts/db-backup.mjs
node scripts/db-restore-check.mjs
node scripts/cd-release-preflight.mjs
```

Le préflight accepte aussi des fichiers de preuves via
`RESTORE_EVIDENCE_FILE` et `RELEASE_CHECKLIST_FILE`. Ces fichiers réels et
les archives restent hors des sources publiques et des répertoires suivis.

Références : [Vercel CLI deploy](https://vercel.com/docs/cli/deploy),
[Vercel CLI build](https://vercel.com/docs/cli/build),
[TLS et autorités système PostgreSQL 16](https://www.postgresql.org/docs/16/libpq-connect.html).
