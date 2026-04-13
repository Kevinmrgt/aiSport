# ADR-002 — Hono comme framework backend

**Date** : 2026-04-13
**Statut** : Accepté
**Auteur** : Kevin

## Contexte

Le backend de SportCoach IA expose une API REST appelée par le frontend Next.js. Il doit valider les inputs, appeler Mistral AI, et persister les entraînements en PostgreSQL. Le choix du framework HTTP TypeScript est déterminant pour la performance, la sécurité et la maintenabilité.

## Options envisagées

| Framework | Avantages | Inconvénients |
|---|---|---|
| **Hono** | Ultra-léger, Edge-ready, TypeScript natif, API Web standard | Écosystème plus jeune qu'Express |
| Express 5 | Écosystème mature, large communauté | Pas TypeScript natif, middleware verbose |
| Fastify | Haute performance, schémas intégrés | Config plus complexe |
| NestJS | Opinionated, IoC container, DI natif | Sur-ingénierie pour un MVP |

## Décision

**Hono** — framework ultra-léger TypeScript avec support natif des Web APIs.

## Justification

1. **TypeScript natif** : pas de `@types/*` additionnels, types précis sur `ctx.req`, `ctx.res`, middleware.
2. **Légèreté** : adapté à un MVP — pas de surcharge NestJS (decorators, modules, DI container).
3. **Web API standard** : `Request`/`Response` natifs, compatible avec Vercel Edge, Cloudflare Workers ou Node.js `@hono/node-server`.
4. **Middleware sécurité inclus** : `secureHeaders()`, `cors()`, `logger()` prêts à l'emploi.
5. **Architecture en couches** : Hono est minimaliste et n'impose rien — facilite l'implémentation stricte Route → Controller → Service → Repository.

## Architecture adoptée

```
Route (Hono router) → Controller (validation Zod) → Service (logique métier) → Repository (Drizzle ORM)
```

Chaque couche a une responsabilité unique et ne doit pas déborder sur les autres.

## Conséquences

- Aucun accès BDD dans les controllers, aucune logique HTTP dans les services.
- Middleware d'erreurs centralisé via `AppError` typé.
- Déploiement sur Railway avec `@hono/node-server`.
