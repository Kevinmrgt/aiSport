---
description: Architecture en couches du backend Hono
globs: "apps/api/**/*.ts"
---

# Architecture Backend

Le backend suit une architecture en couches stricte :

```
Route → Controller → Service → Repository → BDD (Drizzle)
```

## Règles

- **Routes** : définissent les endpoints Hono, appellent le controller, ne contiennent aucune logique
- **Controllers** : valident les inputs (Zod), appellent le service, formatent la réponse HTTP
- **Services** : logique métier pure, ne connaissent pas HTTP ni Drizzle directement
- **Repositories** : encapsulent Drizzle ORM, seul endroit qui touche la BDD

## Interdictions

- Jamais d'accès BDD dans un controller
- Jamais de `req`/`res` HTTP dans un service
- Jamais de logique métier dans une route
- Jamais de SQL brut (toujours Drizzle)

## Error Handling

- Middleware Hono centralisé pour les erreurs
- Erreurs typées : `AppError` avec code HTTP, message, détails
- Les services lancent des `AppError`, le middleware les attrape

## Service Mistral

- Classe dédiée `MistralService` avec contrat JSON strict (Zod)
- Gestion des erreurs : timeout, JSON tronqué, réponse hors format
- Retry avec backoff exponentiel (1 retry max)
- Prompt structuré incluant : sport, niveau, durée, objectifs, contraintes
