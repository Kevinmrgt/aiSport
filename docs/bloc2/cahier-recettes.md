# Cahier de recettes — Alcide

> Bloc 2 RNCP39583 — C2.3.1, compétence éliminatoire
> Candidate corrigée locale : `0.13.0-rc.4` au 2026-07-22.
> Baseline applicative déployée inchangée : `0.13.0-rc.3`, commit `b002adb0e0e7d8d85ee493d54879e190d77d2078`.
> Pull request de la baseline déployée : `#43`.
> Repère documentaire de la baseline : tag `rncp-bloc2-2026-07-21-v8`.
> Le tag `rncp-bloc2-2026-07-21-v5` reste le snapshot documentaire antérieur validé en CI/CD.
> Le SHA archivé et les empreintes de la remise `rc.4` figurent dans le
> `MANIFESTE.txt` généré avec le paquet ; ils ne modifient pas la baseline de
> production `rc.3`.

## Règles de preuve

| Code          | Signification                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| ✅ Exécuté    | scénario exécuté sur une version explicitement identifiée, résultat et preuve conservés               |
| 🧪 Automatisé | test exécuté automatiquement ; l'environnement local, CI ou production doit être précisé             |
| 📎 Historique | preuve obtenue sur une ancienne version, à ne pas assimiler à la version finale                      |
| ⏳ À exécuter | scénario préparé mais sans preuve suffisante                                                         |
| ❌ Échec      | résultat différent de l'attendu, anomalie obligatoire                                                |

Une inspection du code n'est pas une exécution. Chaque résultat final doit
indiquer date, environnement, navigateur/runtime, données, testeur ou commande,
artefact et anomalie éventuelle.

## Synthèse de la version candidate

| Élément                             | Valeur                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scénarios de recette comptabilisés  | 59 ; CR-049 est un risque architectural suivi séparément et n'entre pas dans le dénominateur                                  |
| Scénarios clos                      | 58 : résultats exécutés/observés et contrôles automatisés dont les preuves sont conservées                                     |
| Scénarios non clos                  | CR-055 partiel : qualification humaine des contrastes composites et parcours avec lecteur d'écran réel                         |
| Échecs fonctionnels finaux          | Aucun connu ; quatre écarts reproduits sur `rc.2` ont été corrigés puis contre-recettés sur `rc.3`                             |
| SHA/tag testé                       | baseline déployée `b002adb0e0e7d8d85ee493d54879e190d77d2078` et tag `v8` ; candidate locale `rc.4` sans SHA publié ni tag final |
| Environnement                       | baseline `rc.3` : local/CI/production ; candidate `rc.4` : contrôles locaux Node 24 uniquement                                |
| Artefacts                           | preuves historiques A20, A25 à A38 ; corrections locales `rc.4` B2-A39/A40 ; matrice user stories ; paquet `rc.4` à régénérer |

Les 59 scénarios ne sont pas tous des manipulations manuelles : le statut
`🧪 Automatisé` désigne un cas réellement exécuté dans l'environnement indiqué.
Le statut
`✅ Exécuté` désigne une recette ou une observation conservée. CR-055 n'est pas
inclus dans les 58 scénarios clos tant que sa réserve humaine n'est pas levée.
CR-063 est clos localement : le PDF et le ZIP `rc.4` ont été générés, toutes les
pages inspectées et la gate a validé la découvrabilité, la navigation,
l'anonymisation, la décompression et les empreintes.

### Contrôles locaux de la candidate `0.13.0-rc.4` — 2026-07-22

| Contrôle | Résultat local | Limite |
| -------- | -------------- | ------ |
| Dépendances résolues | `sharp 0.35.3`, `hono 4.12.31`, `@hono/node-server 2.0.11` | cinq avis nouvellement détectés corrigés dans le lockfile |
| `pnpm audit --prod --audit-level=low` | aucune vulnérabilité connue | exécution locale consignée dans B2-A39 |
| Lint et types | verts | aucune exécution CI de `rc.4` revendiquée |
| Tests | 239/239 : shared 14, API 170, Web 55 | ne vaut pas une contre-recette de production |
| Builds | verts | aucun push, CD ou déploiement de `rc.4` réalisé |
| Audit sémantique authentifié | huit routes principales, trois détails et confirmation de suppression contrôlés | deux anomalies reproduites sur `rc.3`, corrigées et testées localement dans B2-A40 |

### Matrice fonctionnalités → scénarios → preuves

| Fonctionnalité | Scénarios comptés | État | Preuves principales |
| -------------- | ----------------- | ---- | ------------------- |
| Authentification et session | CR-001 à CR-004 (4) | 4 clos | B2-A25, B2-A30, E2E OAuth `29833210488` |
| Génération de séance | CR-010 à CR-015 (6) | 6 clos | B2-A25, B2-A34, CI applicative |
| Programmes | CR-016 à CR-021 (6) | 6 clos | B2-A25, B2-A34, PostgreSQL réel |
| Séances, Timer et journalisation | CR-022 à CR-035 (14) | 14 clos | B2-A25, B2-A34, tests API/Web/PostgreSQL |
| Paramètres et dashboard | CR-036 à CR-041 (6) | 6 clos | B2-A25, B2-A34 |
| Sécurité fonctionnelle | CR-042 à CR-048 et CR-050 (8) | 8 clos | B2-A35, audit `low` local `rc.4`, B2-A39 |
| Accessibilité | CR-051 à CR-055 (5) | 4 clos ; CR-055 partiel | B2-A25, B2-A36, B2-A37, B2-A40 |
| Qualité, intégration et déploiement | CR-056 à CR-065 (10) | 10 clos | B2-A19, B2-A22, B2-A38, manifeste du paquet |
| **Total** | **59** | **58 clos ; 1 partiel** | **index des annexes et présent cahier** |

CR-049 est conservé sous son identifiant pour assurer la traçabilité du risque,
mais il ne correspond pas à une fonctionnalité livrée ni à une recette exécutée.

### Campagne de fermeture des risques éliminatoires du 2026-07-21

| Lot                         | Résultat exécuté                                                                                                    | Preuve |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Métier et erreurs           | 9/9 API ciblés, 9/9 Web ciblés, 170/170 API, 55/55 Web, 8/8 PostgreSQL et parcours production CR-065 réussi         | B2-A34 |
| Sécurité                    | 6/6 API, 1/1 PostgreSQL réel, 1/1 rendu XSS, 6/6 Playwright Chromium/Firefox, audit propre et production inspectée  | B2-A35 |
| Accessibilité automatisable | 33/33 Playwright production authentifiée, 2/2 tests de structure et audit sémantique de huit routes principales + trois détails | B2-A36, B2-A40 |

Les correctifs CR-038, confirmation de journalisation et hiérarchie des titres
ont passé la CI `29832575391`, le CD `29832944876`, les smoke tests et la
contre-recette OAuth `29833210488` sur la baseline finale. CR-055 reste partiel
pour les deux vérifications humaines décrites dans B2-A36/A37 ; cette limite n'est
pas transformée en fausse conformité RGAA.

Les rapports de couverture instrumentent 155 tests API, 43 Web, 8 PostgreSQL et
14 shared. Les suites complètes comptent 170 tests API, 55 Web et 14 shared ; le
neuvième contrôle PostgreSQL RNCP est la recette de sécurité SQL exécutée hors
du rapport de couverture. Ces deux présentations mesurent donc des périmètres
différents et ne se contredisent pas.

### Compléments automatisés du 2026-07-21

| Contrôle                       | Résultat                   | Preuve et limite                                                                                                                         |
| ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CI du complément               | Succès des six jobs        | run `29819423534` : lint/typecheck, audit, 155 tests API, 43 Web, 14 shared, couvertures, PostgreSQL, Playwright public, build et Docker |
| Playwright authentifié local   | 6/6                        | session OAuth réelle locale non versionnée ; génération, mobile 390 × 844, débordement horizontal et axe critique/sérieux                |
| Playwright authentifié CI      | 6/6                        | run `29820498452` : session dédiée restaurée depuis GitHub Secrets, puis supprimée du runner                                             |
| Performance production         | 150/150 réponses valides   | B2-A29 : 50 requêtes par endpoint, p95 de 267,11 à 508,63 ms ; mesure ponctuelle, pas un test de charge                                  |
| Prototype authentifié          | Desktop et mobile capturés | B2-A30 ; aucune adresse personnelle ou donnée de recette visible                                                                         |
| Couverture shared              | 14/14                      | B2-A31 : 100 % lignes/statements/fonctions et 92,85 % branches sur les schémas partagés                                                  |
| CI finale `main`               | Succès des six jobs        | run `29845956008` sur `b002adb` : audit, qualité, tests API/Web/shared, PostgreSQL, Playwright, build et Docker                           |
| CD final Vercel                | Succès                     | run `29846343559` : migration, API, Web et smoke tests                                                                                   |
| Snapshot documentaire `v5`     | Succès CI/CD                | `b3ca385` : diff applicatif nul depuis `b002adb`, CI `29847808450`, CD `29848187523` ; preuve antérieure, ne remplace pas la contre-recette de `b002adb` |
| Repère documentaire final `v8` | Contrôles locaux du paquet  | corrections de cohérence, réserves et manuels ; SHA archivé et empreintes portés par le manifeste final                               |
| E2E OAuth post-déploiement     | 6/6                        | run `29833210488` : session dédiée restaurée puis supprimée du runner                                                                    |
| Accessibilité post-déploiement | 33/33 + zoom natif 16/16   | production `b002adb` : 3 pages publiques et 5 privées, reflow, clavier, contraste axe, arbre AX et zoom Chromium 200/400 %              |

Ces compléments démontrent le périmètre automatisé exécuté ; ils ne constituent
pas une déclaration de conformité exhaustive au RGAA.

### Vérification finale automatisée du 2026-07-20

| Contrôle             | Résultat                          | Preuve et limite                                                                                                                  |
| -------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| CI du SHA applicatif | Succès des 6 jobs                 | run `29747228594` : audit `low`, lint/typecheck, 198 tests API/Web et couvertures, PostgreSQL, Playwright/axe, packages et Docker |
| CD du SHA applicatif | Succès                            | run `29747592571` : migration, API, Web et smoke tests                                                                            |
| Production           | HTTP 200                          | API liveness/readiness et Web en `0.13.0-rc.3`, DB et configuration IA `ok`                                                       |
| Monitoring officiel  | Succès                            | run `29748032763` sur le SHA applicatif                                                                                           |
| Déploiement unique   | Une production `READY` par projet | tentatives Git automatiques API/Web `CANCELED`, productions GitHub Actions `READY`                                                |

Ces résultats automatisés ne sont pas confondus avec la recette authentifiée
manuelle B2-A25. Ils ne valident ni l'inspection interne de la session, ni
l'audit RGAA humain complet.

### Vérification locale non finale du 2026-07-20

| Contrôle                                 | Résultat local                                                                             | Portée de la preuve                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Tests unitaires API                      | 86/86 réussis                                                                              | candidate locale historique ; la CI finale exécute 91 tests API                                                |
| Tests unitaires Web                      | 39/39 réussis                                                                              | candidate non commitée ; sortie brute finale non archivée                                                      |
| Couverture API                           | 84,97 % lignes/statements ; 80,40 % branches                                               | périmètre unitaire documenté                                                                                   |
| Couverture Web                           | 68,07 % lignes/statements ; 77,45 % branches                                               | `app`, `components`, `lib`                                                                                     |
| Playwright public                        | 48/48 réussis, Chromium et Firefox                                                         | sans parcours OAuth réel ; rapport brut final non archivé                                                      |
| Recette navigateur publique instrumentée | 12/12 Chromium + 12/12 Firefox                                                             | candidate `69b21ef-dirty` ; 320 px, axe ciblé, console/pageerror, clavier et quatre redirections ; B2-A20      |
| PostgreSQL réel                          | 8/8 réussis ; PostgreSQL 16.14 ; 93,69 % lignes/statements, 80 % branches, 100 % fonctions | candidate `69b21ef-dirty`, Node 24.14.0 ; annexe B2-A19 ; job PostgreSQL final réussi dans la CI `29742672052` |

Ces résultats facilitent la correction, mais ne renseignent pas les totaux de
recette du SHA final et ne valent pas validation manuelle ou production.

## Authentification et session

| ID     | Fonctionnalité            | Préconditions et actions                                                | Résultat attendu                                                 | Preuve prévue                | Statut                                                                                                                             |
| ------ | ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| CR-001 | Connexion Google          | Sans session, `/login`, autoriser Google                                | session créée et redirection vers `/generate`                    | recette production + capture | ✅ Connexion réalisée par le candidat ; session privée active observée sur `/generate` dans B2-A25, écrans Google non instrumentés |
| CR-002 | Route privée sans session | ouvrir `/generate`, `/workouts`, `/programs`, `/dashboard`, `/settings` | redirection `/login`                                             | Playwright public            | ✅ Redirections publiques automatisées ; `/dashboard` également observé en production sans session                                 |
| CR-003 | Déconnexion               | session active, cliquer `Sortir`                                        | session supprimée et retour public                               | recette production           | ✅ Exécuté sur `rc.3` : `/dashboard` redirige ensuite vers `/login`, B2-A25                                                        |
| CR-004 | Navigation selon session  | comparer accueil connecté/déconnecté                                    | liens privés uniquement connecté ; aucun faux nom Google annoncé | capture desktop/mobile       | ✅ États connecté/déconnecté observés ; génération authentifiée capturée en desktop et mobile, B2-A25/B2-A30                       |

## Génération de séance

| ID     | Fonctionnalité               | Préconditions et actions                           | Résultat attendu                                                    | Preuve prévue                      | Statut                                                                                                      |
| ------ | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| CR-010 | Séance valide                | compte actif, sport/niveau/durée/objectifs valides | réponse créée, sauvegarde, détail affiché                           | E2E full-stack + production        | ✅ Génération réelle `rc.2`, 15 min exactes, puis donnée de recette supprimée ; B2-A25                      |
| CR-011 | Sport vide                   | soumettre sans sport                               | message relié au champ, aucun appel API                             | test composant/E2E                 | ✅ 64 tests de schémas et soumission `rc.3` avec message français ; B2-A25                                  |
| CR-012 | Durée hors limites           | saisir une durée invalide                          | validation client et serveur cohérente                              | tests schéma/formulaire/controller | 🧪 Automatisé, CI finale verte                                                                              |
| CR-013 | OpenAI indisponible          | simuler timeout/429/5xx                            | erreur claire, aucune donnée incomplète                             | test service + E2E erreur          | ✅ Simulations 429, 503 et timeout, HTTP 503 sans persistance et erreur UI permettant de réessayer ; B2-A34 |
| CR-014 | JSON IA invalide puis valide | première réponse invalide, seconde correcte        | retry borné puis succès                                             | test service IA                    | 🧪 Automatisé, CI finale verte                                                                              |
| CR-015 | Cohérence durée séance       | réponse 30 min avec contenu incohérent             | rejet et nouvelle tentative/erreur ; cas répétitions pris en charge | tests contrats/service             | 🧪 Automatisé, CI finale verte                                                                              |

## Programmes

| ID     | Fonctionnalité       | Préconditions et actions                             | Résultat attendu                                                | Preuve prévue                   | Statut                                                                                                   |
| ------ | -------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| CR-016 | Générer un programme | objectif, niveau, semaines, séances et durée valides | programme créé et affiché                                       | E2E full-stack + production     | ✅ Génération réelle `rc.2`, 2 semaines/4 séances de 20 min, puis donnée supprimée ; B2-A25              |
| CR-017 | Structure programme  | provoquer semaines/séances manquantes ou n°99        | rejet : quantités et numéros conformes à la demande             | tests contrats/service          | 🧪 Automatisé, CI finale verte                                                                           |
| CR-018 | Lister et paginer    | plusieurs programmes du compte                       | uniquement ses programmes, pagination correcte                  | test PostgreSQL + E2E           | ✅ Page 2/2, paramètres API, isolation utilisateur et PostgreSQL réel exécutés ; B2-A34                  |
| CR-019 | Détail programme     | ouvrir un programme détenu                           | semaines et séances affichées                                   | test service + E2E              | ✅ Détail réel, 2 semaines et séance 2-1 de 20 min ; B2-A25                                              |
| CR-020 | Onglets semaines     | flèches, Home, End, clic                             | sélection/focus conformes au pattern tabs                       | test composant + manuel clavier | ✅ `ArrowRight`, `Home`, `End` exécutés ; B2-A25                                                         |
| CR-021 | Supprimer programme  | confirmer puis simuler aussi une erreur              | suppression réelle ; erreur visible sans fermer la confirmation | test composant + E2E/API        | ✅ Suppression production historique et erreur 500 contrôlée avec confirmation maintenue ; B2-A25/B2-A34 |

## Séances, Timer et journalisation

| ID     | Fonctionnalité                | Préconditions et actions                    | Résultat attendu                                              | Preuve prévue                     | Statut                                                                                           |
| ------ | ----------------------------- | ------------------------------------------- | ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| CR-022 | Liste personnelle             | deux comptes avec séances                   | liste filtrée par utilisateur                                 | test PostgreSQL multi-utilisateur | 🧪 Automatisé, CI finale verte                                                                   |
| CR-023 | Accès séance d'autrui         | compte A ouvre l'ID du compte B             | API 403 sans contenu ; UI n'affiche pas une fausse 404 réseau | test PostgreSQL/API               | 🧪 Automatisé, CI finale verte                                                                   |
| CR-024 | ID invalide                   | appeler détail/suppression avec ID non UUID | 400, jamais erreur PostgreSQL 500                             | tests controllers                 | 🧪 Automatisé, CI finale verte                                                                   |
| CR-025 | Démarrer Timer                | séance minutée, cliquer démarrer            | deadline initialisée, décompte visible                        | test composant                    | ✅ Décompte réel observé en production et tests verts, B2-A25                                    |
| CR-026 | Pause/reprise                 | laisser tourner, pause, attendre, reprendre | pause exclue du temps actif et du décompte                    | test Timer avec horloge simulée   | ✅ Valeurs stables pendant 2,2 s de pause puis reprise réelle, B2-A25                            |
| CR-027 | Onglet ralenti                | avancer l'horloge de plusieurs secondes     | décompte recalé sur deadline, sans dérive cumulative          | test Timer                        | 🧪 Automatisé, CI finale verte                                                                   |
| CR-028 | Passage de phase              | laisser une phase atteindre zéro            | phase suivante annoncée et démarrée                           | test Timer                        | 🧪 Automatisé, CI finale verte                                                                   |
| CR-029 | Plein écran Timer             | ouvrir, Tab/Shift+Tab, Échap                | dialogue nommé, focus contenu/restreint puis restauré         | test composant + manuel           | ✅ Défaut reproduit sur `rc.2`, corrigé ; focus `BUTTON Pause` sur `rc.3`, B2-A25                |
| CR-030 | Fin de séance                 | terminer et enregistrer effort/feedback     | journal créé avec durée active                                | test composant/service/DB         | ✅ Durée active 487 s vérifiée localement et journal créé en production ; B2-A34                 |
| CR-031 | Ownership journal workout     | utiliser workout d'un autre compte          | 403 et aucune insertion                                       | test service + PostgreSQL         | 🧪 Automatisé, CI finale verte                                                                   |
| CR-032 | Ownership journal programme   | utiliser programme d'un autre compte        | 403 et aucune insertion                                       | test service + PostgreSQL         | 🧪 Automatisé, CI finale verte                                                                   |
| CR-033 | Métadonnées falsifiées        | envoyer titre/sport/durée différents        | valeurs serveur dérivées de la ressource détenue              | test service + DB                 | 🧪 Automatisé, CI finale verte                                                                   |
| CR-034 | Notes de douleur              | enregistrer une note facultative            | stockage lié au compte et information confidentialité visible | recette UI + DB                   | ✅ Stockage propriétaire PostgreSQL, page Confidentialité et saisie production vérifiés ; B2-A34 |
| CR-035 | Suppression séance accessible | confirmer, annuler, Échap, erreur API       | focus géré, annulation sûre, erreur visible                   | test composant + manuel           | ✅ Annulation, Échap, restauration du focus et panne API avec dialogue maintenu ; B2-A25/B2-A34  |

## Paramètres et dashboard

| ID     | Fonctionnalité      | Préconditions et actions     | Résultat attendu                                               | Preuve prévue            | Statut                                                                                                 |
| ------ | ------------------- | ---------------------------- | -------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| CR-036 | Lire paramètres     | compte actif                 | fournisseur OpenAI serveur et modèle courant affichés          | test API/Web + E2E       | ✅ OpenAI serveur et GPT-5.4 mini observés en production, B2-A25                                       |
| CR-037 | Enregistrer modèle  | choisir un modèle autorisé   | valeur persistée et confirmation                               | test controller/DB + E2E | ✅ Modèle changé et relu en production, puis valeur initiale restaurée ; B2-A34                        |
| CR-038 | Modèle non autorisé | envoyer valeur arbitraire    | 400, aucune persistance                                        | test controller          | ✅ Défaut reproduit et allowlist API ajoutée ; valeur arbitraire rejetée 400 sans persistance ; B2-A34 |
| CR-039 | Panne settings      | API indisponible             | erreur explicite, pas de faux défaut présenté comme enregistré | test server-api/page     | 🧪 Automatisé, CI finale verte                                                                         |
| CR-040 | Dashboard vide      | aucun journal                | état vide compréhensible                                       | test rendu/E2E           | ✅ État vide déterministe, explication et CTA `/generate` vérifiés ; B2-A34                            |
| CR-041 | Dashboard alimenté  | plusieurs journaux du compte | totaux/durée/effort/feedback exacts et isolés                  | test PostgreSQL + E2E    | ✅ Totaux déterministes et isolation PostgreSQL, puis compteur production `3 → 4` ; B2-A34             |

## Sécurité

| ID     | Fonctionnalité       | Préconditions et actions                               | Résultat attendu                                                 | Preuve prévue           | Statut                                                                                                 |
| ------ | -------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| CR-042 | Chaîne SQL-like      | saisir `'; DROP TABLE workouts; --` comme texte valide | chaîne traitée comme donnée ; requête paramétrée ; table intacte | test PostgreSQL         | ✅ Insérée et relue comme donnée sur PostgreSQL 16.14 ; table requêtable et cleanup vérifié ; B2-A35   |
| CR-043 | XSS                  | saisir balise script dans un champ accepté             | aucun script exécuté au rendu                                    | Playwright navigateur   | ✅ Charges `script` et `img onerror` inertes en React et Chromium/Firefox ; B2-A35                     |
| CR-044 | API sans secret      | appeler une route privée sans secret                   | 401                                                              | test middleware + curl  | 🧪 Automatisé, CI finale verte                                                                         |
| CR-045 | Secret non exposé    | inspecter HTML, JS et réseau navigateur                | aucune clé OpenAI ni secret interservice                         | build + navigateur      | ✅ HTML et 9 scripts de production inspectés : 0 marqueur de secret ou clé longue ; B2-A35             |
| CR-046 | CORS hostile         | requête avec origine non autorisée                     | absence d'autorisation CORS                                      | curl automatisé         | ✅ Origine hostile refusée localement et en production ; origine officielle seule autorisée ; B2-A35   |
| CR-047 | Headers/CSP          | inspecter réponse production                           | headers présents ; `unsafe-eval` absent en production            | test headers/curl       | ✅ CSP/HSTS/headers contrôlés en production ; `unsafe-eval` absent, `unsafe-inline` documenté ; B2-A35 |
| CR-048 | Rate limit local     | dépasser quota dans un processus                       | 429 et `Retry-After`                                             | test middleware         | 🧪 Automatisé, CI finale verte                                                                         |
| CR-050 | Audit dépendances    | lancer audit sur lockfile final                        | aucune vulnérabilité connue au niveau `low`                      | B2-A39                  | ✅ `rc.4` locale : cinq avis corrigés, audit `low` propre ; lint, types, 239 tests et builds verts. CI/CD et production non exécutées. |

### Risque architectural associé — hors comptage de la recette

| ID | Risque | État réel | Décision et preuve |
| -- | ------ | --------- | ----------------- |
| CR-049 | Le rate limit en mémoire n'est pas global entre plusieurs instances serverless. | Non implémenté et non exécuté avec un store partagé. | Risque accepté pour le prototype ; le 429 local de CR-048 ne prouve pas un quota distribué. Industrialisation : store partagé et test multi-instance. |

## Accessibilité RGAA 4.1.2 / WCAG 2.1 AA

| ID     | Fonctionnalité          | Préconditions et actions                                          | Résultat attendu                                          | Preuve prévue                      | Statut                                                                                                                                                            |
| ------ | ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-051 | Pages publiques         | axe complet sur `/` et `/login`                                   | aucune violation applicable non traitée                   | Playwright/axe                     | ✅ Exécuté localement puis en CI finale sur le périmètre public ; ne vaut pas audit RGAA manuel                                                                   |
| CR-052 | Pages authentifiées     | axe sur generate, programmes, listes, détail, dashboard, settings | aucune violation applicable non traitée                   | Playwright avec vrai storage state | ✅ Cinq pages privées auditées sans violation de contraste axe, arbre AX contrôlé ; `/programs/generate` contre-vérifié ; B2-A36                                  |
| CR-053 | Clavier                 | parcourir navigation, formulaires, tabs, suppressions, Timer      | toutes actions atteignables, ordre/focus cohérents        | audit navigateur + tests composants | ✅ Cycle Tab complet et focus perceptible sur 3 pages publiques et 5 privées ; annulation de suppression avec restitution du focus ; focus du premier champ invalide et relations d'onglets corrigés puis testés localement ; B2-A25/B2-A36/B2-A40 |
| CR-054 | Reflow/mobile           | 320 px CSS et viewport mobile                                     | aucune perte d'information/action ni scroll 2D injustifié | captures + audit manuel            | ✅ Reflow 640/320 px sur 3 pages publiques et 5 privées, plus `/programs/generate`, sans débordement ; B2-A36                                                     |
| CR-055 | Zoom/contraste/annonces | zoom 200/400 %, contraste, lecteur d'écran                        | contenu lisible et annonces compréhensibles               | grille RGAA manuelle               | ⏳ Partiel : rejeu production `rc.3` 33/33, zéro violation axe, 416 `incomplete` ; échantillonnage pixel 69 signatures/150 contextes conformes, 8/14 en alerte, 2/2 non concluants. B2-A40 confirme les régions et relations sémantiques sur huit routes et trois détails, sans restitution vocale. Correctifs CSS et focus/onglets locaux validés par 55/55 tests Web, types et lint, mais non déployés/rejoués ; aucune écoute Narrator/NVDA exécutée ; B2-A37/A40. |

## Qualité, intégration et déploiement

| ID     | Fonctionnalité            | Préconditions et actions                                                 | Résultat attendu                                                                    | Preuve prévue       | Statut                                                                                                            |
| ------ | ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| CR-056 | Tests et couvertures      | lancer `pnpm test:coverage`                                              | API/Web/PostgreSQL/shared mesurés séparément ; exclusions expliquées                | rapports CI         | ✅ CI `29819423534` verte ; quatre rapports publiés, dont shared 100 % lignes/statements/fonctions                |
| CR-057 | PostgreSQL réel           | PostgreSQL 16 et migrations, puis tests repositories/ownership sans skip | tests et couverture d'intégration réussis                                           | B2-A19 + rapport CI | ✅ 8/8 locaux sur `69b21ef-dirty`, puis job PostgreSQL final vert dans `29742672052`                              |
| CR-058 | Qualité/build             | lint, typecheck, build sous Node 24                                      | toutes commandes réussies                                                           | logs CI + B2-A39    | ✅ Baseline `rc.3` : CI `29742672052` ; candidate `rc.4` : lint, types et builds verts localement uniquement     |
| CR-059 | Docker                    | construire API/Web et contrôler la procédure migrate/seed                | images Node 24 non-root ; migrate/seed fonctionnels                                 | CI + B2-A22         | ✅ Images finales construites en CI ; migrate/seed validés localement ; clone vierge non archivé                  |
| CR-060 | Readiness API             | DB/clé disponibles puis indisponibles                                    | 200 prêt ; 503 avec dépendance défaillante                                          | tests route + curl  | ✅ Cas automatisés verts ; readiness production 200, DB/IA `ok`                                                   |
| CR-061 | CI complète               | pousser le SHA final                                                     | tous les jobs obligatoires verts                                                    | run GitHub          | ✅ Run final `29845956008` réussi sur `b002adb`                                                                   |
| CR-062 | CD sans contournement     | CI échoue puis réussit                                                   | aucun déploiement après échec ; déploiement après succès                            | runs GitHub + B2-A38 | ✅ Fermé sans toucher à `main` : CI courante `29856584668` rouge sur PR isolée, quatre jobs aval ignorés, aucun run CD associé et inventaires Vercel production API/Web identiques avant/après ; politique YAML 6/6. Chemin vert `29845956008` → `29846343559`. Limite : aucun commit volontairement rouge sur `main`. |
| CR-063 | Version immuable          | construire le paquet depuis un état Git propre et vérifier PDF, source, SHA et empreintes | build refusé si fichiers suivis modifiés ; PDF principal ≤ 30 pages ; livrables de premier niveau présents ; archive et PDF anonymisés ; SHA-256 consignés | `build_bloc2_delivery_pack.py` + manifeste | ✅ PDFs `rc.4` régénérés : dossier 11 pages, annexes 74 pages, LIV-01 à LIV-04 et B2-A39/A40 présents, 22/195 signets et 43/56 liens. Le nouveau ZIP doit être figé après commit pour renouveler anonymisation, décompression et empreintes. |
| CR-064 | Production API/Web        | déployer le SHA final                                                    | liveness/readiness/Web en 200                                                       | curl daté           | ✅ CD final `29846343559`, HTTP 200 `rc.3`, DB et configuration IA `ok`                                           |
| CR-065 | Parcours post-déploiement | login, séance, programme, Timer, journal, dashboard                      | parcours complet sans erreur                                                        | recette production  | ✅ Session OAuth, Programmes, Timer, effort/feedback/douleur, journal et dashboard `3 → 4` en production ; B2-A34 |

## Critère de clôture C2.3.1

Les 59 scénarios de recette sont reliés à une preuve ou à une réserve explicite :
58 sont clos ; seul CR-055 reste partiel pour les contrôles humains. CR-062 combine une CI rouge
courante isolée, un inventaire Vercel avant/après et six tests de politique.
CR-049 demeure un risque architectural hors dénominateur. Les tests
Vitest/Playwright ne sont pas présentés comme un audit RGAA exhaustif.
