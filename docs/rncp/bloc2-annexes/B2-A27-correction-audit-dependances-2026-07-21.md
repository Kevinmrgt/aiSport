# B2-A27 - Correction de nouveaux avis de sécurité des dépendances

> Date : 2026-07-21
>
> Commit testé : `d149076e32b6e48c1bd0811060a5ad726451ed83`
>
> Compétences : C2.1.2, C2.2.3 et C2.3.2

## Anomalie détectée

Le run CI
[`29815728217`](https://github.com/Kevinmrgt/aiSport/actions/runs/29815728217)
a échoué dans le job `Security audit` avec quatre vulnérabilités `high` :

- trois branches de `brace-expansion`, avis
  [`GHSA-3jxr-9vmj-r5cp`](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) ;
- `shell-quote` 1.8.4, avis
  [`GHSA-395f-4hp3-45gv`](https://github.com/advisories/GHSA-395f-4hp3-45gv).

Ces avis de déni de service ont été publiés dans la base GitHub Advisory le
2026-07-20. Ils n'étaient donc pas couverts par la preuve historique B2-A23.
Aucune exploitation n'a été observée ; l'échec provient du contrôle bloquant
`pnpm audit --audit-level=low`.

## Correction appliquée

Les overrides transitifs ont été limités aux plages vulnérables et remplacés
par les premières versions publiées corrigées :

| Dépendance | Versions corrigées utilisées | Dépendances parentes observées |
| --- | --- | --- |
| `brace-expansion` | 1.1.16, 2.1.2 et 5.0.7 | `minimatch` 3, 9 et 10 |
| `shell-quote` | 1.9.0 | `concurrently` et `gel`/`drizzle-orm` |

La version 1.8.5 de `shell-quote`, initialement mentionnée par la sortie d'audit
comme borne corrigée, n'existe pas dans le registre npm. Elle n'a pas été
inventée ni ajoutée au lockfile : la première version corrigée publiée selon
l'avis GitHub est 1.9.0.

## Vérifications réelles

Les commandes locales suivantes ont réussi :

```powershell
pnpm install --frozen-lockfile
pnpm audit --audit-level=low
pnpm exec concurrently "node --version" "node --version"
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Résultats : aucune vulnérabilité connue, smoke `concurrently` réussi, 155 tests
API et 43 tests Web réussis, build de production réussi.

La CI de PR
[`29816347653`](https://github.com/Kevinmrgt/aiSport/actions/runs/29816347653)
a ensuite terminé avec les six jobs verts : audit de sécurité, lint/typecheck,
tests et couvertures avec PostgreSQL, E2E public/accessibilité, builds des
packages et images Docker.

## Limite

Les avis de dépendances évoluent après chaque gel. Cette preuve décrit l'état du
registre et du lockfile le 2026-07-21 ; le job bloquant doit rester actif pour
détecter les avis ultérieurs.
