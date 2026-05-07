# Audit de cohérence documentaire — SportCoach IA / aiSport

> Date de vérification : 2026-05-07  
> Version applicative de référence : `0.12.0`  
> Périmètre : README, changelog, dossier professionnel, documents RNCP, cahier de recettes, CRA, CI/CD, déploiement, sécurité, ADR, sprints, workflows GitHub Actions, rapports de couverture.

## Résumé

L'audit a confirmé que la version de référence du projet est `0.12.0`, portée par le `package.json` racine et le `CHANGELOG.md`. Les manifests privés `apps/api/package.json` et `apps/web/package.json` étaient encore en `0.1.0` ; ils ont été alignés sur `0.12.0` pour éviter une contradiction avec l'endpoint API `/health`.

Les métriques vérifiées le 2026-05-07 sont :

| Donnée | Référence vérifiée |
|---|---|
| Version projet | `0.12.0` dans `package.json`, `apps/api/package.json`, `apps/web/package.json` et `CHANGELOG.md` |
| Tests Vitest | `pnpm test` : 70 tests passés, dont 69 API et 1 Web |
| Couverture API | `pnpm test:coverage` : 81.57% statements, 78.6% branches, 89.23% functions, 81.57% lines |
| TypeScript | `pnpm typecheck` : OK |
| ESLint | `pnpm lint` : OK |
| Audit sécurité dépendances | `pnpm audit --audit-level=high` : échec, 12 vulnérabilités dont 3 high |
| Scénarios de recette | 33 scénarios CR documentés ; numérotation discontinue de CR-001 à CR-044 |
| E2E Playwright | `playwright test --list` : 56 exécutions listées, soit 28 cas par navigateur ; non exécutés pendant cet audit |
| Production documentée | Vercel Web, Vercel API, Neon PostgreSQL |
| Alternatives | Docker Compose et Fly.io API |
| Historique | Railway et Vercel+Fly.io+Neon sont des choix ou étapes historiques, pas la cible canonique actuelle |

Les URLs de healthcheck production ont répondu le 2026-05-07 :

| Endpoint | Résultat |
|---|---|
| `https://ai-sport-api.vercel.app/health` | HTTP 200, `status:"ok"`, mais version live encore `0.1.0` avant redéploiement |
| `https://ai-sport-web.vercel.app/api/health` | HTTP 200, `status:"ok"` |

## Tableau d'audit

| Fichier concerné | Donnée incohérente | Valeur trouvée | Valeur de référence proposée | Correction appliquée | Commentaire |
|---|---|---|---|---|---|
| `package.json` | Version projet | `0.12.0` | `0.12.0` | Non nécessaire | Source de vérité applicative retenue. |
| `apps/api/package.json` | Version app API | `0.1.0` | `0.12.0` | Oui | Corrige la source utilisée par `/health` via `npm_package_version` au prochain déploiement. |
| `apps/web/package.json` | Version app Web | `0.1.0` | `0.12.0` | Oui | Alignement des manifests privés du monorepo. |
| `docs/deployment.md` | Version documentée | `0.13.0` | `0.12.0` | Oui | Remplacé par une version applicative de référence et une date de vérification. |
| `README.md` | Couverture | `94.69% statements` | 81.57% statements API | Oui | Chiffre actualisé d'après `pnpm test:coverage`. |
| `README.md` | Cahier de recettes | 39 scénarios | 33 scénarios CR | Oui | Comptage réel des lignes `CR-xxx`. |
| `README.md` | Dossier professionnel | Ancien dossier technique | Dossier RNCP réaligné | Oui | La preuve pointe vers `docs/rncp/dossier-professionnel-rncp39583.md`. |
| `docs/dossier-professionnel.md` | Version | `0.10.0` | `0.12.0` | Oui | Fichier marqué comme synthèse technique historique. |
| `docs/dossier-professionnel.md` | Déploiement | Railway / Vercel+Fly.io+Neon selon sections | Vercel Web/API + Neon en production canonique | Oui | ADR-006 conservée comme historique ; ADR-007 devient la référence actuelle. |
| `docs/dossier-professionnel.md` | Tests et couverture | 28 tests, 29 E2E, 94.69%, 100% functions | 70 Vitest passés ; 81.57% statements API ; 89.23% functions API ; E2E à relancer | Oui | Les E2E ont été listés mais non exécutés. |
| `docs/dossier-professionnel.md` | Vulnérabilités high | 0 | 3 high à traiter | Oui | Corrigé après `pnpm audit --audit-level=high`. |
| `docs/bloc2/cahier-recettes.md` | Total unitaires | 41 tests | 69 tests API + 1 test Web | Oui | Table des suites de tests mise à jour fichier par fichier. |
| `docs/bloc2/cahier-recettes.md` | Couverture | `>90% statements`, `100% functions` | 81.57% statements API, 89.23% functions API | Oui | Référence vérifiée par `pnpm test:coverage`. |
| `docs/bloc2/cahier-recettes.md` | E2E | 29 tests passés | 56 exécutions listées, non relancées | Oui | Statut changé en "À relancer". |
| `docs/bloc4/compte-rendu-activite.md` | Nombre de sprints | 10 | 12 | Oui | Aligné avec `docs/sprints/sprint-01.md` à `sprint-12.md`. |
| `docs/bloc4/compte-rendu-activite.md` | Tests, scénarios, ADR | 61 tests, 42 scénarios, 6 ADR | 70 Vitest, 33 scénarios CR, 7 ADR | Oui | Les chiffres actuels remplacent les métriques intermédiaires. |
| `docs/security/owasp-review.md` | `MISTRAL_API_KEY` obligatoire | Fail-fast si absente | Variable optionnelle ; warning si absente | Oui | Aligné avec `apps/api/src/lib/validate-env.ts`. |
| `docs/security/owasp-review.md` | Audit dépendances | high = 0 | 3 high à traiter | Oui | A06 passé en point d'attention ouvert. |
| `docs/security/owasp-review.md` | SSRF / IA | URL Mistral unique, timeout 30s | URLs providers bornées par enum ; timeouts 45s / budget 55s | Oui | Aligné avec `ai.service.ts`, `mistral.service.ts`, `mistral-program.service.ts`. |
| `docs/adr/ADR-006-deployment-architecture.md` | Statut de l'architecture Vercel+Fly.io+Neon | Retenue actuelle | Historique, remplacée par ADR-007 | Oui | Fly.io reste alternative API. |
| `docs/adr/ADR-002-hono-backend.md` | Déploiement Railway | Mention actuelle | Mention historique | Oui | Ajout d'un renvoi vers ADR-007. |
| `docs/rncp/matrice-conformite-rncp39583.md` | Totaux tests et recettes | Anciens chiffres à harmoniser | 70 Vitest, 33 CR, E2E à relancer | Oui | Ligne C2.3.1 mise à jour. |
| `docs/rncp/dossier-professionnel-rncp39583.md` | Tests et couverture | 41 unitaires, 29 E2E, incohérence README | 70 Vitest, 81.57% statements API, E2E non exécutés | Oui | Le dossier RNCP porte maintenant les chiffres vérifiés. |
| `docs/rncp/dossier-professionnel-rncp39583.md` | Version `deployment.md` | `0.13.0` signalé | Incohérence résolue, `0.12.0` | Oui | Le document ne demande plus de décision de version. |
| `docs/rncp/bloc1-cadrage-projet-rncp39583.md` | Stack IA | Mistral uniquement dans la synthèse | Mistral par défaut, OpenAI/Anthropic via paramètres utilisateur | Oui | Aligné avec `settings.controller.ts` et `ai.service.ts`. |
| `docs/rncp/bloc3-pilotage-projet-rncp39583.md` | Version et stack IA | `0.13.0` signalé, Mistral seul | `0.12.0`, providers IA réellement supportés | Oui | Les anciennes incohérences sont indiquées comme résolues. |
| `docs/rncp/bloc4-mco-rncp39583.md` | Version | `0.12.0` / `0.13.0` à harmoniser | `0.12.0` cohérent | Oui | La synthèse C4.3.2 est alignée. |
| `CHANGELOG.md` | Absence de trace de l'audit | Section Unreleased vide | Entrée documentaire Unreleased | Oui | Ajout des changements documentaires et versions manifests. |
| `docs/sprints/` | Métriques anciennes | 55 tests, 39/42 scénarios, 94.69%, Railway/Fly.io selon sprint | Historique de sprint | Non | Non corrigé pour ne pas réécrire l'historique. Le rapport explique leur statut. |
| `docs/adr/ADR-006-deployment-architecture.md` | Corps de l'ADR historique | Vercel+Fly.io+Neon | Historique supersédé | Partiel | Note ajoutée ; le corps de l'ADR reste inchangé par traçabilité. |
| `CHANGELOG.md` historique | Anciennes lignes de release | 28/32/55 tests, Railway, Fly.io, 96% | Historique de release | Non | Conservé pour ne pas falsifier les versions passées. |
| `CHANGELOG.md` | Référence `vercel.json` | Fichier racine absent ; `apps/api/vercel.json` existe | À clarifier si le fichier racine a été supprimé | Non | Point à valider manuellement ; historique de release conservé. |
| `docs/rncp/*.pdf` | Preuves officielles | Présentes dans `docs/rncp/` | Ne pas déplacer | Non nécessaire | Aucun PDF RNCP déplacé ou supprimé. |

## Corrections effectuées

- Alignement des versions `apps/api/package.json` et `apps/web/package.json` sur `0.12.0`.
- Correction de `docs/deployment.md` : version de référence `0.12.0`, cible canonique Vercel Web/API + Neon, précision sur `MISTRAL_API_KEY`.
- Correction du README : stack IA réelle, 7 ADR, 12 sprints, 33 scénarios CR, métriques tests/couverture vérifiées, dossier RNCP de référence.
- Correction de l'ancien dossier professionnel : marqué comme historique, métriques, déploiement, ADR, scénarios, vulnérabilités et axes d'amélioration harmonisés.
- Correction du cahier de recettes : table des tests API/Web actualisée, statut E2E changé en "À relancer", couverture API actualisée.
- Correction du CRA : 12 sprints, 70 tests Vitest, 33 scénarios CR, 7 ADR, couverture API actuelle, vulnérabilités high à traiter.
- Correction OWASP : `MISTRAL_API_KEY` optionnelle, A06 ouvert, providers IA et timeouts alignés avec le code.
- Correction des documents RNCP récents : version, tests, couverture, stack IA, scénario de recettes, production canonique.
- ADR-006 et ADR-002 annotées comme historiques pour éviter de présenter Railway ou Fly.io comme cible actuelle.
- Ajout d'une entrée `Unreleased` dans le changelog.

## Points à valider manuellement

1. **Vulnérabilités dépendances** : `pnpm audit --audit-level=high` échoue avec 3 vulnérabilités high. Décider d'une correction dépendances ou d'une justification de risque avant dépôt.
2. **Redéploiement API** : l'API Vercel live répond encore `version:"0.1.0"` tant qu'un nouveau déploiement n'a pas embarqué `apps/api/package.json` en `0.12.0`.
3. **E2E Playwright** : les 56 exécutions sont listées mais non passées pendant cet audit. Relancer `pnpm test:e2e` ou `pnpm test:e2e:smoke` avant d'annoncer un total E2E réussi.
4. **Référence `vercel.json` historique** : le changelog mentionne un `vercel.json` racine absent ; vérifier s'il a été déplacé/supprimé volontairement ou s'il faut restaurer une preuve.
5. **Documents historiques** : les sprint reviews et anciennes entrées de changelog conservent des chiffres intermédiaires. Les présenter comme historiques, pas comme état courant.
6. **Preuves support/client et alerting** : les documents RNCP signalent encore des preuves à produire sur support client, supervision/alerting et processus dépendances.
7. **Build final** : `pnpm build` n'a pas été relancé dans cet audit documentaire ; à exécuter avant dépôt si le jury demande une preuve de build récente.

## Recommandations

- Maintenir ce rapport comme point d'entrée "source de vérité" pour les chiffres de soutenance.
- Ajouter une petite table `Métriques vérifiées` dans le README à chaque préparation de dépôt, avec date et commande.
- Conserver les sprint reviews comme historique, mais éviter de citer leurs chiffres dans les supports finaux sans date.
- Après chaque évolution de tests, mettre à jour dans le même commit : README, cahier de recettes, dossier RNCP et CRA.
- Après chaque changement de cible de déploiement, mettre à jour ensemble : `docs/deployment.md`, `docs/ci-cd.md`, ADR active, README et dossier RNCP.
- Pour les métriques de sécurité, ne jamais annoncer "0 high" sans joindre la date et la sortie de `pnpm audit --audit-level=high`.
