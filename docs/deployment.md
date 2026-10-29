# Déploiement

## Cibles configurées

| Composant | Cible                                         |
| --------- | --------------------------------------------- |
| Web       | Vercel, `https://ai-sport-web.vercel.app`     |
| API       | Vercel, `https://ai-sport-api.vercel.app`     |
| Données   | PostgreSQL Neon, connexion via `DATABASE_URL` |

Ces adresses décrivent la configuration du dépôt. Un état de production doit
être vérifié sur la révision effectivement servie après chaque livraison.
Runtime : Node.js 24, pnpm 11.9. Voir [ci-cd.md](ci-cd.md).

## Configuration

Web : `API_URL`, `NEXT_PUBLIC_API_URL`, `SERVICE_SECRET`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`.
API : `DATABASE_URL`, `SERVICE_SECRET`, `OPENAI_API_KEY`, `FRONTEND_URL`,
`NODE_ENV=production`.

`SERVICE_SECRET` doit être identique sur le Web et l'API. La clé OpenAI reste
sur l'API. Les valeurs `NEXTAUTH_URL`, `FRONTEND_URL` et la redirection OAuth
Google doivent correspondre à l'origine Web livrée.
La redirection est `/api/auth/callback/google`.

Ne jamais versionner les fichiers d'environnement, cookies ou secrets.

## Livraison nominale

1. Vérifier les changements et la CI sur la révision prévue.
2. Le workflow `CD - Vercel`, activé par `ENABLE_GHA_VERCEL_CD=true`, se lance
   après une CI réussie sur `main`.
3. Appliquer les migrations, puis déployer l'API, puis le Web.
4. Vérifier les healthchecks et le parcours utilisateur concerné.

Secrets GitHub : `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID`,
`VERCEL_WEB_PROJECT_ID`, `DATABASE_URL`.
Le workflow manuel `DB - Drizzle migrations` sert aux reprises contrôlées.

Les migrations déjà appliquées restent versionnées avec leurs snapshots et
leur journal. La table historique `generation_quotas` reste dans le schéma ;
aucun parcours applicatif ne l'utilise. Sa suppression éventuelle nécessite
une nouvelle migration, préparée avec sauvegarde et retour arrière.

## Contrôle après livraison

- API : `/health` puis `/health/ready`.
- Web : `/api/health` et page d'accueil.
- Vérifier la version renvoyée et le SHA du déploiement dans Vercel/Actions.
- Tester connexion Google, génération, consultation et suppression avec un
  compte de test dédié. Retirer ensuite les données de recette.

Un healthcheck de processus ne valide ni OAuth, ni la génération, ni
l'ensemble du parcours métier.

## Reprise

Identifier le dernier déploiement sain et son SHA, puis le promouvoir dans
Vercel. Les migrations ne sont pas annulées par un rollback Web/API : préparer
une migration compensatoire ou restaurer une sauvegarde de base si nécessaire.
Rejouer readiness et le parcours impacté.

## Autohébergement

Le [README](../README.md) décrit Docker Compose pour le développement.
Pour une exposition publique, configurer HTTPS, secrets, accès PostgreSQL,
sauvegardes et alertes ; remplacer les identifiants locaux du Compose.
Les services `migrate` et `seed` utilisent le stage Docker `builder`, qui
contient les outils absents des images de production.
