# Annexes Bloc 2 RNCP39583

> Index des preuves à joindre au dossier Bloc 2. Les pièces doivent rester datées et reliées à une compétence.

## Annexes obligatoires recommandées

| ID | Compétence | Pièce | Statut | Source ou commande |
|---|---|---|---|---|
| B2-A01 | C2.1.1 | Capture ou sortie healthcheck API | À produire | `curl <api-url>/health` |
| B2-A02 | C2.1.1 | Capture ou sortie healthcheck Web | À produire | `curl <web-url>/api/health` |
| B2-A03 | C2.1.2 | Capture CI verte | À produire | GitHub Actions |
| B2-A04 | C2.2.1 | Capture accueil/login desktop | À produire | Navigateur |
| B2-A05 | C2.2.1 | Capture génération séance | À produire | Navigateur |
| B2-A06 | C2.2.1 | Capture détail/timer | À produire | Navigateur |
| B2-A07 | C2.2.1 | Capture dashboard | À produire | Navigateur |
| B2-A08 | C2.2.2 | Sortie `pnpm test` | Présent | `docs/rncp/bloc2-annexes/B2-A08-pnpm-test-2026-06-30.md` |
| B2-A09 | C2.2.2 | Sortie `pnpm test:coverage` | Présent | `docs/rncp/bloc2-annexes/B2-A09-coverage-api-2026-06-30.md` |
| B2-A10 | C2.2.3 | Rapport accessibilité Playwright/axe | Présent smoke | `docs/rncp/bloc2-annexes/B2-A10-playwright-smoke-2026-06-30.md` |
| B2-A11 | C2.2.3 | Sortie audit sécurité | Présent | `docs/rncp/bloc2-annexes/B2-A11-audit-security-2026-06-30.md` |
| B2-A12 | C2.3.1 | Extrait cahier de recettes final | Présent | `docs/bloc2/cahier-recettes.md` |
| B2-A13 | C2.3.2 | Plan de correction des bogues | Présent | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md` |
| B2-A14 | C2.4.1 | Manuel utilisateur | Présent | `docs/rncp/bloc2-manuel-utilisateur-alcide.md` |
| B2-A15 | C2.4.1 | Manuel de mise à jour | Présent | `docs/rncp/bloc2-manuel-mise-a-jour.md` |
| B2-A16 | C2.1.1 / C2.1.2 | Sorties qualité build/lint/typecheck | Présent | `docs/rncp/bloc2-annexes/B2-A16-qualite-build-lint-typecheck-2026-06-30.md` |

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
