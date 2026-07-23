# Alcide

Alcide est une application Web qui prépare des séances et des programmes
sportifs personnalisés. Une séance peut ensuite être suivie avec un minuteur,
puis enregistrée dans un journal pour alimenter le tableau de bord.

- Application : <https://ai-sport-web.vercel.app>
- Dépôt : <https://github.com/Kevinmrgt/aiSport>
- API : <https://ai-sport-api.vercel.app/health>
- Version présentée : `0.13.0-rc.7`
- Révision déployée : `d42e7f2c8fc86f26c46f850d32eb748870c6140d`

Le projet utilise Next.js 15, Hono, PostgreSQL 16, Drizzle ORM, Auth.js,
OpenAI, Vitest et Playwright. Le monorepo fonctionne avec Node.js 24 et pnpm
11.9.

## Livrables Bloc 2

Les deux documents remis au jury sont conservés dans `output/pdf/` :

- dossier principal Bloc 2, limité à 30 pages hors annexes ;
- annexes avec les preuves, le cahier de recettes, le plan de correction, la
  revue OWASP, la matrice user stories et les trois manuels.

La source du dossier se trouve dans
[`docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md`](docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md).

## Démarrage avec Docker

### Prérequis

- Git ;
- Docker Desktop avec Docker Compose v2 ;
- un client OAuth Google ;
- une clé OpenAI pour tester la génération réelle.

Après le clonage :

```bash
git clone https://github.com/Kevinmrgt/aiSport.git
cd aiSport
cp .env.example .env
```

Sous PowerShell, la copie du fichier peut être faite avec :

```powershell
Copy-Item .env.example .env
```

Deux secrets distincts doivent être générés : `AUTH_SECRET` pour Auth.js et
`SERVICE_SECRET` pour les échanges entre le Web et l'API. Cette commande peut
être exécutée deux fois :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dans Google Cloud Console, le client OAuth Web doit autoriser :

- origine JavaScript : `http://localhost:3000` ;
- URI de redirection : `http://localhost:3000/api/auth/callback/google`.

Les valeurs `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`,
`SERVICE_SECRET` et `OPENAI_API_KEY` sont ensuite renseignées dans `.env`.
Ce fichier est ignoré par Git.

La stack peut alors être lancée :

```bash
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose up --build -d
```

Points de contrôle attendus :

- Web : <http://localhost:3000> ;
- API liveness : <http://localhost:3001/health> ;
- API readiness : <http://localhost:3001/health/ready>.

Pour consulter les journaux ou arrêter la stack :

```bash
docker compose logs -f web api
docker compose down
```

La commande suivante supprime aussi le volume PostgreSQL et toutes les données
locales. Elle ne doit être utilisée que pour repartir de zéro :

```bash
docker compose down -v
```

Le seed est une fixture technique associée à `demo@alcide.app`. Il n'apparaît
pas pour un autre compte Google. Pour une démonstration fonctionnelle, il est
plus simple de créer une séance avec le compte utilisé lors de la connexion.

## Démarrage sans conteneur Web/API

Prérequis supplémentaires : Node.js 24 et pnpm 11.9.

```bash
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Les fichiers `apps/api/.env` et `apps/web/.env.local` doivent recevoir les
mêmes valeurs de `SERVICE_SECRET`. Les identifiants Google sont configurés
uniquement côté Web. La clé OpenAI reste uniquement côté API.

## Parcours de vérification rapide

1. Ouvrir `/login` et se connecter avec Google.
2. Créer une séance courte depuis `/generate`.
3. Ouvrir la séance, démarrer le minuteur puis enregistrer le ressenti.
4. Vérifier l'apparition de l'activité dans `/dashboard`.
5. Créer un programme depuis `/programs/generate`.
6. Vérifier les listes, les filtres, les paramètres et la suppression.

Le jury dispose en production d'un accès temporaire distinct de Google. Cet
accès est plafonné à 30 générations réussies au total, partagées entre les
séances et les programmes. Le compteur est persistant et sa réservation est
atomique : 31 demandes concurrentes donnent 30 acceptations et un refus. Une
suppression ne recrédite pas le quota ; un échec IA ou d'enregistrement en base
libère en revanche la réservation. Les comptes Google restent illimités. La
recette navigateur de production affiche 29 générations restantes après une
génération de validation.

Sans identifiants Google, les pages publiques et les healthchecks restent
consultables. Sans clé OpenAI, l'application démarre mais la génération ne peut
pas être testée.

## Contrôles qualité

Toutes les commandes suivantes construisent d'abord le package partagé, ce qui
permet leur exécution depuis un clone propre :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e:smoke
pnpm build
pnpm audit --prod --audit-level=low
```

La baseline comprend 267 tests unitaires et de composants : 14 dans le package
partagé, 179 côté API et 74 côté Web. La CI exécute en plus PostgreSQL 16, dont
le test dédié des 31 réservations concurrentes du quota jury, les tests
Playwright E2E, l'audit de dépendances et la construction des images Docker. La
CI `29994929981` et la CD `29995297354` ont réussi sur la révision indiquée en
tête de ce README.

## Structure

```text
apps/web/          interface Next.js et authentification
apps/api/          API Hono, services métier et repositories
packages/shared/   types et schémas Zod partagés
docs/adr/          décisions d'architecture
docs/bloc2/        cahier de recettes
docs/rncp/         dossier, annexes et manuels Bloc 2
docs/security/     revue OWASP
.github/workflows/ intégration et déploiement continus
```

Les procédures détaillées se trouvent dans
[`docs/deployment.md`](docs/deployment.md) et
[`docs/ci-cd.md`](docs/ci-cd.md).
