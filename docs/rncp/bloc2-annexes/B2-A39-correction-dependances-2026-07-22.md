# B2-A39 - Correction des avis de dépendances du 22 juillet 2026

> Compétences : C2.1.2, C2.2.3, C2.3.2
> Version candidate locale : `0.13.0-rc.4`
> Date du contrôle : 2026-07-22
> Statut : correction locale validée ; CI, CD et contre-recette de production à
> consigner après publication autorisée de la branche.

## Anomalie détectée

Le paquet `0.13.0-rc.3` avait passé l'audit le 21 juillet 2026. Un nouvel audit
du lockfile le 22 juillet a cependant terminé avec le code 1 et cinq avis
publiés depuis le gel précédent :

- un avis `high` sur `sharp < 0.35.0`, hérité par Next.js ;
- trois avis `moderate` sur `hono < 4.12.27` ;
- un avis `moderate` sur `@hono/node-server < 2.0.5`.

Cette détection ne rend pas fausse la sortie historique datée du 21 juillet,
mais elle rendait obsolète l'affirmation « aucune vulnérabilité connue » pour
la candidate remise le lendemain. Le job d'audit CI étant volontairement
bloquant dès le niveau `low`, une nouvelle CI aurait échoué.

## Correction appliquée

| Dépendance | Résolution corrigée | Mode de correction |
| ---------- | ------------------: | ------------------ |
| `sharp` | `0.35.3` | override centralisé dans `pnpm-workspace.yaml` |
| `hono` | `4.12.31` | dépendance directe API |
| `@hono/node-server` | `2.0.11` | dépendance directe API avec validation du changement majeur |

La version racine, API et Web est passée à `0.13.0-rc.4`. Les valeurs de repli
des healthchecks et leur test de non-régression ont été alignés. Le lockfile a
été régénéré par pnpm 11.9.0. L'override `sharp` est placé dans
`pnpm-workspace.yaml`, emplacement effectivement pris en charge par cette
version de pnpm.

## Résultats locaux reproductibles

```text
pnpm audit --prod --audit-level=low
No known vulnerabilities found

pnpm --filter web why sharp
sharp@0.35.3
Found 1 version of sharp

pnpm --filter api list hono @hono/node-server --depth 0
hono@4.12.31
@hono/node-server@2.0.11
```

La validation complète locale a également réussi :

| Contrôle | Résultat |
| -------- | -------- |
| installation pnpm | réussie |
| lint | réussi |
| typecheck shared/API/Web | réussi |
| tests shared | 14/14 |
| tests API | 170/170 |
| tests Web | 55/55 |
| total | 239/239 |
| build shared/API/Next.js | réussi |

## Portée et limite

Les avis Hono concernaient notamment des modules ou adaptateurs non utilisés
directement par Alcide, et les images traitées par Next.js sont des ressources
locales. La correction a néanmoins été appliquée sans dérogation, car la règle
qualité du projet refuse toute vulnérabilité connue à partir du niveau `low`.

Cette annexe prouve l'état local du lockfile et de la candidate. Elle ne doit
pas être présentée comme une preuve de déploiement. Les identifiants de la
nouvelle CI, de la CD et la vérification des healthchecks `0.13.0-rc.4` devront
être ajoutés uniquement après leur exécution réelle.
