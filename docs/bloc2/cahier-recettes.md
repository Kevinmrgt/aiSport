# Cahier de recettes — Alcide

> Bloc 2 RNCP39583 — C2.3.1, compétence éliminatoire
> Version reconstruite : 2026-07-20
> Version finale à rattacher au SHA et au tag du manifeste de dépôt

## Règles de preuve

| Code | Signification |
|---|---|
| ✅ Exécuté | scénario exécuté sur la version candidate, résultat et preuve conservés |
| 🧪 Automatisé à figer | test présent ; résultat à rejouer sur le SHA final |
| 📎 Historique | preuve obtenue sur une ancienne version, à ne pas assimiler à la version finale |
| ⏳ À exécuter | scénario préparé mais sans preuve suffisante |
| ❌ Échec | résultat différent de l'attendu, anomalie obligatoire |

Une inspection du code n'est pas une exécution. Chaque résultat final doit
indiquer date, environnement, navigateur/runtime, données, testeur ou commande,
artefact et anomalie éventuelle.

## Synthèse de la version candidate

| Élément | Valeur |
|---|---|
| Scénarios inventoriés | 61 |
| Scénarios exécutés sur le SHA final | À RENSEIGNER |
| Scénarios réussis | À RENSEIGNER |
| Scénarios en échec | À RENSEIGNER |
| SHA/tag testé | À RENSEIGNER |
| Environnement | Local/CI Node 24 + PostgreSQL de test, puis production Vercel/Neon |
| Artefacts | preuves locales partielles dans `docs/rncp/bloc2-annexes/` ; pack du SHA final à régénérer |

### Vérification locale non finale du 2026-07-20

| Contrôle | Résultat local | Portée de la preuve |
|---|---|---|
| Tests unitaires API | 86/86 réussis | candidate non commitée ; sortie brute finale non archivée |
| Tests unitaires Web | 39/39 réussis | candidate non commitée ; sortie brute finale non archivée |
| Couverture API | 84,97 % lignes/statements ; 80,40 % branches | périmètre unitaire documenté |
| Couverture Web | 68,07 % lignes/statements ; 77,45 % branches | `app`, `components`, `lib` |
| Playwright public | 48/48 réussis, Chromium et Firefox | sans parcours OAuth réel ; rapport brut final non archivé |
| Recette navigateur publique instrumentée | 12/12 Chromium + 12/12 Firefox | candidate `69b21ef-dirty` ; 320 px, axe ciblé, console/pageerror, clavier et quatre redirections ; B2-A20 |
| PostgreSQL réel | 8/8 réussis ; PostgreSQL 16.14 ; 93,69 % lignes/statements, 80 % branches, 100 % fonctions | candidate `69b21ef-dirty`, Node 24.14.0 ; annexe B2-A19 ; preuve finale CI encore attendue |

Ces résultats facilitent la correction, mais ne renseignent pas les totaux de
recette du SHA final et ne valent pas validation manuelle ou production.

## Authentification et session

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-001 | Connexion Google | Sans session, `/login`, autoriser Google | session créée et redirection vers `/generate` | recette production + capture | 📎 Historique 2026-07-16 |
| CR-002 | Route privée sans session | ouvrir `/generate`, `/workouts`, `/programs`, `/dashboard`, `/settings` | redirection `/login` | Playwright public | Exécution locale partielle réelle : `/generate`, `/workouts`, `/programs`, `/settings` redirigés dans Chromium/Firefox ; `/dashboard` non exécuté |
| CR-003 | Déconnexion | session active, cliquer `Sortir` | session supprimée et retour public | recette production | ⏳ À exécuter |
| CR-004 | Navigation selon session | comparer accueil connecté/déconnecté | liens privés uniquement connecté ; aucun faux nom Google annoncé | capture desktop/mobile | ⏳ À exécuter |

## Génération de séance

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-010 | Séance valide | compte actif, sport/niveau/durée/objectifs valides | réponse créée, sauvegarde, détail affiché | E2E full-stack + production | 📎 Historique 2026-07-16 |
| CR-011 | Sport vide | soumettre sans sport | message relié au champ, aucun appel API | test composant/E2E | 🧪 Automatisé à figer |
| CR-012 | Durée hors limites | saisir une durée invalide | validation client et serveur cohérente | tests schéma/formulaire/controller | 🧪 Automatisé à figer |
| CR-013 | OpenAI indisponible | simuler timeout/429/5xx | erreur claire, aucune donnée incomplète | test service + E2E erreur | 🧪 Automatisé partiel ; E2E à exécuter |
| CR-014 | JSON IA invalide puis valide | première réponse invalide, seconde correcte | retry borné puis succès | test service IA | 🧪 Automatisé à figer |
| CR-015 | Cohérence durée séance | réponse 30 min avec contenu incohérent | rejet et nouvelle tentative/erreur ; cas répétitions pris en charge | tests contrats/service | 🧪 Automatisé à figer |

## Programmes

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-016 | Générer un programme | objectif, niveau, semaines, séances et durée valides | programme créé et affiché | E2E full-stack + production | 📎 Historique 2026-07-16 |
| CR-017 | Structure programme | provoquer semaines/séances manquantes ou n°99 | rejet : quantités et numéros conformes à la demande | tests contrats/service | 🧪 Automatisé à figer |
| CR-018 | Lister et paginer | plusieurs programmes du compte | uniquement ses programmes, pagination correcte | test PostgreSQL + E2E | 🧪 Automatisé partiel |
| CR-019 | Détail programme | ouvrir un programme détenu | semaines et séances affichées | test service + E2E | 🧪 Automatisé partiel |
| CR-020 | Onglets semaines | flèches, Home, End, clic | sélection/focus conformes au pattern tabs | test composant + manuel clavier | 🧪 Automatisé partiel |
| CR-021 | Supprimer programme | confirmer puis simuler aussi une erreur | suppression réelle ; erreur visible sans fermer la confirmation | test composant + E2E/API | 🧪 Automatisé partiel |

## Séances, Timer et journalisation

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-022 | Liste personnelle | deux comptes avec séances | liste filtrée par utilisateur | test PostgreSQL multi-utilisateur | 🧪 Automatisé à figer |
| CR-023 | Accès séance d'autrui | compte A ouvre l'ID du compte B | API 403 sans contenu ; UI n'affiche pas une fausse 404 réseau | test PostgreSQL/API | 🧪 Automatisé à figer |
| CR-024 | ID invalide | appeler détail/suppression avec ID non UUID | 400, jamais erreur PostgreSQL 500 | tests controllers | 🧪 Automatisé à figer |
| CR-025 | Démarrer Timer | séance minutée, cliquer démarrer | deadline initialisée, décompte visible | test composant | 🧪 Automatisé à figer |
| CR-026 | Pause/reprise | laisser tourner, pause, attendre, reprendre | pause exclue du temps actif et du décompte | test Timer avec horloge simulée | 🧪 Automatisé à figer |
| CR-027 | Onglet ralenti | avancer l'horloge de plusieurs secondes | décompte recalé sur deadline, sans dérive cumulative | test Timer | 🧪 Automatisé à figer |
| CR-028 | Passage de phase | laisser une phase atteindre zéro | phase suivante annoncée et démarrée | test Timer | 🧪 Automatisé à figer |
| CR-029 | Plein écran Timer | ouvrir, Tab/Shift+Tab, Échap | dialogue nommé, focus contenu/restreint puis restauré | test composant + manuel | 🧪 Automatisé partiel |
| CR-030 | Fin de séance | terminer et enregistrer effort/feedback | journal créé avec durée active | test composant/service/DB | 🧪 Automatisé partiel |
| CR-031 | Ownership journal workout | utiliser workout d'un autre compte | 403 et aucune insertion | test service + PostgreSQL | 🧪 Automatisé à figer |
| CR-032 | Ownership journal programme | utiliser programme d'un autre compte | 403 et aucune insertion | test service + PostgreSQL | 🧪 Automatisé à figer |
| CR-033 | Métadonnées falsifiées | envoyer titre/sport/durée différents | valeurs serveur dérivées de la ressource détenue | test service + DB | 🧪 Automatisé à figer |
| CR-034 | Notes de douleur | enregistrer une note facultative | stockage lié au compte et information confidentialité visible | recette UI + DB | ⏳ À exécuter |
| CR-035 | Suppression séance accessible | confirmer, annuler, Échap, erreur API | focus géré, annulation sûre, erreur visible | test composant + manuel | 🧪 Automatisé partiel |

## Paramètres et dashboard

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-036 | Lire paramètres | compte actif | fournisseur OpenAI serveur et modèle courant affichés | test API/Web + E2E | 🧪 Automatisé partiel |
| CR-037 | Enregistrer modèle | choisir un modèle autorisé | valeur persistée et confirmation | test controller/DB + E2E | 🧪 Automatisé partiel |
| CR-038 | Modèle non autorisé | envoyer valeur arbitraire | 400, aucune persistance | test controller | ⏳ À automatiser |
| CR-039 | Panne settings | API indisponible | erreur explicite, pas de faux défaut présenté comme enregistré | test server-api/page | 🧪 Automatisé à figer |
| CR-040 | Dashboard vide | aucun journal | état vide compréhensible | test rendu/E2E | ⏳ À exécuter |
| CR-041 | Dashboard alimenté | plusieurs journaux du compte | totaux/durée/effort/feedback exacts et isolés | test PostgreSQL + E2E | 🧪 Automatisé partiel |

## Sécurité

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-042 | Chaîne SQL-like | saisir `'; DROP TABLE workouts; --` comme texte valide | chaîne traitée comme donnée ; requête paramétrée ; table intacte | test PostgreSQL | ⏳ À automatiser et exécuter ; B2-A19 ne couvre pas cette charge |
| CR-043 | XSS | saisir balise script dans un champ accepté | aucun script exécuté au rendu | Playwright navigateur | ⏳ À exécuter |
| CR-044 | API sans secret | appeler une route privée sans secret | 401 | test middleware + curl | 🧪 Automatisé à figer |
| CR-045 | Secret non exposé | inspecter HTML, JS et réseau navigateur | aucune clé OpenAI ni secret interservice | build + navigateur | ⏳ À exécuter |
| CR-046 | CORS hostile | requête avec origine non autorisée | absence d'autorisation CORS | curl automatisé | 📎 Historique ; à rejouer |
| CR-047 | Headers/CSP | inspecter réponse production | headers présents ; `unsafe-eval` absent en production | test headers/curl | ⏳ À exécuter |
| CR-048 | Rate limit local | dépasser quota dans un processus | 429 et `Retry-After` | test middleware | 🧪 Automatisé à figer |
| CR-049 | Rate limit distribué | répartir charge sur plusieurs instances | quota global cohérent | test avec store partagé | ⏳ Non implémenté, risque accepté |
| CR-050 | Audit dépendances | lancer audit sur lockfile final | aucun high/critical ; modérées analysées | rapport brut | 🧪 À rejouer final |

## Accessibilité RGAA 4.1.2 / WCAG 2.1 AA

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-051 | Pages publiques | axe complet sur `/` et `/login` | aucune violation applicable non traitée | Playwright/axe | ✅ Exécuté localement sur `/`, `/login`, `/confidentialite` et 404, Chromium/Firefox : 0 violation pour les tags ciblés ; ne vaut pas audit RGAA manuel |
| CR-052 | Pages authentifiées | axe sur generate, programmes, listes, détail, dashboard, settings | aucune violation applicable non traitée | Playwright avec vrai storage state | ⏳ À exécuter |
| CR-053 | Clavier | parcourir navigation, formulaires, tabs, suppressions, Timer | toutes actions atteignables, ordre/focus cohérents | audit manuel + tests composants | Exécution partielle réelle : skip link sur 3 pages et bouton Google dans Chromium/Firefox ; navigation authentifiée, tabs, suppressions et Timer non audités manuellement |
| CR-054 | Reflow/mobile | 320 px CSS et viewport mobile | aucune perte d'information/action ni scroll 2D injustifié | captures + audit manuel | Exécution partielle réelle : 4 pages publiques, largeur document 320 px dans Chromium/Firefox, 8 captures ; pages authentifiées non exécutées |
| CR-055 | Zoom/contraste/annonces | zoom 200/400 %, contraste, lecteur d'écran | contenu lisible et annonces compréhensibles | grille RGAA manuelle | ⏳ À exécuter |

## Qualité, intégration et déploiement

| ID | Fonctionnalité | Préconditions et actions | Résultat attendu | Preuve prévue | Statut |
|---|---|---|---|---|---|
| CR-056 | Tests et couvertures | lancer `pnpm test:coverage` | API/Web/shared mesurés, exclusions expliquées | rapports bruts | 🧪 Partiel local : API/Web mesurés, shared non isolé ; à figer final |
| CR-057 | PostgreSQL réel | PostgreSQL 16 et migrations, puis tests repositories/ownership sans skip | 8/8 réussis localement ; couverture 93,69 % lignes/statements, 80 % branches, 100 % fonctions | B2-A19 + rapport local | ✅ Exécuté sur `69b21ef-dirty` ; à rejouer en CI finale |
| CR-058 | Qualité/build | lint, typecheck, build sous Node 24 | toutes commandes réussies | logs bruts | 🧪 À figer final |
| CR-059 | Docker | démarrer postgres, migrate, seed, API/Web | commandes documentées fonctionnent depuis clone neuf | log Docker | 🧪 Partiel réel : images, runtimes, migrate et seed validés sur l'arbre local ; clone neuf non exécuté ; B2-A22 |
| CR-060 | Readiness API | DB/clé disponibles puis indisponibles | 200 prêt ; 503 avec dépendance défaillante | tests route + curl | 🧪 Automatisé partiel |
| CR-061 | CI complète | pousser le SHA final | tous les jobs obligatoires verts | run GitHub | ⏳ À exécuter |
| CR-062 | CD sans contournement | CI échoue puis réussit | aucun déploiement après échec ; déploiement après succès | runs GitHub | ⏳ À exécuter |
| CR-063 | Version immuable | comparer package, tag, SHA, health et changelog | mêmes version/SHA partout | manifeste | ⏳ À exécuter |
| CR-064 | Production API/Web | déployer le SHA final | liveness/readiness/Web en 200 | curl daté | 📎 Historique ; à rejouer |
| CR-065 | Parcours post-déploiement | login, séance, programme, Timer, journal, dashboard | parcours complet sans erreur | recette production | ⏳ À exécuter |
| CR-066 | Utilisateur autonome | faire réaliser le parcours sans aide technique | tâche terminée, retours consignés | fiche de test utilisateur | ⏳ À organiser |

## Critère de clôture C2.3.1

Le cahier est clôturé seulement lorsque les 61 scénarios applicables ont un
résultat obtenu sur le SHA final, que tous les échecs sont liés au plan de
correction et que les scénarios non applicables sont justifiés. Un total de
tests Vitest/Playwright ne remplace pas cette traçabilité fonctionnelle.
