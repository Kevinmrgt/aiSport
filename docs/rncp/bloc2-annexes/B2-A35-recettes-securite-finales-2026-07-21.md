# B2-A35 — Recettes de sécurité finales du 21 juillet 2026

## Objet et conclusion

Cette annexe consigne la fermeture non destructive des recettes de sécurité
CR-042, CR-043, CR-045, CR-046 et CR-047. Elle complète la revue OWASP pour
les catégories A02, A03, A04, A05 et A09.

Les contrôles automatisés et les observations de production sont concluants :

- 6/6 tests API en mémoire et 1/1 test d'intégration PostgreSQL réussis ;
- 1/1 test de rendu React hostile réussi ;
- 6/6 tests Playwright réussis dans Chromium et Firefox, puis 3/3 Chromium
  après le durcissement de la collecte des ressources ;
- 0 vulnérabilité connue retournée par `pnpm audit --audit-level low` ;
- 0 sink DOM dangereux, 0 appel DB non paramétré recherché et 0 clé OpenAI
  longue dans les fichiers suivis ;
- production Web et API disponibles en HTTPS ;
- CORS de production refusé à une origine hostile et accordé uniquement au
  front officiel ;
- 0 occurrence des marqueurs de secrets recherchés dans le HTML et les neuf
  scripts JavaScript chargés par la page de production.

Aucun défaut applicatif nécessitant un correctif de production n'a été trouvé
pendant cette campagne. Les ajouts sont des tests de non-régression et la
présente preuve. Le risque résiduel principal est la présence de
`'unsafe-inline'` dans `script-src` et `style-src` ; `'unsafe-eval'` est bien
absent de la CSP de production.

## Périmètre et environnement

| Élément                               | Valeur contrôlée                                            |
| ------------------------------------- | ----------------------------------------------------------- |
| Date et heure de fin des observations | 2026-07-21, 14:26 CEST / 12:26 UTC                          |
| Révision de base locale               | `bac3b916770cabbbc92e3cda0d58ac3ed7e5e119` (`main`)         |
| Baseline de la campagne sécurité      | `0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`, CI/CD réussies  |
| Baseline canonique déployée           | `b002adb0e0e7d8d85ee493d54879e190d77d2078`, CI `29845956008`, CD `29846343559` |
| État local                            | révision de base avec tests et documents RNCP non commités  |
| Système                               | Windows NT 10.0.22631                                       |
| Node.js                               | 24.14.0                                                     |
| pnpm                                  | 11.9.0                                                      |
| Vitest                                | 3.2.6                                                       |
| Playwright                            | 1.59.1                                                      |
| Navigateurs                           | Chromium et Firefox fournis par Playwright                  |
| PostgreSQL local                      | 16.14 dans le conteneur `alcide-db`                         |
| Web local                             | Next.js démarré automatiquement sur `http://localhost:3000` |
| Web officiel observé                  | `https://ai-sport-web.vercel.app`                           |
| API officielle observée               | `https://ai-sport-api.vercel.app`                           |

Les tests API de CORS, headers et refus d'authentification utilisent l'instance
Hono en mémoire. Le test CR-042 distinct utilise PostgreSQL local, crée un
utilisateur jetable, insère et relit la charge via le repository, vérifie la
table puis supprime l'utilisateur par cascade. Aucun test n'appelle OpenAI ou
OAuth. Les requêtes de production sont uniquement des `GET`, `HEAD` ou
pré-requêtes `OPTIONS`.

Le passage de `0d5c6b6` à `b002adb` corrige uniquement le reflow de composants
Web. Il ne modifie pas les contrôles de sécurité testés ici ; la CI canonique a
néanmoins rejoué l'ensemble des jobs avant le CD final.

## Résultat par scénario

| ID     | Contrôle exécuté                                                             | Résultat observé                                                                                                                        | Statut                               |
| ------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| CR-042 | Compilation du prédicat Drizzle avec `'; DROP TABLE workouts; --`            | la requête contient un placeholder `$1`, le texte n'apparaît pas dans le SQL et reste dans `params`                                     | Fermé                                |
| CR-042 | Insertion et relecture via le repository sur PostgreSQL 16.14                | la chaîne exacte est relue dans la colonne et le JSONB ; `workouts` reste requêtable ; nettoyage vérifié à 0 utilisateur de test        | Fermé                                |
| CR-042 | Validation HTTP Zod avec chaînes SQL-like et dépassement de borne            | la chaîne bornée reste une donnée ; un objectif de 501 caractères est rejeté                                                            | Fermé                                |
| CR-043 | Rendu d'un titre `<script>` et d'un sport `<img onerror>` dans `WorkoutCard` | texte visible mais aucun nœud `script` ou image hostile, aucun attribut d'exécution modifié                                             | Fermé                                |
| CR-043 | Payload XSS contrôlé dans l'URL, Chromium et Firefox                         | aucune exécution et aucune réflexion brute dans le HTML                                                                                 | Fermé                                |
| CR-045 | Inspection HTML et scripts dans deux navigateurs locaux                      | aucun nom ou valeur sentinelle de secret, aucun motif de clé `sk-*` longue                                                              | Fermé                                |
| CR-045 | Inspection de la production officielle                                       | HTML de 54 578 caractères et 9 scripts ; 0 `OPENAI_API_KEY`, `SERVICE_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET` et clé `sk-*` longue | Fermé                                |
| CR-046 | Pré-requête locale avec `Origin: https://hostile.rncp.test`                  | HTTP 204 sans `Access-Control-Allow-Origin`                                                                                             | Fermé                                |
| CR-046 | Pré-requête de production avec une origine hostile                           | HTTP 204 sans `Access-Control-Allow-Origin`                                                                                             | Fermé                                |
| CR-046 | Pré-requête de production avec le front officiel                             | HTTP 204 avec `Access-Control-Allow-Origin: https://ai-sport-web.vercel.app`                                                            | Fermé                                |
| CR-047 | Headers effectifs dans Chromium et Firefox                                   | CSP, `nosniff`, `DENY`, referrer policy et permissions policy présents                                                                  | Fermé                                |
| CR-047 | Headers du Web de production                                                 | HSTS, CSP complète, `nosniff`, `DENY`, referrer policy et permissions policy présents ; `'unsafe-eval'` absent                          | Fermé avec risque résiduel documenté |

## Détail des contrôles OWASP

### A02 — Défaillances cryptographiques

- Les URL HTTP du Web et de l'API répondent `308 Permanent Redirect` vers
  HTTPS.
- Le Web retourne `Strict-Transport-Security: max-age=63072000;
includeSubDomains; preload`.
- L'API retourne `Strict-Transport-Security: max-age=15552000;
includeSubDomains`.
- Le navigateur ne reçoit aucun des marqueurs de secrets serveur recherchés.
- Le module d'appel API reste importé avec `server-only` et injecte le secret
  interservice uniquement côté serveur.

### A03 — Injection

Le test compile le même prédicat `eq(workouts.sport, valeur)` utilisé par les
repositories. Même avec la charge textuelle `'; DROP TABLE workouts; --`, le
texte reste dans le tableau des paramètres et n'est pas concaténé au SQL. Une
recherche complémentaire ne trouve ni `sql.raw(` ni `db.execute(` dans
`apps/api/src`, et aucun usage de `dangerouslySetInnerHTML`, affectation à
`innerHTML`, `eval(` ou `new Function(` dans le code applicatif.

La charge exacte a ensuite été envoyée au PostgreSQL local uniquement comme
paramètre du repository Drizzle. Elle a été relue sans altération dans la
colonne `sport` et le JSONB. Une requête `SELECT` exécutée après l'insertion a
confirmé que `workouts` restait utilisable. Le nettoyage par suppression de
l'utilisateur de test a laissé 0 utilisateur `rncp-security-*` et 0 séance
dans cette base locale. Aucune requête de suppression issue de la charge n'a
été exécutée et la production Neon n'a pas été modifiée.

### A04 — Conception non sécurisée

- Zod revalide les données au contrôleur HTTP, indépendamment de la validation
  du formulaire Web.
- Les limites sont vérifiées : la charge SQL-like bornée est une donnée valide,
  tandis qu'un champ dépassant 500 caractères est rejeté.
- Les tests n'appellent aucun fournisseur externe et n'augmentent aucune
  charge de production.
- Le refus d'accès aux routes privées reste effectué avant tout accès à la
  base lorsque le secret interservice est invalide.

### A05 — Mauvaise configuration de sécurité

Le Web de production retourne notamment :

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://ai-sport-api.vercel.app;
  object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

L'API de production ajoute entre autres `Cross-Origin-Opener-Policy:
same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `nosniff`, HSTS et
`Cache-Control: no-store, max-age=0` sur `/health`.

### A09 — Journalisation et surveillance

Le test d'accès privé avec un secret contrôlé invalide obtient HTTP 401. Le
serveur émet l'événement `[Auth] Secret interne invalide ou manquant` avec le
chemin `/workouts`. Le corps client contient uniquement l'erreur générique
`UNAUTHORIZED` et n'expose ni la valeur envoyée, ni le secret attendu, ni une
stack trace.

Cette preuve porte sur la génération et la séparation serveur/client des logs.
Elle ne revendique pas une plateforme centralisée de corrélation, d'alerte et
de rétention des journaux.

## Commandes reproductibles et sorties synthétiques

### Tests API et rendu React

```powershell
pnpm --filter api exec vitest run tests/rncp-security-final.test.ts
# 1 fichier réussi ; 6 tests réussis

docker start alcide-db
$env:TEST_DATABASE_URL = `
  'postgresql://alcide:alcide_dev@127.0.0.1:5432/alcide'
pnpm --filter api exec vitest run --config vitest.rncp-security.config.ts
# 1 fichier réussi ; 1 test PostgreSQL réussi (4.39s)
docker exec alcide-db psql -U alcide -d alcide -tAc `
  "select count(*) from users where email like 'rncp-security-%@alcide.test';"
# 0
docker exec alcide-db psql -U alcide -d alcide -tAc `
  "select count(*) from workouts;"
# 0 dans cette base locale après cleanup
docker stop alcide-db

pnpm --filter web exec vitest run components/rncp-security-final.test.tsx
# 1 fichier réussi ; 1 test réussi
```

L'avertissement indiquant que `OPENAI_API_KEY` est absente est attendu dans le
test API : aucune route de génération n'est appelée.

### Tests navigateur

```powershell
pnpm --filter web exec playwright test tests/e2e/rncp-security-final.spec.ts
# Running 6 tests using 2 workers
# 6 passed (48.9s)

pnpm --filter web exec playwright test `
  tests/e2e/rncp-security-final.spec.ts --project=chromium
# rejeu après attente déterministe des corps de réponse : 3 passed (33.7s)
```

Les trois scénarios sont exécutés une fois sous Chromium et une fois sous
Firefox : XSS URL, absence de secrets navigateur et headers/CSP effectifs.

### Audit des dépendances et recherches ciblées

```powershell
pnpm audit --audit-level low
# No known vulnerabilities found

rg -n "dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(" `
  apps packages --glob '!**/*.test.*' --glob '!**/.next/**' `
  --glob '!**/node_modules/**'
# aucune occurrence

rg -n "sql\.raw\(|db\.execute\(" apps/api/src --glob '*.ts'
# aucune occurrence

git grep -I -n -E "sk-[A-Za-z0-9_-]{20,}" -- . ':!pnpm-lock.yaml'
# aucune occurrence
```

### CORS et headers de production

```powershell
curl.exe -sS -D - -o NUL -X OPTIONS `
  https://ai-sport-api.vercel.app/health `
  -H "Origin: https://hostile.rncp.test" `
  -H "Access-Control-Request-Method: GET"
# 204 ; aucun Access-Control-Allow-Origin

curl.exe -sS -D - -o NUL -X OPTIONS `
  https://ai-sport-api.vercel.app/health `
  -H "Origin: https://ai-sport-web.vercel.app" `
  -H "Access-Control-Request-Method: GET"
# 204 ; Access-Control-Allow-Origin: https://ai-sport-web.vercel.app

curl.exe -sS -D - -o NUL https://ai-sport-web.vercel.app/
curl.exe -sS -D - -o NUL https://ai-sport-api.vercel.app/health
# 200 pour les deux services ; headers décrits ci-dessus
```

### Inspection des ressources navigateur de production

```powershell
$base = 'https://ai-sport-web.vercel.app'
$html = (curl.exe -sS "$base/" | Out-String)
$scripts = [regex]::Matches($html, '<script[^>]+src="([^"]+)"') |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$parts = foreach ($source in $scripts) {
  $url = if ($source.StartsWith('http')) { $source } else { "$base$source" }
  curl.exe -sS $url | Out-String
}
$surface = $html + [string]::Join("`n", $parts)
# HTML_CHARS=54578 ; SCRIPT_COUNT=9
# OPENAI_API_KEY=0 ; SERVICE_SECRET=0 ; AUTH_SECRET=0
# AUTH_GOOGLE_SECRET=0 ; LONG_SK_PATTERN=0
```

## Fichiers de preuve ajoutés

- `apps/api/tests/rncp-security-final.test.ts` ;
- `apps/api/tests/rncp-security-final.integration.test.ts` ;
- `apps/api/vitest.rncp-security.config.ts` ;
- `apps/web/components/rncp-security-final.test.tsx` ;
- `apps/web/tests/e2e/rncp-security-final.spec.ts` ;
- `docs/rncp/bloc2-annexes/B2-A35-recettes-securite-finales-2026-07-21.md`.

## Limites et risque résiduel

1. La chaîne contenant `DROP TABLE` est compilée puis persistée comme donnée
   dans PostgreSQL local. Elle n'est jamais exécutée comme SQL et n'est pas
   envoyée à Neon ; la preuve ne simule donc aucune attaque sur la production.
2. Le test XSS couvre le sink React d'une carte alimentée par une valeur
   persistée et la non-réflexion URL dans deux vrais navigateurs. Il ne crée
   pas de séance en production et n'engendre aucun coût OpenAI.
3. L'inspection de secrets est une recherche déterministe de noms, valeurs
   sentinelles et formats de clés connus dans les ressources effectivement
   chargées ; elle ne remplace pas un gestionnaire de secrets ni une rotation.
4. Le refus CORS protège les navigateurs. Un client serveur n'est pas soumis à
   CORS ; l'authentification interservice reste donc le contrôle principal des
   routes privées.
5. La CSP autorise encore `'unsafe-inline'` pour les scripts et styles requis
   par l'implémentation Next.js actuelle. Une CSP à nonce ou hash constitue un
   durcissement futur. En revanche, `'unsafe-eval'` est absent en production,
   `object-src` vaut `'none'` et `frame-ancestors` vaut `'none'`.
6. La preuve A09 vérifie la génération d'un événement et l'absence de fuite
   client ; l'observabilité centralisée et les alertes restent un chantier MCO
   distinct.
