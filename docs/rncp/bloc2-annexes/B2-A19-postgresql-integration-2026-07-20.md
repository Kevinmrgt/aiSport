# B2-A19 — Intégration PostgreSQL réelle du 2026-07-20

## Portée et traçabilité

- Compétences concernées : C2.2.2 et C2.2.3.
- Environnement : Windows, Docker Desktop Engine 29.3.1, Node 24.14.0,
  pnpm 11.9.0.
- Image : `postgres:16-alpine`, digest
  `sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777`.
- Serveur interrogé : PostgreSQL 16.14, base et utilisateur `alcide`.
- État Git au moment du run : `69b21ef-dirty`.
- Cette annexe est une preuve locale de correction. Elle n'est pas une preuve du
  SHA final et ne remplace pas le run CI à archiver avant remise.

## Commandes réellement exécutées

```powershell
docker compose up -d postgres
docker exec alcide-db psql -U alcide -d alcide -Atc 'select version();'
$env:DATABASE_URL='postgresql://alcide:alcide_dev@127.0.0.1:5432/alcide'
pnpm --filter api db:migrate
$env:TEST_DATABASE_URL=$env:DATABASE_URL
pnpm --filter api test:integration:coverage
pnpm --filter api typecheck
```

Les valeurs factices nécessaires à l'interpolation globale de Compose ont été
limitées au processus qui démarrait uniquement `postgres`. Aucun service API ou
Web ne les a utilisées et elles n'ont été écrites dans aucun fichier.

## Résultats observés

- conteneur `alcide-db` : `running`, healthcheck `healthy` ;
- six migrations Drizzle présentes dans `drizzle.__drizzle_migrations` ;
- tables présentes : `accounts`, `session_logs`, `sessions`,
  `training_programs`, `user_settings`, `users`, `workouts` ;
- index métier présents : `workouts_user_created_idx`,
  `training_programs_user_created_idx`, `session_logs_user_completed_idx`,
  `session_logs_workout_idx`, `session_logs_program_idx` ;
- première mesure : 3/3 tests réussis, 44,13 % lignes/statements, 42,30 %
  branches, 53,33 % fonctions ;
- défaut constaté : couverture non majoritaire et repository des réglages à
  0 % ;
- correction : cinq tests réels ajoutés pour CRUD, pagination, filtres,
  agrégats, journal de programme et réglages persistants ;
- première mesure après correction : 8/8 tests réussis en 614 ms ; suite
  terminée en 3,79 s ;
- couverture après correction : 93,69 % lignes/statements, 80 % branches et
  100 % fonctions sur les repositories et le service de journalisation inclus ;
- seuils d'intégration fixés à 80 % lignes/statements, 70 % branches et 90 %
  fonctions, puis validés par un nouveau run PostgreSQL : 8/8 réussis en
  846 ms, suite terminée en 4,93 s ;
- `pnpm --filter api typecheck` : sortie 0 ;
- nettoyage vérifié après le run : 0 ligne dans `users`, `workouts`,
  `training_programs`, `session_logs` et `user_settings`.

Le rapport généré localement se trouve dans
`apps/api/coverage/integration/`. Ce répertoire de build reste ignoré par Git ;
le rapport du SHA final devra être archivé depuis le job CI.

## Limites explicites

- le seed n'a pas été exécuté dans ce lot ;
- les images API et Web n'ont pas été construites ou démarrées dans ce lot ;
- aucun parcours OAuth, aucun déploiement et aucun test Neon de production ne
  sont couverts par cette annexe ;
- le runtime local est Node 24.14.0 ; le job CI Node 24 doit encore être exécuté
  sur le SHA final.
