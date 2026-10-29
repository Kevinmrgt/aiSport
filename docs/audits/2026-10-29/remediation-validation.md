# Qualification des corrections après reprise

Date : **29 octobre 2026**. Agent : `verify_integration`. Branche :
`codex/production-readiness`, état de travail partagé et non commité lors des
contrôles. Carte commune : `req-596d90b4-9eb4-487d-9b6a-4508ed801d6f`.
Environnement : Windows, Node **24.14.0**, pnpm **11.9.0**, Vitest **4.1.12**.

## Résultats réellement exécutés

| Contrôle                                        | Résultat final                             | Portée                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                     | Code 0                                     | API et Web ; aucun avertissement ou erreur ESLint. Next signale seulement la dépréciation de sa commande `next lint`.                                                     |
| `pnpm typecheck`                                | Code 0                                     | Trois packages du monorepo, après les corrections Unicode et readiness.                                                                                                   |
| `pnpm test:coverage`                            | **Code 0, 358 tests unitaires réussis**    | Shared 26, API 244, Web 88. Aucun seuil réduit et aucun test rendu ignoré pour obtenir ce résultat.                                                                       |
| `pnpm --filter api test:integration:coverage`   | **Code 0, 27 tests / 5 fichiers réussis**  | PostgreSQL 16 réel réservé à cet audit, suites exécutées séquentiellement ; identité, données, budgets multi-processus, droits, journal idempotent et texte de forme SQL. |
| `node --test` sur tous les `scripts/*.test.mjs` | **Code 0, 35 tests réussis**, aucun ignoré | Politiques CI/CD, SHA, préflight et cibles réelles, sauvegarde chiffrée, refus de restauration dangereuse, inventaire sans secrets et protection des sessions de test.    |
| `pnpm audit --audit-level=low --json`           | **Code 0, aucune alerte**                  | Dépendances de production et de développement : zéro critique, élevée, modérée, faible ou informationnelle dans la réponse courante.                                      |

Les pourcentages suivants ont des périmètres distincts ; ils ne représentent
pas une couverture globale unique de l'application.

| Périmètre de couverture                      | Lignes  | Branches | Fonctions | Statements |
| -------------------------------------------- | ------- | -------- | --------- | ---------- |
| Schémas Shared                               | 100 %   | 95,71 %  | 100 %     | 100 %      |
| API unitaire                                 | 91 %    | 81,57 %  | 89,23 %   | 89,47 %    |
| Web unitaire                                 | 78,57 % | 70,30 %  | 81,22 %   | 77,13 %    |
| Repositories et service de journal, SQL réel | 91,11 % | 81,81 %  | 97,01 %   | 87,34 %    |

Les seuils conservés sont ceux déjà configurés : Shared 90 %, API unitaire
70 %, Web 60 % lignes/statements et 70 % branches/fonctions ; SQL 80 %
lignes/statements, 70 % branches et 90 % fonctions.

## Ajustements de tests nécessaires

Quatre fichiers de tests ont été modifiés ou ajoutés par cet agent ; aucun
fichier applicatif ni configuration de couverture n'a été modifié.

- `apps/api/tests/business-recipes.test.ts` : mock budgétaire hoisté, sans
  extraction non liée des méthodes de classe. Les six recettes ciblées et
  leur lint réussissent ; la règle `unbound-method` reste active.
- `apps/web/app/public-pages.test.tsx` : sélecteur du texte de mise à jour
  adapté au contenu actuel, sans retirer l'assertion existante.
- `apps/web/app/server-boundaries.test.tsx` : dix tests des frontières serveur
  couvrant authentification préalable, destination de connexion, transmission
  de la clé d'opération, nouvelle clé uniquement après un échec établi,
  confirmation d'effacement et déconnexion seulement après succès, export
  privé et absence de diagnostic interne dans le fichier téléchargé.
- `apps/web/lib/content-security-policy.test.ts` : cas de développement
  vérifiant nonce, rechargement local par WebSocket, absence de scripts
  inline arbitraires et absence d'une redirection HTTP vers HTTPS forcée
  pendant le développement.

La première exécution Web après correction du sélecteur réussissait ses
77 tests, mais sa couverture des branches était de 67,46 %, sous le seuil
de 70 %. Les tests des frontières serveur ont porté cette mesure à
69,97 %, toujours insuffisante. Le cas CSP de développement a permis
d'exercer les chemins HMR encore absents : la dernière mesure est de
70,30 %. Le script complet du monorepo a ensuite été réexécuté et a
réellement terminé avec le code 0. Aucun échec intermédiaire n'est présenté
comme une réussite.

## Isolation PostgreSQL et incident de mesure

Les suites SQL ont reçu explicitement `DATABASE_URL` et `TEST_DATABASE_URL`
vers la base temporaire du chat, sur la boucle locale au port 22133. Aucun
fichier `.env` réel n'a été utilisé pour sélectionner une base de production.
L'agent n'a exécuté aucune migration distante ni purge de compte hébergé.

Un premier lancement de la couverture SQL en parallèle de la couverture
unitaire API a échoué : le nettoyage de `apps/api/coverage` a supprimé le
sous-répertoire temporaire `coverage/integration/.tmp`. Cela ne démontre
pas une erreur SQL. La suite SQL a été relancée seule et a réussi ses
27 tests, avec seuils respectés. Pour les prochains contrôles, exécuter la
couverture unitaire API puis la couverture SQL, jamais ces deux processus
simultanément. `fileParallelism: false` protège les fichiers d'une même
suite, pas deux processus Vitest indépendants.

Les suites SQL terminées et leurs fixtures nettoyées, le coordinateur et
l'agent de recette locale ont été prévenus que la base était libre. Aucun
processus de ce lot n'a été laissé actif.

## Limites de cette qualification

Ces résultats concernent le code local examiné et ses tests. Le build,
le smoke navigateur, la recette locale authentifiée et la CI du commit
final sont centralisés par le coordinateur et ne sont pas revendiqués par
ce rapport. Les tests unitaires simulent le fournisseur IA et les sessions
aux frontières testées ; ils ne prouvent ni une connexion Google neuve ni
un appel OpenAI réel.

Aucune valeur de secret, session, donnée utilisateur réelle ou journal brut
n'est conservée dans ce document. Les métadonnées d'hébergement, la
restauration distante, les informations légales, la revue sportive et la
réception des alertes restent des preuves de release distinctes. Une
nouvelle modification fonctionnelle après ces contrôles doit être
qualifiée sur les parcours concernés avant d'attribuer ces résultats au
commit de livraison.
