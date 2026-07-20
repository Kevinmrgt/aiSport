# CI/CD — Alcide

> Version candidate mise à jour le 2026-07-20. Les anciens runs restent
> historiques et ne prouvent pas cette version.

## Cibles

| Composant | Plateforme | URL canonique |
|---|---|---|
| Web Next.js | Vercel | `https://ai-sport-web.vercel.app` |
| API Hono | Vercel | `https://ai-sport-api.vercel.app` |
| PostgreSQL | Neon | secret `DATABASE_URL` |

## Séquence CI

Le workflow `.github/workflows/ci.yml` s'exécute sur push `main`/`develop`, PR
vers `main` et lancement manuel de contrôle. Ses gates sont :

1. installation pnpm figée par `pnpm-lock.yaml` ;
2. build de `packages/shared` ;
3. typecheck et lint du monorepo ;
4. démarrage d'un PostgreSQL 16 de test ;
5. application des migrations Drizzle ;
6. tests et couvertures unitaires API/Web ;
7. tests d'intégration repositories avec PostgreSQL réel et rapport séparé ;
8. build de production shared/API/Web ;
9. Playwright public et axe ;
10. build des images Docker ;
11. `pnpm audit --audit-level=high`, désormais bloquant.

Les rapports API, intégration DB, Web et Playwright sont publiés comme artefacts
distincts. Un pourcentage de couverture n'est jamais présenté sans son
périmètre et ses exclusions.

## Playwright authentifié

Les tests authentifiés exigent `PLAYWRIGHT_AUTH_STORAGE`, un fichier
`storageState` contenant un cookie Auth.js réel et valide. La fausse fixture vide
a été supprimée. Sans cet état, la commande authentifiée échoue explicitement ;
le smoke public ne prétend donc plus couvrir ce parcours.

Commande :

```bash
PLAYWRIGHT_AUTH_STORAGE=/chemin/session-auth.json pnpm --filter web test:e2e:authenticated
```

Ce fichier contient un secret de session : il ne doit jamais être committé ni
joint au dossier. Seul le rapport Playwright expurgé est conservé.

## Déploiement continu

`.github/workflows/deploy-vercel.yml` n'offre plus de déclenchement manuel qui
contourne les gates. Le déploiement se lance uniquement après un workflow
`CI - Alcide` réussi sur `main` et lorsque `ENABLE_GHA_VERCEL_CD=true`.

Séquence :

1. checkout du `head_sha` de la CI réussie ;
2. validation des secrets Vercel ;
3. `vercel pull`, build et déploiement API ;
4. smoke/readiness API ;
5. build et déploiement Web ;
6. smoke Web.

La CLI Vercel est figée par `VERCEL_CLI_VERSION`. Les migrations de production
restent un workflow manuel rattaché à l'environnement GitHub `Production`, à
exécuter avant le déploiement lorsque le schéma change. Au relevé du 2026-07-20,
cet environnement n'avait ni règle de protection ni approbateur : il ne faut
donc pas présenter ce rattachement comme une validation humaine bloquante.
Le workflow CD ne dépend pas techniquement du workflow de migration : quand le
schéma change, l'opérateur doit exécuter et vérifier la migration avant de
déclencher le chemin qui mènera au CD. Cet ordre n'est pas garanti par GitHub.

## Secrets et variables

Secrets CD :

- `VERCEL_TOKEN` ;
- `VERCEL_ORG_ID` ;
- `VERCEL_API_PROJECT_ID` ;
- `VERCEL_WEB_PROJECT_ID`.

Secrets applicatifs :

- Web : `SERVICE_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL` ;
- API : `DATABASE_URL`, `SERVICE_SECRET`, `OPENAI_API_KEY`, `FRONTEND_URL`.

`SERVICE_SECRET` doit être identique côté Web/API et faire l'objet d'une
rotation coordonnée.

## Health et readiness

- `/health` : liveness du processus API, sans promesse sur ses dépendances ;
- `/health/ready` : accès PostgreSQL et configuration OpenAI ;
- `/api/health` : liveness Web.

Le smoke de production doit utiliser readiness pour l'API lorsque toutes les
dépendances métier sont attendues. Un simple liveness 200 ne suffit pas à
valider la génération, l'authentification ou la base.

## Rollback

Pour Web/API, promouvoir dans Vercel le dernier déploiement sain identifié par
SHA. Pour PostgreSQL, privilégier les migrations additives ; avant une migration
sensible, créer une branche/backup Neon et préparer une migration compensatoire.

Après rollback, rejouer liveness, readiness et le parcours métier concerné.

## État des preuves

Le run CI `29489995458` et le run CD en échec `29490217892` décrivent l'état du
2026-07-16. Ils ne doivent pas être réutilisés comme validation de la version
candidate. Le manifeste final recevra les nouveaux liens CI/CD du SHA remis.
