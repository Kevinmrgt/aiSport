# Annexes Bloc 2 RNCP39583

## Annexes finales

| ID | Compétences | Pièce | Statut | Source ou commande |
|---|---|---|---|---|
| B2-A17 | C2.1.1 / C2.1.2 / C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.4.1 | Validation historique production OpenAI, healthchecks, logs Vercel, tests, coverage, typecheck et build | Présent | `docs/rncp/bloc2-annexes/B2-A17-validation-finale-production-openai-2026-07-15.md` |
| B2-A18 | C2.1.1 / C2.1.2 / C2.2.1 / C2.2.2 / C2.2.3 / C2.3.1 / C2.4.1 | Validation post-fix Vercel, CI main verte, monitoring vert, generations seance/programme en production | Présent | `docs/rncp/bloc2-annexes/B2-A18-validation-post-fix-vercel-2026-07-16.md` |

> Ajout 2026-07-16 : l'annexe finale `B2-A18-validation-post-fix-vercel-2026-07-16.md` consolide l'état post-fix Vercel. B2-A17 reste la preuve historique OpenAI du 2026-07-15.

> Index des preuves à joindre au dossier Bloc 2. Les pièces doivent rester datées et reliées à une compétence.

## Annexes obligatoires recommandées

| ID | Compétence | Pièce | Statut | Source ou commande |
|---|---|---|---|---|
| B2-A01 | C2.1.1 | Sortie healthcheck API production | Présent | B2-A18, `GET https://ai-sport-api.vercel.app/health` |
| B2-A02 | C2.1.1 | Sortie healthcheck Web production | Présent | B2-A18, `GET https://ai-sport-web.vercel.app/api/health` |
| B2-A03 | C2.1.2 | CI GitHub verte | Présent | B2-A18, workflow `CI - Alcide`, run `29489995458`, commit `533f17b` |
| B2-A04 | C2.2.1 | Capture accueil connecté desktop | Présent | `docs/rncp/bloc2-annexes/screenshots/B2-A04-accueil-connecte-production-2026-07-15.png` |
| B2-A05 | C2.2.1 | Capture génération séance | Présent | `docs/rncp/bloc2-annexes/screenshots/B2-A05-generation-seance-production-2026-07-15.png` |
| B2-A06 | C2.2.1 | Capture détail/timer | Présent | `docs/rncp/bloc2-annexes/screenshots/B2-A06-detail-timer-production-2026-07-15.png` |
| B2-A07 | C2.2.1 | Capture dashboard | Présent | `docs/rncp/bloc2-annexes/screenshots/B2-A07-dashboard-production-2026-07-15.png` |
| B2-A08 | C2.2.2 | Sortie `pnpm test` | Présent | `docs/rncp/bloc2-annexes/B2-A08-pnpm-test-2026-06-30.md` |
| B2-A09 | C2.2.2 | Sortie `pnpm test:coverage` | Présent | `docs/rncp/bloc2-annexes/B2-A09-coverage-api-2026-06-30.md` |
| B2-A10 | C2.2.3 | Rapport accessibilité Playwright/axe | Présent smoke | `docs/rncp/bloc2-annexes/B2-A10-playwright-smoke-2026-06-30.md` |
| B2-A11 | C2.2.3 | Sortie audit sécurité | Présent | `docs/rncp/bloc2-annexes/B2-A11-audit-security-2026-06-30.md` |
| B2-A12 | C2.3.1 | Extrait cahier de recettes final | Présent | `docs/bloc2/cahier-recettes.md` |
| B2-A13 | C2.3.2 | Plan de correction des bogues | Présent | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md` |
| B2-A14 | C2.4.1 | Manuel utilisateur | Présent | `docs/rncp/bloc2-manuel-utilisateur-alcide.md` |
| B2-A15 | C2.4.1 | Manuel de mise à jour | Présent | `docs/rncp/bloc2-manuel-mise-a-jour.md` |
| B2-A16 | C2.1.1 / C2.1.2 | Sorties qualité build/lint/typecheck | Présent | `docs/rncp/bloc2-annexes/B2-A16-qualite-build-lint-typecheck-2026-06-30.md` |
| B2-A18 | C2.1.1 / C2.1.2 / C2.2.1 / C2.3.1 | Validation finale post-fix Vercel et preuves navigateur 2026-07-16 | Présent | `docs/rncp/bloc2-annexes/B2-A18-validation-post-fix-vercel-2026-07-16.md` |

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
