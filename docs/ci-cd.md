# Intégration et déploiement continus

## Intégration

`.github/workflows/ci.yml` contrôle les push `main`/`develop`, les pull
requests vers `main` et les exécutions manuelles.

- Installation avec lockfile figé, Node.js 24 et pnpm 11.9.
- Build partagé, lint et contrôle TypeScript.
- Tests et couverture API/Web/shared ; intégration PostgreSQL 16 réelle,
  dont la recette de sécurité SQL auparavant absente de la CI.
- Build de production et images Docker.
- Playwright public Chromium/Firefox et accessibilité axe sur un build
  terminé, avec `E2E_PRODUCTION=1` et `next start`, sans compilation dev à froid.
- Audit des dépendances bloquant dès le niveau `low`.
- Tests des politiques de déploiement et des sessions E2E.

Les rapports sont séparés par périmètre. Les seuils de couverture restent dans
les configurations Vitest ; leur résultat ne remplace pas une recette métier.

## Déploiement

`.github/workflows/deploy-vercel.yml` est le chemin nominal : il réagit à
`CI - Alcide` uniquement après succès sur `main`, avec
`ENABLE_GHA_VERCEL_CD=true`. Il déploie le `head_sha` de cette CI.

L'ordre bloquant est : migrations PostgreSQL, API, smoke/readiness API, Web,
puis smoke Web. Un échec interrompt la suite.

Avant les écritures, `cd-release-preflight.mjs` exige les informations
d'éditeur et les preuves de restauration, de migration et de recette de la
révision exacte. La sauvegarde précédant chaque migration est chiffrée
AES-256-GCM et son artefact est conservé avant toute modification de la base.
Une absence de preuve interrompt le CD ; elle n'est pas remplacée par une
attestation inventée. Voir le [runbook](production-runbook.md).

`APP_REVISION` est transmis au build puis à l'environnement d'exécution
Vercel. Les sondes exposent uniquement un SHA de quarante caractères, ou
`null` en développement. Les smokes contrôlent service, statut JSON,
fraîcheur, checks de readiness et SHA attendu, sur l'URL du nouveau build
**et** sur l'alias public. Un ancien build sain ou une page HTML 200 échoue.

La maintenance manuelle possède deux modes : `verify`, par défaut, lit la
source et restaure uniquement dans un PostgreSQL temporaire ; `migrate`
exige le SHA actuel de `main`, sa CI réussie et le même préflight. CD et
maintenance partagent le groupe `production-database-release` et un verrou
consultatif PostgreSQL de session. Ce verrou exige une connexion directe,
pas un endpoint de pooler en mode transaction.

Les previews Vercel restent actives. En production, le script
`scripts/vercel-ignore-build.mjs` ignore les builds automatiques de
l'intégration Git ; le workflow CD force sa propre construction.
Les politiques sont couvertes par `pnpm test:cd-policy` et
`pnpm test:vercel-ignore`.

## Parcours Google authentifié

Le workflow manuel `.github/workflows/authenticated-e2e.yml` utilise une vraie
session d'un compte Google de test dédié. Il exige `E2E_AUTH_EMAIL` et
`E2E_AUTH_STORAGE_B64`. La session restaurée reste ignorée et ne doit jamais
être publiée dans les artefacts. Sans session valide, la suite doit échouer.
Voir [testing-authenticated-e2e.md](testing-authenticated-e2e.md).

## Surveillance

`.github/workflows/production-health-monitor.yml` demande une exécution
horaire ; la ponctualité du scheduler GitHub n'est pas garantie. Le contrôle
compare les SHA Web/API, JSON, horodatages et checks. Lors de sa prochaine
exécution, il détecte aussi un intervalle supérieur à deux heures entre
sondes planifiées. Il ne peut pas alerter pendant que son propre scheduler
est arrêté : une surveillance externe est nécessaire pour une garantie de
délai indépendante. `PROD_EXPECTED_REVISION`, si renseigné, impose en plus
une révision attendue.

Le workflow ouvre une issue en cas d'échec et suit la reprise. Ses modes de
simulation restent séparés de la production. Réception effective de
l'alerte et disponibilité du responsable doivent être vérifiées ; une
issue créée ne les prouve pas. Le contrôle de santé ne couvre ni OAuth ni
une génération IA réelle.

## Révision livrée et retour arrière

Conserver la référence du run et le SHA servi dans le suivi de livraison.
Les rapports d'anciens runs ne prouvent pas l'état d'une nouvelle révision.
Voir [deployment.md](deployment.md) et [maintenance.md](maintenance.md).
