# B2-A23 — Sécurité des dépendances et unicité de la CD

> Date d'exécution locale : 2026-07-20
> Candidate : `0.13.0-rc.2`
> SHA applicatif validé et déployé : `4151b80cc6d164c38549e753f7b960ec4914f519`

> Cette preuve reste exacte pour sa date. Les avis publiés ensuite et leur
> correction du 2026-07-21 sont consignés dans B2-A27.

## Objet

Cette annexe consigne uniquement les contrôles réellement exécutés après deux
corrections : suppression des doubles déploiements Vercel de production et
traitement des six alertes low/moderate du lockfile précédent.

## Politique Vercel vérifiée

- les previews de pull request restent pilotées par l'intégration Git Vercel ;
- un build Git avec `VERCEL_ENV=production` est ignoré ;
- `VERCEL_FORCE_BUILD=1` autorise le chemin GitHub Actions canonique ;
- les changements de lockfile ou de configuration partagée déclenchent bien les
  previews API et Web.

Commande :

```text
pnpm test:vercel-ignore
```

Résultat observé après ajout des contrôles CLI : 8 tests exécutés, 8 réussis,
code de sortie 0. Les deux derniers tests lancent le script réel dans un
processus Node et vérifient ses codes de sortie.

## Audit et compatibilité

| Commande                                   | Résultat réel                             |
| ------------------------------------------ | ----------------------------------------- |
| `pnpm install --frozen-lockfile`           | code 0                                    |
| `pnpm audit --audit-level=low`             | code 0, `No known vulnerabilities found`  |
| `pnpm audit --prod --audit-level=low`      | code 0, `No known vulnerabilities found`  |
| `pnpm lint`                                | code 0, aucune erreur ESLint              |
| `pnpm typecheck`                           | code 0 pour shared, API et Web            |
| `pnpm test`                                | 91 tests API + 39 tests Web = 130 réussis |
| `pnpm build`                               | builds shared, API et Next.js réussis     |
| `pnpm --filter api exec drizzle-kit check` | code 0, `Everything's fine`               |

Versions de correction résolues dans `pnpm-lock.yaml` : Babel `8.0.1`,
brace-expansion `5.0.6`, esbuild `0.25.12` et `0.28.1`, js-yaml `4.3.0`,
PostCSS `8.5.20`.

## Validation distante et production

| Preuve              | Résultat réel                                                     |
| ------------------- | ----------------------------------------------------------------- |
| CI `main`           | run `29740673466`, succès sur les 6 jobs                          |
| Audit distant       | succès avec seuil bloquant `low`                                  |
| CD Vercel           | run `29740979781`, migration + API + Web réussis                  |
| Intégration Git API | production automatique `dpl_5mrSuitYwdKEmwpvzh7vU9Cp9BFB` annulée |
| CD canonique API    | production `dpl_GKNpqDoHMHkBwUSfMyWZa7q7iUXZ` prête               |
| Intégration Git Web | production automatique `dpl_5xgYantaAdLn89GDgRgDSwuUmrPt` annulée |
| CD canonique Web    | production `dpl_3dryqiaD8LB7d4cYSYDuBVR7gTVM` prête               |

Pour ce SHA, un seul déploiement de production a donc abouti par projet. Les
deployments Web `target=null` observés dans la même période sont des previews
Dependabot et ne sont pas comptés comme productions.

## Limite explicite

Cette preuve ne couvre pas la saisie d'un compte Google, les parcours métier
authentifiés ni l'audit humain RGAA avec lecteur d'écran.
