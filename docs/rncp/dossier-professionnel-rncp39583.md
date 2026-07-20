# Dossier professionnel RNCP39583 — Alcide / alcide

> Certification visée : RNCP39583 — Expert en développement logiciel
> Projet support : Alcide / alcide
> Date de consolidation : 2026-05-07
> Version applicative de référence constatée : `package.json` indique `0.12.0`

> **Avertissement de version :** ce dossier transversal a été consolidé le
> 2026-05-07. Ses métriques et conclusions Bloc 2 sont historiques. Le dossier
> Bloc 2 daté après le 2026-07-20 est la source de vérité pour ce bloc.

## Sources utilisées

### Sources RNCP officielles

- [Référentiel Expert en développement logiciel RNCP39583](<./Référentiel Expert en développement logiciel RNCP39583 (1).pdf>)
- [Règlement spécial de certification RNCP39583](<./25 09 15  Réglement spécial de certification - Expert en développement logiciel RNCP39583 (1).pdf>)
- [Modalités d'évaluation RNCP39583 YNOV M2 2025-2026](<./25-26 Modalités_Evaluations_Titre EDL RNCP39583_YNOV_M2_filiere Info (1).pdf>)
- [Règlement général de certification YNOV](<./25 09 12 Réglement général de certification YNOV (1).pdf>)

### Sources projet

- [README projet](../../README.md)
- [Ancien dossier professionnel](../dossier-professionnel.md)
- [Matrice de conformité RNCP39583](./matrice-conformite-rncp39583.md)
- [Cahier de recettes](../bloc2/cahier-recettes.md)
- [Revue OWASP Top 10](../security/owasp-review.md)
- [Documentation CI/CD](../ci-cd.md)
- [Guide de déploiement](../deployment.md)
- [Compte rendu d'activité](../bloc4/compte-rendu-activite.md)
- [ADR architecture](../adr/)
- [Revues de sprint](../sprints/)
- [Fiches anomalies](../bloc4/bugs/)
- [Changelog](../../CHANGELOG.md)
- [Workflows GitHub Actions](../../.github/workflows/)
- [Code API Hono](../../apps/api/src/)
- [Code Web Next.js](../../apps/web/)
- [Package partagé Zod/TypeScript](../../packages/shared/src/)

## Note de réalignement

L'ancien dossier professionnel contient des preuves utiles, mais son découpage ne correspond pas aux quatre blocs officiels RNCP39583. Il associait les blocs à des thèmes techniques : interface utilisateur, persistance des données, sécurité, déploiement et qualité. Le présent document remappe ces preuves selon les intitulés officiels :

- Bloc 1 — Cadrer un projet de développement d'applications logicielles
- Bloc 2 — Concevoir et développer des applications logicielles
- Bloc 3 — Coordonner et piloter un projet de développement d'applications logicielles
- Bloc 4 — Maintenir l'application logicielle en condition opérationnelle

Les preuves ne sont pas inventées. Lorsqu'un élément attendu par le RNCP n'est pas démontré dans les fichiers existants, il est signalé dans une rubrique "Écart / preuve à produire".

---

# 1. Présentation du projet

## Contexte

Alcide est une application web full-stack permettant de générer des entraînements sportifs personnalisés par intelligence artificielle. L'utilisateur sélectionne un sport, décrit son niveau, ses objectifs et ses contraintes, puis reçoit un entraînement ou un programme structuré, sauvegardé en base PostgreSQL et consultable dans l'application.

Le projet est développé en monorepo pnpm avec :

- un frontend Next.js 14 App Router dans [apps/web](../../apps/web/)
- une API Hono TypeScript dans [apps/api/src](../../apps/api/src/)
- un package partagé de types et schémas Zod dans [packages/shared/src](../../packages/shared/src/)
- une base PostgreSQL modélisée avec Drizzle ORM
- une authentification Auth.js avec OAuth Google
- une intégration Mistral AI validée par Zod
- des pipelines GitHub Actions pour CI, CD Vercel, migrations DB et audit

## Problématique

Un sportif non expert peut avoir besoin d'un plan d'entraînement personnalisé sans disposer d'un coach, d'un budget important ou d'une capacité à construire lui-même une progression adaptée. Le projet répond à cette problématique en automatisant la génération d'entraînements personnalisés, tout en sécurisant la génération IA par un contrat JSON strict, une validation Zod et une persistance liée à l'utilisateur authentifié.

## Objectifs

Les objectifs fonctionnels documentés sont :

- permettre la connexion utilisateur via OAuth Google
- générer des séances ou programmes sportifs personnalisés
- stocker les entraînements et programmes de l'utilisateur
- consulter une liste filtrée et paginée des entraînements
- afficher un détail d'entraînement avec timer
- suivre des indicateurs via un dashboard
- exposer des healthchecks web et API

Les objectifs techniques sont :

- maintenir une architecture claire par couches
- partager les contrats de données entre frontend et backend
- protéger les secrets et les données utilisateur
- automatiser la qualité par lint, typecheck, tests, build et audit
- produire une documentation exploitable pour le jury RNCP

## Public cible / utilisateurs

Le public cible principal est composé de sportifs amateurs ou réguliers souhaitant obtenir rapidement une séance adaptée à leur pratique, leur niveau et leurs contraintes. Les utilisateurs secondaires sont le candidat développeur, le jury RNCP, et les acteurs techniques nécessaires au fonctionnement : fournisseurs OAuth, fournisseur IA, hébergeur applicatif et base de données managée.

Écart / preuve à produire : la cartographie officielle des parties prenantes n'existe pas encore comme livrable autonome. Elle doit être formalisée pour le Bloc 1 avec rôle, attentes, niveau d'influence, niveau d'implication et utilisateurs finaux.

## Périmètre fonctionnel

Périmètre couvert par les preuves existantes :

- page d'accueil et navigation
- connexion OAuth Google
- routes protégées
- génération d'entraînements par IA
- génération de programmes multi-semaines
- liste et détail des entraînements
- pagination et filtres
- dashboard utilisateur
- timer d'entraînement
- journalisation de séances terminées dans le code récent
- suppression d'entraînements ou programmes
- healthchecks API et Web

Hors périmètre ou à renforcer :

- support client réel
- monitoring externe avec alerting configuré
- tests d'intégration DB automatisés
- budget prévisionnel consolidé
- planning prévisionnel détaillé comparé au réalisé

## Stack technique

| Couche           | Technologie                                                                 | Preuve                                                                         |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Frontend         | Next.js 14, React, TypeScript, Tailwind CSS                                 | [apps/web](../../apps/web/)                                                    |
| Backend          | Hono, TypeScript, architecture en couches                                   | [apps/api/src](../../apps/api/src/)                                            |
| Base de données  | PostgreSQL, Drizzle ORM                                                     | [schema.ts](../../apps/api/src/db/schema.ts)                                   |
| Authentification | Auth.js / NextAuth v5, OAuth Google                                         | [auth.ts](../../apps/web/lib/auth.ts)                                          |
| IA               | Mistral AI par défaut, OpenAI/Anthropic via clé utilisateur, validation Zod | [ADR-003](../adr/ADR-003-mistral-ai.md), `apps/api/src/services/ai.service.ts` |
| Validation       | Zod côté client, serveur et sortie IA                                       | [packages/shared/src](../../packages/shared/src/)                              |
| Tests            | Vitest, Playwright, axe-core                                                | [cahier de recettes](../bloc2/cahier-recettes.md)                              |
| CI/CD            | GitHub Actions, Vercel, Neon                                                | [ci-cd.md](../ci-cd.md)                                                        |
| Déploiement      | Vercel Web/API, Neon PostgreSQL, Docker supporté                            | [deployment.md](../deployment.md)                                              |

## Synthèse de l'architecture

Architecture logique :

```text
Utilisateur
  -> Next.js App Router
  -> Server Actions / Server Components
  -> API Hono sécurisée par x-internal-secret et x-user-id
  -> Services métier
  -> Repositories Drizzle
  -> PostgreSQL Neon

API Hono
  -> Mistral AI pour la génération
  -> Zod pour valider les entrées et les sorties IA
```

Décisions documentées :

- monorepo pnpm pour partager les types et schémas : [ADR-001](../adr/ADR-001-monorepo-pnpm.md)
- Hono comme backend léger TypeScript : [ADR-002](../adr/ADR-002-hono-backend.md)
- Mistral AI avec JSON mode et validation Zod : [ADR-003](../adr/ADR-003-mistral-ai.md)
- authentification service-to-service : [ADR-004](../adr/ADR-004-service-to-service-auth.md)
- stratégie de tests : [ADR-005](../adr/ADR-005-testing-strategy.md)
- architecture de déploiement : [ADR-006](../adr/ADR-006-deployment-architecture.md)
- CI/CD Vercel + Neon : [ADR-007](../adr/ADR-007-ci-cd-vercel-neon.md)

---

# 2. Bloc 1 — Cadrer un projet de développement d'applications logicielles

## Attendu officiel

Le Bloc 1 est évalué sous forme d'un oral individuel de 30 minutes : 20 minutes de présentation et 10 minutes d'échanges avec le jury. Le support doit présenter le cadrage du projet : parties prenantes, demande, objectifs, opportunités et menaces, audit, diagnostic, risques, veille, comparaison de solutions, ressources, charge, coûts, budget, architecture et préconisations.

## Parties prenantes

Preuves existantes :

- le [README](../../README.md) décrit le projet, ses utilisateurs et sa stack
- l'[ancien dossier professionnel](../dossier-professionnel.md) décrit le contexte et le public visé
- le [compte rendu d'activité](../bloc4/compte-rendu-activite.md) précise que le projet a été conduit en autonomie

Cartographie de travail à formaliser :

| Partie prenante        | Rôle dans le projet                                               | Niveau d'implication constaté | Preuve existante                                                             |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Utilisateur sportif    | Utilise l'application pour générer et consulter des entraînements | Cible fonctionnelle           | [README](../../README.md), [cahier de recettes](../bloc2/cahier-recettes.md) |
| Candidat développeur   | Analyse, conçoit, développe, teste, déploie et documente          | Forte                         | [compte rendu d'activité](../bloc4/compte-rendu-activite.md)                 |
| Jury RNCP              | Évalue la conformité du projet                                    | À préparer                    | [matrice RNCP](./matrice-conformite-rncp39583.md)                            |
| Fournisseur IA Mistral | Génération des contenus sportifs                                  | Dépendance technique          | [ADR-003](../adr/ADR-003-mistral-ai.md)                                      |
| Google OAuth / Auth.js | Authentification utilisateur                                      | Dépendance technique          | [auth.ts](../../apps/web/lib/auth.ts)                                        |
| Vercel / Neon          | Hébergement applicatif et base de données                         | Dépendance technique          | [ci-cd.md](../ci-cd.md), [deployment.md](../deployment.md)                   |

Écart / preuve à produire : il manque une cartographie officielle avec commanditaire réel ou fictif, niveau d'influence, attentes, contraintes, responsabilité et modalités de validation.

## Demande initiale, objectifs et enjeux

La demande initiale reconstruite à partir des preuves est : concevoir une application permettant à un utilisateur authentifié de générer des entraînements personnalisés par IA, de les sauvegarder et de les consulter dans un environnement web sécurisé.

Objectifs et enjeux :

- fournir une expérience simple pour un utilisateur non expert
- sécuriser l'accès aux données par utilisateur
- éviter l'exposition des secrets IA et Auth
- garantir une sortie IA structurée et exploitable
- disposer d'une application démontrable en local, Docker et production
- répondre aux exigences RNCP par des preuves documentaires et techniques

Preuves :

- [README](../../README.md)
- [ancien dossier professionnel](../dossier-professionnel.md)
- [cahier de recettes](../bloc2/cahier-recettes.md)
- [ADR-003](../adr/ADR-003-mistral-ai.md)
- [ADR-004](../adr/ADR-004-service-to-service-auth.md)

Écart / preuve à produire : l'entretien ou l'analyse structurée du besoin commanditaire n'est pas documenté. Il faut produire une fiche "analyse de la demande" avec contexte, irritants, exigences fonctionnelles, exigences non fonctionnelles et critères de succès.

## Opportunités et menaces

Synthèse issue de la veille, des ADR et de la revue sécurité :

| Type        | Élément                               | Impact projet                                 | Preuve                                                                                            |
| ----------- | ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Opportunité | IA générative avec JSON mode          | Personnalisation rapide des entraînements     | [veille technologique](../bloc4/veille-technologique.md), [ADR-003](../adr/ADR-003-mistral-ai.md) |
| Opportunité | Next.js App Router                    | Protection des secrets via Server Actions     | [ADR-004](../adr/ADR-004-service-to-service-auth.md)                                              |
| Opportunité | Monorepo TypeScript                   | Contrats partagés, moins de désynchronisation | [ADR-001](../adr/ADR-001-monorepo-pnpm.md)                                                        |
| Menace      | Coût ou indisponibilité API IA        | Dégradation de la génération                  | [ADR-003](../adr/ADR-003-mistral-ai.md)                                                           |
| Menace      | Prompt injection / sortie IA invalide | Données incohérentes ou risquées              | [owasp-review.md](../security/owasp-review.md)                                                    |
| Menace      | Vendor lock-in Vercel/Neon            | Risque de migration                           | [ADR-007](../adr/ADR-007-ci-cd-vercel-neon.md)                                                    |
| Menace      | Données utilisateur mal isolées       | Risque OWASP A01                              | [owasp-review.md](../security/owasp-review.md)                                                    |

Écart / preuve à produire : la SWOT officielle n'existe pas encore sous forme de matrice complète. Elle doit intégrer opportunités, menaces, adhérences, impact environnemental, sécurité, RGPD, coûts IA et sobriété.

## Contraintes techniques et fonctionnelles

Contraintes documentées :

- TypeScript strict dans le monorepo
- secrets stockés en variables d'environnement
- `SERVICE_SECRET` identique côté Web et API
- validation Zod à chaque frontière
- appel Mistral uniquement côté serveur
- PostgreSQL via Drizzle ORM
- CI bloquante sur lint, typecheck, coverage, build et Docker build
- migrations DB séparées du build applicatif
- déploiement canonique Vercel + Neon

Preuves :

- [package.json](../../package.json)
- [ci-cd.md](../ci-cd.md)
- [deployment.md](../deployment.md)
- [workflows GitHub Actions](../../.github/workflows/)
- [validate-env.ts](../../apps/api/src/lib/validate-env.ts)

Écart / preuve à produire : les contraintes fonctionnelles et non fonctionnelles doivent être consolidées dans un cahier des charges ou une fiche de cadrage.

## Risques projet

Risques déjà couverts par des preuves :

| Risque                                   | Mesure existante                        | Preuve                                                                                       |
| ---------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Accès aux données d'un autre utilisateur | ownership via `userId`, middleware auth | [owasp-review.md](../security/owasp-review.md), [schema.ts](../../apps/api/src/db/schema.ts) |
| Sortie IA invalide                       | JSON mode + Zod + retry                 | [ADR-003](../adr/ADR-003-mistral-ai.md)                                                      |
| Régression logicielle                    | tests unitaires, E2E, CI                | [ci-cd.md](../ci-cd.md), [cahier de recettes](../bloc2/cahier-recettes.md)                   |
| Déploiement non reproductible            | Vercel prebuilt, Docker, docs           | [deployment.md](../deployment.md), [ADR-007](../adr/ADR-007-ci-cd-vercel-neon.md)            |
| Bug bloquant CI                          | fiche anomalie et correction            | [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md)                                       |
| Encodage documentaire incorrect          | fiche anomalie et `.gitattributes`      | [BUG-002](../bloc4/bugs/BUG-002-readme-utf16.md)                                             |

Écart / preuve à produire : il manque un registre unique des risques avec probabilité, impact, criticité, responsable, indicateur et plan de mitigation.

## Faisabilité technique

La faisabilité technique est soutenue par :

- une application fonctionnelle en local, Docker et production
- une API Hono structurée
- une base PostgreSQL modélisée
- une intégration Mistral découplée par service
- des tests automatisés et un cahier de recettes
- des healthchecks pour Web et API
- une CI/CD documentée

Preuves :

- [README](../../README.md)
- [deployment.md](../deployment.md)
- [ci-cd.md](../ci-cd.md)
- [docker-compose.yml](../../docker-compose.yml)
- [schema.ts](../../apps/api/src/db/schema.ts)
- [health.routes.ts](../../apps/api/src/routes/health.routes.ts)
- [route health Web](../../apps/web/app/api/health/route.ts)

Écart / preuve à produire : le diagnostic d'existant et la décision formelle de lancement ne sont pas documentés. Le budget client n'est pas consolidé.

## Veille et comparaison de solutions

Preuves existantes :

- [veille technologique](../bloc4/veille-technologique.md)
- [ADR-001 monorepo pnpm](../adr/ADR-001-monorepo-pnpm.md)
- [ADR-002 Hono](../adr/ADR-002-hono-backend.md)
- [ADR-003 Mistral AI](../adr/ADR-003-mistral-ai.md)
- [ADR-005 stratégie de tests](../adr/ADR-005-testing-strategy.md)
- [ADR-006 déploiement](../adr/ADR-006-deployment-architecture.md)
- [ADR-007 CI/CD Vercel + Neon](../adr/ADR-007-ci-cd-vercel-neon.md)

Comparaisons déjà présentes :

- pnpm monorepo vs dépôts séparés vs npm workspaces
- Hono vs Express vs Fastify vs NestJS
- Mistral AI vs OpenAI vs Gemini vs modèle local
- Vitest/Playwright comme stratégie de tests
- Vercel/Fly/Neon, Docker et options alternatives d'hébergement

Écart / preuve à produire : les comparaisons sont dispersées dans les ADR. Pour le Bloc 1, il faut une synthèse client unique avec critères coût, sécurité, maintenabilité, performance, sobriété et risque.

## Choix d'architecture

Choix retenus :

- monorepo pnpm pour partager les types
- backend Hono en couches
- PostgreSQL + Drizzle ORM
- Auth.js côté Web et secret interne entre Web/API
- Mistral AI côté backend uniquement
- Zod comme contrat de validation transversal
- CI GitHub Actions avant livraison
- production Vercel Web/API + Neon DB

Preuves :

- [ADR](../adr/)
- [apps/api/src](../../apps/api/src/)
- [apps/web](../../apps/web/)
- [packages/shared/src](../../packages/shared/src/)

Écart / preuve à produire : ajouter deux schémas visuels dans le support oral : architecture logique et flux de génération d'entraînement.

## Estimation de charge

Preuves existantes :

- [compte rendu d'activité](../bloc4/compte-rendu-activite.md) avec chronologie des sprints
- [revues de sprint](../sprints/)
- [CHANGELOG](../../CHANGELOG.md)

La chronologie documente le réalisé sur 12 sprints : bootstrap, intégration full-stack, sécurité, tests E2E, rate limiting, Docker, dossier, accessibilité, healthchecks, déploiement Vercel/Neon, pagination, dashboard et fonctionnalités de suivi.

Écart / preuve à produire : aucune estimation prévisionnelle en jours/homme n'est fournie dans les preuves existantes. Il faut produire un chiffrage par lots, priorités, dépendances et écarts prévu/réel.

## Estimation des coûts / budget prévisionnel

Preuves existantes :

- les ADR évoquent des choix orientés coût gratuit ou maîtrisé
- [ADR-003](../adr/ADR-003-mistral-ai.md) justifie Mistral AI notamment par le coût adapté au prototype
- [ADR-006](../adr/ADR-006-deployment-architecture.md) discute les options d'hébergement
- [deployment.md](../deployment.md) documente la cible Vercel + Neon

Écart / preuve à produire : le budget prévisionnel n'est pas présent. Il faut produire un tableau budgétaire séparant temps de développement, hébergement, base de données, IA, nom de domaine, monitoring, maintenance et marge de risque.

## Préconisations et argumentaire client

Argumentaire technique existant :

- la stack choisie permet un prototype full-stack maintenable
- Zod réduit le risque de contrats instables entre IA, API et frontend
- Server Actions + `server-only` évitent l'exposition des secrets
- Vercel/Neon offrent une production démontrable
- Docker conserve une possibilité d'auto-hébergement
- CI/CD, tests et OWASP cadrent la qualité et la sécurité

Écart / preuve à produire : il manque une conclusion de Bloc 1 formulée comme recommandation client : décision attendue, bénéfices, risques acceptés, coûts, conditions de validation et prochaine étape.

## Synthèse Bloc 1

Statut : À renforcer.

Les preuves techniques sont solides, mais le cadrage officiel reste incomplet. Les points les plus critiques sont les parties prenantes, l'analyse commanditaire, la faisabilité formelle, le registre des risques, l'estimation de charge, le budget et l'argumentaire client. Ces éléments sont évalués dans des compétences sensibles, dont plusieurs sont indiquées comme éliminatoires dans la matrice RNCP.

---

# 3. Bloc 2 — Concevoir et développer des applications logicielles

## Attendu officiel

Le Bloc 2 repose sur un rendu écrit individuel avec code source et documentation associée, limité à 30 pages hors annexes. Le dossier doit démontrer la conception, le développement, la qualité, les tests, la sécurité, l'accessibilité, la CI/CD, le cahier de recettes, le plan de correction des bogues et les manuels de déploiement, utilisation et mise à jour.

Livrables Bloc 2 consolidés :

- dossier dédié : [bloc2-dossier-conception-developpement-rncp39583.md](bloc2-dossier-conception-developpement-rncp39583.md)
- plan de correction des bogues : [bloc2-plan-correction-bogues-rncp39583.md](bloc2-plan-correction-bogues-rncp39583.md)
- manuel utilisateur : [bloc2-manuel-utilisateur-alcide.md](bloc2-manuel-utilisateur-alcide.md)
- manuel de mise à jour : [bloc2-manuel-mise-a-jour.md](bloc2-manuel-mise-a-jour.md)
- annexes de preuves : [bloc2-annexes/index.md](bloc2-annexes/index.md)

## Architecture logicielle

Architecture prouvée :

- frontend Next.js App Router
- backend Hono structuré en routes, controllers, services, repositories et middleware
- package partagé Zod/TypeScript
- base PostgreSQL Drizzle
- intégration Mistral AI isolée dans des services
- workflows GitHub Actions

Preuves :

- [apps/api/src](../../apps/api/src/)
- [apps/web](../../apps/web/)
- [packages/shared/src](../../packages/shared/src/)
- [schema.ts](../../apps/api/src/db/schema.ts)
- [ADR-002](../adr/ADR-002-hono-backend.md)

## Prototype / parcours utilisateur

Parcours démontrable :

1. accès page d'accueil
2. connexion OAuth Google
3. génération d'un entraînement ou programme
4. redirection vers le détail
5. consultation du timer
6. retour liste avec filtres et pagination
7. consultation dashboard

Preuves :

- [routes Web](../../apps/web/app/)
- [composants Web](../../apps/web/components/)
- [cahier de recettes](../bloc2/cahier-recettes.md)
- [tests E2E](../../apps/web/tests/e2e/)

Écart / preuve à produire : ajouter au dossier final des captures annotées du prototype ou un court storyboard du parcours.

## Frontend

Le frontend est réalisé avec Next.js 14 App Router. Les preuves principales sont :

- [layout.tsx](../../apps/web/app/layout.tsx) : structure globale, navigation, layout
- [page d'accueil](../../apps/web/app/page.tsx)
- [login](<../../apps/web/app/(auth)/login/page.tsx>)
- [generate](../../apps/web/app/generate/page.tsx)
- [workouts](../../apps/web/app/workouts/page.tsx)
- [dashboard](../../apps/web/app/dashboard/page.tsx)
- [Timer](../../apps/web/components/Timer.tsx)
- [WorkoutForm](../../apps/web/components/WorkoutForm.tsx)
- [ProgramForm](../../apps/web/components/ProgramForm.tsx)
- [server-api.ts](../../apps/web/lib/server-api.ts)

Points démontrables :

- Server Components et Server Actions
- composants de formulaires
- loading states
- redirections protégées
- accessibilité de base avec labels, skip link, focus et ARIA

## Backend

L'API Hono applique une architecture en couches :

```text
Routes -> Controllers -> Services -> Repositories -> Drizzle/PostgreSQL
```

Preuves :

- [routes](../../apps/api/src/routes/)
- [controllers](../../apps/api/src/controllers/)
- [services](../../apps/api/src/services/)
- [repositories](../../apps/api/src/repositories/)
- [middleware auth](../../apps/api/src/middleware/auth.middleware.ts)
- [middleware erreurs](../../apps/api/src/middleware/error.middleware.ts)
- [middleware rate limit](../../apps/api/src/middleware/rate-limit.middleware.ts)

Fonctionnalités backend prouvées :

- génération IA
- accès aux entraînements et programmes
- pagination et filtres
- statistiques utilisateur
- healthcheck
- validation environnement fail-fast
- rate limiting
- ownership par `userId`

## Base de données

Le schéma Drizzle documente :

- utilisateurs Auth.js
- comptes OAuth
- sessions
- entraînements
- programmes multi-semaines
- logs de séance
- paramètres IA utilisateur avec clé chiffrée

Preuve : [schema.ts](../../apps/api/src/db/schema.ts)

Points de conception :

- clés UUID non prédictibles
- relations `userId` pour l'isolation propriétaire
- JSONB pour stocker le contenu généré par IA
- cascade ou `set null` selon les relations
- types inférés Drizzle

Écart / preuve à produire : les tests d'intégration DB automatisés ne sont pas présents ; les repositories sont surtout couverts par tests de service et recettes manuelles.

## Schémas partagés / validation Zod

Le package partagé contient les contrats utilisés par le frontend et l'API :

- [program.schema.ts](../../packages/shared/src/schemas/program.schema.ts)
- [workout.schema.ts](../../packages/shared/src/schemas/workout.schema.ts)
- [session-log.schema.ts](../../packages/shared/src/schemas/session-log.schema.ts)
- [types partagés](../../packages/shared/src/types/)

La validation Zod intervient :

- côté client dans les formulaires
- côté backend dans les controllers
- sur les sorties Mistral avant sauvegarde
- sur certains paramètres de query/pagination

Preuves complémentaires :

- [ADR-003](../adr/ADR-003-mistral-ai.md)
- [owasp-review.md](../security/owasp-review.md)

## Sécurité du code

Mesures documentées :

- Auth.js OAuth Google, cookies HTTP-only
- secret interne `SERVICE_SECRET` entre Web et API
- `server-only` pour empêcher l'exposition du client API interne
- validation Zod stricte
- Drizzle ORM sans SQL brut
- rate limiting sur génération
- headers sécurisés
- CORS restrictif
- fail-fast si variables serveur critiques absentes
- logs sécurité
- timeout Mistral

Preuves :

- [owasp-review.md](../security/owasp-review.md)
- [ADR-004](../adr/ADR-004-service-to-service-auth.md)
- [auth.middleware.ts](../../apps/api/src/middleware/auth.middleware.ts)
- [validate-env.ts](../../apps/api/src/lib/validate-env.ts)
- [rate-limit.middleware.ts](../../apps/api/src/middleware/rate-limit.middleware.ts)

## Accessibilité

Preuves existantes :

- tests Playwright accessibilité : [accessibility.spec.ts](../../apps/web/tests/e2e/accessibility.spec.ts)
- tests axe-core : [axe.spec.ts](../../apps/web/tests/e2e/axe.spec.ts)
- cahier de recettes CR-025 et tests associés : [cahier de recettes](../bloc2/cahier-recettes.md)
- composants avec labels, `aria-live`, `aria-busy`, skip link et états de focus

Preuve produite : l'annexe Bloc 2 `B2-A10-playwright-smoke-2026-06-30.md` consigne le smoke Playwright/axe avec 48 exécutions passées. Une capture du rapport HTML Playwright reste utile pour la soutenance.

## Tests unitaires

Preuves :

- tests API dans `apps/api/tests/`
- test Web Timer : [Timer.test.ts](../../apps/web/components/Timer.test.ts)
- configuration Vitest API : [vitest.config.ts](../../apps/api/vitest.config.ts)
- scripts : [package.json](../../package.json)
- cahier de recettes : [tests automatisés](../bloc2/cahier-recettes.md)

Référence vérifiée le 2026-06-30 : `pnpm test` passe avec 71 tests Vitest (70 API + 1 Web). `pnpm test:coverage` couvre l'API avec 82.33% statements, 78.6% branches, 89.23% functions et 82.33% lines.

Les tests E2E smoke ont été exécutés le 2026-06-30 : `pnpm test:e2e:smoke` passe avec 48 exécutions Playwright sur Chromium et Firefox. Le fichier `generate.spec.ts` représente 8 exécutions supplémentaires à relancer si le dossier annonce le total E2E complet de 56.

## Tests E2E

Preuves :

- [home.spec.ts](../../apps/web/tests/e2e/home.spec.ts)
- [auth.spec.ts](../../apps/web/tests/e2e/auth.spec.ts)
- [generate.spec.ts](../../apps/web/tests/e2e/generate.spec.ts)
- [accessibility.spec.ts](../../apps/web/tests/e2e/accessibility.spec.ts)
- [axe.spec.ts](../../apps/web/tests/e2e/axe.spec.ts)
- [playwright-report](../../apps/web/playwright-report/)

Couverture attendue :

- pages publiques
- login
- routes protégées
- validations de formulaire
- accessibilité RGAA/WCAG
- smoke tests CI

Preuve produite : le rapport smoke est consigné dans `docs/rncp/bloc2-annexes/B2-A10-playwright-smoke-2026-06-30.md`. Conserver une capture du rapport HTML reste un plus pour l'annexe jury.

## CI/CD

Preuves :

- [ci.yml](../../.github/workflows/ci.yml)
- [deploy-vercel.yml](../../.github/workflows/deploy-vercel.yml)
- [db-migrate.yml](../../.github/workflows/db-migrate.yml)
- [ci-cd.md](../ci-cd.md)
- [ADR-007](../adr/ADR-007-ci-cd-vercel-neon.md)

Gates CI :

- install avec lockfile gelé
- build du package partagé
- typecheck
- lint
- tests unitaires avec coverage
- build
- smoke E2E et accessibilité
- Docker build API et Web
- audit sécurité non bloquant mais visible

## Cahier de recettes

Le cahier de recettes couvre notamment :

- authentification
- génération d'entraînement
- consultation, timer, suppression
- sécurité
- rate limiting
- états de chargement
- healthchecks
- pagination, filtres et dashboard
- tests automatisés

Preuve : [cahier de recettes](../bloc2/cahier-recettes.md)

Écart / preuve à produire : le scénario CR-013 "Erreur API Mistral" est maintenant clarifié dans le cahier de recettes. Il est couvert partiellement par tests unitaires, mais la coupure IA réelle reste à relancer si elle doit être présentée comme preuve manuelle.

## Plan de correction des bugs

Preuves de bugs traités :

- [BUG-001 — coverage threshold](../bloc4/bugs/BUG-001-coverage-threshold.md)
- [BUG-002 — README UTF-16](../bloc4/bugs/BUG-002-readme-utf16.md)
- [CHANGELOG](../../CHANGELOG.md)

Preuve créée : le plan global de correction des bogues Bloc 2 est disponible dans [bloc2-plan-correction-bogues-rncp39583.md](bloc2-plan-correction-bogues-rncp39583.md). Il relie anomalie, source, priorité, correction et test de non-régression.

## Manuels de déploiement, utilisation et mise à jour

Preuves existantes :

- manuel de déploiement : [deployment.md](../deployment.md)
- CI/CD et migrations : [ci-cd.md](../ci-cd.md)
- commandes utilisateur/développeur : [README](../../README.md)
- journal de version : [CHANGELOG](../../CHANGELOG.md)

Preuves créées :

- manuel utilisateur final : [bloc2-manuel-utilisateur-alcide.md](bloc2-manuel-utilisateur-alcide.md)
- manuel de mise à jour applicative : [bloc2-manuel-mise-a-jour.md](bloc2-manuel-mise-a-jour.md)

## Synthèse Bloc 2

Statut : OK avec harmonisation documentaire nécessaire.

Le Bloc 2 est le bloc le plus solidement couvert par le code et les preuves existantes. Les principaux livrables documentaires manquants ont été consolidés : dossier dédié, plan de correction des bogues, manuel utilisateur, manuel de mise à jour et index d'annexes. Les contrôles récents sont passés : tests unitaires, coverage, build, lint, typecheck, audit high et smoke E2E. Les risques restants portent surtout sur les captures CI, captures prototype, healthchecks datés, CR-013 en coupure IA réelle et `generate.spec.ts` hors smoke.

---

# 4. Bloc 3 — Coordonner et piloter un projet de développement d'applications logicielles

## Attendu officiel

Le Bloc 3 est évalué par un oral individuel de 45 minutes : 30 minutes de présentation et 15 minutes d'échanges. Le candidat doit présenter la gestion du projet et réaliser une démonstration du logiciel. Le support doit couvrir méthodologie, planning, ressources, outil de suivi, arbitrage, affectation des missions, management, communication, compétences, comptes rendus, points de validation, indicateurs de satisfaction et démonstration.

## Méthodologie projet

Preuves existantes :

- [compte rendu d'activité](../bloc4/compte-rendu-activite.md)
- [revues de sprint](../sprints/)
- [CHANGELOG](../../CHANGELOG.md)

Méthode constatée :

- approche itérative inspirée Scrum
- sprints successifs avec livrables
- documentation des décisions par ADR
- CI/CD à chaque push
- amélioration continue par bugs, tests et changelog

Écart / preuve à produire : formaliser la méthodologie dans un support Bloc 3 avec cérémonies, définition de terminé, rôles, critères de validation et adaptation au contexte solo.

## Planning détaillé

Le projet dispose d'une chronologie réelle dans le compte rendu d'activité et les sprints. Les sprints documentent les jalons suivants :

- Sprint 01 : bootstrap monorepo et CI
- Sprint 02 : intégration frontend-backend et auth
- Sprint 03 : suppression, erreurs, coverage
- Sprint 04 : E2E et OWASP
- Sprint 05 : rate limiting et loading states
- Sprint 06 : Docker et déploiement
- Sprint 07 : dossier professionnel et CRA
- Sprint 08 : axe-core et seed
- Sprint 09 : correction encodage README
- Sprint 10 : healthcheck Web et fail-fast env
- Sprint 11 : Vercel/Neon et docs RNCP
- Sprint 12 : pagination, dashboard et BDD live

Preuves :

- [compte rendu d'activité](../bloc4/compte-rendu-activite.md)
- [sprints](../sprints/)
- [CHANGELOG](../../CHANGELOG.md)

Écart / preuve à produire : il manque un planning prévisionnel avec charge estimée, dépendances, jalons, écarts prévu/réel et justification des dérives.

## Organisation des sprints

Preuves :

- [sprint-01.md](../sprints/sprint-01.md) à [sprint-12.md](../sprints/sprint-12.md)
- [CHANGELOG](../../CHANGELOG.md)

Points forts :

- chaque sprint correspond à des livrables visibles
- les versions applicatives sont consignées dans le changelog
- les incidents importants ont donné lieu à des fiches anomalies

Incohérence à signaler : certains documents historiques mentionnent 10 sprints alors que le projet contient maintenant 12 revues de sprint et un changelog jusqu'à `0.12.0`.

## Ressources nécessaires

Ressources techniques documentées :

- poste de développement Windows
- Node.js 20
- pnpm
- Docker Desktop
- PostgreSQL local ou Neon
- Vercel
- GitHub Actions
- Mistral AI
- Google OAuth

Preuves :

- [README](../../README.md)
- [deployment.md](../deployment.md)
- [ci-cd.md](../ci-cd.md)
- [.env.example](../../.env.example)

Écart / preuve à produire : préciser les ressources humaines, rôles, charge et compétences nécessaires pour une équipe projet cible.

## Outil de suivi

Preuves existantes :

- Git et GitHub pour versioning
- GitHub Actions pour suivi qualité
- sprints Markdown
- CHANGELOG pour suivi versions
- fiches BUG pour anomalies

Écart / preuve à produire : il n'existe pas de preuve d'un tableau Kanban, backlog priorisé ou outil de suivi projet dédié. Un tableau de pilotage Bloc 3 doit être produit avec statut, priorité, responsable, échéance, KPI qualité et avancement.

## Répartition des missions

Constat :

- le projet est documenté comme conduit en autonomie complète par le candidat
- les preuves ne démontrent pas une affectation réelle à une équipe

Preuve : [compte rendu d'activité](../bloc4/compte-rendu-activite.md)

Écart / preuve à produire : créer une répartition honnête et conforme au contexte : RACI d'un projet solo avec parties prenantes simulées ou cibles, limites du contexte, et missions qui auraient été affectées dans une équipe réelle.

## Arbitrages réalisés

Arbitrages techniques prouvés :

- choix pnpm monorepo
- choix Hono
- choix Mistral AI
- choix auth service-to-service
- choix stratégie de tests
- choix Vercel/Neon comme cible canonique
- arbitrage coverage CI dans BUG-001

Preuves :

- [ADR](../adr/)
- [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md)

Écart / preuve à produire : sélectionner un cas d'arbitrage pour l'oral Bloc 3 et le formaliser avec options, critères, matrice de décision, risques, décision et résultat. Le cas BUG-001 ou le choix Vercel/Neon sont les plus exploitables.

## Communication projet

Preuves existantes :

- documentation technique Markdown
- ADR
- sprints
- changelog
- fiches anomalies
- README

Écart / preuve à produire : absence de comptes rendus adressés à un client, d'outil de communication équipe, de modalités de validation client ou d'indicateurs de satisfaction.

## Comptes rendus d'activité

Preuve principale : [compte rendu d'activité](../bloc4/compte-rendu-activite.md)

Ce document décrit :

- contexte d'activité
- chronologie
- méthodologie
- outils
- compétences développées
- difficultés
- résultats
- perspectives

Écart / preuve à produire : pour le Bloc 3, il faut produire 2 ou 3 comptes rendus client synthétiques avec décisions, validations, remarques, actions et indicateurs.

## Indicateurs de suivi

Indicateurs déjà présents :

- coverage statements
- coverage functions
- nombre de tests unitaires et E2E
- erreurs TypeScript
- erreurs ESLint
- vulnérabilités high
- statut healthchecks
- versions changelog
- statut bugs

Preuves :

- [cahier de recettes](../bloc2/cahier-recettes.md)
- [ci-cd.md](../ci-cd.md)
- [CHANGELOG](../../CHANGELOG.md)
- [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md)

Écart / preuve à produire : consolider les KPI dans un tableau de bord projet unique et harmoniser les valeurs finales après exécution récente des tests.

## Points de validation

Points de validation existants ou implicites :

- CI verte
- build réussi
- tests unitaires passants
- smoke tests Web/API
- cahier de recettes
- versions changelog
- déploiement Vercel

Écart / preuve à produire : formaliser les points de validation métier/client par jalon : MVP, sécurité, accessibilité, déploiement, version soutenance.

## Indicateurs de satisfaction

Écart / preuve à produire : aucun indicateur de satisfaction utilisateur ou client n'est prouvé. À produire : questionnaire court, grille de démonstration, score de compréhension, temps de génération acceptable, satisfaction sur parcours et retour qualitatif.

## Démonstration prévue de la dernière version logicielle

Éléments démontrables :

- Web production : `https://alcide-web.vercel.app`
- API production : `https://alcide-api.vercel.app`
- healthcheck API : `https://alcide-api.vercel.app/health`
- healthcheck Web : `https://alcide-web.vercel.app/api/health`

Scénario recommandé :

1. présenter l'objectif utilisateur
2. ouvrir l'application
3. montrer la connexion
4. générer un entraînement
5. consulter le détail et le timer
6. montrer liste, filtres, pagination
7. montrer dashboard
8. expliquer en une minute la sécurité `server-only` et `x-internal-secret`
9. montrer healthchecks et CI/CD

Écart / preuve à produire : écrire le script final de démonstration de 5 à 7 minutes avec vocabulaire adapté à un jury non exclusivement technique.

## Synthèse Bloc 3

Statut : À renforcer.

Le projet prouve une conduite itérative réelle, mais le pilotage officiel RNCP n'est pas encore assez formalisé. Les manques principaux concernent le planning prévisionnel, l'outil de suivi, la gestion d'équipe ou sa mise en situation, les compétences, les comptes rendus client, les indicateurs de satisfaction et le script de démonstration.

---

# 5. Bloc 4 — Maintenir l'application logicielle en condition opérationnelle

## Attendu officiel

Le Bloc 4 est évalué par un dossier écrit individuel de 20 pages maximum hors annexes. Le dossier doit présenter la gestion du monitoring, le traitement des anomalies et la maintenance : mises à jour des dépendances, supervision, collecte des anomalies, fiche anomalie, correctif, recommandations, journal de version et collaboration support client.

## Processus de mise à jour des dépendances

Preuves existantes :

- [pnpm-lock.yaml](../../pnpm-lock.yaml)
- [package.json](../../package.json)
- [ci.yml](../../.github/workflows/ci.yml)
- [ci-cd.md](../ci-cd.md)
- [CHANGELOG](../../CHANGELOG.md)

Processus actuellement déductible :

- lockfile versionné
- install CI avec `--frozen-lockfile`
- audit `pnpm audit --audit-level=high`
- tests, typecheck, lint et build avant livraison
- consignation dans changelog si modification notable

Preuve créée : le processus complet de mise à jour est formalisé dans [bloc2-manuel-mise-a-jour.md](bloc2-manuel-mise-a-jour.md) : branche, dépendances, lecture changelog, audit, tests, migration éventuelle, déploiement, rollback et journalisation. Le contrôle historique du 2026-06-30 comptait 2 alertes low et 4 moderate ; le contrôle local du 2026-07-20 sur la candidate `0.13.0-rc.2`, exécuté avec `pnpm audit --audit-level=low`, ne remonte plus aucune vulnérabilité connue. La CI du SHA final doit confirmer ce résultat.

## CI/CD et audit

Preuves :

- [ci.yml](../../.github/workflows/ci.yml)
- [deploy-vercel.yml](../../.github/workflows/deploy-vercel.yml)
- [db-migrate.yml](../../.github/workflows/db-migrate.yml)
- [ci-cd.md](../ci-cd.md)

La CI couvre :

- lint et typecheck
- tests unitaires avec coverage
- build
- E2E smoke et accessibilité
- Docker build
- audit sécurité visible

La CD Vercel couvre :

- validation des secrets
- pull env Vercel
- build Vercel
- déploiement prebuilt
- smoke test API et Web

## Supervision / healthchecks / alerting

Preuves existantes :

- healthcheck API : [health.routes.ts](../../apps/api/src/routes/health.routes.ts)
- healthcheck Web : [route.ts](../../apps/web/app/api/health/route.ts)
- Docker healthchecks : [docker-compose.yml](../../docker-compose.yml)
- smoke tests production : [deploy-vercel.yml](../../.github/workflows/deploy-vercel.yml)
- documentation : [ci-cd.md](../ci-cd.md)

Écart / preuve à produire : les sondes existent mais l'alerting externe n'est pas prouvé. Il faut formaliser le périmètre de supervision, les indicateurs, seuils, fréquence, responsable et canal d'alerte. Une preuve UptimeRobot, Vercel Monitoring, Better Stack ou équivalent renforcerait fortement le Bloc 4.

## Processus de collecte des anomalies

Preuves :

- [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md)
- [BUG-002](../bloc4/bugs/BUG-002-readme-utf16.md)
- [CHANGELOG](../../CHANGELOG.md)

Les fiches existantes contiennent description, contexte, cause racine, reproduction, correction, vérification et leçons apprises.

Écart / preuve à produire : il manque une procédure générale de collecte et triage : source, sévérité, priorité, reproduction, responsable, décision, correction, validation, clôture.

## Fiches anomalies rencontrées

Anomalies prouvées :

| Anomalie                         | Sévérité    | Statut | Preuve                                                 |
| -------------------------------- | ----------- | ------ | ------------------------------------------------------ |
| Coverage CI à 54% sous seuil 70% | Bloquant CI | Résolu | [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md) |
| README encodé en UTF-16 LE       | Modéré      | Résolu | [BUG-002](../bloc4/bugs/BUG-002-readme-utf16.md)       |

Point fort : BUG-001 est un excellent cas Bloc 4 car il relie incident, CI, cause racine, correction et validation.

## Traitement des bugs et correctifs déployés

Correctifs documentés :

- exclusions coverage et nouveaux tests unitaires pour BUG-001
- réécriture README UTF-8 et `.gitattributes` pour BUG-002
- fail-fast variables serveur
- fix healthcheck Web
- correction Auth.js `trustHost` sur Vercel
- pagination/filtres validés par Zod

Preuves :

- [BUG-001](../bloc4/bugs/BUG-001-coverage-threshold.md)
- [BUG-002](../bloc4/bugs/BUG-002-readme-utf16.md)
- [CHANGELOG](../../CHANGELOG.md)
- [owasp-review.md](../security/owasp-review.md)

## Journal des versions

Preuve principale : [CHANGELOG](../../CHANGELOG.md)

Le changelog suit une structure proche de Keep a Changelog et trace les versions de `0.1.0` à `0.12.0`, avec ajouts, changements, corrections et sécurité.

Incohérence résolue le 2026-05-07 : [deployment.md](../deployment.md) indique désormais `0.12.0` comme version applicative de référence, alignée avec [package.json](../../package.json) et [CHANGELOG](../../CHANGELOG.md).

## Rollback

Preuve existante : [ci-cd.md](../ci-cd.md) documente le rollback Vercel par promotion d'un dernier déploiement sain, et rappelle que les migrations destructrices doivent être évitées ou accompagnées d'une migration inverse.

Écart / preuve à produire : ajouter une procédure rollback complète avec critères de déclenchement, responsable, étapes Web/API, étapes DB, communication et validation post-rollback.

## Recommandations d'amélioration

Recommandations déjà présentes dans les docs :

- tests d'intégration DB avec Testcontainers
- monitoring production structuré
- Redis ou Upstash pour le rate limiting cross-instances
- export PDF
- PWA/offline pour timer
- supervision externe et alerting
- meilleure consolidation des métriques

Preuves :

- [compte rendu d'activité](../bloc4/compte-rendu-activite.md)
- [ancien dossier professionnel](../dossier-professionnel.md)
- [owasp-review.md](../security/owasp-review.md)

Écart / preuve à produire : prioriser ces recommandations avec source du retour, indicateur, gain attendu, coût, délai et risque.

## Exemple de collaboration support client

Écart / preuve à produire : aucun exemple réel de collaboration support client n'est présent dans les fichiers existants. Les fiches BUG prouvent le traitement technique d'anomalies, mais pas une interaction support/client. Il faut créer une preuve traçable et honnête : retour utilisateur ou commanditaire, qualification, diagnostic, réponse, correctif, validation et clôture.

## Synthèse Bloc 4

Statut : Partiel.

Le Bloc 4 dispose de preuves solides sur les bugs, les correctifs, la CI/CD, le rollback et le changelog. Les points à renforcer sont la supervision avec alerting, le processus formel de collecte des anomalies, le processus de mise à jour des dépendances, la priorisation des améliorations et le cas support client.

---

# 6. Synthèse finale

## Niveau de couverture par bloc

| Bloc officiel RNCP39583                                                              | Couverture actuelle | Justification                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bloc 1 — Cadrer un projet de développement d'applications logicielles                | À renforcer         | Les preuves techniques existent, mais le cadrage client, le budget, la charge, les risques et les préconisations ne sont pas encore formalisés.                                                                                |
| Bloc 2 — Concevoir et développer des applications logicielles                        | OK                  | Code, architecture, tests, CI/CD, sécurité, accessibilité, cahier de recettes et déploiement sont prouvés ; les contrôles locaux du 2026-06-30 sont verts, hors `generate.spec.ts` E2E complet et CR-013 en coupure IA réelle. |
| Bloc 3 — Coordonner et piloter un projet de développement d'applications logicielles | À renforcer         | La conduite itérative est réelle, mais le pilotage officiel, les outils de suivi, l'équipe, les comptes rendus client et les indicateurs de satisfaction sont insuffisamment prouvés.                                          |
| Bloc 4 — Maintenir l'application logicielle en condition opérationnelle              | Partiel             | Bugs, changelog, correctifs et CI/CD sont solides ; supervision/alerting, processus anomalies et support client doivent être renforcés.                                                                                        |

## Risques restants

| Risque                                                      | Bloc concerné   | Niveau        | Action attendue                                                    |
| ----------------------------------------------------------- | --------------- | ------------- | ------------------------------------------------------------------ |
| Compétences éliminatoires Bloc 1 insuffisamment formalisées | Bloc 1          | Élevé         | Produire support cadrage complet                                   |
| Budget et charge absents                                    | Bloc 1          | Élevé         | Créer estimation prévisionnelle et budget                          |
| Pilotage projet trop rétrospectif                           | Bloc 3          | Élevé         | Créer planning prévu/réel et tableau de bord                       |
| Équipe et compétences non démontrées                        | Bloc 3          | Élevé         | Produire RACI, grille compétences et plan de montée en compétences |
| Alerting externe absent                                     | Bloc 4          | Moyen à élevé | Formaliser ou mettre en place une supervision                      |
| Support client absent                                       | Bloc 4          | Moyen         | Produire un cas support traçable                                   |
| Chiffres et versions incohérents                            | Tous            | Moyen         | Harmoniser README, dossier, CRA, changelog, deployment             |
| Tests DB non automatisés                                    | Bloc 2 / Bloc 4 | Moyen         | Documenter limite ou ajouter tests d'intégration                   |

## Incohérences à corriger avant dépôt

- Version projet : `package.json`, [deployment.md](../deployment.md) et `CHANGELOG` sont alignés sur `0.12.0`.
- Nombre de sprints : certains documents mentionnent 10 sprints ; les preuves actuelles vont jusqu'au sprint 12.
- Nombre de tests : la référence vérifiée est `pnpm test` = 71 tests Vitest passés ; les chiffres 28, 32, 41 ou 70 sont historiques.
- Nombre de scénarios de recette : 33 scénarios CR documentés ; la numérotation va jusqu'à CR-044 mais reste discontinue.
- Déploiement cible : [ADR-006](../adr/ADR-006-deployment-architecture.md) est désormais marquée historique ; [ADR-007](../adr/ADR-007-ci-cd-vercel-neon.md), [ci-cd.md](../ci-cd.md) et [deployment.md](../deployment.md) définissent Vercel Web/API + Neon comme production canonique.

## Actions prioritaires avant dépôt ou soutenance

1. Produire le support Bloc 1 officiel : parties prenantes, demande, SWOT, audit, faisabilité, risques, veille, comparaison, charge, budget, architecture, préconisation.
2. Produire le support Bloc 3 officiel : planning prévu/réel, tableau de pilotage, RACI, arbitrage, communication, compétences, comptes rendus client, indicateurs de satisfaction, script de démo.
3. Compléter le dossier Bloc 4 : processus dépendances, supervision/alerting, procédure anomalies, cas support client, rollback détaillé, recommandations priorisées.
4. Harmoniser versions, sprints, métriques et tests dans README, dossier, CRA, cahier de recettes, deployment et changelog.
5. Exécuter les commandes de validation finales et figer les chiffres :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e:smoke
pnpm build
```

6. Préparer une démonstration courte et fiable de la dernière version : login, génération, détail, timer, liste filtrée, dashboard, healthchecks et CI/CD.

## Conclusion

Le projet Alcide dispose d'une base technique solide et de nombreuses preuves exploitables : architecture, code, sécurité, accessibilité, tests, CI/CD, déploiement, changelog et anomalies réelles. Le principal travail restant n'est pas de réécrire le code, mais de présenter le projet selon la logique officielle RNCP39583. Le présent dossier constitue une base réalignée pour construire les supports finaux de dépôt et de soutenance.
