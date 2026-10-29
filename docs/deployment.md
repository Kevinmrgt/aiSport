# Déploiement

## Cibles configurées

| Composant | Cible                                                                      |
| --------- | -------------------------------------------------------------------------- |
| Web       | Vercel, `https://www.alcideai.fr` ; ancien alias `ai-sport-web.vercel.app` |
| API       | Vercel, `https://ai-sport-api.vercel.app`                                  |
| Données   | PostgreSQL Neon, connexion via `DATABASE_URL`                              |

Ces adresses décrivent la configuration du dépôt. Un état de production doit
être vérifié sur la révision effectivement servie après chaque livraison.
Runtime : Node.js 24, pnpm 11.9. Voir [ci-cd.md](ci-cd.md).

## Configuration

Web : `API_URL`, `NEXT_PUBLIC_API_URL`, `SERVICE_SECRET`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`.
API : `DATABASE_URL`, `SERVICE_SECRET`, `OPENAI_API_KEY`, `FRONTEND_URL`,
`NODE_ENV=production`.

Web et API : `APP_REVISION`, SHA Git immuable de quarante caractères,
transmis par le CD au build et au déploiement. `VERCEL_GIT_COMMIT_SHA` sert
de repli lorsqu'il est disponible ; une valeur absente ou invalide donne
`revision: null` et échoue au contrôle de livraison.

`SERVICE_SECRET` doit être identique sur le Web et l'API. La clé OpenAI reste
sur l'API. Les valeurs `NEXTAUTH_URL`, `FRONTEND_URL` et la redirection OAuth
Google doivent correspondre à l'origine Web livrée.
La redirection est `/api/auth/callback/google`.

Ne jamais versionner les fichiers d'environnement, cookies ou secrets.

## Livraison nominale

1. Vérifier les changements et la CI sur la révision prévue.
2. Le workflow `CD - Vercel`, activé par `ENABLE_GHA_VERCEL_CD=true`, se lance
   après une CI réussie sur `main`.
3. Exécuter le préflight, conserver une sauvegarde chiffrée, appliquer les
   migrations sous verrou, puis déployer l'API et le Web.
4. Vérifier JSON et SHA du build créé et des domaines publics, puis le
   parcours utilisateur concerné.

Secrets GitHub : `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID`,
`VERCEL_WEB_PROJECT_ID`, `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY` (32 octets
aléatoires encodés en base64). `MIGRATION_DATABASE_URL` est nécessaire si
`DATABASE_URL` utilise un pooler ; il doit viser la même base via une
connexion directe. `VERCEL_AUTOMATION_BYPASS_SECRET` est facultatif pour
sonder les URLs Vercel protégées ; il n'est pas transféré au domaine canonique.

Les variables publiques légales et les preuves de release sont décrites
dans le [runbook de production](production-runbook.md). Le workflow manuel
`DB - Drizzle migrations` vérifie par défaut sans écrire sur la source.
Son mode `migrate` est explicite et soumis aux mêmes preuves que le CD.

Les migrations déjà appliquées restent versionnées avec leurs snapshots et
leur journal. La table historique `generation_quotas` reste dans le schéma ;
aucun parcours applicatif ne l'utilise. Sa suppression éventuelle nécessite
une nouvelle migration, préparée avec sauvegarde et retour arrière.

## Contrôle après livraison

- API : `/health` puis `/health/ready`.
- Web : `/api/health` et page d'accueil.
- Vérifier le champ `revision` du JSON et le SHA exact attendu dans Vercel/Actions.
- Tester connexion Google, génération, consultation et suppression avec un
  compte de test dédié. Retirer ensuite les données de recette.

Un healthcheck de processus ne valide ni OAuth, ni la génération, ni
l'ensemble du parcours métier.

## Reprise

Identifier le dernier déploiement sain et son SHA, puis le promouvoir dans
Vercel. Les migrations ne sont pas annulées par un rollback Web/API : préparer
une migration compensatoire ou restaurer une sauvegarde de base si nécessaire.
Rejouer readiness et le parcours impacté.

Ne pas promouvoir un ancien Web/API incompatible avec les migrations déjà
appliquées. Le runbook conserve les conditions de restauration et les
preuves à vérifier ; aucun script fourni ne restaure automatiquement sur
une base contenant des tables utilisateur.

## Autohébergement

Le [README](../README.md) décrit Docker Compose pour le développement.
Pour une exposition publique, configurer HTTPS, secrets, accès PostgreSQL,
sauvegardes et alertes ; remplacer les identifiants locaux du Compose.
Les services `migrate` et `seed` utilisent le stage Docker `builder`, qui
contient les outils absents des images de production.
