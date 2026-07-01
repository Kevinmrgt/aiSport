# B2-A16 - Preuve qualité build/lint/typecheck - 2026-06-30

Compétences liées : C2.1.1 et C2.1.2 - environnements de test, qualité et intégration continue.

Commandes exécutées depuis la racine du projet :

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Résultats :

| Commande | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` | Succès, lockfile respecté |
| `pnpm typecheck` | Succès sur shared, api et web |
| `pnpm lint` | Succès, aucune erreur ESLint |
| `pnpm build` | Succès, build shared, API et Next.js 15.5.18 |
| `git diff --check` | Succès, aucun whitespace error |

Conclusion : la chaîne qualité locale est exploitable comme preuve de non-régression avant dépôt.
