# B2-A39 - Correction des avis de dépendances du 22 juillet 2026

> Compétences : C2.1.2, C2.2.3, C2.3.2
> Version publiée : `0.13.0-rc.4`
> Date du contrôle : 2026-07-22
> Statut : correction publiée, CI/CD verte et healthchecks de production validés.

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

## Publication et validation distante

La pull request `#47` a fusionné la correction dans `main`. Le SHA applicatif
`ea703aef912ce9e7c49c4c9b7872a5a7b595b666` a passé les contrôles suivants :

| Contrôle distant | Résultat |
| ---------------- | -------- |
| CI de la pull request `29906947215` | 6 jobs réussis |
| CI `main` `29907294766` | 6 jobs réussis |
| CD `29907642144` | migration, API, Web et smoke tests réussis |
| API `/health` | HTTP 200, version `0.13.0-rc.4` |
| API `/health/ready` | HTTP 200, base et configuration IA `ok` |
| Web `/api/health` | HTTP 200, version `0.13.0-rc.4` |

La contre-recette d'accessibilité authentifiée a ensuite réussi à **33/33** et
le zoom natif à **16/16** sur la production `rc.4`.

## Portée et limite

Les avis Hono concernaient notamment des modules ou adaptateurs non utilisés
directement par Alcide, et les images traitées par Next.js sont des ressources
locales. La correction a néanmoins été appliquée sans dérogation, car la règle
qualité du projet refuse toute vulnérabilité connue à partir du niveau `low`.

Cette annexe prouve à la fois la correction locale et son passage réel dans la
chaîne CI/CD. Elle ne remplace pas l'écoute humaine au lecteur d'écran ni la
qualification humaine du dernier contexte de contraste composite conservé en
réserve dans B2-A40.
