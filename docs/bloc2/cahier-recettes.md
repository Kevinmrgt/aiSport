# Cahier de recettes — Alcide

> Bloc 2 RNCP39583 — C2.3.1, compétence éliminatoire
> Version consolidée : 2026-07-21
> Baseline applicative déployée : `ac02d219802614d1da4064e542f8de6c5487e5eb`.
> Complément de preuves techniques : `81b2b0bd6afa0cf3a33cca6d7ee045ae5808709d`.
> Le tag de remise `rncp-bloc2-2026-07-21` sera créé après fusion et contrôle de `main`.

## Règles de preuve

| Code          | Signification                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| ✅ Exécuté    | scénario exécuté sur la version candidate, résultat et preuve conservés                              |
| 🧪 Automatisé | test présent et exécuté dans la CI finale ; preuve fonctionnelle individuelle à relier si nécessaire |
| 📎 Historique | preuve obtenue sur une ancienne version, à ne pas assimiler à la version finale                      |
| ⏳ À exécuter | scénario préparé mais sans preuve suffisante                                                         |
| ❌ Échec      | résultat différent de l'attendu, anomalie obligatoire                                                |

Une inspection du code n'est pas une exécution. Chaque résultat final doit
indiquer date, environnement, navigateur/runtime, données, testeur ou commande,
artefact et anomalie éventuelle.

## Synthèse de la version candidate

| Élément                             | Valeur                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scénarios inventoriés               | 60                                                                                                                             |
| Scénarios exécutés sur le SHA final | Gel Git à confirmer après CI/CD ; chaque scénario possède désormais un résultat ou une limite reliée au plan de correction     |
| Scénarios réussis                   | Non convertis en pourcentage : 170 tests API, 55 Web, 14 shared, 9 PostgreSQL RNCP et les parcours authentifiés sont détaillés |
| Scénarios en échec                  | Quatre écarts ont été reproduits sur `rc.2`, corrigés puis contre-recettés sur `rc.3` ; aucune gate CI/CD finale en échec      |
| SHA/tag testé                       | baseline `ac02d219802614d1da4064e542f8de6c5487e5eb` ; compléments `81b2b0bd6afa0cf3a33cca6d7ee045ae5808709d`                   |
| Environnement                       | Local/CI Node 24 + PostgreSQL de test, puis production Vercel/Neon                                                             |
| Artefacts                           | annexes finales A20 et A25 à A31, rapports CI, captures authentifiées et paquet de remise daté du 2026-07-21                   |

### Campagne de fermeture des risques éliminatoires du 2026-07-21

| Lot                         | Résultat exécuté                                                                                                    | Preuve |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Métier et erreurs           | 9/9 API ciblés, 9/9 Web ciblés, 170/170 API, 55/55 Web, 8/8 PostgreSQL et parcours production CR-065 réussi         | B2-A34 |
| Sécurité                    | 6/6 API, 1/1 PostgreSQL réel, 1/1 rendu XSS, 6/6 Playwright Chromium/Firefox, audit propre et production inspectée  | B2-A35 |
| Accessibilité automatisable | 33/33 Playwright production authentifiée et 2/2 tests de structure ; 3 publiques et 5 privées, plus contre-contrôle | B2-A36 |

Les correctifs CR-038, confirmation de journalisation et hiérarchie des titres
sont validés dans la candidate locale. Leur présence en production sera
attribuée seulement après passage par la CI/CD. CR-055 reste partiel pour les
trois vérifications humaines décrites dans B2-A36 ; cette limite n'est pas
transformée en fausse conformité RGAA.

### Compléments automatisés du 2026-07-21

| Contrôle                     | Résultat                   | Preuve et limite                                                                                                                         |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CI du complément             | Succès des six jobs        | run `29819423534` : lint/typecheck, audit, 155 tests API, 43 Web, 14 shared, couvertures, PostgreSQL, Playwright public, build et Docker |
| Playwright authentifié local | 6/6                        | session OAuth réelle locale non versionnée ; génération, mobile 390 × 844, débordement horizontal et axe critique/sérieux                |
| Playwright authentifié CI    | 6/6                        | run `29820498452` : session dédiée restaurée depuis GitHub Secrets, puis supprimée du runner                                             |
| Performance production       | 150/150 réponses valides   | B2-A29 : 50 requêtes par endpoint, p95 de 267,11 à 508,63 ms ; mesure ponctuelle, pas un test de charge                                  |
| Prototype authentifié        | Desktop et mobile capturés | B2-A30 ; aucune adresse personnelle ou donnée de recette visible                                                                         |
| Couverture shared            | 14/14                      | B2-A31 : 100 % lignes/statements/fonctions et 92,85 % branches sur les schémas partagés                                                  |

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
| CR-049 | Rate limit distribué | répartir charge sur plusieurs instances                | quota global cohérent                                            | test avec store partagé | ⏳ Non implémenté, risque accepté                                                                      |
| CR-050 | Audit dépendances    | lancer audit sur lockfile final                        | aucune vulnérabilité connue au niveau `low`                      | rapport CI + B2-A23     | ✅ Exécuté localement et dans la CI finale : audit propre                                              |

## Accessibilité RGAA 4.1.2 / WCAG 2.1 AA

| ID     | Fonctionnalité          | Préconditions et actions                                          | Résultat attendu                                          | Preuve prévue                      | Statut                                                                                                                                                            |
| ------ | ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-051 | Pages publiques         | axe complet sur `/` et `/login`                                   | aucune violation applicable non traitée                   | Playwright/axe                     | ✅ Exécuté localement puis en CI finale sur le périmètre public ; ne vaut pas audit RGAA manuel                                                                   |
| CR-052 | Pages authentifiées     | axe sur generate, programmes, listes, détail, dashboard, settings | aucune violation applicable non traitée                   | Playwright avec vrai storage state | ✅ Cinq pages privées auditées sans violation de contraste axe, arbre AX contrôlé ; `/programs/generate` contre-vérifié ; B2-A36                                  |
| CR-053 | Clavier                 | parcourir navigation, formulaires, tabs, suppressions, Timer      | toutes actions atteignables, ordre/focus cohérents        | audit manuel + tests composants    | ✅ Cycle Tab complet et focus perceptible sur 3 pages publiques et 5 privées ; dialogues/Timer couverts séparément ; B2-A25/B2-A36                                |
| CR-054 | Reflow/mobile           | 320 px CSS et viewport mobile                                     | aucune perte d'information/action ni scroll 2D injustifié | captures + audit manuel            | ✅ Reflow 640/320 px sur 3 pages publiques et 5 privées, plus `/programs/generate`, sans débordement ; B2-A36                                                     |
| CR-055 | Zoom/contraste/annonces | zoom 200/400 %, contraste, lecteur d'écran                        | contenu lisible et annonces compréhensibles               | grille RGAA manuelle               | 🧪 Partiel documenté : proxy 200/400 %, ratios 17,36:1/8,19:1, alertes et arbre AX réussis ; zoom UI, composites et vrai lecteur d'écran restent humains ; B2-A36 |

## Qualité, intégration et déploiement

| ID     | Fonctionnalité            | Préconditions et actions                                                 | Résultat attendu                                                                    | Preuve prévue       | Statut                                                                                                            |
| ------ | ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| CR-056 | Tests et couvertures      | lancer `pnpm test:coverage`                                              | API/Web/PostgreSQL/shared mesurés séparément ; exclusions expliquées                | rapports CI         | ✅ CI `29819423534` verte ; quatre rapports publiés, dont shared 100 % lignes/statements/fonctions                |
| CR-057 | PostgreSQL réel           | PostgreSQL 16 et migrations, puis tests repositories/ownership sans skip | tests et couverture d'intégration réussis                                           | B2-A19 + rapport CI | ✅ 8/8 locaux sur `69b21ef-dirty`, puis job PostgreSQL final vert dans `29742672052`                              |
| CR-058 | Qualité/build             | lint, typecheck, build sous Node 24                                      | toutes commandes réussies                                                           | logs CI             | ✅ Exécuté dans `29742672052`                                                                                     |
| CR-059 | Docker                    | construire API/Web et contrôler la procédure migrate/seed                | images Node 24 non-root ; migrate/seed fonctionnels                                 | CI + B2-A22         | ✅ Images finales construites en CI ; migrate/seed validés localement ; clone vierge non archivé                  |
| CR-060 | Readiness API             | DB/clé disponibles puis indisponibles                                    | 200 prêt ; 503 avec dépendance défaillante                                          | tests route + curl  | ✅ Cas automatisés verts ; readiness production 200, DB/IA `ok`                                                   |
| CR-061 | CI complète               | pousser le SHA final                                                     | tous les jobs obligatoires verts                                                    | run GitHub          | ✅ Run `29747228594` réussi sur `3a21e3b`                                                                         |
| CR-062 | CD sans contournement     | CI échoue puis réussit                                                   | aucun déploiement après échec ; déploiement après succès                            | runs GitHub         | 🧪 Chemin de succès et chaînage `workflow_run` prouvés ; scénario d'échec non rejoué pour cette remise            |
| CR-063 | Version immuable          | comparer package, tag, SHA, health et changelog                          | version cohérente et distinction explicite entre SHA applicatif et gel documentaire | manifeste           | ✅ Version `0.13.0-rc.3`, SHA applicatif et futur tag documentaire distingués                                     |
| CR-064 | Production API/Web        | déployer le SHA final                                                    | liveness/readiness/Web en 200                                                       | curl daté           | ✅ CD `29747592571`, HTTP 200 `rc.3` et monitoring `29748032763`                                                  |
| CR-065 | Parcours post-déploiement | login, séance, programme, Timer, journal, dashboard                      | parcours complet sans erreur                                                        | recette production  | ✅ Session OAuth, Programmes, Timer, effort/feedback/douleur, journal et dashboard `3 → 4` en production ; B2-A34 |

## Critère de clôture C2.3.1

Les 60 scénarios sont maintenant renseignés par un résultat exécuté, une limite
ou un risque accepté relié au plan de correction. La clôture du gel final reste
conditionnée au passage des correctifs locaux par la CI/CD et à leur
contre-recette de production. CR-055 conserve en outre trois contrôles humains
explicites ; les tests Vitest/Playwright ne sont pas présentés comme un audit
RGAA exhaustif.
