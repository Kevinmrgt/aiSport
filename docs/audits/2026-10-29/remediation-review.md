# Relecture indépendante des corrections de production

Date : 29 octobre 2026. Agent : `review_production`. Branche examinée :
`codex/production-readiness`, modifications en cours et non commitées.
Carte commune : `req-596d90b4-9eb4-487d-9b6a-4508ed801d6f`.

**Revue locale reprise après la pause explicite du propriétaire.** Les quatre
constats identifiés ci-dessous ont reçu un correctif. Ce rapport décrit cette
relecture et ses contrôles ciblés ; il ne vaut pas validation finale de mise
en production.
Aucun commit, push, déploiement, test de charge ou accès à une base distante
n'a été effectué par cet agent. Les autres agents continuaient leurs lots
pendant la lecture ; le coordinateur centralise les tests globaux.

## REV-01 — P1 corrigé : comparer la cible PostgreSQL réellement utilisée

Le préflight comparait seulement l'identité de la preuve de restauration à
celle de la checklist. Il n'établissait pas l'identité de `DATABASE_URL` ou
de `MIGRATION_DATABASE_URL` utilisées par le run. Un changement de secret
pouvait donc conserver un préflight vert avec des attestations relatives à
une autre base.

Sur attribution explicite du coordinateur, les corrections ont été ajoutées :

- `scripts/db-operations.mjs` : extraction du calcul `databaseIdentity`,
  lecture réelle via `readDatabaseIdentity`, transaction en lecture seule,
  délais de connexion/requête bornés, erreurs sans URL ni secret.
- `scripts/cd-release-preflight.mjs` : lecture des deux connexions réelles ;
  comparaison avec restauration et checklist, puis comparaison des cibles
  applicative et de migration. Une cible absente ou différente est refusée.
- Les deux workflows de migration transmettent les connexions nécessaires
  au préflight avant toute écriture.
- Tests ajoutés pour changement de cible applicative, cible de migration
  différente, absence d'identité réelle et choix de connexion directe.

**Preuve exécutée :** `node --test scripts/cd-release-preflight.test.mjs
scripts/db-operations.test.mjs scripts/cd-workflow-policy.test.mjs` :
**16 tests réussis**, aucun ignoré. `git diff --check` ciblé réussi.

Le calcul d'identité conserve le mécanisme existant (base, adresse et port
vus par PostgreSQL). Une variation d'adresse d'infrastructure peut refuser
une preuve ancienne : comportement conservateur à qualifier sur la cible,
sans assouplir la comparaison sur la seule base d'un libellé fourni.
La lecture SQL réelle du nouveau helper reste à couvrir dans la recette
globale ; aucune preuve distante n'est revendiquée ici.

## REV-02 — P2 transmis : révocation et décalage d'horloge

`parseSessionIssuedAt` accepte jusqu'à trente secondes d'avance de l'horloge
Web. Le contrôle initial de révocation comparait pourtant au seul instant
d'effacement de l'API. Un cookie émis avec une seconde d'avance pouvait donc
avoir un `issuedAt` supérieur au `revokedAt` après effacement, puis recréer un
compte avec cette ancienne session.

Le défaut découle directement des deux comparaisons dans
`apps/api/src/services/account-session.service.ts`. Le coordinateur a confié
la correction à `fix_privacy` : marge partagée de trente secondes dans la
révocation, tests des décalages et délai de reconnexion expliqué à l'utilisateur.
L'agent confidentialité a confirmé la correction avant sa pause : constante
partagée `SESSION_CLOCK_SKEW_MS=30000`, cutoff `revokedAt + skew`, **22 tests
unitaires et 2 tests SQL réussis**, dont les offsets 0, 1, 1 000 et 30 000 ms.
Types API et lint API/Web également annoncés réussis par cet agent. Ces
résultats sont attribués au lot confidentialité ; le relecteur ne les a pas
réexécutés. Leur intégration au bilan global reste à vérifier à la reprise.

## REV-03 — P2 reproduit puis corrigé : noms Google Unicode dans les headers

La version relue initialement de `apps/web/lib/server-api.ts` transmettait
`session.user.name` brut dans `x-user-name`. Les headers du runtime Fetch de Node utilisent des ByteString :
un nom chinois ou un emoji provoque un `TypeError` avant même l'appel HTTP.
Tous les appels API de ces comptes peuvent donc échouer.

**Reproduction locale exécutée, sans réseau :** construction de `Headers`
avec un nom ASCII : acceptée ; avec un nom chinois et avec un nom comportant
un emoji : refusée avec `TypeError`. Aucune valeur de compte réel utilisée.

**Correction du coordinateur :** transport UTF-8 encodé dans un header
distinct, décodage borné côté API et fallback pour l'ancien header pendant
une transition compatible. Le coordinateur annonce **9 tests API et 7 tests
Web réussis**, incluant les cas Unicode. Ces tests ne sont pas revendiqués
comme exécutés par le relecteur ; ils sont à rapprocher du bilan global.

## REV-04 — P2 corrigé : une seule connexion de readiness en cours par processus

La lecture initiale de `apps/api/src/lib/readiness.ts` montrait un `Client` PostgreSQL
dédié créé pour chaque vérification. La route publique `/health/ready` ne
passe donc plus par le pool applicatif limité à trois connexions. Des appels
concurrents peuvent multiplier les connexions même dans une seule instance.

Le correctif partage maintenant une seule promesse de sonde PostgreSQL en
cours, jusqu'à la fin de la fermeture du client. La connexion et les requêtes
conservent leurs délais bornés, dont l'annulation de requête côté serveur ;
aucune course de timeout ne laisse volontairement une requête poursuivre en
arrière-plan. Il n'y a pas de cache des résultats terminés : la sonde suivante
reteste immédiatement la disponibilité et peut constater une panne ou sa
résolution. Le contrôle de configuration IA reste propre à chaque invocation.

La sonde vérifie aussi les **14 tables applicatives**, y compris budgets,
révocations et opérations de journal, ainsi que le journal de migrations
Drizzle. Le dernier timestamp requis et le nombre de migrations sont des
constantes synchronisées au journal versionné par un test, sans lecture de
fichiers au runtime du bundle serverless. Un schéma incomplet ou une migration
requise absente donne `not_ready`.

**Vérifications exécutées par le relecteur :** readiness et health routes,
**13 tests réussis** sous Vitest 4 ; types API, lint ciblé et `git diff --check`
ciblé réussis. La régression de concurrence envoie vingt appels simulés
simultanés et un appel supplémentaire pendant la fermeture : **un seul client**
est créé et fermé. Les autres cas couvrent échec partagé, reconnexion fraîche,
échec de connexion, configuration IA différente entre appels et migration
absente. Aucun test de charge distant n'a été effectué.

Une invocation réelle supplémentaire contre le PostgreSQL temporaire de
ce chat a également renvoyé `ready=true`, `database=ok`, `schema=ok`. Elle
n'a lu que des métadonnées de tables/migrations ; la configuration IA était
une valeur synthétique testant uniquement sa présence, sans appel fournisseur.

Le plafond est **par processus**, pas un plafond de connexions global entre
toutes les instances Vercel. Si les rôles d'application et de migration sont
distincts, qualifier le droit `SELECT` du rôle applicatif sur
`drizzle.__drizzle_migrations` ; son absence doit rester un refus de readiness.

## Périmètre effectivement relu et limites

Les lectures ont couvert l'identité Google et le rapprochement legacy,
révocation et effacement, export par propriétaire, admission et réservations
budgétaires PostgreSQL, création atomique ressource/succès, conservation des
réservations incertaines, idempotence des journaux, annulation des semaines
IA, validation de durées sans réécriture, sauvegarde/restauration et chaîne
CI/CD. Les verrous de sujet partagés par authentification et effacement,
les clés d'opération par utilisateur et les transactions de succès sont des
fondations positives observées.

Cette lecture ne constitue pas une certification complète. Les données
réelles, la restauration distante, les comptes hébergeurs, la nouvelle
connexion Google et la génération fournisseur n'ont pas été qualifiés par
ce relecteur. Les avis juridiques, coordonnées de l'éditeur et revue sportive
humaine restent des preuves de release distinctes, volontairement exigées
par le préflight. Les contrôles d'intégration globaux et la qualification
distante restent sous la responsabilité du coordinateur.
