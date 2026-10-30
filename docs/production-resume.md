# Reprise de la préparation à la production

**La pause a été levée par Kevin le 29 octobre 2026.** Ce document conserve
le point de reprise historique ci-dessous. Pour l'état actuel, consulter
[la validation](audits/2026-10-29/remediation-validation.md) et
[les travaux avant ouverture](release-readiness.md).

**Pause demandée par Kevin avant mise en veille, le 29 octobre 2026.**
Le travail est enregistré mais la préparation et la qualification restent
incomplètes. Ne pas déployer, clôturer la demande ou annoncer une CI verte
sur la seule base des contrôles partiels ci-dessous.

## Identité et suivi

- Projet : `C:/Users/kevin/OneDrive/Documents/Dev/aiSport`.
- Branche : `codex/production-readiness`, créée depuis `cb9037f`.
- Chat natif : `01a187e0-20f2-7e22-bcde-e316a084f27b`.
- Carte de corrections : `req-596d90b4-9eb4-487d-9b6a-4508ed801d6f`.
- L'audit précédent est clos sur sa propre carte ; ne pas le rouvrir pour
  reprendre cette demande distincte de corrections.
- Cible confirmée par Kevin : **ce dépôt actuel sur `www.alcideai.fr`**.
- Les changements sont dans les fichiers du checkout, **non commités et non
  poussés**. Aucun PR, déploiement ou migration hébergée n'a été effectué.

Avant de reprendre, lire `board:task list`, retrouver la carte de
corrections, lire son état puis lever la pause par `unblock` avec `actor` et
`expectedRevision` récents. Toutes les mutations du tableau passent par la
CLI. Le helper local ignoré `tmp/remediation-board.ps1` applique ce protocole
avec nouvelles lectures et reprises bornées sur conflits.

## Corrections enregistrées

1. **Dépendances et sécurité** : Next 15.5.28, React 19.3.1, Hono 4.13.14,
   Zod 4.6.7, Vitest 4.1.12 et transitives corrigées. CSP avec nonce via
   middleware, taille HTTP bornée, corrélation sans payload sensible,
   validation de configuration de production. Dernier `pnpm audit` complet :
   **zéro alerte**, code 0.
2. **Identité et données** : sujet Google stable, reconnexion des cookies
   anciens, mapping legacy explicite avec dry-run ; aucun rapprochement par
   égalité d'e-mail. Validation maîtrisée des JSON historiques, pagination
   ordonnée et lectures cohérentes. Voir `identity-data-migration.md`.
3. **IA** : plus de redistribution arbitraire de durée ou suppression des
   consignes ; sorties incohérentes rejetées/régénérées, scope sportif
   conservateur, refus/troncatures/retries et annulation traités. Hooks
   `onAttempt/onUsage` avec borne pessimiste UTF-8 avant chaque appel.
   Voir `ai-safety.md`.
4. **Budgets** : PostgreSQL atomique par compte/global, modèles limités par
   configuration, réservations et mesure de consommation, coupe-circuit
   partagé, idempotence persistante et création ressource/succès atomiques.
   Opération incertaine non reprise automatiquement. Voir
   `generation-budgets.md`. La concurrence borne les opérations : quatre
   programmes peuvent produire seize appels simultanés, pas quatre.
5. **Confidentialité** : export propriétaire, effacement et révocation de
   tous les sujets liés, protection contre un décalage d'horloge de 30 s,
   purge configurable en dry-run par défaut. Nouvelles notes de douleur
   refusées, anciens contenus inclus dans export/effacement. Pages et
   configuration légales préparées sans coordonnées inventées. Voir
   `privacy-operations.md`.
6. **UX** : déconnexion mobile, erreurs/focus des contraintes, retour à la
   destination après Google, clés UUID stables pour retentatives, douleur
   retirée des formulaires, reprise du timer sur confirmation en pause avec
   TTL/session, métadonnées et textes révisés. Les deux actions de journal
   transmettent `operationId`.
7. **Livraison** : santé JSON + SHA, contrôle du build et du domaine, scripts
   de sauvegarde AES-GCM/restauration isolée, migrations verrouillées,
   préflight sur preuves réelles. La revue a corrigé la comparaison des
   identités des bases **réellement utilisées** avant toute écriture. Mode
   `verify` du workflow DB est en lecture seule sur la source ; les
   migrations candidates se répètent uniquement sur une copie. Voir
   `production-runbook.md`.
8. **Journal idempotent** : table séparée et verrou transactionnel, replay
   sans doublon et refus d'une même clé avec contenu différent.

## Migrations et base temporaire

Les migrations nouvelles sont `0007` à `0012`, sans réécriture des anciennes :
identité, intégrité, budgets, confidentialité, journal idempotent et CHECK
de portée des budgets. **Toutes ont été appliquées sur la base d'audit.**
Les quatre modules de schéma sont agrégés dans `db/index.ts` et
`drizzle.config.ts`.

Le conteneur **`alcide-remediation-20261029`** est conservé pour la reprise,
avec label de ce chat et port **127.0.0.1:22133**. Il est réservé aux données
synthétiques ; les scripts de test définissent explicitement leur URL. Ne
pas utiliser les `.env` réels pour choisir la cible SQL de tests. Les deux
conteneurs d'autres projets n'ont pas été arrêtés ou modifiés.

Avant nettoyage final, vérifier nom et label du conteneur. Aucun nettoyage
global Docker, volume d'autre projet, migration distante ou purge réelle
n'est autorisé par la simple présence de cette base temporaire.

## Contrôles réellement obtenus

- Audit complet des dépendances : **0 alerte**.
- Types globaux : réussis à plusieurs points d'intégration ; rejouer après
  l'ensemble des derniers changements et le correctif de revue.
- Shared : **26 tests**, couverture lignes 100 %, branches 95,71 % sous
  Vitest 4 ; seuils conservés.
- PostgreSQL combiné : **27 tests / 5 fichiers**, tous réussis, couverture
  lignes 91,05 %, branches 81,81 %. Suites exécutées séquentiellement.
- Budget : **9 tests SQL**, dont deux processus Node et redémarrage ;
  **43 tests unitaires** ciblés.
- IA : **58 tests ciblés**, puis intégration de la borne d'entrée ; aucune
  génération fournisseur réelle.
- Confidentialité finale après correctif d'horloge : **22 tests API**, **2
  tests SQL**, **20 tests Web** ; types et lint ciblés réussis.
- UX : **23 tests ciblés**, types et lint ciblés réussis.
- Politiques/chiffrement : **31 tests Node** réussis avant derniers ajouts ;
  inventaire de cible + champs légaux : **5 tests Node** réussis ; la revue
  a ensuite exécuté **16 tests Node** sur sa correction de préflight.
- Le contrôle global de couverture a précédemment échoué pendant
  l'intégration (anciens mocks, fixtures UUID, scénario douleur/modèle).
  Plusieurs suites ciblées ont été corrigées et vérifiées, mais **le contrôle
  global final n'a pas encore été rejoué**. Ne pas transformer les succès
  ciblés en succès global.
- **Aucun build final ni smoke navigateur de cette nouvelle version.** Les
  résultats du candidat d'audit `cb9037f` ne qualifient pas ces corrections.

## Revue et prochaines actions prioritaires

Lire `audits/2026-10-29/remediation-review.md` : revue interrompue, non close.

1. Corriger le **nom Unicode passé brut dans `x-user-name`** : Node Headers
   rejette des caractères comme des noms chinois ou emojis avant HTTP.
   Utiliser un transport encodé/décodé borné compatible, ou ne pas transmettre
   ce nom s'il n'est pas nécessaire. Ajouter une régression.
2. Vérifier/corriger la capacité de `/health/ready` : son Client PostgreSQL
   dédié est hors pool de trois connexions et peut multiplier les connexions
   sous requêtes concurrentes. Aucun test de charge distant n'a été fait.
3. Terminer la revue, exécuter lint, types, couverture unitaire et SQL, tests
   Node de politiques, audit figé et build. Corriger les erreurs restantes
   sans réduire les seuils ni ignorer un test qui échoue.
4. Recette navigateur publique en mode production (`E2E_PRODUCTION=1`), puis
   recette locale authentifiée à deux sessions synthétiques. **Le harness
   complet n'est pas encore écrit** : `testing-local-production.md` décrit
   les deux fichiers à créer et les protections. Il ne remplace pas OAuth
   Google neuf ou OpenAI réel. Ne pas conserver cookies/traces privés.
5. Vérifier les fichiers non suivis, formater uniquement le périmètre,
   commiter les corrections et l'audit, pousser la branche et créer une PR
   reviewable. Attacher la PR au chat avec l'outil prévu. Vérifier la CI.
6. Déclencher le workflow DB **sur la branche et le SHA exacts**, seulement
   `mode=verify`, puis lire les preuves. Ne jamais appeler l'ancien workflow
   du `main` par défaut, ni `mode=migrate` tant que le préflight est incomplet.
7. Mettre à jour la carte de corrections et le bilan de livraison avec les
   preuves finales et les seuls reliquats externes réellement nécessaires.

## Accès distants et décisions restantes

- GitHub CLI est authentifié au dépôt. Les secrets de déploiement existants
  sont présents ; leurs valeurs n'ont pas été affichées.
- Un secret **`BACKUP_ENCRYPTION_KEY`** de 32 octets en base64 a été créé dans
  GitHub par entrée standard ; valeur jamais affichée, enregistrée dans le
  dépôt ou dans le tableau. Prévoir l'accès de secours avant de dépendre des
  archives. Aucune archive de production n'a encore été créée.
- Les credentials Vercel locaux renvoient **403** sur les lectures de projet.
  Le nouveau job `target-inventory` du workflow DB pourra vérifier les
  credentials GitHub existants et produire uniquement métadonnées et noms
  de variables ; aucune valeur de secret ne sort.
- Le domaine actuellement en ligne diffère du code candidat. Son projet,
  sa base, ses données et ses éventuels crédits restent à rapprocher avant
  remplacement. Aucun effacement ou abandon de ces données n'est décidé.
- Les six champs `LEGAL_OPERATOR_NAME`, `LEGAL_CONTACT_EMAIL`,
  `LEGAL_HOSTING_NAME`, `LEGAL_HOSTING_CONTACT`, `LEGAL_PROCESSING_BASIS`,
  `LEGAL_TRANSFERS_NOTICE` doivent correspondre à des faits/décisions réels.
  Ils ne sont pas inventés pour faire réussir le préflight.
- Restent à prouver sur la cible finale : OAuth neuf, revue sportive humaine,
  contrats/configurations des fournisseurs, réception d'alerte et restauration
  de données hébergées. Ne pas signer ces attestations au nom du propriétaire.

Tous les agents actifs ont reçu la pause. Aucun nouveau test long,
serveur, push ou déploiement n'a été lancé après cette instruction.
