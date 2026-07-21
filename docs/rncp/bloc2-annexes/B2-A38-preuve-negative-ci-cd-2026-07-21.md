# B2-A38 - Preuve négative CI/CD courante sur branche isolée

> Date : 2026-07-21
> Compétences : C2.1.2, C2.2.4, C2.3.1 et C2.3.2
> Scénario : CR-062 - empêcher tout déploiement de production après une CI rouge

## Objectif et garde-fous

Le test devait provoquer un échec réel de la CI courante sans pousser de commit
défaillant sur `main` et sans modifier la production. Une branche isolée et une
pull request brouillon, explicitement non fusionnable, ont donc été utilisées :

- branche : `codex/rncp-cd-gate-proof-v7` ;
- commit volontairement rouge : `ef393f873ce3337c4ba83b84cf75eb5ce07549b4` ;
- pull request brouillon `#46`, fermée après collecte des preuves ;
- unique défaut injecté : variable TypeScript inutilisée dans un fichier de
  preuve temporaire, soit une erreur `@typescript-eslint/no-unused-vars`.

Le test ne modifie ni la branche `main`, ni les migrations, ni les secrets, ni
les applications de production.

## Résultat GitHub Actions

| Contrôle | Résultat observé |
| --- | --- |
| CI courante | run `29856584668`, événement `pull_request`, conclusion `failure` |
| Job fautif | `Lint and typecheck` `88722310839`, échec à l'étape ESLint après installation, build shared et typecheck réussis |
| Audit sécurité | job `88722310861`, succès |
| Tests unitaires et couverture | job `88722490150`, `skipped` |
| Build packages | job `88722490096`, `skipped` |
| E2E smoke et accessibilité | job `88722489720`, `skipped` |
| Build Docker | job `88722490652`, `skipped` |
| Runs associés au SHA | un seul run : `CI - Alcide` `29856584668` ; aucun run `CD - Vercel` |

Le workflow de production écoute uniquement les fins de CI dont la branche de
tête est `main`. Une CI rouge de pull request n'engendre donc aucun workflow CD.
Cette absence est un résultat attendu de la politique, pas un job CD présenté à
tort comme `skipped`.

## Inventaire Vercel production avant/après

L'inventaire a été lu avec Vercel CLI `54.17.2`, filtre
`--environment production --format json`, avant la création de la PR puis après
la fin de la CI rouge.

| Projet | Dernier déploiement production avant | Dernier déploiement production après | Décision |
| --- | --- | --- | --- |
| API `ai-sport-api` | `ai-sport-beo6pvdnl-kevinmrgts-projects.vercel.app`, `READY`, créé à `1784650955064`, SHA `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02` | valeurs strictement identiques | aucun nouveau déploiement production |
| Web `ai-sport-web` | `ai-sport-hbjk1xwvs-kevinmrgts-projects.vercel.app`, `READY`, créé à `1784651047559`, SHA `b3ca385c0014c6acfd5c29ebbe14fa38ca766c02` | valeurs strictement identiques | aucun nouveau déploiement production |

La vérification concerne la cible `production`. La preview Web de la pull
request est restée distincte et ne constitue pas un déploiement production.

## Test automatique de non-contournement

Le script `scripts/cd-workflow-policy.test.mjs` exécute six contrôles :

1. déclencheur `workflow_run` sur `CI - Alcide`, branche `main`, type `completed` ;
2. absence de `workflow_dispatch` dans le CD ;
3. conditions `conclusion == 'success'` et `ENABLE_GHA_VERCEL_CD == 'true'`
   sur `migrate-db`, `deploy-api` et `deploy-web` ;
4. checkout du `head_sha` exact de la CI pour chaque job ;
5. simulation `failure`, `cancelled` et `skipped` : décision de déploiement fausse ;
6. tests mutants : détection d'un déclencheur manuel ou du retrait de la gate.

Résultat local : **6/6 réussis**. Le contrôle est ajouté à la CI par la commande
`pnpm test:cd-policy`.

## Conclusion et portée

CR-062 est fermé par combinaison de preuves :

- chemin positif de production `29845956008` vers `29846343559` ;
- ancienne preuve `main` rouge `28506873066` vers CD `28506912686` `skipped` ;
- CI rouge courante réellement exécutée sur une PR isolée, aucun run CD associé ;
- inventaires Vercel production API/Web inchangés avant/après ;
- six tests de politique sur le YAML courant.

La limite est conservée : aucun commit volontairement rouge n'a été poussé sur
`main`, car cette manipulation dégraderait inutilement la branche et pourrait
perturber les utilisateurs. Le dossier ne prétend donc pas avoir reproduit ce
risque destructif à l'identique.
