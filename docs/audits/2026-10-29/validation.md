# Vérifications exécutées pour l'audit de production

Date : 29 octobre 2026. Coordinateur : Codex. Candidat local :
`cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche
`codex/nettoyage-projet`. Node `24.14.0`, pnpm `11.9.0`, Windows.
Le dépôt était propre au début ; seuls les rapports d'audit sont ajoutés.

## Résultats locaux

| Contrôle                                                               | Résultat réel                                 | Portée                                                                                                                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                            | Réussi, code 0                                | Avertissement de dépréciation de `next lint`, aucun avertissement ESLint.                                                                                                    |
| `pnpm typecheck`                                                       | Réussi, code 0                                | Trois packages.                                                                                                                                                              |
| `pnpm test:coverage`                                                   | Réussi, code 0                                | Shared : 14 tests ; API : 170 ; Web : 58. Soit 242 tests unitaires.                                                                                                          |
| Politiques de livraison et sessions                                    | 18 tests réussis, aucun ignoré                | `node --test scripts/vercel-ignore-policy.test.mjs scripts/cd-workflow-policy.test.mjs scripts/e2e-auth-policy.test.mjs`.                                                    |
| Migrations Drizzle sur PostgreSQL 16 temporaire                        | Réussies, code 0                              | Base vide réservée à cet audit ; aucune URL de base utilisateur utilisée.                                                                                                    |
| `pnpm --filter api test:integration:coverage`                          | 8 tests réussis, aucun ignoré, code 0         | Vrais SQL, propriété des ressources, programmes, journaux et statistiques.                                                                                                   |
| `pnpm --filter api exec vitest run --config vitest.security.config.ts` | 1 test réussi, aucun ignoré, code 0           | Chaîne ressemblant à du SQL conservée comme donnée ; table toujours utilisable.                                                                                              |
| `pnpm audit --prod --audit-level=low --json`                           | Échec attendu du contrôle de sécurité, code 1 | 20 avis : 4 critiques, 7 élevés, 9 modérés. Voir `security.md` ; pas vingt exploitations démontrées.                                                                         |
| `pnpm build`                                                           | Réussi, code 0                                | Shared, API et build Next.js de production ; quinze routes produites, dont treize pages générées pendant le build.                                                           |
| `pnpm test:e2e:smoke`                                                  | Échec, code 1 : 48 réussis / 50, aucun ignoré | En développement, le détail anonyme reste en chargement dans Chromium et Firefox. La contre-vérification de production réussit ci-dessous ; le smoke initial reste en échec. |
| Vérification ciblée du build de production                             | Réussie, code 0 : 4/4                         | Après reconstruction Web réussie, `next start` sur boucle locale : détail et génération anonymes redirigés dans Chromium et Firefox. Aucune modification du code.            |

Les pourcentages ci-dessous concernent des périmètres différents ; ils ne
doivent pas être additionnés ou présentés comme une couverture globale.

| Rapport de couverture                               | Lignes  | Branches | Fonctions |
| --------------------------------------------------- | ------- | -------- | --------- |
| Shared                                              | 100 %   | 92,85 %  | 100 %     |
| API unitaire                                        | 89,62 % | 80,74 %  | 95,58 %   |
| Web unitaire                                        | 76,3 %  | 79,32 %  | 82,35 %   |
| Repositories et service de journal, PostgreSQL réel | 93,69 % | 80 %     | 100 %     |

## Isolation des vérifications SQL

Un conteneur PostgreSQL `16-alpine`, nommé `alcide-audit-20261029`, a été
créé pour ce chat, avec publication sur la boucle locale et une base dédiée.
Les commandes de migration et de test ont reçu explicitement `DATABASE_URL`
et `TEST_DATABASE_URL` vers cette base éphémère. Les services des autres
projets sont restés en place. Les tests créent des identités synthétiques et
nettoient leurs fixtures.

La première migration a échoué pendant l'initialisation du serveur
PostgreSQL, avant qu'il soit prêt. Après confirmation du démarrage, la même
migration a réussi ; les deux suites SQL ont ensuite réussi. Ce premier
échec n'est pas présenté comme une panne du produit ni effacé du bilan.
Avant suppression du conteneur, une dernière requête SQL a confirmé zéro
compte, zéro entraînement, zéro programme et zéro journal. Son nom et son
label de chat ont été vérifiés, puis seul ce conteneur et ses volumes
temporaires ont été supprimés avec succès. Les services des autres projets
ont été conservés.

## Investigation du smoke

La relance des seuls tests `/workouts/[id]` avec un seul worker donne un
échec Chromium et une réussite Firefox. Chromium attend une navigation vers
`/login` qui ne se termine pas avant le timeout ; le résultat varie donc
selon le navigateur et l'état du serveur de développement. La route place
son contrôle de session avant la lecture métier, et les captures ne montrent
que le squelette anonyme. Aucun contournement d'authentification n'est établi.
Les captures initiales sont conservées dans
`tmp/production-audit-2026-10-29/local-smoke-initial/`.

La reconstruction Web réussit, puis un serveur `next start` est lancé sur
`127.0.0.1:3006`. Quatre vérifications navigateur neuves réussissent :

| Navigateur | Route anonyme               | Destination | Durée observée |
| ---------- | --------------------------- | ----------- | -------------- |
| Chromium   | `/workouts/some-workout-id` | `/login`    | 1 513 ms       |
| Chromium   | `/generate`                 | `/login`    | 741 ms         |
| Firefox    | `/workouts/some-workout-id` | `/login`    | 1 947 ms       |
| Firefox    | `/generate`                 | `/login`    | 813 ms         |

La régression de redirection n'est donc pas reproduite avec le build de
production. L'échec du smoke en développement reste un sujet de fiabilité
de qualification, classé P2 ; sa cause précise n'est pas établie. Ces quatre
contrôles ciblés ne transforment pas le smoke initial en 50/50 ni ne
remplacent la recette authentifiée finale. Aucun seuil ou test n'a été
modifié. Le serveur temporaire a ensuite été arrêté.

## Vérifications distantes et limites

L'agent exploitation a contrôlé GitHub et les trois sondes publiques en
lecture seule : voir `operations.md` pour les réponses et liens de runs.
Le Web redirige vers le domaine canonique `https://www.alcideai.fr/`.
La version `0.13.0-rc.8` ne permet pas de déduire le SHA réellement servi.
La readiness valide une requête SQL simple et la présence d'une clé IA,
sans valider une génération.

Aucun déploiement, modification de configuration distante, migration
hébergée, restauration de production, test de charge distant, appel IA
payant ni mutation de compte réel n'est inclus dans cet audit. La recette
Google neuve, la génération réelle de séance et de programme, la recette à
deux comptes et l'exercice de restauration restent à effectuer sur une
cible et un budget maîtrisés. Leur absence est une limite de qualification,
pas une réussite présumée.
