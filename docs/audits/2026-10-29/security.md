# Audit sécurité et authentification — Alcide

Date : 29 octobre 2026. Révision examinée : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`. Responsable : agent sécurité. Audit du code et vérifications locales, sans modification applicative ni opération distante. Les résultats de tests globaux sont consolidés par le coordinateur.

**Avis : corriger les trois P1 ci-dessous avant une ouverture publique.** Aucun exploit P0 ni accès non autorisé à des données réelles n'a été démontré. La présence d'une dépendance affectée et un défaut de conception sont distingués d'une exploitation reproduite.

| ID     | Priorité | Constat                                                                         | Preuve obtenue                                      | Responsable proposé            |
| ------ | -------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| SEC-01 | P1       | L'identité persistante dépend de l'adresse email, le sujet OAuth est ignoré     | Code et simulation locale du middleware, DB simulée | Backend + authentification     |
| SEC-02 | P1       | Dépendances de production affectées par 20 avis de sécurité                     | Audit pnpm courant transmis par le coordinateur     | Maintenance dépendances        |
| SEC-03 | P1       | Limitation IA locale à un processus et absence de plafond budgétaire persistant | Code des routes, middleware et services             | Backend + exploitation         |
| SEC-04 | P2       | CSP autorisant les scripts inline                                               | Configuration Next.js                               | Frontend sécurité              |
| SEC-05 | P2       | Validation de configuration limitée à la présence de deux variables             | Code du validateur                                  | Exploitation + backend         |
| SEC-06 | P2       | Politique de journaux à durcir pour les données et erreurs techniques           | Appels de journalisation inspectés                  | Exploitation + confidentialité |

## SEC-01 — Lier les données au sujet Google, pas à l'email

**Preuve :** `apps/api/src/middleware/auth.middleware.ts:37` lit `x-user-id`, vérifie uniquement sa présence puis ne l'utilise plus. Les lignes 49–56 font un insert/upsert dont la clé de conflit est `users.email`. `apps/web/lib/server-api.ts:84` transmet pourtant l'identité de session. Le schéma possède une table `accounts` avec `providerAccountId` (`apps/api/src/db/schema.ts:17`), mais ce parcours ne l'emploie pas.

**Reproduction locale effectuée :** exécution du vrai `authMiddleware` avec trois contextes synthétiques ; remplacement en mémoire de `db.insert` par un double reproduisant l'upsert sur email. Aucun appel réseau ou SQL réel. Résultat : `google-sub-A + shared@audit.test → row-1`, `google-sub-B + shared@audit.test → row-1`, puis `google-sub-A + renamed@audit.test → row-2`. Les valeurs réellement transmises à l'insert ne contiennent que `email` et `name`, jamais le sujet Google. Ce test démontre l'identité ignorée ; il ne démontre pas la possibilité d'obtenir deux comptes Google arbitraires avec la même adresse, ni une prise de contrôle réelle.

**Impact :** un changement d'adresse peut séparer un compte de ses données ; une adresse réattribuée à une autre identité peut entraîner une réassociation de données si le fournisseur présente cette adresse. Google précise que l'email peut changer et ne doit pas servir de clé d'identité ; le `sub` est stable. [Documentation Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

**Correction :** conserver une association unique `(provider, providerAccountId/sub) → users.id`. Garantir que l'identifiant transmis correspond au sujet fournisseur stable, puis faire l'upsert sur cette association. Préparer une migration des comptes existants avec une procédure de rapprochement contrôlée ; éviter de relier automatiquement deux identités distinctes sur la seule égalité d'email. L'adresse vérifiée reste un attribut de contact. Vérifier également la politique `email_verified` si l'email sert à autoriser une action.

**Acceptation :** avec PostgreSQL dédié, deux sujets ayant la même adresse ne partagent aucun entraînement ni journal ; un même sujet qui change d'adresse conserve le même `users.id`. Recette OAuth avec deux vrais comptes de test, puis vérification lecture/suppression croisée sur workouts, programmes et journaux. Ne pas qualifier ce point avec des mocks seuls.

## SEC-02 — Qualifier et corriger les dépendances

**Preuve :** le coordinateur a exécuté `pnpm audit --prod --audit-level=low --json` le 29 octobre 2026 : code de sortie 1, **20 avis : 4 critiques, 7 élevés, 9 modérés**. JSON courant consulté par cet agent ; Next.js résolu `15.5.22`, Hono `4.13.2`, Zod `3.25.76`. Ce sont des avis, pas vingt exploitations indépendantes.

Exemples qui exigent une qualification :

- Next.js Server Actions, déni de service : [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). L'application utilise des Server Actions ; la version corrigée annoncée dans l'audit est `15.5.28`.
- Next.js optimisation d'images, RCE SVG : [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw). Version corrigée annoncée `15.5.28` ; chemin vulnérable et restrictions d'images à vérifier. Aucune image malveillante envoyée.
- Zod, épuisement mémoire sur collections contraintes surdimensionnées : [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). L'avis renvoyé annonce `>=4.6.6`, ce qui impose une migration majeure et une recette des contrats, pas un simple remplacement non testé.

**Applicabilité :** l'avis RCE Next.js spécifique à un serveur Windows ne prouve pas un risque identique sur Vercel/Linux. Plusieurs avis Hono portent sur `serveStatic`, `toSSG`, `parseBody` ou JSX, absents des chemins métier inspectés ; ils restent à traiter dans l'inventaire. Les avis d'outillage transitif ne prouvent pas un point d'entrée HTTP. Les versions corrigées citées viennent du registre consulté ce jour ; relancer l'audit avant livraison.

**Correction :** mise à jour compatible de Next/écosystème, Hono et adaptateur Node, qualification des transitives ; migration Zod contrôlée avec contrats partagés. Régénérer le lockfile puis qualifier build, authentification, Server Actions, génération et déploiement.

**Acceptation :** nouvel audit du lockfile livré sans avis bloquant applicable non traité ; toute exception possède une justification d'inapplicabilité vérifiable, un responsable et une échéance. Retrouver ces versions dans les artefacts effectivement déployés. La seule réussite de CI ne clôt pas ce point.

## SEC-03 — Borner l'abus et le budget IA entre instances

**Preuve :** `apps/api/src/middleware/rate-limit.middleware.ts:12` stocke les compteurs dans une `Map`, avec cinq générations par minute (`:14–15`). `workout.routes.ts:18` et `program.routes.ts:17` appliquent ce middleware aux seules générations. L'état n'est ni partagé ni durable. `settings.controller.ts:9` autorise trois modèles et `:68` résout la clé serveur ; les services de génération ne réservent pas de budget persistant. La table historique `generation_quotas` n'est pas utilisée par ce parcours.

**Impact :** sur plusieurs instances ou après renouvellement d'une instance, un même compte bénéficie de plusieurs fenêtres indépendantes. Le plafond par minute ne borne ni la dépense journalière ni l'effet d'un programme multi-appels. Aucun test de charge distant ni appel IA payant n'a été lancé.

**Correction :** compteur distribué atomique, réservation durable d'un budget par compte et global avant l'appel, limite de concurrence, suivi de consommation, politique de modèle et arrêt d'urgence. Choisir explicitement le comportement quand le magasin de quotas est indisponible.

**Acceptation :** test concurrent sur deux processus : budget global respecté, redémarrage sans remise à zéro, requête refusée avant tout appel fournisseur, restitution documentée en cas d'échec. Démontrer une alerte et une coupure de budget sans requête payante non maîtrisée.

## SEC-04 — CSP à renforcer

**Preuve :** `apps/web/next.config.mjs:18` autorise `script-src 'self' 'unsafe-inline'` en production. `unsafe-eval` est limité au développement. La configuration interdit les objets, les frames et les formulaires vers une autre origine.

**Impact :** une injection HTML/script qui apparaîtrait ailleurs bénéficie d'une défense CSP moins forte. Aucun puits `dangerouslySetInnerHTML`, `eval` ou `new Function` applicatif n'a été trouvé dans les chemins inspectés ; aucune XSS démontrée.

**Correction et acceptation :** CSP compatible Next.js avec nonce ou hashes ; recette OAuth, hydration, Server Actions et navigation sans violation inattendue. Vérifier l'en-tête sur le déploiement et un échantillon de pages, puis confirmer qu'un script inline sans nonce est bloqué.

## SEC-05 — Configuration sensible insuffisamment validée

**Preuve :** `apps/api/src/lib/validate-env.ts:4` exige seulement `DATABASE_URL` et `SERVICE_SECRET`, puis teste leur présence (`:15–18`). La longueur du secret, son caractère distinct d'Auth.js et les origines HTTPS de production ne sont pas validés. Le contrôle du secret API est fail-closed en cas d'absence (`auth.middleware.ts:28`), ce qui est positif.

**Impact :** une erreur d'exploitation peut laisser un secret faible ou une origine par défaut ; aucune faiblesse des secrets réellement configurés n'est affirmée. Aucun secret n'a été affiché ou essayé.

**Correction et acceptation :** contrôles de configuration de production, longueur minimale adaptée aux secrets générés, origines exactes et protocole requis, procédure de rotation Web/API. Tests de rejet de valeurs synthétiques courtes ou de développement ; preuve de configuration par présence/validation uniquement, sans valeur dans le rapport ou les logs.

## SEC-06 — Journaux à minimiser et corréler

**Preuve :** `apps/web/lib/server-api.ts:62` trace chaque appel avec identifiant utilisateur, chemin et URL API ; `:110` trace l'erreur API. `apps/api/src/controllers/settings.controller.ts:58` transmet l'objet d'erreur brut à `console.error`. `error.middleware.ts:9` journalise les détails des erreurs applicatives. Les repositories journalisent également les identifiants lors des refus d'accès. Le gestionnaire masque bien les erreurs inattendues dans la réponse HTTP et supprime leur stack en production.

**Impact :** des exceptions de dépendances peuvent contenir des paramètres techniques ou personnels ; l'accès, la rétention et le masquage de ces logs restent à qualifier dans la plateforme. Aucune fuite de secret réelle observée.

**Correction et acceptation :** journal structuré avec identifiant de corrélation, liste de champs autorisés, masque systématique des clés/headers/tokens et données sensibles. Vérifier avec erreurs synthétiques contenant des marqueurs que ni clé, ni notes de douleur, ni cookie ne ressortent ; documenter accès et rétention côté hébergeur.

## Protections présentes et limites de la vérification

- Toutes les routes métier inspectées appliquent `authMiddleware`. Le secret service/API est vérifié avant l'upsert ; il reste dans un module Web `server-only`, qui rappelle `auth()` à chaque appel. La présence de CORS n'est pas considérée comme un mécanisme d'authentification.
- Les listes sont filtrées par propriétaire. Les détails et suppressions passent par une vérification de propriétaire (`workout.repository.ts:171`, `program.repository.ts:130`), les créations de journaux vérifient la ressource source dans `session-log.service.ts`. Pas d'IDOR immédiate identifiée une fois le bon `users.id` résolu ; SEC-01 remet précisément en cause cette résolution.
- Zod borne les champs d'entrée métier, UUID et pagination côté API ; Drizzle utilise des paramètres SQL. Les composants React affichent les textes sans HTML brut dans les chemins inspectés. L'existence de ces mécanismes ne remplace pas leurs tests PostgreSQL et navigateur.
- Auth.js limite les connexions au fournisseur Google et refuse les cookies explicitement marqués pour un ancien fournisseur. Durée JWT : trente jours (`apps/web/lib/auth.ts:32`) ; révocation serveur et suppression de compte restent à traiter avec l'audit de confidentialité.
- Scan de signatures étroites sur les **258 fichiers suivis par Git**, sans afficher de valeurs : aucune clé privée PEM, clé OpenAI de forme attendue ou jeton GitHub de forme attendue détecté. Les `.env` réels ne sont pas suivis. Ce contrôle ne couvre ni l'historique Git, ni les magasins de secrets distants, ni toutes les formes possibles de secrets ; il n'autorise pas à déclarer le dépôt exempt de secrets.
- Pas de session Google de test ouverte par cet agent, pas d'exploitation distante, pas de vraie base sollicitée. La simulation SEC-01 utilise le vrai middleware et une DB simulée ; les résultats globaux du coordinateur complètent cet audit, sans transformer une recette manquante en succès.
