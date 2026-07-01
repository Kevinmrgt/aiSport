# Veille Technologique — Alcide

> Bloc 4 RNCP 39583 — Expert en développement logiciel
> Date : 2026-04-13 | Auteur : Kevin

---

## Périmètre

Cette veille couvre les technologies utilisées dans Alcide et leur écosystème : IA générative pour le coaching sportif, frameworks web full-stack, sécurité applicative, et testing moderne.

---

## 1. Intelligence Artificielle générative pour le sport

### État de l'art

Le coaching sportif assisté par IA connaît une croissance rapide. Les grandes plateformes (Nike Training Club, Freeletics, Whoop) intègrent des modèles de langage pour personnaliser les plans d'entraînement.

### Mistral AI vs alternatives

| Modèle | Points forts | Limites | Adapté pour Alcide |
|---|---|---|---|
| **Mistral 7B / Mixtral** | Open-source, JSON mode natif, latence faible, hébergeable | Moins performant que GPT-4o sur le raisonnement complexe | ✅ Idéal : JSON strict, coût maîtrisé |
| **GPT-4o (OpenAI)** | Excellente compréhension, multimodal | Coût élevé, dépendance US | Possible mais sur-dimensionné |
| **Gemini Flash (Google)** | Vitesse, pricing compétitif | Écosystème plus jeune | Alternative crédible |
| **Llama 3 (Meta)** | Open-source, auto-hébergeable | Nécessite infrastructure GPU | Pour le contrôle total des données |

**Choix retenu** (ADR-003) : Mistral AI via API cloud — JSON mode forcé, validation Zod, coût adapté au prototype RNCP.

### Tendances 2026

- **RAG (Retrieval-Augmented Generation)** : combiner LLM + base de données d'exercices pour des recommandations plus précises
- **Structured outputs** : OpenAI et Mistral proposent des schemas JSON garantis — améliore la fiabilité vs le prompt engineering seul
- **Function calling** : les modèles peuvent appeler des APIs externes (récupérer les stats biométriques Garmin/Apple Watch)
- **Edge inference** : Llama 3 8B tourne sur MacBook M3 — l'inférence locale devient viable pour les applications mobiles

---

## 2. Frameworks web full-stack

### Next.js App Router

Next.js 14/15 (App Router) a marqué un tournant architectural avec :
- **Server Components** : zéro JS côté client pour le contenu statique
- **Server Actions** : appels serveur depuis le client sans API REST dédiée
- **Streaming + Suspense** : affichage progressif pendant le fetch (utilisé dans Sprint 05 via `loading.tsx`)
- **Partial Prerendering (PPR)** : hybride statique/dynamique au niveau du composant (Next.js 15 expérimental)

**Impact sur Alcide** : l'architecture Server Actions a permis d'éviter une API Next.js dédiée et de garder les secrets serveur (`SERVICE_SECRET`) hors du bundle client.

### Hono vs alternatives

| Framework | Runtime | Avantages | Usage |
|---|---|---|---|
| **Hono** | Node, Bun, Deno, Edge | Ultra-léger, TypeScript natif, middleware composable | ✅ Backend Alcide |
| **Express** | Node | Mature, écosystème riche | Lourd, pas de types natifs |
| **Fastify** | Node | Très performant, schemas JSON | Plus complexe à setup |
| **Elysia** | Bun | Très rapide, TypeScript end-to-end | Jeune, Bun only |

**Tendance** : Hono s'impose comme le standard pour les APIs TypeScript légères en 2025-2026, notamment grâce à sa compatibilité Edge (Cloudflare Workers, Vercel Edge).

---

## 3. Sécurité applicative

### OWASP Top 10 — Évolutions 2025

L'OWASP Top 10 2025 (en cours de publication) renforce l'importance de :
- **A10 SSRF** : devenu critique avec l'essor des microservices et des appels LLM (un LLM peut être manipulé pour effectuer des requêtes internes)
- **LLM Top 10** : OWASP a publié un Top 10 spécifique aux applications LLM — **prompt injection** (A01 LLM) est le risque #1

**Pertinence pour Alcide** :
- Prompt injection mitigé par le JSON mode Mistral + validation Zod stricte du résultat
- SSRF mitigé par l'URL Mistral fixe (pas de redirection dynamique depuis l'input)

### Rate limiting

Le rate limiting in-memory (Sprint 05) est un premier niveau de protection. En production :
- **Redis + Sliding window** : précision et persistence cross-instances
- **Upstash Rate Limit** : solution serverless clé-en-main pour Vercel/Edge
- **Cloudflare WAF** : protection au niveau CDN avant que les requêtes atteignent l'application

---

## 4. Testing moderne

### Playwright vs Cypress

| Critère | Playwright | Cypress |
|---|---|---|
| **Multi-navigateurs** | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge (pas Safari natif) |
| **Architecture** | Out-of-process (plus stable) | In-process (accès direct DOM) |
| **Parallélisme** | Natif | Payant (Cypress Cloud) |
| **DX** | Trace viewer, codegen, API testing | Dashboard intuitif |
| **Trend 2026** | En forte croissance | Mature, stable |

**Choix retenu** (ADR-005) : Playwright — multi-navigateurs natif, intégration CI sans coût supplémentaire.

### Vitest vs Jest

Vitest s'est imposé comme le remplaçant de Jest dans l'écosystème Vite/TypeScript :
- **Vitesse** : 3-10× plus rapide (pas de transformation Babel)
- **ESM natif** : support natif des modules ES (Jest nécessite des plugins)
- **API compatible** : migration de Jest → Vitest quasi transparente
- **Coverage v8** : intégré nativement, pas de babel-jest nécessaire

---

## 5. Accessibilité (RGAA / WCAG)

### RGAA 4.1 → RGAA 4.2 (2025)

Le RGAA 4.2 (publication prévue 2025) aligne la France sur WCAG 2.2 :
- **Nouveau critère 2.5.3** : les labels doivent correspondre au nom accessible du composant
- **2.4.11** : composants UI visibles au focus
- **3.2.6** : liens d'évitement cohérents entre pages

**Impact** : Alcide implémente déjà ces critères (`skip-link`, `aria-label` consistants, focus visible).

### Outils de test automatisé

- **axe-core** : bibliothèque de référence, intégrable dans Playwright via `@axe-core/playwright`
- **Lighthouse CI** : scores WCAG automatisés dans le pipeline
- **Storybook a11y addon** : test d'accessibilité par composant

**Prochaine étape** : intégrer `@axe-core/playwright` dans les tests E2E pour détecter automatiquement les violations WCAG.

---

## 6. Hébergement et déploiement

### Options pour Alcide

| Option | Avantages | Limites |
|---|---|---|
| **Vercel (Next.js) + Railway (API)** | Zero-config, déploiement en 1 push | Coût selon usage, vendor lock-in |
| **Fly.io** | Conteneurs Docker, régions globales, pricing transparent | Configuration plus manuelle |
| **Render** | Gratuit pour prototype, PostgreSQL managé | Froid au démarrage (free tier) |
| **Auto-hébergé (VPS)** | Contrôle total, RGPD | Maintenance infra |

**Recommandation pour prototype RNCP** : Vercel (frontend) + Railway (API + PostgreSQL) — déploiement en moins d'une heure, compatible GitHub Actions.

---

## Sources de veille

| Source | Fréquence | Canal |
|---|---|---|
| This Week in React | Hebdomadaire | Newsletter |
| Hono GitHub releases | Par release | GitHub Watch |
| OWASP News | Mensuel | RSS |
| Mistral AI Blog | Irrégulier | RSS |
| State of JS 2025 | Annuel | stateofjs.com |
| ANSSI — Bulletins sécurité | Hebdomadaire | cert.ssi.gouv.fr |
