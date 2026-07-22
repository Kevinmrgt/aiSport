# Manifeste de dépôt - Bloc 2 RNCP39583

> État vérifié le 22 juillet 2026. Les résultats ci-dessous correspondent à
> des contrôles exécutés. Ils ne constituent pas une décision d'évaluation ni
> une déclaration de conformité RGAA exhaustive.

## Références

| Élément | Valeur |
| ------- | ------ |
| Dépôt | `https://github.com/Kevinmrgt/aiSport` |
| Branche publique | `main` |
| Version | `0.13.0-rc.5` |
| Commit déployé | `c63439e8ac8d68efd5ba091211b326ee8575fbba` |
| CI | `29930722308` - six jobs réussis |
| CD | `29931146789` - migration, API, Web et smoke tests réussis |
| Web | `https://ai-sport-web.vercel.app` |
| API liveness | `https://ai-sport-api.vercel.app/health` |
| API readiness | `https://ai-sport-api.vercel.app/health/ready` |

Le dépôt est indiqué ici pour la préparation de la remise. Les PDF restent
anonymisés conformément au règlement général ; le lien peut être transmis au
jury par le champ prévu sur la plateforme.

## Pièces finales

| N° | Pièce | Fichier | Contrôle |
| --: | ----- | ------- | -------- |
| 01 | Dossier écrit | `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.5-final-2026-07-22.pdf` | limite de 30 pages, signets, liens et rendu contrôlés |
| 02 | Annexes | `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.5-final-2026-07-22.pdf` | preuves sélectionnées, quatre livrables complets et trois manuels |
| 03 | Code source | archive créée par `build_bloc2_delivery_pack.py` | liste positive, aucun `.env`, secret ou état OAuth |
| 04 | Empreintes | `MANIFESTE.txt` dans le paquet | SHA Git archivé et SHA-256 de chaque pièce |

Les anciennes versions `rc.2` et `rc.3` ont été retirées de l'emplacement des
livrables afin d'éviter une confusion au moment du dépôt.

## Couverture des seize éléments demandés

| Élément attendu | Emplacement principal |
| --------------- | --------------------- |
| Protocole de déploiement continu | dossier section 3, workflow CD, DOC-01 |
| Critères de qualité et de performance | dossier section 3, B2-A29 |
| Protocole d'intégration continue | dossier section 4, B2-A28/B2-A38 |
| Architecture maintenable | dossier section 5 et ADR |
| Prototype | dossier section 7, B2-A30, LIV-04 |
| Frameworks et paradigmes | dossier section 6 et ADR |
| Tests unitaires | dossier section 8, B2-A19/B2-A31 |
| Sécurité | dossier section 9, B2-A35/B2-A39, LIV-03 |
| Accessibilité | dossier section 10, B2-A20/B2-A36/B2-A37/B2-A40/B2-A41 |
| Historique des versions | dossier section 11 et `CHANGELOG.md` |
| Dernière version fonctionnelle | dossier section 11, CI/CD et healthchecks |
| Cahier de recettes | dossier section 12 et LIV-01 |
| Plan de correction des bogues | dossier section 13 et LIV-02 |
| Manuel de déploiement | dossier section 14 et DOC-01 |
| Manuel utilisateur | dossier section 15 et DOC-02 |
| Manuel de mise à jour | dossier section 16 et DOC-03 |

## Contrôles techniques

- installation figée par `pnpm-lock.yaml` ;
- audit de dépendances au seuil `low` sans vulnérabilité connue ;
- lint, contrôle de types, 241 tests et builds réussis sur la version `rc.5` ;
- rapports de couverture API, Web, PostgreSQL et shared séparés ;
- tests Playwright publics et authentifiés ;
- images Docker API et Web construites en CI ;
- migration, déploiement API/Web et smoke tests réussis ;
- 150/150 réponses valides sur la mesure séquentielle des healthchecks ;
- contrôles SQL-like, XSS, secrets, CORS, CSP et en-têtes ;
- clavier, reflow, zoom, contrastes, axe, inspection sémantique et NVDA ;
- contrôle de l'anonymisation, des signets, des liens, du rendu et des
  empreintes après la génération finale.

Les deux améliorations P2 issues du parcours NVDA restent visibles dans le plan
de correction. Elles ne sont pas masquées par les résultats automatisés.
