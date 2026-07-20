# Manifeste de dépôt — Bloc 2 RNCP39583

> Statut : **version candidate**. Remplacer les champs `À RENSEIGNER` après
> fusion, tag et déploiement de la version effectivement remise au jury.

## Référence immuable

| Élément | Valeur |
|---|---|
| Dépôt ou archive de code | À RENSEIGNER |
| Branche finale | `main` après fusion |
| Commit SHA complet | À RENSEIGNER |
| Tag de release | À RENSEIGNER |
| Version applicative | `0.13.0-rc.1` (candidate locale ; à confirmer après tag) |
| Date/heure de constitution | À RENSEIGNER, fuseau Europe/Paris |
| URL Web observée | `https://ai-sport-web.vercel.app` — HTTP 200 sur `0.12.0`, candidate non déployée |
| URL API observée | `https://ai-sport-api.vercel.app` — HTTP 200 sur `0.12.0`, candidate non déployée |

Le SHA, le tag, les healthchecks et les rapports de tests doivent tous porter
sur la même version. Un ancien run CI ne constitue pas une preuve de la version
candidate courante.

## Pièces obligatoires

| Pièce | Emplacement | Statut avant dépôt |
|---|---|---|
| Code source | archive du SHA ci-dessus ou dépôt accessible | À RENSEIGNER |
| Dossier écrit, 30 pages maximum | `docs/rncp/livrables/dossier-bloc2-candidat-corrige-2026-07-20.pdf` | Export de travail régénéré, 15 pages visuellement contrôlées ; à régénérer après gel du SHA |
| Manuel de déploiement | `docs/deployment.md` | Présent |
| Manuel utilisateur | `docs/rncp/bloc2-manuel-utilisateur-alcide.md` | Présent |
| Manuel de mise à jour | `docs/rncp/bloc2-manuel-mise-a-jour.md` | Présent |
| Cahier de recettes | `docs/bloc2/cahier-recettes.md` | À figer après recette finale |
| Plan de correction | `docs/rncp/bloc2-plan-correction-bogues-rncp39583.md` | Présent |
| Revue sécurité OWASP | `docs/security/owasp-review.md` | À dater après audit final |
| Rapport accessibilité | `docs/rncp/bloc2-accessibilite-rgaa.md` | À compléter après audit manuel |
| Recette navigateur publique | `docs/rncp/bloc2-annexes/B2-A20-recette-navigateur-accessibilite-publique-2026-07-20.md` | Preuve locale partielle : 24/24 contrôles ; OAuth/authentifié/audit manuel non exécutés |
| Validation Docker | `docs/rncp/bloc2-annexes/B2-A22-docker-node24-2026-07-20.md` | Preuve locale : builds/runtimes/migrate/seed réussis ; CI finale non exécutée |
| Annexes et preuves brutes | `docs/rncp/bloc2-annexes/` | À régénérer |

## Vérifications de la version remise

Toutes les cases doivent être cochées sur le SHA final :

Preuve locale intermédiaire disponible : B2-A19 rapporte 8/8 tests
d'intégration réussis sur PostgreSQL 16.14, mais sur `69b21ef-dirty` avec Node
24.14.0. La case correspondante reste donc volontairement décochée jusqu'au run
CI Node 24 du SHA final.

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:coverage`
- [ ] `pnpm build`
- [ ] `pnpm audit --audit-level=high`
- [ ] tests d'intégration PostgreSQL
- [ ] Playwright public et authentifié
- [ ] audit axe et audit manuel WCAG sur les parcours métier
- [ ] build Docker et procédure migration/seed
- [ ] déploiement Web/API du SHA final
- [ ] healthchecks et parcours métier post-déploiement
- [ ] concordance version package/API/Web/changelog/tag

## Règle de fermeture

Ce manifeste ne doit être marqué « prêt au dépôt » que lorsque chaque preuve
est datée, rattachée au SHA final et conservée sous forme de sortie brute ou de
rapport exporté. Une inspection du code seule n'est pas une exécution de recette.
