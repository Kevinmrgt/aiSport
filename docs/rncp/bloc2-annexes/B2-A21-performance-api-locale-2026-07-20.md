# B2-A21 — Mesure locale des healthchecks API du 2026-07-20

## Portée

- Compétence concernée : C2.1.1.
- Exécution réelle le 2026-07-20 vers 10:22 Europe/Paris.
- Version déclarée par l'API : `0.13.0-rc.1`.
- État Git : candidate locale non commitée ; cette annexe ne prouve pas le futur
  SHA final ni la performance de production.
- Runtime : Node.js 24.14.0 sous Windows.
- Base : PostgreSQL 16.14 locale dans le conteneur `alcide-db` sain.

## Protocole réellement exécuté

L'API préalablement construite par `pnpm build` a été lancée avec
`apps/api/dist/src/index.js`. Après cinq requêtes de préchauffage par route, un
script Node a envoyé 50 requêtes séquentielles vers chaque URL en mesurant la
durée côté client avec `performance.now()` :

- `http://127.0.0.1:3001/health` ;
- `http://127.0.0.1:3001/health/ready`.

Le serveur a été arrêté après la mesure et son PID a été contrôlé avant arrêt.

## Résultats observés

| Route | Requêtes | HTTP | p50 | p95 | maximum |
|---|---:|---:|---:|---:|---:|
| `/health` | 50 | 200 | 3,77 ms | 8,18 ms | 9,94 ms |
| `/health/ready` | 50 | 200 | 8,61 ms | 36,35 ms | 43,32 ms |

La réponse readiness observée indiquait `database: ok` après une requête réelle
`select 1` sur PostgreSQL.

## Limites explicites

- il s'agit d'une mesure locale séquentielle, pas d'un test de charge ni d'une
  mesure Vercel/Neon ;
- aucune concurrence, génération IA, authentification ou page Web n'est mesurée ;
- `aiConfiguration: ok` vérifie uniquement qu'une variable
  `OPENAI_API_KEY` non vide est présente. Une valeur locale clairement factice a
  été utilisée pour éviter tout appel fournisseur : ce résultat ne prouve ni la
  validité de la clé ni la connectivité OpenAI ;
- la mesure devra être complétée par des sondes de production sur le SHA final.
