# Manuel de mise à jour - Alcide

> Livrable Bloc 2 RNCP39583 - Documentation technique d'exploitation et d'évolution.
> Version exploitée : `0.13.0-rc.4` - baseline déployée `ea703aef912ce9e7c49c4c9b7872a5a7b595b666`.

## 1. Objectif

Ce manuel décrit la procédure de mise à jour d'Alcide pour livrer une nouvelle version applicative sans casser les parcours existants.

Il couvre :

- mise à jour du code ;
- mise à jour des dépendances ;
- migrations de base de données ;
- tests de non-régression ;
- déploiement ;
- vérification post-déploiement ;
- rollback.

## 2. Préconditions

Avant toute mise à jour :

- travailler sur une branche dédiée ;
- vérifier l'état Git avec `git status --short --branch` ;
- vérifier la version actuelle dans `package.json` ;
- récupérer les dernières modifications avec `git fetch --prune origin` puis `git pull --ff-only origin main` si la branche est `main` ;
- ne jamais modifier une variable secrète réelle dans le dépôt.

## 3. Mise à jour du code applicatif

1. Créer ou utiliser une branche de travail.
2. Modifier uniquement le périmètre nécessaire.
3. Mettre à jour les tests si le comportement change.
4. Mettre à jour la documentation RNCP si la preuve associée change.
5. Relire le diff :

```powershell
git diff --stat
git diff
```

Critère de validation :

- le diff est cohérent avec l'objectif ;
- aucune modification hors périmètre n'est présente ;
- les preuves RNCP restent alignées avec le code réel.

## 4. Mise à jour des dépendances

1. Identifier les dépendances à mettre à jour.
2. Lire le changelog des dépendances majeures.
3. Mettre à jour `package.json` ou utiliser l'outil package manager.
4. Régénérer le lockfile avec pnpm.
5. Lancer les contrôles :

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm audit --audit-level=low
```

Critère de validation :

- le lockfile est cohérent ;
- aucun test critique ne régresse ;
- aucune vulnérabilité connue à partir du niveau `low` n'est laissée sans
  correction ou justification explicite.

## 5. Migration de base de données

Lorsqu'un changement touche `apps/api/src/db/schema.ts` :

1. Générer la migration :

```powershell
pnpm db:generate
```

2. Relire le fichier de migration généré.
3. Vérifier que la migration est compatible avec les données existantes.
4. Appliquer la migration sur l'environnement cible :

```powershell
pnpm db:migrate
```

5. Vérifier les fonctionnalités concernées.

Critères de prudence :

- éviter les suppressions destructrices non justifiées ;
- prévoir une sauvegarde avant production ;
- documenter tout changement irréversible.

## 6. Tests de non-régression

Commandes minimales avant livraison :

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Commandes recommandées avant dépôt RNCP ou livraison importante :

```powershell
pnpm test:e2e:smoke
$env:E2E_AUTH_EMAIL='adresse-du-compte-dedie@example.com'
$env:E2E_BASE_URL='https://ai-sport-web.vercel.app'
pnpm test:e2e:auth:browser
# Après la connexion Google et le retour sur /generate :
pnpm test:e2e:auth:capture
pnpm test:e2e:authenticated
```

`test:e2e:smoke` couvre le public. La commande authentifiée exige un
`storageState` Auth.js réel, local, non committé. La procédure sécurisée complète
est décrite dans `docs/testing-authenticated-e2e.md`. `pnpm test:e2e` seul marque la
suite authentifiée ignorée si cette variable manque ; il ne prouve donc pas le
parcours OAuth. Si les E2E ne sont pas relancés, la documentation doit conserver
le statut "à relancer" au lieu d'annoncer une réussite.

## 7. Mise à jour de version

Pour une version applicative :

1. Mettre à jour la version dans :
   - `package.json` ;
   - `apps/api/package.json` ;
   - `apps/web/package.json`.
2. Vérifier les fallback de healthcheck :
   - `apps/api/src/routes/health.routes.ts` ;
   - `apps/web/app/api/health/route.ts`.
3. Mettre à jour `CHANGELOG.md`.
4. Vérifier que `docs/deployment.md` et les documents RNCP ne mentionnent pas une version contradictoire.

Contrôle :

```powershell
rg -n "0\\.12\\.0|version applicative|APP_VERSION|NEXT_PUBLIC_APP_VERSION" package.json apps docs README.md CHANGELOG.md
```

Adapter la recherche selon la nouvelle version.

## 8. Déploiement

Le déploiement se fait via les workflows et la cible Vercel/Neon documentée.

Contrôles avant déploiement :

- CI verte ;
- migrations prêtes ou non nécessaires ;
- variables d'environnement présentes ;
- build local ou CI réussi ;
- changelog mis à jour.

Contrôles après déploiement :

```powershell
curl https://<api-url>/health
curl https://<api-url>/health/ready
curl https://<web-url>/api/health
```

Puis vérifier manuellement :

1. page d'accueil ;
2. login ;
3. génération ou consultation avec données seedées ;
4. liste des séances ;
5. détail et timer ;
6. dashboard.

## 9. Rollback

Rollback applicatif :

1. Identifier la dernière version stable dans Vercel ou Git.
2. Revenir au déploiement précédent.
3. Vérifier les healthchecks.
4. Relancer un smoke test.
5. Documenter l'incident ou l'écart dans le plan de correction.

Rollback base de données :

- privilégier une sauvegarde/restauration lorsque la migration est destructive ;
- éviter de lancer une migration inverse non testée ;
- consigner précisément le changement de schéma et l'impact utilisateur.

## 10. Traçabilité

Après une mise à jour, documenter :

- version livrée ;
- fichiers principaux modifiés ;
- commandes lancées ;
- résultat des tests ;
- migration ou non ;
- statut du déploiement ;
- anomalies détectées ;
- action de rollback si nécessaire.

Documents à mettre à jour si concernés :

- `CHANGELOG.md`
- `docs/deployment.md`
- `docs/ci-cd.md`
- `docs/bloc2/cahier-recettes.md`
- `docs/rncp/dossier-professionnel-rncp39583.md`
- `docs/rncp/matrice-conformite-rncp39583.md`
