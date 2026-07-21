# CI/CD — Alcide

> Version candidate mise à jour le 2026-07-21. Les preuves distinguent le SHA
> applicatif correctif, le repère documentaire et le SHA finalement archivé.

## Cibles

| Composant   | Plateforme | URL canonique                     |
| ----------- | ---------- | --------------------------------- |
| Web Next.js | Vercel     | `https://ai-sport-web.vercel.app` |
| API Hono    | Vercel     | `https://ai-sport-api.vercel.app` |
| PostgreSQL  | Neon       | secret `DATABASE_URL`             |

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
11. `pnpm audit --audit-level=low`, désormais bloquant ;
12. test unitaire de la politique d'ignorance Vercel.

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

L'intégration Git Vercel reste connectée pour les previews. Son build automatique
est ignoré en production par `scripts/vercel-ignore-build.mjs` lorsque
`VERCEL_ENV=production`. Le workflow GitHub Actions définit
`VERCEL_FORCE_BUILD=1` et reste l'unique chemin nominal de mise en production.
Cette règle est couverte par `pnpm test:vercel-ignore`.

Séquence :

1. checkout du `head_sha` de la CI réussie ;
2. validation du secret `DATABASE_URL` et application des migrations Drizzle ;
3. validation des secrets Vercel ;
4. `vercel pull`, build et déploiement API ;
5. smoke/readiness API ;
6. build et déploiement Web ;
7. smoke Web.

La CLI Vercel est figée par `VERCEL_CLI_VERSION`. Le job `migrate-db` est une
dépendance bloquante de `deploy-api`, lui-même préalable à `deploy-web` : une
migration échouée arrête donc le déploiement. Le workflow manuel
`DB - Drizzle migrations` reste disponible pour une intervention contrôlée ou
une reprise. Au relevé du 2026-07-20, l'environnement GitHub `production`
n'avait ni règle de protection ni approbateur : il ne faut pas présenter ce
rattachement comme une validation humaine bloquante.

Le chemin positif de la baseline corrective est prouvé sur
`b002adb0e0e7d8d85ee493d54879e190d77d2078` par la CI `29845956008`, puis la
CD `29846343559` : migration, API, Web et smoke tests sont réussis. Le repère
documentaire `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02`, descendant sans changement
applicatif de `b002adb`, a ensuite passé la CI `29847808450` et la CD
`29848187523`. Cette seconde exécution ne remplace pas la contre-recette métier
et accessibilité de `b002adb` ; elle confirme que le snapshot documentaire
n'introduit aucune régression dans la chaîne complète.

### Preuve négative et limite de CR-062

Une exécution historique apporte une preuve dynamique de la condition d'échec :

- CI `28506873066`, push `main` sur `5c2cf08c56794bcf2885e69713b7bddd8521ae87`,
  conclue `failure` après l'échec ESLint ;
- CD `28506912686`, événement `workflow_run` sur le même SHA, conclue `skipped` ;
- ses jobs `Deploy API to Vercel` et `Deploy Web to Vercel` sont `skipped` et
  ne contiennent aucune étape exécutée.

Ces éléments prouvent l'absence d'exécution du CD GitHub Actions. Aucun relevé
Vercel avant/après ce run historique n'est conservé pour démontrer séparément
que l'inventaire de production est resté identique.

Cette preuve du 2026-07-01 ne suffit pas, seule, à déclarer la politique
courante entièrement contre-recettée : la version du workflow à cette date
acceptait encore `workflow_dispatch`, donc un lancement manuel pouvait
contourner la provenance CI. Dans la version actuelle, ce déclencheur a été
supprimé et les trois jobs `migrate-db`, `deploy-api` et `deploy-web` portent la
condition `workflow_run.conclusion == 'success'` avec
`ENABLE_GHA_VERCEL_CD=true`. Le chemin positif actuel est exécuté ; le chemin
rouge actuel est vérifié statiquement mais n'a pas été provoqué pour la remise.
CR-062 reste donc documenté avec cette réserve, sans fabriquer de CI rouge.

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

| Nature | SHA | CI | CD | Portée |
| ------ | --- | -- | -- | ------ |
| Baseline applicative corrective | `b002adb0e0e7d8d85ee493d54879e190d77d2078` | `29845956008` succès | `29846343559` succès | Preuve canonique du correctif de reflow et de son déploiement |
| Snapshot documentaire `v5` | `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02` | `29847808450` succès | `29848187523` succès | Diff avec `b002adb` limité aux documents/PDF ; chaîne complète rejouée avant la correction documentaire `v6` |
| Chemin rouge historique | `5c2cf08c56794bcf2885e69713b7bddd8521ae87` | `28506873066` échec | `28506912686` skipped | API/Web non exécutés dans GitHub Actions ; pas de relevé Vercel avant/après ; ancien workflow encore lançable manuellement |

Le run CI `29489995458` et le run CD en échec `29490217892` décrivent un ancien
incident de configuration Vercel sur le SHA `533f17b` : la CI était verte et la
CD a démarré, puis a échoué pendant `vercel pull`. Ils ne constituent donc pas
une preuve « CI rouge ⇒ CD bloquée » et restent historiques.
