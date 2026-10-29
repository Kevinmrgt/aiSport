# Audit qualité et qualification de livraison — 29 octobre 2026

Révision examinée : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`. Responsable : agent QA dédié. Audit statique des suites, workflows, parcours et persistance. Les exécutions globales sont centralisées par le coordinateur : aucun résultat de test exécuté par un autre agent n'est revendiqué ici.

Le candidat est le dépôt aiSport actuel, destiné à `https://www.alcideai.fr`. L'interface publique observée par les autres agents présente encore tarifs et accès jury/bêta absents du candidat ; son SHA n'est pas établi. Les références de code et constats ci-dessous portent donc sur le candidat local, pas sur cette interface distante.

## Conclusion

La base de tests est substantielle et distingue correctement unitaires, PostgreSQL réel et navigateur public. La qualification du parcours principal reste insuffisante pour une ouverture publique : une CI verte ne prouve actuellement ni une génération réelle suivie de sa persistance, ni un OAuth neuf sur la révision livrée. Aucun P0 démontré dans ce périmètre.

P1 : condition à résoudre avant ouverture publique. P2 : amélioration de fiabilité ou de garantie à planifier, dont la décision peut être documentée pour une bêta limitée.

## Constats

### QA-01 — P1 — La recette authentifiée ne couvre pas le service principal de bout en bout

**Preuve.** `.github/workflows/ci.yml:203` lance seulement le smoke public. Le workflow authentifié est déclenché manuellement (`.github/workflows/authenticated-e2e.yml:4`) et lance `pnpm test:e2e:authenticated` à la ligne 62. Sa configuration sélectionne uniquement `generate.spec.ts` (`apps/web/playwright.auth.config.ts:15`). Les six tests du fichier (`apps/web/tests/e2e/generate.spec.ts:51`, 57, 73, 81, 91, 105) vérifient affichage, labels, refus de champs vides, mobile et axe. Aucun ne soumet une génération valide.

La recette métier séparée sélectionne `business-recipes.spec.ts` (`apps/web/playwright.recipes.config.ts:14`). Elle nécessite une séance préexistante et vérifie journalisation/dashboard (`apps/web/tests/e2e/business-recipes.spec.ts:71`), mais n'est appelée par aucun workflow livré. Elle ne produit pas non plus séance/programme depuis un formulaire valide.

**Impact.** Une rupture Web → API → OpenAI → PostgreSQL peut échapper au processus de livraison, malgré des tests unitaires réussis. L'isolation est testée au niveau repository, mais aucune recette navigateur à deux comptes ne garantit l'assemblage OAuth et identité sur l'environnement livré.

**Action / responsable.** QA + développement : établir une recette de release sur un environnement et des comptes de test dédiés. Couvrir génération de séance et programme, rechargement/persistance, liste/détail, timer/journal/dashboard, suppression, refus d'accès entre deux utilisateurs, panne IA et reprise. Exécuter la recette métier existante en complément. Associer les résultats au SHA du Web et de l'API ; utiliser un budget de génération explicitement borné.

**Acceptation.** Rapport daté sur les deux révisions effectivement servies, aucun scénario critique ignoré, données de recette nettoyées, échec d'un scénario critique empêchant la décision d'ouverture. La création des tests ne suffit pas : leur exécution réelle doit être enregistrée.

### QA-02 — P2 — Le test PostgreSQL de sécurité existe mais n'est exécuté par aucune étape de CI

**Preuve.** `apps/api/vitest.config.ts:7` exclut tous les `*.integration.test.ts`. La configuration d'intégration appelée par CI inclut uniquement `tests/repositories.integration.test.ts` (`apps/api/vitest.integration.config.ts:7`, `.github/workflows/ci.yml:115`). Le test d'injection SQL persistée est dans `apps/api/tests/security.integration.test.ts:30` et possède sa configuration distincte (`apps/api/vitest.security.config.ts:7`), absente des commandes de CI. Le job nommé « Security audit » lance l'audit de dépendances (`.github/workflows/ci.yml:261`), pas cette suite applicative.

**Impact.** Ce contrôle peut régresser sans faire échouer la CI. Ce constat ne démontre aucune injection exploitable ; l'utilisation de Drizzle et les tests repositories restent des garanties positives distinctes.

**Action / responsable.** QA + responsable CI : ajouter l'exécution du config sécurité avec la base PostgreSQL éphémère déjà présente, ou inclure explicitement cette suite dans une configuration d'intégration commune.

**Acceptation.** Le test apparaît exécuté, non ignoré, dans une CI de la révision candidate ; une assertion volontairement dégradée fait échouer la tâche dans une branche de vérification.

### QA-03 — P2 — Les écritures métier ne disposent pas d'une identité d'opération permettant une reprise fiable

**Preuve.** La génération appelle le fournisseur puis insère une ressource (`apps/api/src/services/workout.service.ts:23`, `apps/api/src/services/program.service.ts:22`). Chaque journal est inséré sans clé d'idempotence (`apps/api/src/repositories/session-log.repository.ts:44`). Le schéma du journal ne contient qu'un UUID nouvellement généré et des index de consultation (`apps/api/src/db/schema.ts:105`, 142). Le formulaire désactive bien le bouton pendant la sauvegarde et après succès (`apps/web/components/SessionCompletionForm.tsx:183`), mais après une erreur réseau l'utilisateur peut réessayer ; aucun identifiant d'opération stable n'est transmis (`apps/web/components/SessionCompletionForm.tsx:48`).

**Impact.** Si la première écriture réussit puis que sa réponse est perdue, une nouvelle soumission peut créer un deuxième journal et compter deux séances ; une génération répétée peut également créer une seconde ressource et consommer un second appel. Risque déduit du code, sans reproduction réseau distante pendant cet audit. Réaliser volontairement deux séances du même entraînement doit rester possible.

**Action / responsable.** Backend + frontend : créer un identifiant par opération utilisateur, le conserver pour les tentatives de la même opération et imposer son unicité par utilisateur côté base. Pour une génération, enregistrer l'état de l'opération et son résultat afin de récupérer un succès dont la réponse a été perdue.

**Acceptation.** Tests PostgreSQL avec deux requêtes concurrentes de même clé et test de réponse perdue : un seul journal ou résultat, un incrément statistique ; une nouvelle opération distincte reste autorisée.

### QA-04 — P2 — La validation d'une session existante ne prouve pas une nouvelle connexion Google

**Preuve.** La suite restaure des cookies depuis un secret (`.github/workflows/authenticated-e2e.yml:50`) et vérifie `/api/auth/session` (`apps/web/tests/e2e/generate.spec.ts:43`). Cette démarche vérifie une session Auth.js réellement émise et son identité ; elle ne parcourt pas l'écran Google, le consentement et le callback lors de l'exécution. Le document `docs/testing-authenticated-e2e.md` explique honnêtement que la capture OAuth se fait avec un navigateur isolé.

**Impact.** Une session encore valide peut masquer un changement de client Google, de mode de publication ou d'URL de callback empêchant les nouveaux utilisateurs de se connecter.

**Action / responsable.** QA + propriétaire OAuth : conserver la suite par cookies et ajouter une recette humaine de connexion neuve, consentement, retour, déconnexion et nouvelle connexion sur l'origine finale, avec compte autorisé distinct d'un administrateur du projet.

**Acceptation.** Date, origine, révision et identité du compte de test contrôlée sans publier de données personnelles ni cookies ; parcours réussi depuis un profil isolé sans session Alcide préexistante.

### QA-05 — P2 — La recette d'accessibilité historique ne vaut pas validation du candidat actuel

**Preuve.** `docs/accessibility.md:22` situe les campagnes précédentes en juillet 2026 et précise qu'elles ne valident pas une nouvelle version. Les annonces de succès après suppression et de destination après déconnexion restent à contre-recetter (`docs/accessibility.md:26`). Les suites publiques axe ne suffisent pas à valider ces transitions privées avec lecteur d'écran.

**Action / responsable.** QA accessibilité : contre-recette NVDA/clavier de suppression, déconnexion et retour du focus ; vérifier les parcours privés, mobile, zoom 200/400 %, et états d'erreur sur la révision candidate.

**Acceptation.** Preuves associant navigateur, technologie d'assistance, page/état, résultat observé et anomalies restantes. Toute revendication de conformité doit rester proportionnée au périmètre réellement vérifié.

### QA-06 — P2 — Le smoke sur serveur de développement n'est pas fiable ; échec non reproduit sur le build de production

**Exécution réelle par le coordinateur.** Le smoke public du candidat termine avec 48 tests réussis sur 50. Le test `apps/web/tests/e2e/auth.spec.ts:45` échoue dans Chromium et Firefox : après navigation vers `/workouts/some-workout-id`, l'URL reste celle du détail au lieu de rejoindre `/login`. L'assertion dispose de 15 secondes et le test atteint sa limite de 30 secondes. Les autres contrôles du smoke réussissent.

**Reproduction ciblée ultérieure, serveur de développement et un seul worker.** Chromium échoue encore (37 secondes) ; Firefox réussit en 16,5 secondes. Le journal Chromium indique qu'une navigation vers `http://localhost:3000/login` est en cours mais ne se termine pas avant l'expiration du test. L'échec initial Firefox reste dans le bilan ; sa réussite ciblée ne transforme pas le smoke complet en réussite.

**Contrôle du build de production par le coordinateur.** Après reconstruction Web réussie, `next start` sur `127.0.0.1:3006`, sans modification du code : Chromium redirige `/workouts/some-workout-id` vers `/login` en 1 513 ms et `/generate` en 741 ms ; Firefox réussit les mêmes contrôles en 1 947 ms et 813 ms. Soit quatre contrôles réussis sur quatre. La régression d'authentification du build de production n'est donc pas reproduite. Ces quatre contrôles ciblés ne remplacent pas une exécution réussie de l'ensemble du smoke. Voir `validation.md` pour le bilan consolidé.

**Preuve examinée par cet agent.** `apps/web/test-results/auth-Protection-des-routes-f5844-ige-vers-login-sans-session-chromium/error-context.md` conserve le timeout, l'URL et un instantané montrant le shell anonyme, le lien de connexion et le squelette « Chargement de l'entrainement en cours... ». Le coordinateur conserve également le résultat Firefox et les captures. Ces fichiers générés sont ignorés par Git ; le résultat agrégé est consigné dans `validation.md`.

**Portée.** Le code de `apps/web/app/workouts/[id]/page.tsx:23` attend les paramètres, appelle `auth()`, puis redirige avant tout appel de lecture de séance. Ce `redirect` est hors du bloc `try/catch` suivant. L'instantané ne montre aucune donnée privée. L'échec concerne la qualification avec le serveur de développement ; il ne démontre pas un contournement d'authentification ni une fuite. L'écart avec `next start` oriente vers l'environnement de développement ou sa compilation à froid, mais la cause exacte n'est pas prouvée. La priorité devient P2, fiabilité des tests, sur la base de ce contrôle complémentaire.

**Action / responsable.** Frontend + QA : stabiliser le smoke avec une cible construite comme la production, ou isoler sa dépendance au démarrage/à la compilation du serveur de développement par les journaux serveur et erreurs/réseau navigateur. Tester un identifiant synthétique UUID en complément de la valeur volontairement arbitraire du smoke. Préserver le contrôle d'authentification ; ne pas simplement supprimer le test ou relâcher l'attente.

**Acceptation.** Sans session, une navigation directe vers le détail rejoint la connexion dans Chromium et Firefox sans rester sur un chargement ; aucune lecture protégée ne précède l'authentification. Smoke complet réussi sur le candidat final, puis recette de la même route sur l'origine livrée avec révisions connues.

## Garanties positives observées

- La CI impose lint, types, tests avec couverture, build, smoke Chromium/Firefox, construction Docker et audit de dépendances ; pas de `continue-on-error` relevé dans ces workflows.
- Les tests repositories utilisent une vraie base PostgreSQL éphémère en CI, des comptes distincts et un nettoyage ciblé. Ils couvrent persistance, accès propriétaire, refus d'accès croisé, listes/statistiques et journaux (`apps/api/tests/repositories.integration.test.ts:83`, 96, 143, 156, 213, 232, 268).
- Couvertures unitaire et repository disposent de périmètres et seuils distincts ; le commentaire de `apps/api/vitest.config.ts:10` évite de présenter la couverture unitaire comme couverture globale.
- Les erreurs et indisponibilités IA possèdent des tests dédiés (`apps/api/tests/ai-unavailability-recipes.test.ts`), le timer des tests d'interaction, et les formulaires des contrôles de validation et accessibilité.
- Les suites de recette refusent une identité de compte inattendue. Le workflow authentifié nettoie le fichier de session et désactive les traces pour limiter la diffusion de cookies.

## Limites et reprise

Aucun appel IA payant, aucune mutation en production, aucun test PostgreSQL sur une base utilisateur, aucun changement de code n'a été effectué par cet agent. Aucun chiffre de couverture actuel n'est affirmé sans résultat d'exécution. Les tests d'intégration sont ignorés sans `TEST_DATABASE_URL` (`apps/api/tests/repositories.integration.test.ts:8`) ; une exécution locale verte sans cette variable ne prouve donc rien sur PostgreSQL. Les suites E2E génériques ignorent leurs scénarios authentifiés sans `PLAYWRIGHT_AUTH_STORAGE` ; utiliser le préflight et vérifier le nombre de scénarios exécutés. Les résultats globaux, la disponibilité distante et les versions réellement servies doivent être joints par le coordinateur.

Complément transmis par le coordinateur après cette revue : lint, types et build réussis ; 242 tests unitaires (Shared 14, API 170, Web 58), 18 tests de politiques, 8 tests repositories PostgreSQL et 1 test de sécurité PostgreSQL réussis, sans scénario SQL ignoré. Voir `validation.md` pour les commandes, périmètres, couvertures et le résultat final du smoke navigateur. L'exécution explicite du test SQL de sécurité pendant cet audit confirme son succès local ; elle ne corrige pas son absence du workflow CI constatée en QA-02. Ces résultats ne lèvent pas QA-01 ni ne prouvent le SHA public.
