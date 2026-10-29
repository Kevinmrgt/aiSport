# Intégration et déploiement continus

## Intégration

`.github/workflows/ci.yml` contrôle les push `main`/`develop`, les pull
requests vers `main` et les exécutions manuelles.

- Installation avec lockfile figé, Node.js 24 et pnpm 11.9.
- Build partagé, lint et contrôle TypeScript.
- Tests et couverture API/Web/shared ; intégration PostgreSQL 16 réelle.
- Build de production et images Docker.
- Playwright public Chromium/Firefox et accessibilité axe.
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

`.github/workflows/production-health-monitor.yml` vérifie readiness API et
health Web toutes les heures. Il ouvre une issue en cas de panne et suit la
reprise. Ses modes de simulation permettent de vérifier ce mécanisme sans
interroger la production. Un contrôle de santé ne couvre pas le parcours IA.

## Révision livrée et retour arrière

Conserver la référence du run et le SHA servi dans le suivi de livraison.
Les rapports d'anciens runs ne prouvent pas l'état d'une nouvelle révision.
Voir [deployment.md](deployment.md) et [maintenance.md](maintenance.md).
