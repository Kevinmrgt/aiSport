# Script de démonstration logiciel Bloc 3 - SportCoach IA

> Épreuve : **Bloc 3 RNCP39583 - Coordonner et piloter un projet de développement d'applications logicielles**  
> Démonstration attendue : dernière version logicielle développée, avec vocabulaire adapté à une audience client/jury  
> Version de référence : `0.12.0` d'après `package.json` et `CHANGELOG.md`  
> Durée cible : **7 à 8 minutes** dans les 30 minutes de présentation.

---

## 1. Objectif de la démonstration

La démonstration doit prouver que le projet a été piloté jusqu'à une version logicielle utilisable :

- un utilisateur peut s'authentifier ;
- il peut générer ou consulter des entraînements ;
- il peut lancer une séance avec timer ;
- il peut enregistrer un suivi de session ;
- il peut visualiser son dashboard ;
- il peut accéder aux paramètres IA ;
- les routes sensibles sont protégées ;
- les healthchecks permettent de vérifier l'état Web/API ;
- un plan de secours existe si l'IA, l'auth ou le réseau échoue.

Fil conducteur à dire au jury :

> Je vais montrer le parcours d'un utilisateur sportif. À chaque étape, je fais le lien avec le pilotage projet : fonctionnalité attendue, validation, risque maîtrisé et preuve associée.

---

## 2. Préconditions de démo

### 2.1 Préconditions générales

| Élément | Statut attendu |
|---|---|
| Navigateur | Chrome ou Edge prêt, zoom 100% |
| Connexion réseau | Disponible pour la démo production |
| Compte OAuth | Compte Google de démonstration prêt si la production est utilisée |
| Base de données | Neon migrée et/ou PostgreSQL local démarré |
| Données | Au moins une séance ou seed local prêt |
| IA | Clé Mistral configurée ou plan B seed prêt |
| Healthchecks | API `/health` et Web `/api/health` testés avant passage |
| Captures alternatives | Accueil, séance/timer, dashboard, CI/CD, healthchecks |

### 2.2 URLs de production documentées

Ces URLs sont documentées dans `docs/ci-cd.md` et `docs/deployment.md`. Elles doivent être vérifiées avant la soutenance.

| Service | URL |
|---|---|
| Web | `https://ai-sport-web.vercel.app` |
| API | `https://ai-sport-api.vercel.app` |
| Healthcheck API | `https://ai-sport-api.vercel.app/health` |
| Healthcheck Web | `https://ai-sport-web.vercel.app/api/health` |

Commandes de vérification :

```bash
curl https://ai-sport-api.vercel.app/health
curl https://ai-sport-web.vercel.app/api/health
curl -I https://ai-sport-web.vercel.app
```

Vérification légère effectuée le 2026-05-07 :

| Cible | Résultat |
|---|---|
| API `/health` | HTTP 200 |
| Web `/api/health` | HTTP 200 |
| Racine Web | HTTP 200 |

À refaire le jour de la soutenance, car une URL de production peut évoluer ou être temporairement indisponible.

---

## 3. Variables d'environnement nécessaires

Ne jamais afficher les vraies valeurs pendant la soutenance.

### 3.1 API Hono

Variables attendues dans `apps/api/.env` ou dans l'environnement Vercel API :

```text
DATABASE_URL=postgresql://...
SERVICE_SECRET=<meme valeur cote Web et API>
MISTRAL_API_KEY=<cle Mistral ou vide si usage cle utilisateur/plan B>
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
```

Preuves :

- `apps/api/.env.example`
- `apps/api/src/lib/validate-env.ts`
- `docs/deployment.md`

### 3.2 Frontend Next.js

Variables attendues dans `apps/web/.env.local` ou dans l'environnement Vercel Web :

```text
NEXT_PUBLIC_API_URL=http://localhost:3001
AUTH_SECRET=<secret Auth.js>
AUTH_GOOGLE_ID=<client id OAuth>
AUTH_GOOGLE_SECRET=<client secret OAuth>
NEXTAUTH_URL=http://localhost:3000
SERVICE_SECRET=<meme valeur cote Web et API>
```

Preuves :

- `apps/web/.env.example`
- `apps/web/lib/auth.ts`
- `apps/web/lib/server-api.ts`

Point de vigilance :

- `SERVICE_SECRET` doit être identique côté Web et API ;
- aucune vraie clé ne doit être montrée au jury ;
- la production doit utiliser les valeurs Vercel, pas les fichiers `.env` locaux.

---

## 4. Commandes de lancement local

### 4.1 Option A - Démo locale avec PostgreSQL Docker

À utiliser si la production Vercel ou Neon est instable.

```bash
pnpm install
docker compose up postgres -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

URLs locales :

| Service | URL |
|---|---|
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API healthcheck | `http://localhost:3001/health` |
| Web healthcheck | `http://localhost:3000/api/health` |

### 4.2 Option B - Démo Docker Compose complète

À utiliser si les services locaux Node sont instables.

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
```

Puis ouvrir :

```text
http://localhost:3000
http://localhost:3001/health
```

### 4.3 Validation rapide avant démo

```bash
pnpm test
pnpm test:coverage
pnpm --filter web exec playwright test tests/e2e/home.spec.ts tests/e2e/auth.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/axe.spec.ts --project=chromium
```

Résultats constatés le 2026-05-07 :

| Commande | Résultat |
|---|---|
| `pnpm test` | 70 tests unitaires passants |
| `pnpm test:coverage` | API statements : 81.57% |
| Smoke Playwright Chromium | 24 tests passants |
| Smoke Playwright Firefox | Non relancé avec succès localement : navigateur Firefox Playwright absent |

---

## 5. Scénario utilisateur pas à pas

### Vue synthétique

| Étape | Durée | Fonctionnalité | Preuve pilotage |
|---|---:|---|---|
| 1 | 30 s | Ouvrir application + healthchecks | Version démontrable et supervisable |
| 2 | 45 s | Authentification | Routes protégées et ownership |
| 3 | 90 s | Génération d'entraînement | Fonction coeur, IA, validation Zod |
| 4 | 60 s | Consultation d'un entraînement | Persistance et restitution utilisateur |
| 5 | 75 s | Timer + suivi de session | Exécution et feedback |
| 6 | 75 s | Génération ou consultation de programme | Progression multi-semaines |
| 7 | 60 s | Dashboard | Indicateurs utilisateur |
| 8 | 45 s | Paramètres IA | Pilotage du risque fournisseur |
| 9 | 45 s | Sécurité / CI / healthcheck | Qualité et validation finale |

Durée cible : 7 à 8 minutes.

---

## 6. Script détaillé

### Étape 1 - Ouvrir la version et vérifier les healthchecks

Durée cible : 30 secondes.

Action :

1. Ouvrir `https://ai-sport-web.vercel.app` ou `http://localhost:3000`.
2. Dans un second onglet, ouvrir `/api/health`.
3. Ouvrir l'API `/health`.

À dire :

> Je commence par vérifier que la version démontrée est bien accessible. Les healthchecks Web et API font partie du pilotage qualité : ils permettent de valider rapidement l'état de la livraison.

Preuves :

- `apps/api/src/routes/health.routes.ts`
- `apps/web/app/api/health/route.ts`
- `.github/workflows/deploy-vercel.yml`

Plan B :

- si la production ne répond pas, ouvrir les healthchecks locaux ;
- si le réseau échoue, montrer les captures préparées et lancer local.

### Étape 2 - Authentification

Durée cible : 45 secondes.

Action :

1. Cliquer sur "Se connecter".
2. Utiliser le compte OAuth de démonstration si disponible.
3. Montrer que les liens protégés deviennent disponibles.

À dire :

> L'authentification rattache les données à un utilisateur. Le backend ne reçoit pas directement le cookie Auth.js : Next.js appelle l'API Hono côté serveur avec un secret interne et l'identifiant utilisateur.

Preuves :

- `apps/web/lib/auth.ts`
- `apps/web/lib/server-api.ts`
- `apps/api/src/middleware/auth.middleware.ts`
- `docs/adr/ADR-004-service-to-service-auth.md`

Plan B :

- si OAuth échoue, montrer la redirection automatique vers `/login` depuis `/generate` ou `/workouts` ;
- expliquer le parcours avec capture ou démo locale préparée ;
- ne jamais afficher les secrets OAuth.

### Étape 3 - Génération d'entraînement

Durée cible : 90 secondes.

Action :

1. Aller sur `/generate`.
2. Choisir un sport, niveau, durée, objectif et contraintes.
3. Lancer la génération.
4. Attendre la redirection vers `/workouts/[id]`.

Exemple de données :

| Champ | Valeur proposée |
|---|---|
| Sport | Course à pied ou musculation |
| Niveau | Intermédiaire |
| Durée | 30 à 45 minutes |
| Objectif | Améliorer l'endurance |
| Contraintes | Pas de matériel ou genou sensible |

À dire :

> C'est la fonctionnalité coeur : transformer un besoin utilisateur en séance structurée. Le risque principal est une réponse IA invalide ; il est traité par JSON mode, validation Zod et retry.

Preuves :

- `apps/web/app/generate/page.tsx`
- `apps/api/src/services/mistral.service.ts`
- `packages/shared/src/schemas/workout.schema.ts`
- `docs/adr/ADR-003-mistral-ai.md`

Plan B :

- si l'IA est lente, arrêter après quelques secondes et passer à une séance seedée ;
- dire : "Pour éviter de dépendre du réseau IA pendant le jury, j'ai préparé des données de démonstration."

### Étape 4 - Consultation d'un entraînement

Durée cible : 60 secondes.

Action :

1. Ouvrir `/workouts`.
2. Montrer filtres sport/niveau et pagination si données disponibles.
3. Ouvrir le détail d'un entraînement.
4. Montrer échauffement, exercices, récupération.

À dire :

> La séance générée est persistée en PostgreSQL et réaffichée dans l'espace de l'utilisateur. Les filtres et la pagination ont été ajoutés au sprint 12 pour améliorer l'usage en version de démonstration.

Preuves :

- `apps/web/app/workouts/page.tsx`
- `apps/web/app/workouts/[id]/page.tsx`
- `apps/api/src/repositories/workout.repository.ts`
- `docs/sprints/sprint-12.md`

Plan B :

- utiliser les séances créées par `pnpm db:seed`.

### Étape 5 - Timer et suivi de session

Durée cible : 75 secondes.

Action :

1. Dans le détail de séance, lancer le timer.
2. Montrer pause / reprise / passage d'exercice si rapide.
3. Terminer ou simuler la fin.
4. Enregistrer effort perçu et feedback si le formulaire apparaît.

À dire :

> Le logiciel ne s'arrête pas à la génération. Il accompagne l'exécution de la séance, puis enregistre un retour utilisateur. C'est important pour démontrer une boucle d'usage complète.

Preuves :

- `apps/web/components/Timer.tsx`
- `apps/web/components/SessionCompletionForm.tsx`
- `apps/api/src/routes/session-log.routes.ts`
- `packages/shared/src/schemas/session-log.schema.ts`

Plan B :

- si la séance est trop longue, montrer uniquement le lancement/pause ;
- expliquer que le test unitaire `Timer.test.ts` valide le rendu du composant.

### Étape 6 - Génération ou consultation d'un programme

Durée cible : 75 secondes.

Action :

1. Ouvrir `/programs`.
2. Si un programme existe, ouvrir son détail.
3. Montrer les semaines et séances.
4. Ouvrir une séance de programme si temps disponible.

Alternative si l'IA est disponible :

1. Ouvrir `/programs/generate`.
2. Générer un programme court : 2 semaines, 2 séances/semaine.

À dire :

> Le programme multi-semaines montre que le périmètre a évolué au-delà du MVP. Le pilotage a permis de passer d'une séance unique à une progression structurée.

Preuves :

- `apps/web/app/programs/generate/page.tsx`
- `apps/web/app/programs/[id]/page.tsx`
- `apps/api/src/routes/program.routes.ts`
- `apps/api/src/services/mistral-program.service.ts`

Plan B :

- ne pas générer en direct si le temps est court ;
- montrer un programme existant ou expliquer le flux via le code/preuves.

### Étape 7 - Dashboard

Durée cible : 60 secondes.

Action :

1. Ouvrir `/dashboard`.
2. Montrer les séances créées, terminées, temps réalisé et effort moyen.
3. Montrer répartition par niveau, sport, feedback.

À dire :

> Le dashboard est un indicateur côté utilisateur. Pour le Bloc 3, il sert aussi à montrer que le projet a été piloté vers une version démontrable avec une restitution claire des données.

Preuves :

- `apps/web/app/dashboard/page.tsx`
- `apps/api/src/controllers/session-log.controller.ts`
- `apps/api/src/repositories/session-log.repository.ts`

Plan B :

- si aucun historique n'apparaît, expliquer que le dashboard se remplit après les sessions terminées ;
- montrer une capture préparée avec données seedées.

### Étape 8 - Paramètres IA

Durée cible : 45 secondes.

Action :

1. Ouvrir `/settings`.
2. Montrer le provider IA, modèle et présence/absence de clé API.
3. Ne pas saisir de vraie clé à l'écran.

À dire :

> Cette page permet de piloter le risque fournisseur IA. Elle prépare une évolution où l'utilisateur peut configurer son propre provider ou sa propre clé, sans exposer de secret côté client.

Preuves :

- `apps/web/app/settings/page.tsx`
- `apps/api/src/routes/settings.routes.ts`
- `apps/api/src/services/ai.service.ts`
- `apps/api/src/db/schema.ts` avec `user_settings`

Plan B :

- montrer uniquement la page et expliquer ;
- ne jamais révéler les variables d'environnement.

### Étape 9 - Sécurité, ownership, CI/CD et clôture

Durée cible : 45 secondes.

Action :

1. Montrer rapidement qu'une route protégée redirige vers `/login` si non connecté.
2. Ouvrir ou citer `docs/ci-cd.md` et les workflows.
3. Revenir au livrable Bloc 3 pour conclure.

À dire :

> Je termine par les validations projet : les routes protégées, les tests, le coverage, le smoke E2E et les healthchecks. Ce sont les indicateurs qui ont permis de piloter la qualité et d'obtenir une version livrable.

Preuves :

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-vercel.yml`
- `docs/ci-cd.md`
- `docs/rncp/bloc3-pilotage-projet-rncp39583.md`

Plan B :

- si GitHub ou Vercel n'est pas accessible, citer les fichiers locaux.

---

## 7. Plan B détaillé

### 7.1 Si l'IA ne fonctionne pas

Action :

```bash
pnpm db:seed
```

Puis montrer :

- `/workouts` ;
- un détail d'entraînement ;
- le timer ;
- le dashboard si des sessions sont enregistrées.

Phrase à dire :

> La génération IA dépend d'un service externe. Pour sécuriser la démonstration, j'ai prévu un seed local qui permet de valider tout le parcours applicatif sans dépendre de Mistral.

### 7.2 Si l'authentification ne fonctionne pas

Action :

- montrer la page `/login` ;
- montrer la redirection depuis `/generate` sans session ;
- utiliser captures ou environnement local avec session déjà préparée si disponible.

Phrase à dire :

> L'échec OAuth en démo est un risque externe classique. Ce qui est important côté pilotage, c'est que les routes protégées réagissent correctement et que le plan de secours permet de continuer la validation fonctionnelle.

### 7.3 Si la production ne fonctionne pas

Action :

```bash
docker compose up postgres -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Puis ouvrir :

- `http://localhost:3000`
- `http://localhost:3001/health`

Phrase à dire :

> Le projet conserve une capacité de démonstration locale. C'est un arbitrage de pilotage : la production Vercel est la cible, mais Docker/local garantit la continuité de démonstration.

### 7.4 Si la base de données ne fonctionne pas

Action :

- vérifier `DATABASE_URL` ;
- lancer uniquement les pages publiques ;
- montrer schéma DB et seed ;
- montrer captures alternatives.

Preuves :

- `apps/api/src/db/schema.ts`
- `apps/api/src/db/seed.ts`
- `docs/deployment.md`

### 7.5 Si Playwright ou la validation E2E échoue

Action :

```bash
pnpm --filter web exec playwright install chromium firefox
pnpm test:e2e:smoke
```

Si le temps manque :

- présenter `24` tests Chromium passés le 2026-05-07 ;
- préciser que l'échec Firefox local venait du navigateur absent, pas d'une assertion fonctionnelle.

---

## 8. Captures ou preuves alternatives à préparer

Préparer dans un dossier de soutenance ou dans les onglets du navigateur :

| Preuve alternative | Pourquoi |
|---|---|
| Page d'accueil | Montrer que l'application démarre |
| Page login | Montrer l'accès OAuth |
| Formulaire génération séance | Montrer le coeur métier |
| Détail séance + timer | Montrer l'exécution utilisateur |
| Dashboard | Montrer le suivi |
| Paramètres IA | Montrer le pilotage provider |
| Healthcheck API | Montrer disponibilité backend |
| Healthcheck Web | Montrer disponibilité frontend |
| `pnpm test` | Montrer validation unitaires |
| `pnpm test:coverage` | Montrer seuil coverage |
| Workflows GitHub Actions | Montrer CI/CD |
| ADR-003, ADR-004, ADR-007 | Montrer arbitrages IA, auth, déploiement |

---

## 9. Phrase de clôture de la démonstration

> La démonstration montre que la version de référence est utilisable : l'utilisateur peut s'authentifier, générer ou consulter une séance, l'exécuter avec timer, enregistrer un retour et suivre son activité. Les limites restantes sont connues et pilotées : dépendance IA, monitoring externe, harmonisation documentaire et relance E2E complète. En l'état, le projet peut être validé comme version de démonstration RNCP, avec un plan clair de consolidation avant livraison client réelle.
