# Sprint 02 — Intégration frontend-backend

**Dates** : 2026-04-13 au 2026-04-20
**Objectif** : Connecter le frontend au backend et livrer un MVP fonctionnel end-to-end

---

## Objectifs du sprint

- Implémenter l'authentification service-to-service réelle (remplacement du placeholder)
- Connecter le formulaire de génération à l'API Mistral via Server Actions
- Afficher la liste des workouts et leur détail avec données réelles
- Ajouter la gestion de session dans la navbar (login/logout)
- Atteindre 14 tests unitaires (8 existants + 6 nouveaux)
- Documenter Sprint 02 et mettre à jour CHANGELOG.md

---

## Réalisations

### Authentification service-to-service (OWASP A01)
- `feat(api): replace auth placeholder with x-internal-secret validation`
  - Pattern service-to-service : Next.js Server Actions → Hono API via `x-internal-secret` + `x-user-id`
  - Le secret ne transite jamais côté client (HTTP-only cookie Auth.js)
  - `test(api): add 6 auth middleware tests (reject bad secret, missing userId, OWASP A09 logging)`

### Backend
- `feat(api): add SERVICE_SECRET env var for service-to-service auth`

### Frontend (Next.js 14)
- `feat(web): create server-api.ts — server-only helper for authenticated Hono calls`
- `feat(web): connect WorkoutForm to serverApi.generateWorkout() via Server Action`
  - Après succès : redirect automatique vers `/workouts/[id]`
- `feat(web): implement workout list page with WorkoutCard component`
  - Grille responsive (1/2/3 colonnes), état vide explicite, RGAA 4.1
- `feat(web): implement workout detail page with real data`
  - Affichage échauffement, programme + Timer, récupération
  - Ownership vérifié côté backend (notFound() sur 403/404)
- `feat(web): make layout navbar session-aware`
  - Connecté : nom + liens Générer/Mes entraînements + bouton Déconnexion
  - Déconnecté : lien Se connecter
  - RGAA 4.1 : aria-label sur bouton déconnexion, focus visible

### Nouveau composant
- `feat(web): add WorkoutCard component — RGAA 4.1 (role="article", aria-label sur lien)`

---

## Métriques

| Indicateur | Valeur |
|---|---|
| Tests unitaires API | 14 (8 Sprint 01 + 6 Sprint 02) |
| Couverture tests API | ~70% (MistralService + Controller + AuthMiddleware) |
| Fichiers créés | 4 (server-api.ts, WorkoutCard.tsx, sprint-02.md, auth.middleware.test.ts) |
| Fichiers modifiés | 6 (auth.middleware.ts, generate/page.tsx, workouts/page.tsx, [id]/page.tsx, layout.tsx, ci.yml) |
| Contrôles OWASP | A01 (service-to-service secret), A09 (logging auth failures) |
| RGAA 4.1 | role="article", aria-label, nav breadcrumb, bouton signOut accessible |

---

## Fonctionnalités testées manuellement (cahier de recettes)

| ID | Scénario | Statut |
|---|---|---|
| CR-001 | Accès page d'accueil | ✅ Conforme |
| CR-002 | Clic "Se connecter" → /login | ✅ Conforme |
| CR-010 | Connexion GitHub OAuth | À tester (nécessite OAuth app) |
| CR-011 | Redirection /generate après connexion | À tester |
| CR-012 | Soumission formulaire → génération workout | À tester (nécessite MISTRAL_API_KEY) |
| CR-013 | Redirection /workouts/[id] après génération | À tester |
| CR-014 | Timer démarre avec exercices réels | À tester |
| CR-020 | /workouts liste les séances | À tester |
| CR-021 | Accès workout d'un autre utilisateur → 403 | À tester |
| CR-030 | Déconnexion → retour page d'accueil | À tester |

---

## Objectifs Sprint 03 (à planifier)

- [ ] Tests Playwright E2E pour le flux complet (login → generate → timer)
- [ ] Migrations Drizzle + test contre PostgreSQL réel en CI
- [ ] Supprimer un workout depuis la liste (bouton + confirmation)
- [ ] Page d'erreur 404 et error boundary Next.js
- [ ] Compléter le cahier de recettes avec résultats réels
- [ ] Ajouter `server-only` sur tous les modules server-side
- [ ] Revue de sécurité OWASP complète (A01-A10)
