# Guide de lecture jury — Bloc 2 RNCP39583

> Document d'orientation, sans donnée personnelle.
> Version applicative présentée : `0.13.0-rc.3`.
> Baseline applicative testée et déployée :
> `b002adb0e0e7d8d85ee493d54879e190d77d2078` (`b002adb`).
> Référence documentaire : tag `rncp-bloc2-2026-07-21-v7`.
> Le SHA exact de la source archivée figure dans le `MANIFESTE.txt` du paquet.

## Lecture recommandée

1. Lire la synthèse et la matrice finale du dossier principal, sections 2 et 17.
2. Examiner en priorité les quatre compétences éliminatoires : C2.2.1,
   C2.2.2, C2.2.3 et C2.3.1.
3. Utiliser la matrice ci-dessous pour passer du critère à la preuve primaire.
4. Consulter le cahier de recettes pour distinguer les 58 scénarios clos de
   l'unique réserve CR-055.
5. Vérifier dans le `MANIFESTE.txt` du paquet que la source, les deux PDF et les
   empreintes appartiennent au même gel documentaire.

La décision d'acquisition appartient au jury. Les états « étayé » ci-dessous
signifient seulement qu'une chaîne de preuves vérifiable est fournie.

## Repères factuels

| Repère | Valeur à vérifier |
| --- | --- |
| Compétences du bloc | 9 |
| Compétences éliminatoires | C2.2.1, C2.2.2, C2.2.3 et C2.3.1 |
| Cahier de recettes | 59 scénarios : 58 clos, 1 réservé |
| Baseline de production | `b002adb` |
| CI canonique | GitHub Actions `29845956008`, six jobs verts |
| CD canonique | GitHub Actions `29846343559`, smoke tests Web/API verts |
| Tests des suites complètes | shared 14, API 170, Web 55 ; périmètre PostgreSQL RNCP 9 contrôles |
| Accessibilité finale | 33/33 contrôles, zoom natif 16/16 ; portée humaine non exhaustive |
| Documentation d'exploitation | manuel de déploiement, manuel utilisateur et manuel de mise à jour |

## Matrice des neuf compétences

| Compétence | Ce que le jury doit pouvoir établir | Point d'entrée | Preuves primaires | État et limite |
| --- | --- | --- | --- | --- |
| C2.1.1 — Environnements, qualité et performance | Les environnements et objectifs sont définis, reproductibles et mesurés. | Dossier, sections 3 et 5 | B2-A21, B2-A22, B2-A28, B2-A29 ; `docs/deployment.md` | Étayé. A29 est une mesure séquentielle, pas un test de charge distribué. |
| C2.1.2 — Intégration continue | Chaque changement traverse des gates qualité, tests, audit, build et images. | Dossier, section 4 | `.github/workflows/ci.yml`, B2-A23, B2-A27, B2-A28, B2-A38 ; CI `29845956008` | Étayé. Les rapports séparent suites complètes et tests instrumentés pour la couverture. |
| **C2.2.1 — Prototype fonctionnel** | Les parcours essentiels fonctionnent sur une interface responsive et protégée. | Dossier, section 7 | B2-A25, B2-A30, captures bureau/mobile, recette CR-065 | **Éliminatoire — étayé.** La démonstration doit rester centrée sur les parcours réellement observés. |
| **C2.2.2 — Tests unitaires** | Les règles métier et composants critiques sont vérifiés avec des résultats mesurables. | Dossier, section 8 | B2-A19, B2-A28, B2-A31 ; rapports de couverture | **Éliminatoire — étayé.** 155 API, 43 Web, 8 PostgreSQL et 14 shared sont instrumentés ; les suites complètes comptent 170 API, 55 Web, 9 PostgreSQL RNCP et 14 shared. |
| **C2.2.3 — Sécurité, accessibilité et conformité** | Les risques principaux ont des contrôles exécutés et les limites ne sont pas masquées. | Dossier, sections 9 et 10 | B2-A23 à A30, B2-A35, B2-A36, B2-A37 ; revue OWASP | **Éliminatoire — étayé avec limite humaine.** Aucun audit RGAA exhaustif ni parcours avec lecteur d'écran réel n'est revendiqué. |
| C2.2.4 — Déploiement progressif et versionnement | Une baseline identifiée passe de la CI au CD avec migration et smoke tests. | Dossier, section 11 | B2-A22, B2-A28, B2-A38 ; `docs/ci-cd.md` ; CD `29846343559` | Étayé. `b002adb` est le SHA applicatif ; le SHA documentaire est distinct. |
| **C2.3.1 — Cahier de recettes** | Les exigences sont traduites en scénarios, résultats et preuves auditables. | Dossier, section 12 | B2-A12, B2-A25, B2-A30, B2-A34 à A38 | **Éliminatoire — étayé avec une réserve.** 58/59 clos ; seule CR-055 reste explicitement bornée. |
| C2.3.2 — Correction des bogues | Les anomalies sont reproduites, priorisées, corrigées et contre-testées. | Dossier, section 13 | B2-A13, B2-A25, B2-A27, B2-A34, B2-A36 à A38 | Étayé. Le registre distingue correction observée, automatisation et risque accepté. |
| C2.4.1 — Documentation d'exploitation | Un tiers peut déployer, utiliser et mettre à jour sans dépendre d'une explication orale. | Dossier, sections 14 à 16 | Les trois manuels complets et B2-A22 | Étayé. Les secrets et valeurs personnelles sont volontairement absents. |

## Réserve et contrôle CI/CD à lire avant l'oral

### CR-055 — accessibilité humaine

Les contrôles automatisés, clavier, focus, reflow, arbre d'accessibilité et zoom
natif sont consignés dans B2-A36 et B2-A37. Deux vérifications ne sont pas
présentées comme accomplies : une revue humaine exhaustive des contrastes sur
fonds composites et un parcours complet avec un lecteur d'écran réel. Cette
réserve interdit de transformer les résultats axe/Playwright en déclaration de
conformité RGAA exhaustive.

### CR-062 — chemin négatif CI vers CD fermé par B2-A38

B2-A38 consigne la CI courante `29856584668`, volontairement rouge sur la
pull request brouillon isolée `#46`. Après l'échec ESLint, les jobs de tests,
build, E2E et Docker sont `skipped`, aucun run CD n'est associé au SHA et les
inventaires Vercel de production API/Web restent strictement inchangés. Le test
`pnpm test:cd-policy` passe 6/6 contrôles sur le YAML courant. CR-062 est donc
clos par cette preuve négative, le chemin vert `29845956008` vers
`29846343559` et la preuve historique. Sa limite reste explicite : aucun commit
volontairement rouge n'a été poussé sur `main`, afin de ne pas dégrader la
branche de production.

## Vérification d'intégrité

Deux identités coexistent volontairement :

- `b002adb` identifie le code applicatif effectivement testé et déployé ;
- le SHA documentaire inscrit dans le `MANIFESTE.txt` identifie la consolidation
  et la source remises au jury, sans prétendre qu'elles ont été redéployées.

Le `MANIFESTE.txt` du paquet est la référence finale pour les SHA complets, le
nombre de pages et les empreintes SHA-256. En cas de divergence entre une
copie de travail et le paquet, le paquet manifesté prévaut.
