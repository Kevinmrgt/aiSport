# Cahier de recettes — Alcide

> Bloc 2 RNCP39583 — C2.3.1, compétence éliminatoire
> Version déployée : `0.13.0-rc.5` au 2026-07-22, commit `c63439e8ac8d68efd5ba091211b326ee8575fbba`.
> Validation de la version : CI `29930722308` ; CD `29931146789`.
> Le SHA archivé et les empreintes de la remise `rc.5` figurent dans le
> `MANIFESTE.txt` généré avec le paquet ; ils ne modifient pas la baseline de
> production `rc.5`.

## Règles de preuve

| Code          | Signification                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Exécuté       | scénario exécuté sur une version explicitement identifiée, résultat et preuve conservés              |
| Automatisé    | test exécuté automatiquement ; l'environnement local, CI ou production doit être précisé            |
| Historique    | preuve obtenue sur une ancienne version, à ne pas assimiler à la version finale                     |
| À exécuter    | scénario préparé mais sans preuve suffisante                                                        |
| Échec         | résultat différent de l'attendu, anomalie obligatoire                                               |

Une inspection du code n'est pas une exécution. Chaque résultat final doit
indiquer date, environnement, navigateur/runtime, données, testeur ou commande,
artefact et anomalie éventuelle.

## Synthèse de la version déployée

| Élément                             | Valeur                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scénarios de recette comptabilisés  | 59 ; CR-049 est un risque architectural suivi séparément et n'entre pas dans le dénominateur                                  |
| Scénarios avec résultat             | 59 : exécutions, observations ou contrôles automatisés avec une preuve associée                                               |
| Réserves                            | CR-055 conserve deux améliorations P2 et une contre-recette NVDA sans transcription détaillée                                 |
| Échecs fonctionnels finaux          | Aucun connu ; B2-BUG-042/043 sont corrigés et validés sur `rc.5` ; B2-BUG-044/045 restent des améliorations P2 non bloquantes  |
| SHA testé                           | baseline déployée `c63439e8ac8d68efd5ba091211b326ee8575fbba`                                                               |
| Environnement                       | baseline `rc.5` en CI/production ; trois endpoints de santé en HTTP 200                                                       |
| Artefacts                           | preuves A20, A25 à A41 ; matrice user stories ; paquet `rc.5` généré, inspecté et vérifié                                      |

Les 59 scénarios ne sont pas tous des manipulations manuelles : le statut
`Automatisé - Automatisé` désigne un cas réellement exécuté dans l'environnement indiqué.
Le statut `Exécuté` désigne une recette ou une observation conservée. CR-063
est vérifié par la génération du paquet incluant B2-A41, le contrôle visuel des
deux PDF, la décompression, le contrôle d'anonymisation et la comparaison des
empreintes SHA-256.

### Contrôles de la version `0.13.0-rc.5` — 2026-07-22

| Contrôle | Résultat local | Limite |
| -------- | -------------- | ------ |
| Dépendances résolues | `sharp 0.35.3`, `hono 4.12.31`, `@hono/node-server 2.0.11` | cinq avis nouvellement détectés corrigés dans le lockfile |
| `pnpm audit --prod --audit-level=low` | aucune vulnérabilité connue | exécution locale consignée dans B2-A39 |
| Lint et types | verts | localement et dans la CI `29930722308` |
| Tests | 241/241 : shared 14, API 170, Web 57 | formulaires séance/programme et région vive paramètres inclus |
| Builds | verts | déploiement CD `29931146789` réussi |
| Santé production | API liveness/readiness et Web HTTP 200 en `rc.5` | base et configuration IA `ok` |
| Lecteur d'écran | contre-recette NVDA déclarée validée après déploiement | aucune nouvelle transcription détaillée, B2-A41 |

### Matrice fonctionnalités → scénarios → preuves

| Fonctionnalité | Scénarios comptés | Résultats | Preuves principales |
| -------------- | ----------------- | ---- | ------------------- |
| Authentification et session | CR-001 à CR-004 (4) | 4 renseignés | B2-A25, B2-A30, E2E OAuth `29833210488` |
| Génération de séance | CR-010 à CR-015 (6) | 6 renseignés | B2-A25, B2-A34, CI applicative |
| Programmes | CR-016 à CR-021 (6) | 6 renseignés | B2-A25, B2-A34, PostgreSQL réel |
| Séances, Timer et journalisation | CR-022 à CR-035 (14) | 14 renseignés | B2-A25, B2-A34, tests API/Web/PostgreSQL |
| Paramètres et dashboard | CR-036 à CR-041 (6) | 6 renseignés | B2-A25, B2-A34 |
| Sécurité fonctionnelle | CR-042 à CR-048 et CR-050 (8) | 8 renseignés | B2-A35, audit `low` local `rc.4`, B2-A39 |
| Accessibilité | CR-051 à CR-055 (5) | 5 renseignés, réserves sur CR-055 | B2-A25, B2-A36, B2-A37, B2-A40, B2-A41 |
| Qualité, intégration et déploiement | CR-056 à CR-065 (10) | 10 renseignés | B2-A19, B2-A22, B2-A38, manifeste du paquet |
| **Total** | **59** | **59 résultats documentés** | **index des annexes et présent cahier** |

CR-049 est conservé sous son identifiant pour assurer la traçabilité du risque,
mais il ne correspond pas à une fonctionnalité livrée ni à une recette exécutée.

### Campagne de fermeture des risques éliminatoires du 2026-07-21

| Lot                         | Résultat exécuté                                                                                                    | Preuve |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Métier et erreurs           | 9/9 API ciblés, 9/9 Web ciblés, 170/170 API, 55/55 Web, 8/8 PostgreSQL et parcours production CR-065 réussi         | B2-A34 |
| Sécurité                    | 6/6 API, 1/1 PostgreSQL réel, 1/1 rendu XSS, 6/6 Playwright Chromium/Firefox, audit propre et production inspectée  | B2-A35 |
| Accessibilité automatisable | 33/33 Playwright production authentifiée, 2/2 tests de structure, audit sémantique et parcours réel NVDA sur dix scénarios | B2-A36, B2-A40, B2-A41 |

Les correctifs CR-038, confirmation de journalisation et hiérarchie des titres
ont passé la CI `29832575391`, le CD `29832944876`, les smoke tests et la
contre-recette OAuth `29833210488` sur la baseline antérieure. CR-055 est clos
sur l'échantillon : les 166 contextes composites sont décidés, les correctifs
B2-BUG-042/043 sont déployés dans `rc.5`, les healthchecks sont verts et la
contre-recette NVDA a été déclarée validée. Cette conclusion reste limitée aux
parcours décrits et ne vaut pas déclaration de conformité RGAA exhaustive.

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
| CI finale `main`               | Succès des six jobs        | run `29930722308` sur `c63439e` : audit, qualité, 241 tests API/Web/shared, PostgreSQL, Playwright, build et Docker                       |
| CD final Vercel                | Succès                     | run `29931146789` : migration, API, Web et smoke tests                                                                                   |
| Snapshot documentaire `v5`     | Succès CI/CD                | `b3ca385` : diff applicatif nul depuis `b002adb`, CI `29847808450`, CD `29848187523` ; preuve antérieure, ne remplace pas la contre-recette de `b002adb` |
| E2E OAuth post-déploiement     | 6/6                        | run `29833210488` : session dédiée restaurée puis supprimée du runner                                                                    |
| Accessibilité post-déploiement | 33/33 + zoom natif 16/16   | production `ea703ae` : 3 pages publiques et 5 privées ; 166/166 contextes composites décidés ; B2-A40 fermé                            |
| Contre-recette NVDA `rc.5`     | Validation déclarée        | l'utilisateur déclare avoir effectué et validé les tests ; aucun détail supplémentaire non fourni n'est revendiqué, B2-A41             |

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
| Tests unitaires API                      | 86/86 réussis                                                                              | version locale historique ; la CI finale exécute 91 tests API                                                  |
| Tests unitaires Web                      | 39/39 réussis                                                                              | version locale non commitée ; sortie brute finale non archivée                                                |
| Couverture API                           | 84,97 % lignes/statements ; 80,40 % branches                                               | périmètre unitaire documenté                                                                                   |
| Couverture Web                           | 68,07 % lignes/statements ; 77,45 % branches                                               | `app`, `components`, `lib`                                                                                     |
| Playwright public                        | 48/48 réussis, Chromium et Firefox                                                         | sans parcours OAuth réel ; rapport brut final non archivé                                                      |
| Recette navigateur publique instrumentée | 12/12 Chromium + 12/12 Firefox                                                             | version locale `69b21ef-dirty` ; 320 px, axe ciblé, console/pageerror, clavier et quatre redirections ; B2-A20 |
| PostgreSQL réel                          | 8/8 réussis ; PostgreSQL 16.14 ; 93,69 % lignes/statements, 80 % branches, 100 % fonctions | version locale `69b21ef-dirty`, Node 24.14.0 ; annexe B2-A19 ; job PostgreSQL final réussi dans la CI `29742672052` |

Ces résultats facilitent la correction, mais ne renseignent pas les totaux de
recette du SHA final et ne valent pas validation manuelle ou production.

## Authentification et session

| ID     | Fonctionnalité            | Préconditions et actions                                                | Résultat attendu                                                 | Preuve prévue                | Statut                                                                                                                             |
| ------ | ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| CR-001 | Connexion Google          | Sans session, `/login`, autoriser Google                                | session créée et redirection vers `/generate`                    | recette production + capture | Exécuté - Connexion réalisée ; session privée active observée sur `/generate` dans B2-A25, écrans Google non instrumentés |
| CR-002 | Route privée sans session | ouvrir `/generate`, `/workouts`, `/programs`, `/dashboard`, `/settings` | redirection `/login`                                             | Playwright public            | Exécuté - Redirections publiques automatisées ; `/dashboard` également observé en production sans session                                 |
| CR-003 | Déconnexion               | session active, cliquer `Sortir`                                        | session supprimée et retour public                               | recette production           | Exécuté sur `rc.3` : `/dashboard` redirige ensuite vers `/login`, B2-A25                                                                   |
| CR-004 | Navigation selon session  | comparer accueil connecté/déconnecté                                    | liens privés uniquement connecté ; aucun faux nom Google annoncé | capture desktop/mobile       | Exécuté - États connecté/déconnecté observés ; génération authentifiée capturée en desktop et mobile, B2-A25/B2-A30                       |

## Génération de séance

| ID     | Fonctionnalité               | Préconditions et actions                           | Résultat attendu                                                    | Preuve prévue                      | Statut                                                                                                      |
| ------ | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| CR-010 | Séance valide                | compte actif, sport/niveau/durée/objectifs valides | réponse créée, sauvegarde, détail affiché                           | E2E full-stack + production        | Exécuté - Génération réelle `rc.2`, 15 min exactes, puis donnée de recette supprimée ; B2-A25                      |
| CR-011 | Sport vide                   | soumettre sans sport                               | message relié au champ, aucun appel API                             | test composant/E2E                 | Exécuté - 64 tests de schémas et soumission `rc.3` avec message français ; B2-A25                                  |
| CR-012 | Durée hors limites           | saisir une durée invalide                          | validation client et serveur cohérente                              | tests schéma/formulaire/controller | Automatisé - Automatisé, CI finale verte                                                                              |
| CR-013 | OpenAI indisponible          | simuler timeout/429/5xx                            | erreur claire, aucune donnée incomplète                             | test service + E2E erreur          | Exécuté - Simulations 429, 503 et timeout, HTTP 503 sans persistance et erreur UI permettant de réessayer ; B2-A34 |
| CR-014 | JSON IA invalide puis valide | première réponse invalide, seconde correcte        | retry borné puis succès                                             | test service IA                    | Automatisé - Automatisé, CI finale verte                                                                              |
| CR-015 | Cohérence durée séance       | réponse 30 min avec contenu incohérent             | rejet et nouvelle tentative/erreur ; cas répétitions pris en charge | tests contrats/service             | Automatisé - Automatisé, CI finale verte                                                                              |

## Programmes

| ID     | Fonctionnalité       | Préconditions et actions                             | Résultat attendu                                                | Preuve prévue                   | Statut                                                                                                   |
| ------ | -------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| CR-016 | Générer un programme | objectif, niveau, semaines, séances et durée valides | programme créé et affiché                                       | E2E full-stack + production     | Exécuté - Génération réelle `rc.2`, 2 semaines/4 séances de 20 min, puis donnée supprimée ; B2-A25              |
| CR-017 | Structure programme  | provoquer semaines/séances manquantes ou n°99        | rejet : quantités et numéros conformes à la demande             | tests contrats/service          | Automatisé - Automatisé, CI finale verte                                                                           |
| CR-018 | Lister et paginer    | plusieurs programmes du compte                       | uniquement ses programmes, pagination correcte                  | test PostgreSQL + E2E           | Exécuté - Page 2/2, paramètres API, isolation utilisateur et PostgreSQL réel exécutés ; B2-A34                  |
| CR-019 | Détail programme     | ouvrir un programme détenu                           | semaines et séances affichées                                   | test service + E2E              | Exécuté - Détail réel, 2 semaines et séance 2-1 de 20 min ; B2-A25                                              |
| CR-020 | Onglets semaines     | flèches, Home, End, clic                             | sélection/focus conformes au pattern tabs                       | test composant + manuel clavier | Exécuté - `ArrowRight`, `Home`, `End` exécutés ; B2-A25                                                         |
| CR-021 | Supprimer programme  | confirmer puis simuler aussi une erreur              | suppression réelle ; erreur visible sans fermer la confirmation | test composant + E2E/API        | Exécuté - Suppression production historique et erreur 500 contrôlée avec confirmation maintenue ; B2-A25/B2-A34 |

## Séances, Timer et journalisation

| ID     | Fonctionnalité                | Préconditions et actions                    | Résultat attendu                                              | Preuve prévue                     | Statut                                                                                           |
| ------ | ----------------------------- | ------------------------------------------- | ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| CR-022 | Liste personnelle             | deux comptes avec séances                   | liste filtrée par utilisateur                                 | test PostgreSQL multi-utilisateur | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-023 | Accès séance d'autrui         | compte A ouvre l'ID du compte B             | API 403 sans contenu ; UI n'affiche pas une fausse 404 réseau | test PostgreSQL/API               | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-024 | ID invalide                   | appeler détail/suppression avec ID non UUID | 400, jamais erreur PostgreSQL 500                             | tests controllers                 | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-025 | Démarrer Timer                | séance minutée, cliquer démarrer            | deadline initialisée, décompte visible                        | test composant                    | Exécuté - Décompte réel observé en production et tests verts, B2-A25                                    |
| CR-026 | Pause/reprise                 | laisser tourner, pause, attendre, reprendre | pause exclue du temps actif et du décompte                    | test Timer avec horloge simulée   | Exécuté - Valeurs stables pendant 2,2 s de pause puis reprise réelle, B2-A25                            |
| CR-027 | Onglet ralenti                | avancer l'horloge de plusieurs secondes     | décompte recalé sur deadline, sans dérive cumulative          | test Timer                        | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-028 | Passage de phase              | laisser une phase atteindre zéro            | phase suivante annoncée et démarrée                           | test Timer                        | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-029 | Plein écran Timer             | ouvrir, Tab/Shift+Tab, Échap                | dialogue nommé, focus contenu/restreint puis restauré         | test composant + manuel           | Exécuté - Défaut reproduit sur `rc.2`, corrigé ; focus `BUTTON Pause` sur `rc.3`, B2-A25                |
| CR-030 | Fin de séance                 | terminer et enregistrer effort/feedback     | journal créé avec durée active                                | test composant/service/DB         | Exécuté - Durée active 487 s vérifiée localement et journal créé en production ; B2-A34                 |
| CR-031 | Ownership journal workout     | utiliser workout d'un autre compte          | 403 et aucune insertion                                       | test service + PostgreSQL         | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-032 | Ownership journal programme   | utiliser programme d'un autre compte        | 403 et aucune insertion                                       | test service + PostgreSQL         | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-033 | Métadonnées falsifiées        | envoyer titre/sport/durée différents        | valeurs serveur dérivées de la ressource détenue              | test service + DB                 | Automatisé - Automatisé, CI finale verte                                                                   |
| CR-034 | Notes de douleur              | enregistrer une note facultative            | stockage lié au compte et information confidentialité visible | recette UI + DB                   | Exécuté - Stockage propriétaire PostgreSQL, page Confidentialité et saisie production vérifiés ; B2-A34 |
| CR-035 | Suppression séance accessible | confirmer, annuler, Échap, erreur API       | focus géré, annulation sûre, erreur visible                   | test composant + manuel           | Exécuté - Annulation, Échap, restauration du focus et panne API avec dialogue maintenu ; B2-A25/B2-A34  |

## Paramètres et dashboard

| ID     | Fonctionnalité      | Préconditions et actions     | Résultat attendu                                               | Preuve prévue            | Statut                                                                                                 |
| ------ | ------------------- | ---------------------------- | -------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| CR-036 | Lire paramètres     | compte actif                 | fournisseur OpenAI serveur et modèle courant affichés          | test API/Web + E2E       | Exécuté - OpenAI serveur et GPT-5.4 mini observés en production, B2-A25                                       |
| CR-037 | Enregistrer modèle  | choisir un modèle autorisé   | valeur persistée et confirmation                               | test controller/DB + E2E | Exécuté - Modèle changé et relu en production, puis valeur initiale restaurée ; B2-A34                        |
| CR-038 | Modèle non autorisé | envoyer valeur arbitraire    | 400, aucune persistance                                        | test controller          | Exécuté - Défaut reproduit et allowlist API ajoutée ; valeur arbitraire rejetée 400 sans persistance ; B2-A34 |
| CR-039 | Panne settings      | API indisponible             | erreur explicite, pas de faux défaut présenté comme enregistré | test server-api/page     | Automatisé - Automatisé, CI finale verte                                                                         |
| CR-040 | Dashboard vide      | aucun journal                | état vide compréhensible                                       | test rendu/E2E           | Exécuté - État vide déterministe, explication et CTA `/generate` vérifiés ; B2-A34                            |
| CR-041 | Dashboard alimenté  | plusieurs journaux du compte | totaux/durée/effort/feedback exacts et isolés                  | test PostgreSQL + E2E    | Exécuté - Totaux déterministes et isolation PostgreSQL, puis compteur production `3 → 4` ; B2-A34             |

## Sécurité

| ID     | Fonctionnalité       | Préconditions et actions                               | Résultat attendu                                                 | Preuve prévue           | Statut                                                                                                 |
| ------ | -------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| CR-042 | Chaîne SQL-like      | saisir `'; DROP TABLE workouts; --` comme texte valide | chaîne traitée comme donnée ; requête paramétrée ; table intacte | test PostgreSQL         | Exécuté - Insérée et relue comme donnée sur PostgreSQL 16.14 ; table requêtable et cleanup vérifié ; B2-A35   |
| CR-043 | XSS                  | saisir balise script dans un champ accepté             | aucun script exécuté au rendu                                    | Playwright navigateur   | Exécuté - Charges `script` et `img onerror` inertes en React et Chromium/Firefox ; B2-A35                     |
| CR-044 | API sans secret      | appeler une route privée sans secret                   | 401                                                              | test middleware + curl  | Automatisé - Automatisé, CI finale verte                                                                         |
| CR-045 | Secret non exposé    | inspecter HTML, JS et réseau navigateur                | aucune clé OpenAI ni secret interservice                         | build + navigateur      | Exécuté - HTML et 9 scripts de production inspectés : 0 marqueur de secret ou clé longue ; B2-A35             |
| CR-046 | CORS hostile         | requête avec origine non autorisée                     | absence d'autorisation CORS                                      | curl automatisé         | Exécuté - Origine hostile refusée localement et en production ; origine officielle seule autorisée ; B2-A35   |
| CR-047 | Headers/CSP          | inspecter réponse production                           | headers présents ; `unsafe-eval` absent en production            | test headers/curl       | Exécuté - CSP/HSTS/headers contrôlés en production ; `unsafe-eval` absent, `unsafe-inline` documenté ; B2-A35 |
| CR-048 | Rate limit local     | dépasser quota dans un processus                       | 429 et `Retry-After`                                             | test middleware         | Automatisé - Automatisé, CI finale verte                                                                         |
| CR-050 | Audit dépendances    | lancer audit sur lockfile final                        | aucune vulnérabilité connue au niveau `low`                      | B2-A39                  | Exécuté - `rc.4` : cinq avis corrigés, audit `low` propre ; lint, types, 239 tests et builds verts localement et en CI ; CD et production vérifiés. |

### Risque architectural associé — hors comptage de la recette

| ID | Risque | État réel | Décision et preuve |
| -- | ------ | --------- | ----------------- |
| CR-049 | Le rate limit en mémoire n'est pas global entre plusieurs instances serverless. | Non implémenté et non exécuté avec un store partagé. | Risque accepté pour le prototype ; le 429 local de CR-048 ne prouve pas un quota distribué. Industrialisation : store partagé et test multi-instance. |

## Accessibilité RGAA 4.1.2 / WCAG 2.1 AA

| ID     | Fonctionnalité          | Préconditions et actions                                          | Résultat attendu                                          | Preuve prévue                      | Statut                                                                                                                                                            |
| ------ | ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-051 | Pages publiques         | axe complet sur `/` et `/login`                                   | aucune violation applicable non traitée                   | Playwright/axe                     | Exécuté localement puis en CI finale sur le périmètre public ; ne vaut pas audit RGAA manuel                                                                              |
| CR-052 | Pages authentifiées     | axe sur generate, programmes, listes, détail, dashboard, settings | aucune violation applicable non traitée                   | Playwright avec vrai storage state | Exécuté - Cinq pages privées auditées sans violation de contraste axe, arbre AX contrôlé ; `/programs/generate` contre-vérifié ; B2-A36                                  |
| CR-053 | Clavier                 | parcourir navigation, formulaires, tabs, suppressions, Timer      | toutes actions atteignables, ordre/focus cohérents        | audit navigateur + tests composants | Exécuté - Cycle Tab complet et focus perceptible sur 3 pages publiques et 5 privées ; annulation de suppression avec restitution du focus ; focus du premier champ invalide et 3/3 relations d'onglets contre-recettés en production ; B2-A25/B2-A36/B2-A40 |
| CR-054 | Reflow/mobile           | 320 px CSS et viewport mobile                                     | aucune perte d'information/action ni scroll 2D injustifié | captures + audit manuel            | Exécuté - Reflow 640/320 px sur 3 pages publiques et 5 privées, plus `/programs/generate`, sans débordement ; B2-A36                                                     |
| CR-055 | Zoom/contraste/annonces | zoom 200/400 %, contraste, lecteur d'écran                        | contenu lisible et annonces compréhensibles               | grille RGAA + transcription NVDA   | Exécuté - Résultats disponibles sur l'échantillon : rejeu `rc.4` 33/33, zoom 16/16, zéro violation axe et contrastes 166/166 décidés ; campagne NVDA détaillée, correctifs publiés dans `rc.5`, puis contre-recette déclarée validée. Ne vaut pas conformité RGAA exhaustive ; B2-A37/A40/A41. |

## Qualité, intégration et déploiement

| ID     | Fonctionnalité            | Préconditions et actions                                                 | Résultat attendu                                                                    | Preuve prévue       | Statut                                                                                                            |
| ------ | ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| CR-056 | Tests et couvertures      | lancer `pnpm test:coverage`                                              | API/Web/PostgreSQL/shared mesurés séparément ; exclusions expliquées                | rapports CI         | Exécuté - CI `29819423534` verte ; quatre rapports publiés, dont shared 100 % lignes/statements/fonctions                |
| CR-057 | PostgreSQL réel           | PostgreSQL 16 et migrations, puis tests repositories/ownership sans skip | tests et couverture d'intégration réussis                                           | B2-A19 + rapport CI | Exécuté - 8/8 locaux sur `69b21ef-dirty`, puis job PostgreSQL final vert dans `29742672052`                              |
| CR-058 | Qualité/build             | lint, typecheck, build sous Node 24                                      | toutes commandes réussies                                                           | logs CI + B2-A39/A41 | Exécuté - `rc.5` : lint, types, 241 tests et builds verts localement et dans la CI `29930722308`                         |
| CR-059 | Docker                    | construire API/Web et contrôler la procédure migrate/seed                | images Node 24 non-root ; migrate/seed fonctionnels                                 | CI + B2-A22         | Exécuté - Images finales construites en CI ; migrate/seed validés localement ; clone vierge non archivé                  |
| CR-060 | Readiness API             | DB/clé disponibles puis indisponibles                                    | 200 prêt ; 503 avec dépendance défaillante                                          | tests route + curl  | Exécuté - Cas automatisés verts ; readiness production 200, DB/IA `ok`                                                   |
| CR-061 | CI complète               | pousser le SHA final                                                     | tous les jobs obligatoires verts                                                    | run GitHub          | Exécuté - Run final `29930722308` réussi sur `c63439e`                                                                   |
| CR-062 | CD sans contournement     | CI échoue puis réussit                                                   | aucun déploiement après échec ; déploiement après succès                            | runs GitHub + B2-A38 | Exécuté - Fermé sans toucher à `main` : CI courante `29856584668` rouge sur PR isolée, quatre jobs aval ignorés, aucun run CD associé et inventaires Vercel production API/Web identiques avant/après ; politique YAML 6/6. Chemin vert `29845956008` → `29846343559`. Limite : aucun commit volontairement rouge sur `main`. |
| CR-063 | Version immuable          | construire le paquet depuis un état Git propre et vérifier PDF, source, SHA et empreintes | build refusé si fichiers suivis modifiés ; PDF principal ≤ 30 pages ; livrables de premier niveau présents ; archive et PDF anonymisés ; SHA-256 consignés | `build_bloc2_delivery_pack.py` + manifeste | Exécuté - Vérifié sur `rc.5` : paquet généré avec B2-A41 ; limite des 30 pages respectée ; deux PDF inspectés ; anonymisation validée ; ZIP décompressé et empreintes comparées. Le `MANIFESTE.txt` de la dernière génération fait foi. |
| CR-064 | Production API/Web        | déployer le SHA final                                                    | liveness/readiness/Web en 200                                                       | curl daté           | Exécuté - CD finale `29931146789`, HTTP 200 `rc.5`, DB et configuration IA `ok`                                          |
| CR-065 | Parcours post-déploiement | login, séance, programme, Timer, journal, dashboard                      | parcours complet sans erreur                                                        | recette production  | Exécuté - Session OAuth, Programmes, Timer, effort/feedback/douleur, journal et dashboard `3 → 4` en production ; B2-A34 |

## Critère de clôture C2.3.1

Les 59 scénarios de recette sont reliés à une preuve ou à une réserve explicite.
CR-063 est validé par la construction, l'inspection, la
décompression et la comparaison des empreintes du paquet `rc.5`.
CR-055 réunit les mesures, la campagne technique, le déploiement `rc.5` et la
contre-recette NVDA déclarée validée. CR-062 combine une CI rouge
courante isolée, un inventaire Vercel avant/après et six tests de politique.
CR-049 demeure un risque architectural hors dénominateur. Les tests
Vitest/Playwright ne sont pas présentés comme un audit RGAA exhaustif.
