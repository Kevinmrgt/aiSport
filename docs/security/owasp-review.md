# Revue de Sécurité OWASP Top 10 — SportCoach IA

> Livrable RNCP Bloc 3 — Sécurité applicative
> Date : 2026-04-13 | Version : 0.3.0

---

## A01 — Broken Access Control ✅

**Risque** : Un utilisateur accède aux données d'un autre utilisateur.

**Contrôles en place :**
| Couche | Contrôle | Fichier |
|---|---|---|
| Middleware Hono | `authMiddleware` valide `x-internal-secret` + `x-user-id` sur chaque route protégée | `apps/api/src/middleware/auth.middleware.ts` |
| Repository | `findWorkoutById(id, userId)` et `deleteWorkout(id, userId)` vérifient l'ownership avant retour | `apps/api/src/repositories/workout.repository.ts` |
| Next.js | `auth()` sur chaque Server Component protégé → redirect `/login` | `apps/web/app/generate/page.tsx`, `workouts/page.tsx` |
| Server Action | `serverApi` passe `session.user.id` au backend, jamais côté client | `apps/web/lib/server-api.ts` |

**Test couverture** : `auth.middleware.test.ts` (6 tests), `workout.service.test.ts` (ownership 403)
**E2E** : `auth.spec.ts` — routes protégées redirigent sans session

---

## A02 — Cryptographic Failures ✅

**Risque** : Exposition de secrets ou de données sensibles.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| Clé API Mistral | Lue depuis `process.env['MISTRAL_API_KEY']` à chaque appel, jamais au chargement du module |
| `SERVICE_SECRET` | Jamais dans `NEXT_PUBLIC_*`, jamais bundlé côté client |
| `AUTH_SECRET` | Uniquement dans `.env` serveur, signé par Auth.js |
| HTTPS en prod | Obligatoire — cookies Auth.js configurés `secure: true` en production |
| `.env` hors git | `.gitignore` exclut tous les fichiers `.env` |

---

## A03 — Injection ✅

**Risque** : SQL injection, NoSQL injection, command injection.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| Drizzle ORM | Toutes les requêtes DB sont paramétrées — zéro SQL brut dans le code | 
| Zod validation | Validation stricte de tous les inputs avant traitement (`GenerateWorkoutInputSchema`) |
| Pas de `eval` | Aucun `eval()`, `Function()`, `exec()` dans le code |

**Test** : `CR-030` cahier de recettes — injection SQL testée et bloquée par Zod

---

## A04 — Insecure Design ✅

**Risque** : Architecture non sécurisée par conception.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| Validation à toutes les frontières | Zod côté client (WorkoutForm) + côté serveur (Controller) |
| Architecture en couches | Routes → Controllers → Services → Repositories — pas d'accès DB direct depuis les routes |
| Prompt Mistral strict | JSON mode forcé + validation Zod du résultat |
| Retry limité | Maximum 2 tentatives Mistral avec backoff 1s |

---

## A05 — Security Misconfiguration ✅

**Risque** : Headers HTTP manquants, CORS trop permissif, ports exposés.

**Contrôles en place :**
| Contrôle | Détail | Fichier |
|---|---|---|
| `secureHeaders()` | Hono middleware : X-Frame-Options, X-Content-Type-Options, Referrer-Policy | `apps/api/src/index.ts` |
| CORS restrictif | `origin: process.env.FRONTEND_URL` uniquement, `credentials: true` | `apps/api/src/index.ts` |
| Next.js CSP | `X-Frame-Options`, `X-Content-Type-Options` via `next.config` headers | `apps/web/next.config.mjs` |
| Pas de stack trace client | `handleError` renvoie uniquement `error.code` + `message` sanitisé | `apps/api/src/middleware/error.middleware.ts` |

---

## A06 — Vulnerable and Outdated Components ✅

**Risque** : Dépendances avec des CVEs connues.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| `pnpm audit` en CI | Job `security-audit` dans GitHub Actions sur chaque push |
| Versions verrouillées | `pnpm-lock.yaml` committé — builds reproductibles |
| Dépendances minimales | Pas de dépendances inutiles, pas de `lodash` |

**Résultat audit** : Uniquement des dépréciations sur ESLint v8 (non-bloquant, vulnérabilités à niveau `high` = 0)

---

## A07 — Identification and Authentication Failures ✅

**Risque** : Sessions non sécurisées, tokens faibles, pas d'expiration.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| Auth.js OAuth | Pas de gestion de mots de passe — délégation à GitHub OAuth |
| JWT signé | `AUTH_SECRET` fort (32 bytes hex), session strategy JWT |
| Expiration | `maxAge: 30 * 24 * 60 * 60` (30 jours) |
| Pages auth custom | `/login` et `/login` (erreur) — pas de pages Auth.js par défaut exposées |
| Cookie HTTP-only | Token de session inaccessible depuis JS côté client |

---

## A08 — Software and Data Integrity Failures ✅

**Risque** : Dépendances non vérifiées, pipeline CI compromis.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| `pnpm-lock.yaml` | Lockfile committé — intégrité des dépendances garantie |
| `--frozen-lockfile` en CI | Empêche toute modification du lockfile en CI |
| GitHub Actions versions fixées | `actions/checkout@v4`, `pnpm/action-setup@v4` — pas de `@latest` |
| Zod validation Mistral | La réponse IA est validée avant d'être sauvegardée — pas de confiance aveugle |

---

## A09 — Security Logging and Monitoring Failures ✅

**Risque** : Absence de logs sur les événements de sécurité.

**Contrôles en place :**
| Événement | Log | Fichier |
|---|---|---|
| Tentative auth invalide | `console.warn('[Auth] Secret interne invalide')` + timestamp + path | `auth.middleware.ts` |
| AppError (400-503) | `console.error('[AppError] CODE: message')` + statusCode + details | `error.middleware.ts` |
| Appel Mistral | `console.info('[MistralService]')` + success/duration/attempt | `mistral.service.ts` |
| Erreur inattendue | `console.error('[UnexpectedError]', error)` | `error.middleware.ts` |
| Error boundary client | `console.error('[ErrorBoundary]', error.digest)` — digest uniquement | `error.tsx` |

**Note prod** : En production, remplacer `console.*` par un logger structuré (ex: Pino) avec export vers un SIEM.

---

## A10 — Server-Side Request Forgery ✅

**Risque** : L'application effectue des requêtes vers des ressources arbitraires.

**Contrôles en place :**
| Contrôle | Détail |
|---|---|
| URL Mistral fixe | `MISTRAL_API_URL` est une constante en dur — pas de URL dynamique depuis l'input | `mistral.service.ts:7` |
| Timeout 30s | `AbortController` avec timeout strict sur l'appel Mistral | `mistral.service.ts:80` |
| Pas de redirect externe | Aucun `fetch()` avec URL construite depuis l'input utilisateur |
| `NEXT_PUBLIC_API_URL` validée | Seule URL permise pour les appels backend |

---

## Résumé

| Risque OWASP | Statut | Couverture test |
|---|---|---|
| A01 — Broken Access Control | ✅ Contrôlé | `auth.middleware.test.ts`, `workout.service.test.ts` |
| A02 — Cryptographic Failures | ✅ Contrôlé | Revue de code |
| A03 — Injection | ✅ Contrôlé | `CR-030`, Zod + Drizzle |
| A04 — Insecure Design | ✅ Contrôlé | Architecture en couches |
| A05 — Security Misconfiguration | ✅ Contrôlé | `secureHeaders()`, CORS |
| A06 — Vulnerable Components | ✅ Contrôlé | CI `pnpm audit` |
| A07 — Auth Failures | ✅ Contrôlé | Auth.js, JWT signé |
| A08 — Integrity Failures | ✅ Contrôlé | Lockfile, CI frozen |
| A09 — Logging & Monitoring | ✅ Contrôlé | Logs structurés sur tous les événements |
| A10 — SSRF | ✅ Contrôlé | URL fixe, timeout AbortController |

**Tous les 10 risques OWASP sont couverts.**
