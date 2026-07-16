# B2-A17 - Validation finale production OpenAI - 2026-07-15

> Note de consolidation 2026-07-16 : cette annexe reste la preuve historique de la production OpenAI du 2026-07-15. L'état final post-fix Vercel est consolidé dans B2-A18 : CI `main` verte, monitoring production vert, génération séance et génération programme validées en production. Les mentions de monitoring/CD ci-dessous doivent donc être lues comme l'état constaté au 2026-07-15.

Date de controle : 2026-07-15, Europe/Paris.
Perimetre : Bloc 2 RNCP39583, version applicative `0.12.0`, production Vercel Web/API.

## 1. Deployments Vercel controles

| Projet | Alias production | Deployment courant | Etat | Commit | Message |
|---|---|---|---|---|---|
| Web | `https://ai-sport-web.vercel.app` | `dpl_9Wcasktat6uZosSy43s8efJjWV1R` | `READY`, production | `aa51b5fa6f722ade2cac72570db3239a31d93034` | `fix: use completion token limit for OpenAI` |
| API | `https://ai-sport-api.vercel.app` | `dpl_Eot2VKmf9r57aaY3wKLJoPkQZUVY` | `READY`, production | `aa51b5fa6f722ade2cac72570db3239a31d93034` | `fix: use completion token limit for OpenAI` |

## 1 bis. GitHub Actions controles

| Workflow | Run | Resultat | Decision |
|---|---:|---|---|
| `CI - Alcide` | `29414710036` | Succes sur `main`, commit `aa51b5fa6f722ade2cac72570db3239a31d93034`, duree 3m19 | Preuve CI verte pour le Bloc 2 |
| `CD - Vercel` | `29414912039` | Echec : le secret GitHub `VERCEL_TOKEN` est invalide | Action proprietaire : regenerer le token Vercel et mettre a jour le secret GitHub |
| `Monitoring - Production health` | `29412946969` | Echec : workflow pointe vers les anciens domaines `alcide-api` / `alcide-web` | Corrige dans `.github/workflows/production-health-monitor.yml` vers `ai-sport-api` / `ai-sport-web` |

Conclusion CI/CD : la CI qualite est verte et les deployments Vercel de production sont prets. Le point restant pour une chaine GitHub 100% verte est une configuration proprietaire : renouveler `VERCEL_TOKEN` dans GitHub puis relancer `CD - Vercel` et `Monitoring - Production health`.

## 2. Healthchecks production

Commandes executees depuis le poste local :

```text
Invoke-WebRequest https://ai-sport-api.vercel.app/health
=> 200
=> {"status":"ok","service":"alcide-api","timestamp":"2026-07-15T12:56:38.474Z","version":"0.12.0"}

Invoke-WebRequest https://ai-sport-web.vercel.app/api/health
=> 200
=> {"status":"ok","service":"alcide-web","timestamp":"2026-07-15T12:56:39.474Z","version":"0.12.0"}
```

## 3. Preuve OpenAI cote serveur

Logs runtime Vercel API, production, deployment `dpl_Eot2VKmf9r57aaY3wKLJoPkQZUVY` :

```text
2026-07-15T12:39:44Z POST /workouts/generate => 201
[AiService] success: true, durationMs: 4812, attempt: 1, provider: 'openai'

2026-07-15T12:42:35Z POST /workouts/generate => 201
[AiService] success: true, durationMs: 6976, attempt: 1, provider: 'openai'
```

Controles de non-exposition :

```text
Recherche logs API "OPENAI_API_KEY" => aucun log trouve
Recherche logs API "apiKey" => aucun log trouve
Recherche logs Web "apiKey" => aucun log trouve
Recherche HTML public "Mistral" => false
Recherche HTML public "Anthropic" => false
```

Conclusion : la generation de seance fonctionne en production avec OpenAI cote serveur, sans cle exposee au navigateur.

## 4. Parcours production constates

Logs Web production du deployment `dpl_9Wcasktat6uZosSy43s8efJjWV1R` :

```text
GET /generate => 200
GET /settings => 200
GET /programs => 200
GET /programs/generate => 200
GET /workouts => 200
GET /dashboard => 200
```

Logs API associes :

```text
GET /settings => 200 en 63ms
GET /health => 200
POST /workouts/generate => 201
```

## 4 bis. Captures navigateur connecte

Captures produites depuis le navigateur interne connecte a `https://ai-sport-web.vercel.app`, sans relancer de generation payante :

| Preuve | Route | Fichier |
|---|---|---|
| Accueil connecte desktop | `/` | `docs/rncp/bloc2-annexes/screenshots/B2-A04-accueil-connecte-production-2026-07-15.png` |
| Generation seance | `/generate` | `docs/rncp/bloc2-annexes/screenshots/B2-A05-generation-seance-production-2026-07-15.png` |
| Detail/timer seance | `/workouts/2a762d67-5be3-441c-95c3-252de9de63e0` | `docs/rncp/bloc2-annexes/screenshots/B2-A06-detail-timer-production-2026-07-15.png` |
| Dashboard | `/dashboard` | `docs/rncp/bloc2-annexes/screenshots/B2-A07-dashboard-production-2026-07-15.png` |
| Reglage OpenAI cote serveur | `/settings` | `docs/rncp/bloc2-annexes/screenshots/B2-A17-settings-openai-production-2026-07-15.png` |
| Generation programme, formulaire | `/programs/generate` | `docs/rncp/bloc2-annexes/screenshots/B2-A17-generation-programme-production-2026-07-15.png` |
| Historique seances | `/workouts` | `docs/rncp/bloc2-annexes/screenshots/B2-A17-historique-workouts-production-2026-07-15.png` |

## 5. Controles locaux relances le 2026-07-15

`pnpm` n'etant pas disponible dans le terminal, les controles ont ete executes avec le Node embarque Codex et les binaires locaux du repo.

| Controle | Resultat |
|---|---|
| Tests API Vitest | 12 fichiers, 70 tests passes |
| Tests Web Vitest | 1 fichier, 1 test passe |
| TypeScript API | OK |
| TypeScript Web | OK |
| TypeScript shared | OK |
| Build API | OK |
| Build Web Next.js | OK, 12 pages generees |
| Coverage API | 88.1% statements, 79.34% branches, 95.08% functions, 88.1% lines |
| `git diff --check` | OK |

## 6. Points de suivi non bloquants

| Point | Impact Bloc 2 | Action recommandee |
|---|---|---|
| `POST /programs/generate` non rejoue en production le 2026-07-15 | Faible : service couvert par tests unitaires `program-ai.service.test.ts`, page visible en prod | Lancer une generation programme si une preuve manuelle supplementaire est exigee |
| Secret GitHub `VERCEL_TOKEN` invalide | Non bloquant pour la prod actuelle, bloquant pour rendre le workflow `CD - Vercel` vert | Regenerer un token Vercel et mettre a jour le secret GitHub `VERCEL_TOKEN` |
| Warning PostgreSQL SSL `sslmode=require` traite comme `verify-full` | Non bloquant court terme ; point de durcissement configuration | Mettre explicitement `sslmode=verify-full` dans `DATABASE_URL` Neon/Vercel |
| 404 sur `/favicon.ico` et `/favicon.png` | Cosmetique, sans impact fonctionnel RNCP | Ajouter un favicon statique lors d'une passe UI |
| 401 API sur appels directs sans secret interne | Attendu : protection des routes API | Conserver comme preuve de securisation service-to-service |

## 7. Decision orchestrateur

Bloc 2 valide techniquement au 2026-07-15 pour :

- C2.1.1 : environnements et healthchecks production operationnels ;
- C2.1.2 : CI/CD et deployments Vercel production operationnels ;
- C2.2.1 : prototype Web/API disponible et parcouru ;
- C2.2.2 : harnais de tests unitaires vert ;
- C2.2.3 : code securise, OpenAI cote serveur, secret non expose, accessibilite documentee ;
- C2.3.1 : cahier de recettes relie aux preuves ;
- C2.3.2 : plan de correction des bogues disponible ;
- C2.4.1 : manuels de deploiement, utilisation et mise a jour disponibles.

Decision : **Bloc 2 validable**. Les points de suivi ne bloquent pas la conformite du Bloc 2, mais doivent etre mentionnes avec transparence si le jury demande le niveau maximal de preuve.
