# Preuves de répétition C3.4.2 — 2026-09-07

> Projet : Alcide
>
> Baseline : `0.13.0-rc.8`
>
> SHA de base local et `origin/main` :
> `d950b6b790a8b11153995bf817b7cb0d583d36da`
>
> État qualité le plus récent : overrides et lockfile inclus dans le commit
> local `7fc5f01`, non encore validé par une CI distante
>
> Fenêtre d'exécution : 10:23–10:32 CEST (Europe/Paris)
>
> Navigateur : Chrome piloté par `agent-browser 0.36.0`

## Résultats rejoués

| Contrôle                                 | Résultat observé                                                                                     |               Statut               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | :--------------------------------: |
| Production `/`                           | page non vide, titre `Alcide - Coaching sportif premium`, navigation, CTA et lien de confidentialité |               Réussi               |
| Production `/login`                      | bouton Google et formulaire « Accès jury » visibles ; champs laissés vides                           |      Réussi public uniquement      |
| Production `/generate` sans session      | URL finale `/login`                                                                                  |               Réussi               |
| Production Web `/api/health`             | HTTP 200, `status: ok`, version `0.13.0-rc.8`                                                        |               Réussi               |
| Production API `/health`                 | HTTP 200, `status: ok`, version `0.13.0-rc.8`                                                        |               Réussi               |
| Production API `/health/ready`           | HTTP 200, `status: ready`, version `0.13.0-rc.8`, contrôles DB et configuration IA `ok`              |               Réussi               |
| Local Web `/`                            | page non vide, aucun overlay d'erreur Next.js, mêmes éléments structurants                           |               Réussi               |
| Local `/generate` sans session           | URL finale `/login`                                                                                  |               Réussi               |
| Local Web `/api/health`                  | HTTP 200, version `0.13.0-rc.8`                                                                      |               Réussi               |
| Local accès jury                         | démarrage volontaire avec `JURY_ACCESS_ENABLED=false` : formulaire absent                            | Conforme à la configuration testée |
| Migration + seed PostgreSQL local        | `alcide-db` sain sur `localhost:5432` ; 7 migrations appliquées ; seed : 1 utilisateur, 3 séances    |               Réussi               |
| Accès authentifié `rc.8` le 2026-09-07   | aucun identifiant confidentiel fourni à cette session                                                |             Non testé              |
| Smoke E2E complet sérialisé              | `pnpm test:e2e:smoke --workers=1`, code 0, 54/54 en 4,4 min sans relance                             |         Réussi localement          |
| Audits dépendances complet et production | codes 0/0, aucune vulnérabilité connue après overrides et régénération du lockfile                   |         Réussi localement          |

La présence du formulaire jury en production prouve que l'option est exposée à
l'instant du contrôle ; elle ne prouve ni la validité, ni la date d'expiration
des identifiants. Aucun secret n'a été lu, créé, saisi, copié ou enregistré.

## Captures vérifiées

| Fichier                                        | Dimensions | Utilité                                                  | SHA-256                                                            |
| ---------------------------------------------- | ---------: | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `01-production-accueil.png`                    |  1264×2033 | secours visuel complet de l'accueil production           | `06a5be4cfad95c84e3cbc4ed8f4d2ddfdf0b00b7d6f573a3b7f9e16aa6b1d294` |
| `02-production-login.png`                      |  1264×1005 | accès Google + accès jury, champs vides                  | `eb84aa12843be3bc165c09023ff906ac0ec48a885e8262b22ca093f320e9365e` |
| `03-production-route-protegee-redirection.png` |  1264×1005 | écran obtenu après ouverture de `/generate` sans session | `eb84aa12843be3bc165c09023ff906ac0ec48a885e8262b22ca093f320e9365e` |
| `04-production-health-web.png`                 |   1264×625 | JSON Web, timestamp et version                           | `36134cf8a1f2e5ae69415bc76925eb8fe014e4f07a7b74c1a75aeada83868c62` |
| `05-production-readiness-api.png`              |   1264×625 | JSON readiness API, DB et IA                             | `95bea490f12472844e06a06ee04346192eb75959de047319d5297b3768071888` |
| `06-local-accueil-annote.png`                  |   1264×625 | secours local, zones clés encadrées                      | `b559d2ecfe3d719a55d1a71e3992b7f3c2afaed36e64ff182d73816ff18739ef` |
| `07-local-route-protegee-redirection.png`      |   1264×899 | garde locale de `/generate`                              | `ff06215ed6b34e757d65358cb4823889f38f64b7590538c7eeb6e07333c4dc8a` |
| `08-local-login-jury-desactive.png`            |   1264×899 | preuve que le kill switch masque le formulaire           | `ff06215ed6b34e757d65358cb4823889f38f64b7590538c7eeb6e07333c4dc8a` |
| `09-local-health-web.png`                      |   1264×625 | JSON santé du Web local                                  | `538d60049280119a81d2f219368f90d5de9c55a7817659155dd83efb6d90e6a3` |

Les paires 02/03 et 07/08 sont identiques octet pour octet : c'est attendu,
car la route protégée aboutit précisément à la page de connexion. L'URL finale
a été relevée dans le navigateur ; l'image seule ne permet pas de la déduire.
Les neuf PNG ont été ouverts et leur rendu contrôlé après capture.

## Journal technique reproductible

Les valeurs sensibles utilisées pour démarrer le Web local étaient uniquement
des sentinelles de processus, jamais écrites dans un fichier. Le serveur a été
arrêté après la recette et les deux sessions navigateur ont été fermées.

```powershell
pnpm dev:web
agent-browser --session bloc3local open http://localhost:3000
agent-browser --session bloc3local wait --load networkidle
agent-browser --session bloc3local snapshot -i
agent-browser --session bloc3local screenshot --annotate `
  docs/rncp/bloc3-annexes/preuves-demo-2026-09-07/06-local-accueil-annote.png
```

Contrôle E2E Chromium complémentaire rejoué sur le SHA courant :

```powershell
pnpm --filter web exec playwright test `
  tests/e2e/home.spec.ts tests/e2e/auth.spec.ts `
  tests/e2e/accessibility.spec.ts tests/e2e/axe.spec.ts `
  --project=chromium --reporter=line
```

Résultat de ce sous-ensemble : **27/27 réussis en 1,4 min**. Le premier smoke
multi-navigateurs du même jour était resté à **53/54**, avec timeout du cas
Auth.js jury Chromium, puis relance isolée **1/1**. Cet historique n'est pas
effacé.

La gate complète a ensuite été rejouée en sérialisant les scénarios :

```powershell
pnpm test:e2e:smoke --workers=1
```

Résultat le plus récent : **code 0, 54/54 Chromium + Firefox en 4,4 min, sans
relance**. La gate E2E sérialisée est donc verte. Ce résultat prouve la
configuration `workers=1` ; il ne prouve pas que la course observée en mode
parallèle a disparu.

Audit rejoué :

```powershell
pnpm audit --audit-level=low
```

Résultat initial : code 1, **3 avis transitifs** — 2 high sur
`browserslist <=4.28.6` (`GHSA-c83g-rgw3-j3cx`,
`GHSA-73wf-gq98-2v4g`) et 1 low sur
`postcss-selector-parser >=6.1.0 <6.1.3`
(`GHSA-w9m9-85wc-3x92`). L'historique rouge reste conservé.

Deux overrides qualifiés ont ensuite fixé `browserslist` en `4.28.7` et
`postcss-selector-parser` en `6.1.3`, puis `pnpm-lock.yaml` a été régénéré. Les
deux contrôles suivants ont chacun terminé en code 0 avec
`No known vulnerabilities found` :

```powershell
pnpm audit --audit-level=low
pnpm audit --prod --audit-level=low
```

La gate sécurité locale est maintenant verte. Au moment de ce journal,
`pnpm-workspace.yaml` et `pnpm-lock.yaml` sont rattachés au commit `7fc5f01`,
qui attend encore une CI distante : les résultats ne sont pas attribués au SHA
de base `d950b6b` ni à la production.

## Migration et seed : exécution locale sans base distante

La lecture statique confirme sept migrations ordonnées `0000` à `0006`, sept
entrées correspondantes dans `drizzle/meta/_journal.json`, et un seed
idempotent qui crée un utilisateur de démonstration et trois séances sans appel
IA. Les commandes configurées sont `drizzle-kit migrate` et
`tsx src/db/seed.ts`.

La tentative d'exécution a ciblé exclusivement :

```text
postgresql://alcide:alcide_dev@localhost:5432/alcide
```

Le premier contrôle a été bloqué parce que Compose interpole aussi les secrets
obligatoires des services API/Web. Une fois le moteur Docker disponible, le
conteneur local existant `alcide-db` (`postgres:16-alpine`) a été contrôlé puis
démarré directement, sans valeur de substitution et sans lancer API/Web. Son
healthcheck est passé à `healthy` et son port publié est `5432`.

L'exécution finale du 2026-09-07 a utilisé uniquement :

```powershell
$env:DATABASE_URL='postgresql://alcide:alcide_dev@localhost:5432/alcide'
docker start alcide-db
pnpm db:migrate
pnpm db:seed
```

Résultat : migrations appliquées avec succès ; seed terminé avec l'utilisateur
`demo@alcide.app` et trois workouts. La vérification SQL en lecture seule donne
`users=1` et `workouts=3`. Aucune `DATABASE_URL` de production n'a été lue ou
utilisée et aucune base distante n'a été touchée.

Avant toute répétition, afficher uniquement l'hôte, le port et le nom de base
parsés — jamais le mot de passe — et refuser toute cible autre que
`localhost:5432/alcide`.

## Sources de recoupement

- `docs/rncp/bloc3-annexes/B3-A02-tableau-pilotage-2026-09-07.md` : historique
  smoke 53/54 + relance 1/1, nouveau smoke sérialisé 54/54, audits initiaux et
  corrigés, campagne healthchecks ;
- `docs/rncp/bloc2-annexes/B2-A42-acces-jury-securise-2026-07-23.md` :
  recette authentifiée historique en `rc.7`, distincte du contrôle courant ;
- `docs/rncp/bloc2-annexes/B2-A43-simplification-interface-recette-production-2026-07-23.md` :
  contre-recette authentifiée historique en `rc.8` ;
- `apps/web/.env.example`, `apps/web/lib/jury-auth.ts` : prérequis de l'accès
  jury, sans valeur réelle ;
- `docker-compose.yml`, `apps/api/drizzle/`, `apps/api/src/db/seed.ts` : cible
  locale et contenu migration/seed.
