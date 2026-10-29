# Tests et recette

## Contrôles locaux et CI

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:vercel-ignore
pnpm test:cd-policy
pnpm test:e2e:auth-policy
pnpm test:e2e:smoke
```

Le smoke public démarre un Web local et teste Chromium et Firefox. Il ne
prétend pas valider une connexion Google réelle.

Pour PostgreSQL, fournir `TEST_DATABASE_URL` pointant vers une base dédiée,
appliquer les migrations via `DATABASE_URL` sur cette même base, puis lancer :

```bash
pnpm --filter api test:integration:coverage
```

Ne jamais cibler une base utilisateur : les tests créent puis suppriment leurs
fixtures. Sans `TEST_DATABASE_URL`, ils sont ignorés et ne prouvent rien sur DB.

## Suites complémentaires

- `apps/api/vitest.security.config.ts` : sécurité avec PostgreSQL réel.
- `apps/web/playwright.accessibility.config.ts` : accessibilité public/privé.
- `apps/web/playwright.recipes.config.ts` : scénarios métier authentifiés.
- `pnpm test:e2e:authenticated` : parcours Google avec session réelle.

Les suites authentifiées exigent `PLAYWRIGHT_AUTH_STORAGE`. Suivre
[testing-authenticated-e2e.md](testing-authenticated-e2e.md) et utiliser un
compte de test dédié. Elles peuvent modifier ses données.

`pnpm test:e2e:evidence` enregistre les captures publiques dans
`tmp/browser-evidence`, jamais dans les sources documentaires.
Les outils `e2e-native-zoom-audit.mjs`, `e2e-contrast-incomplete-audit.mjs`,
`e2e-contrast-composite-sampling.mjs` et `scripts/a11y-contrast-sampling.ps1`
complètent les contrôles d'accessibilité. Le zoom accepte
`A11Y_ZOOM_SCOPE=public` et `A11Y_ZOOM_WRAP_FIX_PREVIEW=1` pour le diagnostic.

## Recette avant livraison

| Parcours                                      | Résultat attendu                                                |
| --------------------------------------------- | --------------------------------------------------------------- |
| Page publique et connexion                    | Pages lisibles, Google proposé, erreurs génériques              |
| Route privée sans session                     | Redirection vers la connexion                                   |
| Connexion Google                              | Session réelle et identité stable                               |
| Génération de séance/programme                | Champs validés, persistance et détail cohérent                  |
| Échec IA                                      | Message compréhensible, reprise possible, aucun résultat fictif |
| Ressource d'un autre utilisateur              | Accès refusé                                                    |
| Timer                                         | Pause/reprise, durée cohérente et focus préservé                |
| Journal et tableau de bord                    | Ressenti enregistré et activité actualisée                      |
| Suppression                                   | Confirmation, suppression effective et retour accessible        |
| Déconnexion                                   | Session terminée et routes privées protégées                    |
| Petit écran, clavier, zoom et lecteur d'écran | Information utilisable                                          |

Chaque recette consigne date, SHA, environnement, commande ou testeur,
résultat et anomalies. Une revue du code ne remplace pas une exécution.
