# CI/CD — Alcide

> Version de référence mise à jour le 2026-07-22. Les preuves distinguent le SHA
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

Le chemin positif de la baseline corrective courante est prouvé sur
`c63439e8ac8d68efd5ba091211b326ee8575fbba` par la CI `29930722308`, puis la
CD `29931146789` : migration, API, Web et smoke tests sont réussis. Le repère
documentaire `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02`, descendant sans changement
applicatif de `b002adb`, a ensuite passé la CI `29847808450` et la CD
`29848187523`. Cette seconde exécution ne remplace pas la contre-recette métier
et accessibilité de `b002adb` ; elle confirme que le snapshot documentaire
n'introduit aucune régression dans la chaîne complète.

### Preuve négative et clôture maîtrisée de CR-062

Une exécution historique apporte une preuve dynamique de la condition d'échec :

- CI `28506873066`, push `main` sur `5c2cf08c56794bcf2885e69713b7bddd8521ae87`,
  conclue `failure` après l'échec ESLint ;
- CD `28506912686`, événement `workflow_run` sur le même SHA, conclue `skipped` ;
- ses jobs `Deploy API to Vercel` et `Deploy Web to Vercel` sont `skipped` et
  ne contiennent aucune étape exécutée.

Ces éléments prouvent l'absence d'exécution du CD GitHub Actions historique.
La version courante a été contre-recettée sans pousser de commit défaillant sur
`main` : la PR brouillon isolée `#46`, SHA `ef393f8`, a produit la CI rouge
`29856584668` sur l'erreur ESLint volontaire. Les jobs tests, build, E2E et
Docker sont `skipped`, aucun run CD n'est associé au SHA et la PR a été fermée
sans fusion.

Les inventaires Vercel `production` ont été relevés avant et après : le dernier
déploiement API reste `ai-sport-beo6pvdnl-kevinmrgts-projects.vercel.app`, et le
dernier Web reste `ai-sport-hbjk1xwvs-kevinmrgts-projects.vercel.app`, tous deux
sur `b3ca385`, avec les mêmes dates de création. Aucune production n'a été
ajoutée. La preview de PR est distincte de la cible production.

Enfin, `pnpm test:cd-policy` passe 6/6 et vérifie le déclencheur `workflow_run`
sur `main`, l'absence de `workflow_dispatch`, la condition de succès, la gate
d'activation et le checkout du `head_sha` sur `migrate-db`, `deploy-api` et
`deploy-web`. B2-A38 conserve les sorties et les limites. CR-062 est fermé par
cette combinaison de preuves, sans prétendre qu'un commit rouge a été poussé
sur `main`.

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
| Baseline applicative corrective `rc.5` | `c63439e8ac8d68efd5ba091211b326ee8575fbba` | `29930722308` succès | `29931146789` succès | Preuve canonique des correctifs NVDA, de leurs tests et de leur déploiement |
| Baseline applicative corrective `rc.4` | `ea703aef912ce9e7c49c4c9b7872a5a7b595b666` | `29907294766` succès | `29907642144` succès | Preuve canonique des dépendances, du reflow, du focus, des onglets et de leur déploiement |
| Snapshot documentaire `v5` | `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02` | `29847808450` succès | `29848187523` succès | Diff avec `b002adb` limité aux documents/PDF ; chaîne complète rejouée avant la correction documentaire `v6` |
| Chemin rouge courant isolé | `ef393f873ce3337c4ba83b84cf75eb5ce07549b4` | `29856584668` échec | aucun run associé, conformément au filtre de branche | PR `#46` fermée sans fusion ; quatre jobs aval ignorés et inventaires Vercel production inchangés, B2-A38 |
| Chemin rouge historique | `5c2cf08c56794bcf2885e69713b7bddd8521ae87` | `28506873066` échec | `28506912686` skipped | API/Web non exécutés dans GitHub Actions ; pas de relevé Vercel avant/après ; ancien workflow encore lançable manuellement |

Le run CI `29489995458` et le run CD en échec `29490217892` décrivent un ancien
incident de configuration Vercel sur le SHA `533f17b` : la CI était verte et la
CD a démarré, puis a échoué pendant `vercel pull`. Ils ne constituent donc pas
une preuve « CI rouge ⇒ CD bloquée » et restent historiques.
