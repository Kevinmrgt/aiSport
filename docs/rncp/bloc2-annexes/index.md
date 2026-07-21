# Annexes Bloc 2 RNCP39583

## Annexes historiques de référence

Les annexes B2-A17 et B2-A18 portent sur la version `0.12.0`. Elles sont
conservées pour la traçabilité, mais leurs conclusions « final » ou « validable »
ne s'appliquent pas à la candidate `0.13.0-rc.3` et ne doivent pas être reprises
comme preuves du SHA final.

| ID     | Compétences                                                  | Pièce                                                                                                   | Statut                                   | Source ou commande                                                                 |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| B2-A17 | C2.1.1 / C2.1.2 / C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.4.1 | Validation historique production OpenAI, healthchecks, logs Vercel, tests, coverage, typecheck et build | Historique `0.12.0`, non final candidate | `docs/rncp/bloc2-annexes/B2-A17-validation-finale-production-openai-2026-07-15.md` |
| B2-A18 | C2.1.1 / C2.1.2 / C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.4.1 | Validation post-fix Vercel, CI main verte, monitoring vert, generations seance/programme en production  | Historique `0.12.0`, non final candidate | `docs/rncp/bloc2-annexes/B2-A18-validation-post-fix-vercel-2026-07-16.md`          |

> B2-A18 consolide l'état historique post-fix Vercel du 2026-07-16. B2-A17
> reste la preuve historique OpenAI du 2026-07-15. Aucune des deux n'est une
> preuve de la candidate courante.

> Index des preuves à joindre au dossier Bloc 2. Les pièces doivent rester datées et reliées à une compétence.

## Annexes obligatoires recommandées

| ID     | Compétence                        | Pièce                                                                                                         | Statut                                                                                                | Source ou commande                                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| B2-A01 | C2.1.1                            | Sortie healthcheck API production                                                                             | Historique seulement                                                                                  | B2-A18, `GET https://ai-sport-api.vercel.app/health`                                               |
| B2-A02 | C2.1.1                            | Sortie healthcheck Web production                                                                             | Historique seulement                                                                                  | B2-A18, `GET https://ai-sport-web.vercel.app/api/health`                                           |
| B2-A03 | C2.1.2                            | CI GitHub verte                                                                                               | Historique `533f17b`                                                                                  | B2-A18, workflow `CI - Alcide`, run `29489995458`, commit `533f17b`                                |
| B2-A04 | C2.2.1                            | Capture accueil connecté desktop                                                                              | Historique 2026-07-15                                                                                 | `docs/rncp/bloc2-annexes/screenshots/B2-A04-accueil-connecte-production-2026-07-15.png`            |
| B2-A05 | C2.2.1                            | Capture génération séance                                                                                     | Historique 2026-07-15                                                                                 | `docs/rncp/bloc2-annexes/screenshots/B2-A05-generation-seance-production-2026-07-15.png`           |
| B2-A06 | C2.2.1                            | Capture détail/timer                                                                                          | Historique 2026-07-15                                                                                 | `docs/rncp/bloc2-annexes/screenshots/B2-A06-detail-timer-production-2026-07-15.png`                |
| B2-A07 | C2.2.1                            | Capture dashboard                                                                                             | Historique 2026-07-15                                                                                 | `docs/rncp/bloc2-annexes/screenshots/B2-A07-dashboard-production-2026-07-15.png`                   |
| B2-A08 | C2.2.2                            | Sortie `pnpm test`                                                                                            | Historique 2026-06-30                                                                                 | `docs/rncp/bloc2-annexes/B2-A08-pnpm-test-2026-06-30.md`                                           |
| B2-A09 | C2.2.2                            | Sortie `pnpm test:coverage`                                                                                   | Historique 2026-06-30                                                                                 | `docs/rncp/bloc2-annexes/B2-A09-coverage-api-2026-06-30.md`                                        |
| B2-A10 | C2.2.3                            | Rapport accessibilité Playwright/axe                                                                          | Historique 2026-06-30                                                                                 | `docs/rncp/bloc2-annexes/B2-A10-playwright-smoke-2026-06-30.md`                                    |
| B2-A11 | C2.2.3                            | Sortie audit sécurité                                                                                         | Historique 2026-06-30                                                                                 | `docs/rncp/bloc2-annexes/B2-A11-audit-security-2026-06-30.md`                                      |
| B2-A12 | C2.3.1                            | Cahier de recettes candidat                                                                                   | Présent ; preuves automatiques finales et réserves humaines distinguées                               | `docs/bloc2/cahier-recettes.md`                                                                    |
| B2-A13 | C2.3.2                            | Plan de correction des bogues                                                                                 | Présent et actualisé après les runs finaux                                                            | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md`                                              |
| B2-A14 | C2.4.1                            | Manuel utilisateur                                                                                            | Présent dans le gel `v0.13.0-rc.3`                                                                    | `docs/rncp/bloc2-manuel-utilisateur-alcide.md`                                                     |
| B2-A15 | C2.4.1                            | Manuel de mise à jour                                                                                         | Présent dans le gel `v0.13.0-rc.3`                                                                    | `docs/rncp/bloc2-manuel-mise-a-jour.md`                                                            |
| B2-A16 | C2.1.1 / C2.1.2                   | Sorties qualité build/lint/typecheck                                                                          | Historique 2026-06-30                                                                                 | `docs/rncp/bloc2-annexes/B2-A16-qualite-build-lint-typecheck-2026-06-30.md`                        |
| B2-A18 | C2.1.1 / C2.1.2 / C2.2.1 / C2.3.1 | Validation post-fix Vercel et preuves navigateur 2026-07-16                                                   | Historique `0.12.0`                                                                                   | `docs/rncp/bloc2-annexes/B2-A18-validation-post-fix-vercel-2026-07-16.md`                          |
| B2-A19 | C2.2.2 / C2.2.3                   | Intégration PostgreSQL 16 réelle sur candidate locale non commitée                                            | Preuve locale conservée ; job PostgreSQL final vert dans la CI `29742672052`                          | `docs/rncp/bloc2-annexes/B2-A19-postgresql-integration-2026-07-20.md`                              |
| B2-A20 | C2.2.1 / C2.2.3 / C2.3.1          | Recette navigateur publique réelle : reflow 320 px, axe ciblé, console, clavier et redirections sans session  | Présent sur candidate locale ; 24 JSON et 8 PNG ; OAuth/authentifié/audit manuel non exécutés         | `B2-A20-recette-navigateur-accessibilite-publique-2026-07-20.md` et `browser-evidence-2026-07-20/` |
| B2-A21 | C2.1.1                            | Mesure locale séquentielle des healthchecks API                                                               | 50/50 HTTP 200 par route ; p95 local seulement, production non mesurée                                | `docs/rncp/bloc2-annexes/B2-A21-performance-api-locale-2026-07-20.md`                              |
| B2-A22 | C2.1.1 / C2.1.2 / C2.2.4 / C2.4.1 | Builds et exécution Docker Node 24/pnpm 11.9, migrate, seed et nettoyage                                      | Exécution locale réussie et build Docker final CI vert ; clone vierge non archivé                     | `docs/rncp/bloc2-annexes/B2-A22-docker-node24-2026-07-20.md`                                       |
| B2-A23 | C2.1.2 / C2.2.2 / C2.2.3          | Audit low propre, overrides ciblés, compatibilité lint/types/tests/build/Drizzle et règle de CD Vercel testée | Réussi localement, en CI et en production sur `0.13.0-rc.2`                                           | `docs/rncp/bloc2-annexes/B2-A23-securite-dependances-et-cd-2026-07-20.md`                          |
| B2-A24 | C2.1.1 / C2.2.3 / C2.3.1          | Démarrage OAuth Google réel depuis la production jusqu'au formulaire Google                                   | Redirection, PKCE, scopes et callback validés ; session authentifiée obtenue ultérieurement dans B2-A25 | `docs/rncp/bloc2-annexes/B2-A24-demarrage-oauth-production-2026-07-20.md`                         |
| B2-A25 | C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.3.2 | Recette authentifiée réelle, anomalies, correctifs et contre-recette de production | Séance/programme/Timer/dashboard/settings/suppressions/déconnexion observés ; limites RGAA et stockage de session conservées | `docs/rncp/bloc2-annexes/B2-A25-recette-authentifiee-production-et-correctifs-2026-07-20.md` |
| B2-A26 | C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.3.2 | Suite Playwright authentifiée avec session OAuth réelle, stockage hors Git et CI dédiée | 4/4 localement et 4/4 dans le run GitHub Actions `29816721099` ; limites du compte et du périmètre explicites | `docs/rncp/bloc2-annexes/B2-A26-playwright-authentifie-compte-dedie-2026-07-21.md` |
| B2-A27 | C2.1.2 / C2.2.3 / C2.3.2 | Correction des avis `brace-expansion` et `shell-quote` révélés par la CI | Audit local propre et six jobs verts dans la CI `29816347653` | `docs/rncp/bloc2-annexes/B2-A27-correction-audit-dependances-2026-07-21.md` |

## Règles de nommage

Utiliser un nom explicite :

```text
B2-A08-pnpm-test-YYYY-MM-DD.txt
B2-A09-coverage-api-YYYY-MM-DD.txt
B2-A10-playwright-axe-YYYY-MM-DD.txt
B2-A04-prototype-login-desktop-YYYY-MM-DD.png
```

## Règles de validation

Une annexe est valide si :

- elle est datée ;
- elle indique la commande ou le contexte de capture ;
- elle est reliée à une compétence C2.x ;
- elle ne contient aucun secret ;
- son contenu est cohérent avec le dossier principal.
