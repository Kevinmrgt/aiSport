# Runbook de maintenance Bloc 4 - Alcide

> Projet : **Alcide / alcide**
> Bloc RNCP39583 : **Maintenir l'application logicielle en condition opérationnelle**
> Version : 2026-05-07
> Objet : procédures opérationnelles pour démarrer, tester, déployer, surveiller, corriger et restaurer l'application.

---

## 1. Périmètre

Ce runbook décrit les gestes de maintenance nécessaires pour exploiter Alcide en local, en CI/CD et en production Vercel/Neon.

Composants couverts :

| Composant | Technologie | Preuves |
|---|---|---|
| Web | Next.js 14, Auth.js | `apps/web/`, [apps/web/vercel.json](../../apps/web/vercel.json) |
| API | Hono TypeScript | `apps/api/`, [apps/api/vercel.json](../../apps/api/vercel.json) |
| Base de données | PostgreSQL / Drizzle / Neon | `apps/api/drizzle/`, [db-migrate.yml](../../.github/workflows/db-migrate.yml) |
| IA | Mistral AI, validation Zod | `apps/api/src/services/ai.service.ts` |
| CI/CD | GitHub Actions, Vercel | `.github/workflows/`, [ci-cd.md](../ci-cd.md) |

---

## 2. Contacts et responsabilités

Le projet ayant été conduit en autonomie, les responsabilités ci-dessous sont formalisées pour l'exploitation RNCP.

| Rôle | Responsable | Responsabilités |
|---|---|---|
| Mainteneur applicatif | Kevin | Diagnostic, correctifs, tests, changelog |
| Référent déploiement | Kevin | Vercel, GitHub Actions, rollback |
| Référent base de données | Kevin | Migrations Drizzle, sauvegarde/branche Neon |
| Référent sécurité | Kevin | Secrets, audit, OWASP, incidents sécurité |
| Support client | Simulé sauf preuve ultérieure | Réception et qualification des retours utilisateurs |

Canaux recommandés :

- GitHub Actions pour CI/CD.
- Vercel dashboard pour déploiements et logs runtime.
- Neon dashboard pour base de données.
- Email ou ticket GitHub Issue pour support utilisateur.

---

## 3. Prérequis poste local

| Outil | Version attendue | Vérification |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |
| Docker Desktop | récent | `docker --version` |
| Git | récent | `git --version` |
| Vercel CLI | via `npx vercel@latest` | `npx vercel@latest --version` |

Installer les dépendances :

```bash
pnpm install --frozen-lockfile
```

Si le lockfile doit évoluer après mise à jour de dépendances :

```bash
pnpm install
```

---

## 4. Variables d'environnement

### 4.1 Local avec Docker Compose

Créer le fichier `.env` racine :

```bash
cp .env.example .env
```

Variables sensibles à renseigner :

```text
SERVICE_SECRET=<secret partagé API/Web>
MISTRAL_API_KEY=<clé Mistral>
AUTH_SECRET=<secret Auth.js>
AUTH_GOOGLE_ID=<client Google OAuth>
AUTH_GOOGLE_SECRET=<secret Google OAuth>
NEXTAUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4.2 Développement local hors Docker

Créer les fichiers :

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Point critique : `SERVICE_SECRET` doit être identique côté Web et API.

### 4.3 Production

Configurer les variables dans Vercel :

| Projet | Variables |
|---|---|
| Web | `NEXT_PUBLIC_API_URL`, `SERVICE_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL` |
| API | `DATABASE_URL`, `SERVICE_SECRET`, `MISTRAL_API_KEY`, `FRONTEND_URL`, `NODE_ENV` |

Configurer les secrets GitHub nécessaires à la CD :

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_API_PROJECT_ID
VERCEL_WEB_PROJECT_ID
DATABASE_URL
```

---

## 5. Démarrer l'application localement

### 5.1 Option Docker Compose

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
```

Vérifier :

```bash
curl http://localhost:3001/health
curl http://localhost:3000/api/health
```

Arrêter :

```bash
docker compose down
```

Arrêter en supprimant le volume PostgreSQL local uniquement si une réinitialisation complète est voulue :

```bash
docker compose down -v
```

### 5.2 Option développement local

```bash
docker compose up postgres -d
pnpm db:migrate
pnpm dev
```

URLs locales :

| Service | URL |
|---|---|
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API health | `http://localhost:3001/health` |
| Web health | `http://localhost:3000/api/health` |

---

## 6. Lancer les tests et contrôles qualité

Contrôles standards avant merge :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Tests E2E smoke :

```bash
pnpm test:e2e:smoke
```

Audit sécurité :

```bash
pnpm audit --audit-level=high
```

Critères de validation :

| Contrôle | Attendu |
|---|---|
| `pnpm lint` | aucune erreur ESLint |
| `pnpm typecheck` | aucune erreur TypeScript |
| `pnpm test` | tests API et Web passants |
| `pnpm test:coverage` | seuil coverage respecté |
| `pnpm build` | build shared, API et Web OK |
| `pnpm audit --audit-level=high` | aucune vulnérabilité haute non traitée ou non documentée |

---

## 7. Vérifier les healthchecks

### 7.1 Local

```bash
curl http://localhost:3001/health
curl http://localhost:3000/api/health
```

Réponses attendues :

- API : JSON avec `status: ok`, `timestamp`, `version`.
- Web : JSON avec `status: ok`, `service: alcide-web`, `timestamp`.

### 7.2 Production

```bash
curl https://alcide-api.vercel.app/health
curl https://alcide-web.vercel.app/api/health
curl -I https://alcide-web.vercel.app
```

Critère : HTTP 200 ou 2xx pour les healthchecks.

---

## 8. Appliquer les migrations Drizzle

### 8.1 Générer une migration

Après modification du schéma Drizzle :

```bash
pnpm db:generate
```

Vérifier les fichiers créés dans `apps/api/drizzle/`.

### 8.2 Appliquer localement

```bash
pnpm db:migrate
```

### 8.3 Appliquer en production

Procédure recommandée :

1. Vérifier que la PR applicative est validée.
2. Vérifier la nature de la migration : additive, destructive, renommage, transformation.
3. Créer une branche ou sauvegarde Neon si la migration est sensible.
4. Fusionner seulement après une CI verte : le job `migrate-db` du workflow CD
   applique alors la migration avant tout déploiement API.
5. Vérifier le succès du job `migrate-db` dans les logs GitHub Actions.
6. Vérifier les healthchecks API/Web.
7. Tester un parcours authentifié si le changement touche les données.

Le workflow manuel `DB - Drizzle migrations` est conservé pour une reprise ou
une migration isolée explicitement autorisée.

Commande locale contre production uniquement si la cible `DATABASE_URL` est volontairement configurée :

```bash
pnpm db:migrate
```

Ne pas lancer une migration production depuis un terminal local sans validation explicite de la cible.

---

## 9. Déployer

### 9.1 Déploiement GitHub Actions Vercel

Flux canonique :

```text
main -> CI - Alcide -> migration DB -> API -> smoke API -> Web -> smoke Web
```

Conditions :

- CI verte.
- Secrets Vercel configurés.
- Secret `DATABASE_URL` configuré.
- `ENABLE_GHA_VERCEL_CD=true` si CD automatique souhaitée après CI verte.
- Migration Drizzle réussie ; son échec bloque les déploiements API et Web.

### 9.2 Déploiement manuel API

Depuis la racine :

```bash
pnpm install --frozen-lockfile
pnpm build
cd apps/api
npx vercel@latest pull --yes --environment=production
npx vercel@latest build --prod
npx vercel@latest deploy --prebuilt --prod
```

### 9.3 Déploiement manuel Web

Depuis la racine :

```bash
pnpm install --frozen-lockfile
pnpm build
cd apps/web
npx vercel@latest pull --yes --environment=production
npx vercel@latest build --prod
npx vercel@latest deploy --prebuilt --prod
```

---

## 10. Vérifications post-déploiement

Checklist :

- [ ] API healthcheck HTTP 200.
- [ ] Web healthcheck HTTP 200.
- [ ] Page Web principale accessible.
- [ ] Connexion OAuth Google fonctionnelle.
- [ ] Génération d'entraînement testée avec compte authentifié.
- [ ] Liste ou dashboard utilisateur accessible.
- [ ] Logs Vercel sans erreurs 5xx répétées.
- [ ] `CHANGELOG.md` mis à jour si version ou correctif notable.
- [ ] Fiche anomalie clôturée si le déploiement corrige un incident.

Commandes :

```bash
curl --fail https://alcide-api.vercel.app/health
curl --fail https://alcide-web.vercel.app/api/health
curl -I https://alcide-web.vercel.app
```

---

## 11. Gérer un incident

### 11.1 Détection

Sources possibles :

- GitHub Actions échoue.
- Smoke test production échoue.
- Healthcheck externe échoue.
- Logs Vercel montrent 5xx, erreurs IA, erreurs DB ou auth.
- Utilisateur signale un problème.
- `pnpm audit` remonte une vulnérabilité haute.

### 11.2 Qualification rapide

Questions à trancher :

| Question | But |
|---|---|
| Web, API, DB, IA, auth ou CI ? | Isoler le composant |
| Production ou local uniquement ? | Identifier l'environnement |
| Tous les utilisateurs ou un seul ? | Évaluer l'impact |
| Depuis quel déploiement ? | Trouver la cause probable |
| Existe-t-il un contournement ? | Réduire l'urgence |
| Rollback plus rapide qu'un hotfix ? | Restaurer le service |

### 11.3 Commandes de diagnostic

```bash
git status --short
git log --oneline -5
pnpm test
pnpm build
curl https://alcide-api.vercel.app/health
curl https://alcide-web.vercel.app/api/health
```

Diagnostic production :

- ouvrir les logs du déploiement Vercel concerné ;
- comparer avec le dernier déploiement sain ;
- vérifier GitHub Actions ;
- vérifier Neon si erreurs DB ;
- vérifier fournisseur IA et quotas si erreurs de génération.

### 11.4 Décision

| Situation | Décision |
|---|---|
| Service indisponible après déploiement | Rollback Vercel immédiat |
| Bug fonctionnel non critique | Hotfix en branche, CI, déploiement |
| Migration destructive en cause | Restaurer backup/branche Neon ou migration inverse |
| Secret absent ou erroné | Corriger variable Vercel/GitHub puis redéployer |
| IA externe indisponible | Informer utilisateur, surveiller, envisager fallback ou limitation temporaire |

### 11.5 Clôture

Mettre à jour :

- fiche anomalie ;
- `CHANGELOG.md` si correctif notable ;
- documentation si procédure modifiée ;
- leçons apprises et actions préventives.

---

## 12. Rollback

### 12.1 Rollback Web ou API sur Vercel

1. Ouvrir Vercel.
2. Sélectionner le projet `alcide-web` ou `alcide-api`.
3. Aller dans `Deployments`.
4. Identifier le dernier déploiement sain.
5. Cliquer `Promote to Production`.
6. Vérifier les healthchecks.
7. Vérifier les logs.
8. Communiquer la restauration si un utilisateur est impacté.

### 12.2 Rollback base de données

Priorité : éviter d'avoir besoin d'un rollback DB par conception.

Règles :

- migrations additives privilégiées ;
- pas de suppression de colonne ou table sans sauvegarde ;
- backup/branche Neon avant changement sensible ;
- migration inverse préparée si nécessaire ;
- validation sur environnement local ou preview avant production.

Si incident DB :

1. Stopper les déploiements applicatifs.
2. Identifier la migration fautive.
3. Restaurer depuis backup/branche Neon ou appliquer migration inverse.
4. Redéployer la version applicative compatible.
5. Vérifier API, parcours authentifié et données critiques.

---

## 13. Mise à jour des dépendances

Procédure courte :

```bash
pnpm audit --audit-level=high
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Règles :

- traiter immédiatement les vulnérabilités hautes exploitables ;
- lire le changelog pour les majors ;
- ne pas merger une mise à jour qui modifie le lockfile sans CI verte ;
- ajouter une entrée `CHANGELOG.md` si changement notable ;
- prévoir rollback Vercel si la régression est détectée après déploiement.

---

## 14. Commandes utiles

```bash
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e:smoke
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm audit --audit-level=high
docker compose up --build -d
docker compose logs api
docker compose logs web
docker compose down
curl http://localhost:3001/health
curl http://localhost:3000/api/health
curl https://alcide-api.vercel.app/health
curl https://alcide-web.vercel.app/api/health
```

---

## 15. Limites connues du runbook

| Limite | Impact | Action recommandée |
|---|---|---|
| Pas de preuve d'alerting externe configuré | Détection prod encore partielle | Configurer UptimeRobot, Better Stack ou Vercel Monitoring |
| Logs non centralisés | Diagnostic manuel plus lent | Ajouter logger structuré et export |
| Support client simulé | Preuve C4.3.3 faible | Créer ticket support réel ou retour commanditaire |
| Rollback DB non prouvé | Risque migration | Capturer backup/branche Neon avant prochaine migration |
| Tests repositories sans DB d'intégration | Couverture infrastructure partielle | Ajouter Testcontainers ou base de test dédiée |
