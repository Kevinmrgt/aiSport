# B2-A31 - Couverture autonome du package `shared`

> Date : 2026-07-21
> Commit technique : `81b2b0bd6afa0cf3a33cca6d7ee045ae5808709d`
> CI de pull request : [run 29819423534](https://github.com/Kevinmrgt/aiSport/actions/runs/29819423534)

## Écart corrigé

Les contrats `shared` étaient exercés indirectement depuis les tests API, mais
ne disposaient ni d'une suite autonome ni d'un rapport de couverture séparé.
Le dossier ne pouvait donc pas chiffrer honnêtement ce périmètre.

## Harnais ajouté

La suite `packages/shared/tests/schemas.test.ts` couvre :

- cohérence de la durée détaillée d'une séance ;
- bornes des formulaires séance et programme ;
- numérotation des semaines et séances ;
- nombre de semaines et de séances ;
- durée annoncée et durée détaillée des programmes ;
- références autorisées pour un journal de séance simple ou de programme.

Commande :

```text
pnpm --filter shared test:coverage
```

## Résultat local et CI

| Indicateur       |      Résultat |
| ---------------- | ------------: |
| Fichiers de test |    1/1 réussi |
| Tests            | 14/14 réussis |
| Statements       |         100 % |
| Lignes           |         100 % |
| Fonctions        |         100 % |
| Branches         |       92,85 % |

Le job `Unit tests and coverage` du run `29819423534` a réussi et a publié
l'artefact `coverage-report-shared`. La CI continue de publier séparément les
rapports API, Web et PostgreSQL ; les taux ne sont pas fusionnés artificiellement.

Les fichiers de types TypeScript sans code runtime sont compilés par `tsc` et
ne sont pas inclus dans le taux V8 des schémas exécutables.
