# Cahier de Recettes — Alcide

> Livrable RNCP Bloc 2 — Compétence C2.3.1 (ÉLIMINATOIRE)
> Vérification documentaire initiale : 2026-05-07 — 33 scénarios CR documentés (numérotation discontinue de CR-001 à CR-044)
> Dernier contrôle d'exécution : 2026-06-30

## Synthèse de verrouillage Bloc 2

| Indicateur | Valeur retenue |
|---|---|
| Scénarios CR documentés | 33 |
| Scénarios validés fonctionnellement ou par test automatisé | 32 |
| Scénarios à relancer en condition réelle | 1 : CR-013 |
| Tests Vitest de référence | 71 tests passés : 70 API + 1 Web |
| Couverture API de référence | 82.33% statements, 89.23% functions |
| E2E Playwright | 48 exécutions smoke passées ; le scénario `generate.spec.ts` reste à relancer pour annoncer le total complet de 56 |

## Format

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-XXX | Nom | Conditions préalables | Étapes à suivre | Ce qui devrait se passer | Ce qui s'est passé | ✅ / ❌ / 🔄 |

---

## Authentification

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-001 | Connexion OAuth Google | Aucune session active | 1. Aller sur `/login` 2. Cliquer "Continuer avec Google" 3. Autoriser l'application sur Google | Redirection vers `/generate`, session créée | Redirection correcte, navbar affiche le nom d'utilisateur | ✅ |
| CR-002 | Accès route protégée sans session | Aucune session active | 1. Aller directement sur `/generate` | Redirection automatique vers `/login` | Redirection immédiate vers `/login` | ✅ |
| CR-003 | Déconnexion | Session active | 1. Cliquer "Déconnexion" dans la navbar | Session supprimée, redirection vers `/` | Session expirée, navbar affiche "Se connecter" | ✅ |
| CR-004 | Navbar session-aware | Session active / inactive | 1. Observer la navbar connecté vs déconnecté | Affichage conditionnel nom utilisateur + liens | Nom Google visible quand connecté, "Se connecter" sinon | ✅ |

---

## Génération d'entraînement

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-010 | Générer un entraînement valide | Utilisateur connecté, `OPENAI_API_KEY` configurée côté serveur | 1. Aller sur `/generate` 2. Remplir sport: "Course", niveau: "Débutant", durée: 30min, objectifs: "Endurance" 3. Soumettre | Entraînement généré et affiché en < 30s, redirect `/workouts/[id]` | Redirect vers le détail avec exercices réels | ✅ |
| CR-011 | Validation formulaire — champ vide | Utilisateur connecté | 1. Soumettre le formulaire sans remplir le champ "Sport" | Message d'erreur sous le champ, pas d'appel API | Erreur inline Zod affichée, formulaire non soumis | ✅ |
| CR-012 | Validation formulaire — durée invalide | Utilisateur connecté | 1. Saisir durée = 5 minutes (< minimum) 2. Soumettre | Message d'erreur "Durée minimum 15 minutes" | Erreur Zod bloque la soumission côté client | ✅ |
| CR-013 | Erreur API OpenAI | API OpenAI indisponible ou timeout simulé | 1. Générer un entraînement avec l'API coupée ou simuler timeout/429 côté service | Message d'erreur clair affiché à l'utilisateur, sans sauvegarde de séance incomplète | Couvert partiellement par tests unitaires `workout-ai.service.test.ts` ; test manuel de coupure réelle à relancer | 🔄 |
| CR-014 | Retry automatique IA | - | 1. Simuler une réponse JSON invalide d'OpenAI | Retry automatique avec prompt renforcé, workout valide au 2ème essai | Couvert par test unitaire `workout-ai.service.test.ts` | ✅ |

---

## Consultation, Timer et Suppression

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-020 | Liste des entraînements | Utilisateur connecté, au moins 1 workout | 1. Aller sur `/workouts` | Liste des entraînements de l'utilisateur connecté uniquement | Liste réelle affichée avec cards, difficulté badge coloré | ✅ |
| CR-021 | Accès entraînement d'un autre utilisateur | 2 comptes utilisateurs | 1. Se connecter avec compte A 2. Tenter d'accéder à l'ID d'un workout du compte B | Erreur 404 (ownership check backend) | Repository vérifie userId avant retour (couvert en test) | ✅ |
| CR-022 | Démarrer le timer | Page de détail d'un workout | 1. Cliquer "Démarrer" | Timer démarre, décompte visible, exercice affiché | Timer démarre avec exercices réels issus de la génération IA OpenAI | ✅ |
| CR-023 | Pause/Reprise timer | Timer en cours | 1. Cliquer "Pause" 2. Cliquer "Reprendre" | Timer se met en pause puis reprend au bon moment | Pause et reprise fonctionnelles avec aria-live | ✅ |
| CR-024 | Passage automatique à l'exercice suivant | Timer en cours | 1. Laisser le timer arriver à 0 | Phase repos démarrée, puis exercice suivant automatiquement | Transitions phase exercise → repos → exercice suivant | ✅ |
| CR-025 | Accessibilité navigation clavier | Aucune | 1. Naviguer sur tout le site avec Tab uniquement | Tous les éléments interactifs accessibles, focus visible | Skip link, focus ring visible, aria-live sur timer | ✅ |
| CR-026 | Supprimer un entraînement | Utilisateur connecté, workout existant | 1. Cliquer "Supprimer" sur une carte 2. Confirmer | Workout supprimé, liste mise à jour | Confirmation UI + Server Action + revalidatePath | ✅ |
| CR-027 | Annuler une suppression | Dialog de confirmation visible | 1. Cliquer "Supprimer" 2. Cliquer "Annuler" | Workout conservé, dialog fermé | Annulation immédiate sans appel API | ✅ |
| CR-028 | Page workout inexistant | Workout supprimé ou ID invalide | 1. Accéder à `/workouts/id-inexistant` | Page 404 accessible avec lien retour | notFound() → page not-found.tsx | ✅ |

---

## Sécurité

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-030 | Injection SQL tentée | - | 1. Saisir `'; DROP TABLE workouts; --` dans le champ sport | Validation Zod bloque, aucun SQL exécuté (Drizzle ORM) | Zod rejette avant appel API, Drizzle = requêtes paramétrées | ✅ |
| CR-031 | XSS tentée | - | 1. Saisir `<script>alert('xss')</script>` dans les objectifs | Script non exécuté (React échappe automatiquement) | React échappe le contenu, aucun script exécuté | ✅ |
| CR-032 | Clé API OpenAI côté client | DevTools réseau | 1. Générer un workout 2. Inspecter les requêtes réseau depuis le navigateur | La clé API OpenAI n'apparaît dans aucune requête client | Server Action — aucun appel OpenAI depuis le navigateur | ✅ |
| CR-033 | Accès API Hono sans secret | Outil HTTP (curl/Postman) | 1. Appeler `POST /workouts/generate` sans header `x-internal-secret` | Réponse 401 UNAUTHORIZED | Couvert par `auth.middleware.test.ts` (6 tests) | ✅ |
| CR-034 | Secret interne non exposé côté client | DevTools réseau | 1. Générer un workout 2. Inspecter toutes les requêtes réseau | `x-internal-secret` n'apparaît dans aucune requête navigateur | Module `server-api.ts` marqué `server-only` | ✅ |

---

## Sécurité — Rate Limiting

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-035 | Rate limiting — dépassement quota | Utilisateur connecté | 1. Envoyer 6 requêtes `POST /workouts/generate` en < 1 minute | 6ème requête reçoit `429 RATE_LIMIT_EXCEEDED` avec header `Retry-After` | Bloqué après 5 requêtes, header Retry-After présent | ✅ |
| CR-036 | Rate limiting — isolation utilisateurs | 2 utilisateurs connectés | 1. Épuiser le quota de l'utilisateur A | L'utilisateur B n'est pas affecté | Quota isolé par userId, user B reçoit 200 | ✅ |

---

## États de chargement (UX)

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-037 | Loading state `/workouts` | Réseau lent | 1. Naviguer vers `/workouts` | Skeleton de cartes visible pendant le fetch | Grille de 6 cards squelettes animées avec aria-busy | ✅ |
| CR-038 | Loading state `/generate` | Réseau lent | 1. Naviguer vers `/generate` | Skeleton du formulaire visible | Skeleton 4 champs + bouton avec aria-busy | ✅ |
| CR-039 | Loading state `/workouts/[id]` | Réseau lent | 1. Naviguer vers un détail | Skeleton du timer visible | Skeleton fil d'Ariane + Timer avec aria-busy | ✅ |

---

## Healthcheck et configuration (Production)

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-040 | Healthcheck API Hono | API démarrée | 1. `curl http://localhost:3001/health` | Réponse 200 JSON avec `status:"ok"`, `service:"alcide-api"`, `timestamp` ISO et `version` applicative | Route `apps/api/src/routes/health.routes.ts` conforme ; `health.routes.test.ts` vérifie le statut non cacheable et la version | ✅ |
| CR-041 | Healthcheck Next.js web | Web démarré | 1. `curl http://localhost:3000/api/health` | Réponse 200 JSON `{"status":"ok","service":"alcide-web","timestamp":"..."}` | 200 OK, JSON conforme, fix le healthcheck Dockerfile web | ✅ |
| CR-042 | Fail-fast démarrage API sans SERVICE_SECRET | `SERVICE_SECRET` absent du `.env` | 1. Démarrer l'API sans la variable `SERVICE_SECRET` | Crash immédiat avec log `[Startup] Variables manquantes : ['SERVICE_SECRET']` et `process.exit(1)` | Exit immédiat avant tout trafic — OWASP A05 Fail-Safe Defaults | ✅ |

---

## Pagination, Filtres et Dashboard

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-043 | Filtrer la liste des entraînements | Utilisateur connecté, au moins 1 workout | 1. Aller sur `/workouts` 2. Sélectionner un sport et/ou un niveau 3. Cliquer "Filtrer" | Liste filtrée, compteur mis à jour, bouton "Réinitialiser" visible | Formulaire GET sans JS requis, LIMIT/OFFSET BDD, OWASP A04 Zod | ✅ |
| CR-044 | Dashboard statistiques utilisateur | Utilisateur connecté, au moins 1 workout ou session terminée | 1. Cliquer "Dashboard" dans la navbar | Page affiche séances créées, séances terminées, temps réalisé, effort moyen, dernière séance, répartition par niveau et top sports | Dashboard aligné avec `apps/web/app/dashboard/page.tsx` : agrégats entraînements + statistiques de sessions, fallback si aucune donnée | ✅ |

---

## Tests automatisés

| Suite | Fichier | Cas couverts | Statut CI |
|---|---|---|---|
| WorkoutAiService | `workout-ai.service.test.ts` | 6 tests — JSON valide, retry, timeout, 429 | ✅ |
| ProgramAiService | `program-ai.service.test.ts` | 7 tests — génération multi-semaines, retry, timeout, 429 | ✅ |
| AuthMiddleware | `auth.middleware.test.ts` | 6 tests — secret invalide, userId manquant, logging A09 | ✅ |
| WorkoutController | `workout.controller.test.ts` | 8 tests — handlers principaux, JSON malformé, 403/404 | ✅ |
| WorkoutService | `workout.service.test.ts` | 8 tests — generate+save, liste paginée, filtres, détail, ownership | ✅ |
| ProgramController | `program.controller.test.ts` | 9 tests — génération programme, lecture, erreurs 400/403/404/503 | ✅ |
| ProgramService | `program.service.test.ts` | 8 tests — génération, persistance, pagination, ownership | ✅ |
| SessionLogController | `session-log.controller.test.ts` | 4 tests — création de journal, validation d'effort perçu | ✅ |
| ErrorMiddleware | `error.middleware.test.ts` | 4 tests — AppError routing, erreur inattendue, logging | ✅ |
| RateLimitMiddleware | `rate-limit.middleware.test.ts` | 5 tests — quota, 429, Retry-After, isolation userId, A09 | ✅ |
| ValidateEnv | `validate-env.test.ts` | 4 tests — variables obligatoires OK, erreur si SERVICE_SECRET ou DATABASE_URL manque, warning si OPENAI_API_KEY absente | ✅ |
| HealthRoutes | `health.routes.test.ts` | 1 test — JSON healthcheck, version et cache-control | ✅ |
| **Total API Vitest** | — | **70 tests · 82.33% statements · 89.23% functions** (`pnpm test:coverage`, 2026-06-30) | ✅ |
| Web Vitest | `components/Timer.test.ts` | 1 test — timer | ✅ |
| **Total `pnpm test`** | — | **71 tests passés** (70 API + 1 Web, 2026-06-30) | ✅ |
| E2E home | `home.spec.ts` | 6 tests par navigateur — titre, skip link, nav, footer, /login | ✅ smoke 2026-06-30 |
| E2E auth | `auth.spec.ts` | 6 tests par navigateur — Google button, routes protégées, 404 | ✅ smoke 2026-06-30 |
| E2E generate | `generate.spec.ts` | 4 tests par navigateur — form labels, validation, aria-live (session mockée) | À relancer |
| E2E accessibility | `accessibility.spec.ts` | 10 tests par navigateur — RGAA 4.1 skip link, lang, sémantique, liens | ✅ smoke 2026-06-30 |
| E2E axe-core | `axe.spec.ts` | 2 tests par navigateur — WCAG 2.1 A/AA violations / et /login | ✅ smoke 2026-06-30 |
| **Total E2E smoke** | — | **48 exécutions Playwright passées** (24 cas × Chromium/Firefox, `pnpm test:e2e:smoke`, 2026-06-30) | ✅ |
| **Total E2E complet listé** | — | **56 exécutions Playwright** (28 cas × Chromium/Firefox) ; 8 exécutions `generate.spec.ts` restent à relancer | Partiel |
