# ADR-004 — Authentification service-to-service (Next.js → Hono)

**Date** : 2026-04-13
**Statut** : Accepté
**Décideurs** : Kevin (développeur)

---

## Contexte

Le frontend Next.js 14 et le backend Hono sont deux processus distincts (ports 3000 et 3001). L'utilisateur s'authentifie via Auth.js (GitHub OAuth) qui stocke la session dans un JWT signé dans un cookie HTTP-only. Ce cookie n'est pas accessible au JavaScript côté client, ce qui rend impossible la transmission directe du token de session dans les requêtes API client-side.

### Contraintes
- Le cookie Auth.js (`authjs.session-token`) est HTTP-only — inaccessible depuis le navigateur
- Le backend Hono doit pouvoir identifier l'utilisateur sur chaque requête
- L'API key ne doit jamais être exposée côté client (OWASP A02)
- La solution doit fonctionner sans dépendance réseau entre les deux apps (pas de session partagée via Redis)

---

## Options envisagées

### Option A — Passer le cookie session via CORS avec credentials
Le navigateur envoie automatiquement le cookie HTTP-only si `credentials: 'include'` est configuré et si le CORS autorise l'origine. Hono validerait le token en base de données (`sessions` table).

**Inconvénients** :
- Nécessite une requête DB sur chaque appel API (latence)
- Le CORS avec credentials est plus complexe à sécuriser
- L'app mobile ou API-only ne pourrait pas utiliser la même stratégie

### Option B — JWT partagé entre Auth.js et Hono
Hono décode le même JWT Auth.js avec `AUTH_SECRET` partagé. Aucune requête DB.

**Inconvénients** :
- Le format JWT d'Auth.js v5 peut évoluer entre versions
- Couplage entre les deux apps sur le format du token
- Nécessite d'exposer `AUTH_SECRET` côté Hono

### Option C — Secret interne service-to-service ✅ Retenu
Next.js Server Actions et Server Components appelent Hono côté serveur (jamais depuis le navigateur). Ils passent un `x-internal-secret` partagé + `x-user-id` extrait de la session Auth.js. Hono valide uniquement le secret.

**Avantages** :
- Pas de requête DB pour valider l'auth
- Le secret ne transit jamais côté client (Server Actions s'exécutent sur le serveur Next.js)
- Isolation propre : Hono ne connaît pas Auth.js
- Pattern standard pour les microservices en réseau interne de confiance
- Facilement extensible (ajouter des claims sans changer le format)

---

## Décision

**Option C — Secret partagé `x-internal-secret`**

### Architecture

```
Browser                Next.js Server              Hono API
  │                         │                          │
  │── form submit ──────────▶│                          │
  │                    Server Action:                   │
  │                    auth() → session               │
  │                    fetch(API) avec:               │
  │                    x-internal-secret: <secret>    │
  │                    x-user-id: session.user.id     │
  │                         │── POST /workouts ───────▶│
  │                         │                    authMiddleware:
  │                         │                    vérifie secret
  │                         │                    lit x-user-id
  │                         │◀─── 201 workout ─────────│
  │◀─ redirect /workouts ───│                          │
```

### Variables d'environnement
- `SERVICE_SECRET` — valeur identique dans `apps/api/.env` et `apps/web/.env.local`
- Ne jamais exposer dans `NEXT_PUBLIC_*` (serait bundlé côté client)

### Limites acceptées
- Si `SERVICE_SECRET` est compromis, un attaquant peut usurper n'importe quel `x-user-id`. En production, utiliser un réseau privé (VPC) entre les deux services et changer le secret régulièrement.
- Ce pattern est adapté à un déploiement sur un serveur unique ou un VPC. Pour une architecture avec edge functions ou CDN global, préférer l'Option B.

---

## Conséquences

- `auth.middleware.ts` valide uniquement `x-internal-secret` + présence de `x-user-id`
- `server-api.ts` est marqué `server-only` — impossible de l'importer côté client
- L'ajout de nouveaux champs utilisateur (rôle, email) se fait sans modifier le format du token
- Les routes Hono ne sont pas exposables directement depuis le navigateur sans le secret
