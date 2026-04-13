# ADR-005 — Stratégie de tests : unitaires, intégration, E2E

> Date : 2026-04-13 | Statut : **Accepté** | Auteur : Kevin

---

## Contexte

SportCoach IA est une application full-stack monorepo (Next.js + Hono + Mistral AI). Pour garantir la qualité et répondre aux exigences RNCP Bloc 2 (cahier de recettes), une stratégie de tests claire est nécessaire. La question centrale est : **quelle couche tester avec quel outil, et pourquoi ?**

---

## Options considérées

### Option 1 — Tests uniquement unitaires (Vitest)

**Avantages :**
- Rapide, isolation totale, pas de dépendances externes
- Facile à maintenir

**Inconvénients :**
- Ne couvre pas les interactions frontend-backend
- Les mocks peuvent masquer des incompatibilités d'intégration réelles (ex. schéma Zod désynchronisé)
- Aucune couverture des flux utilisateur (RGAA, accessibilité clavier)

### Option 2 — Tests E2E uniquement (Playwright)

**Avantages :**
- Teste les vrais flux utilisateur end-to-end
- Détecte les régressions UI et les bugs d'intégration

**Inconvénients :**
- Lents (secondes par test vs millisecondes)
- Fragiles : dépendent de l'UI, du DOM, de l'état de la DB
- Difficiles à déboguer (où ça casse : frontend, backend, DB ?)
- Impossibles à utiliser pour tester la logique métier isolément

### Option 3 — Pyramide de tests (unitaires + E2E, sans intégration DB)

**Avantages :**
- Équilibre vitesse et couverture réelle
- Tests unitaires rapides pour la logique métier (< 1s total)
- E2E pour les flux critiques (accessibilité, auth, validation)
- Exclusion des couches DB des métriques (dépendances trop lourdes pour CI sans Docker)

**Inconvénients :**
- Les repositories (couche DB) ne sont pas testés automatiquement

---

## Décision

**Option 3 retenue** — Pyramide de tests sans couche intégration DB.

```
        [E2E — Playwright]
       /                   \
      /  Flux utilisateur    \
     /   Auth, RGAA, 404      \
    /                          \
   [──── Tests unitaires ─────]
   [  Vitest — logique métier  ]
   [  Controllers, Services    ]
   [  Middlewares, AppError     ]
```

### Répartition

| Couche | Outil | Ce qui est testé | Ce qui est exclu |
|---|---|---|---|
| Unitaire | Vitest | Controllers, Services, Middlewares, AppError | Repositories (SQL), Routes Hono |
| E2E | Playwright | Flux auth, formulaires, accessibilité RGAA | Logique métier interne |
| Intégration DB | — (futur) | Repositories avec vraie DB | Hors périmètre Sprint 04 |

### Seuils

- Coverage unitaire : **≥ 70%** statements (CI bloquant) — atteint 96% en Sprint 03
- E2E : **non bloquant en CI** (`continue-on-error: true`) — nécessite serveur live
- Audit sécurité : `pnpm audit --audit-level=high` — non bloquant sur warnings moyens

---

## Conséquences

**Positives :**
- La CI tourne en < 3 minutes sans Docker (tests unitaires rapides)
- Les flux utilisateur critiques sont couverts par 18 tests E2E (auth, RGAA, formulaires)
- Le seuil de coverage est documenté et maintenu

**Négatives / Risques :**
- Les repositories ne sont pas testés automatiquement — mitigé par Drizzle ORM (requêtes paramétrées) et les tests manuels du cahier de recettes (CR-020 à CR-026)
- Les tests E2E peuvent échouer si le serveur ne démarre pas en CI — mitigé par `continue-on-error: true` et `reuseExistingServer` en local

---

## Références

- `apps/api/vitest.config.ts` — configuration coverage avec exclusions
- `apps/web/playwright.config.ts` — configuration E2E avec webServer
- `docs/bloc2/cahier-recettes.md` — 34 scénarios de tests manuels
- `docs/security/owasp-review.md` — mapping OWASP → couverture test
