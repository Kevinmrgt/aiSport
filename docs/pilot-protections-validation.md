# Qualification locale des protections du pilote

La qualification vise le candidat de la branche `codex/pilot-protections`, dans
le worktree isolé `alcide-pilot-protections/aiSport`. Elle ne déploie rien et
n'active aucun pilote réel. Les seules activations exécutées sont des fixtures
synthétiques dans une nouvelle base PostgreSQL locale jetable.

## Reproduire la preuve

```powershell
node scripts/qualify-pilot-protections.mjs
```

Le script exige l'image `postgres:16-alpine` déjà présente et utilise
`--pull=never`. Il crée son propre conteneur, expose PostgreSQL uniquement sur
`127.0.0.1` avec un port attribué automatiquement et crée la base
`alcide_pilot_qualification_test`. Il ignore les URL de base, clés et options
applicatives héritées. Aucun conteneur existant n'est arrêté. Son conteneur et
ses volumes sont supprimés dans le bloc de nettoyage, même après un échec.

Il applique toutes les migrations candidates par l'entrée verrouillée habituelle,
vérifie qu'elles n'ont créé ni activation ni invitation et conserve `fsync=on`.
Il exécute toutes les suites `*.integration.test.ts` avec la configuration
PostgreSQL existante et ses seuils de couverture. Les délais du lanceur sont
de trente secondes pour les tests et leurs hooks, afin de tolérer les écritures
Docker locales ; les limites de transaction du produit restent inchangées.
Les fichiers de couverture sont conservés dans le répertoire propre au run,
afin qu'une couverture unitaire simultanée ne puisse pas les supprimer.

Les transports HTTP réels `fetch`, `http` et `https` refusent les destinations
externes dans les processus de tests. Les fournisseurs IA et Stripe des tests
sont simulés ; aucune clé de fournisseur ni donnée utilisateur réelle n'est
nécessaire. Les sous-processus de concurrence héritent de cette garde.

Les preuves se trouvent dans `tmp/pilot-qualification/<runId>/evidence.json`.
Elles contiennent les résultats individuels, les empreintes du candidat et des
migrations, la révision de départ, l'état modifié du worktree et le nettoyage.
Un candidat modifié pendant l'exécution, un test ignoré, une couverture sous
les seuils, une suite échouée ou un nettoyage échoué interdisent `complete=true`.
Les diagnostics techniques expurgés restent dans ce répertoire temporaire.

Un diagnostic ciblé est possible, sans prétendre satisfaire la couverture de
la suite complète :

```powershell
node scripts/qualify-pilot-protections.mjs tests/pilot-protections.integration.test.ts tests/billing.integration.test.ts
```

## Invariants vérifiés sur PostgreSQL réel

| Protection           | Scénarios exécutables                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fermeture initiale   | Migrations sans singleton ni invitation ; anciens crédits sans accès IA ; invitation explicite obligatoire.                                                                                              |
| Places et admissions | Dix invitations concurrentes au maximum ; suppression sans récupération de place ; trois admissions par invité et trente au total, y compris les échecs.                                                 |
| Budget monétaire     | Réservations concurrentes à la frontière exacte de vingt dollars ; coût historique inclus dans ce même plafond ; provision avant chaque tentative.                                                       |
| Incertitude          | Échec, bail expiré, redémarrage applicatif et effacement du compte conservent le montant ; toute nouvelle admission est bloquée tant que le reçu reste incertain.                                        |
| Règlement            | Reçu idempotent ; doublons de reçu local ou fournisseur refusés ; modèle inconnu refusé ; alias et snapshot tarifés de façon cohérente ; tokens supplémentaires comptés au tarif de sortie conservateur. |
| Dépassement          | Coût réel supérieur à la provision conservé ; pilote désactivé et nouvelles admissions refusées.                                                                                                         |
| Temps                | Fenêtre fixe de trente jours ; contrôle avant une reprise et après attente de verrou ; reçu tardif réglable après expiration.                                                                            |
| Effacement           | Admissions, place et ledger financier survivent à la suppression ; reçu tardif réglable sans rétablir les compteurs consommés.                                                                           |
| Intégrité            | Déplacement de fenêtre, réduction de référence et suppression de comptabilité refusés ; activation concurrente unique ; provisions historiques orphelines interdisant l'activation.                      |
| Isolation            | Un autre compte ne peut régler un reçu ni marquer l'opération comme incertaine.                                                                                                                          |
| Programme            | Plus de deux semaines refusées avant admission et avant toute génération.                                                                                                                                |
| Stripe TEST          | Checkout et réconciliation fermés par défaut ; simulation réservée au développement explicite ; webhooks dédupliqués sans crédit IA ; anciens grants TEST inutilisables pour générer.                    |

## Résultat de la qualification

Exécution complète réussie le **31 octobre 2026, de 14:44:49 à 14:48:47, Europe/Paris** :

| Mesure                                                | Résultat réel                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Commande                                              | `node scripts/qualify-pilot-protections.mjs`                              |
| PostgreSQL                                            | 16.15, `fsync=on`, conteneur neuf sur loopback                            |
| Migrations                                            | Appliquées ; aucune activation ni invitation créée                        |
| Suites et tests                                       | **11 suites, 89 tests réussis, 0 échec, 0 ignoré**                        |
| Dont scénarios adversariaux du pilote                 | 18 tests réussis                                                          |
| Couverture statements / branches / fonctions / lignes | **86,26 % / 79,21 % / 92,20 % / 91,21 %**                                 |
| Seuils existants correspondants                       | 80 % / 70 % / 90 % / 80 %, tous satisfaits                                |
| Sources pendant l'exécution                           | Empreinte identique avant et après                                        |
| Nettoyage                                             | Conteneur et volumes supprimés ; aucun conteneur de qualification restant |

Preuve locale non versionnée :
`tmp/pilot-qualification/8adcde8d-7e47-41b7-808a-ef7bae63f476/evidence.json`.
La couverture HTML/LCOV et les diagnostics de ce même run sont conservés dans
ce répertoire. Empreinte SHA-256 de la preuve :
`8d61900229aac9b0c397a2cd2fdea0c73dccb6224b6be574a5c24505cd27ff4d`.

Le worktree était modifié et partait du commit
`52958d021d5a032b8359f593ac422ec5cc0f69b3` ; ce SHA seul ne désigne donc pas
les modifications qualifiées. L'empreinte des sources API, tests API, migrations,
shared, lockfile et lanceur était
`b7adc9dfbcae6440898ba86cd1569f7af9d5047ddd11a63bac7835d5e79e329b`.
L'empreinte des migrations était
`574104b1e5e54aac94ec033c42fe5967da5a07bbd0f4a5cce40215ff7af27557`.

Les diagnostics intermédiaires ont détecté puis fait corriger l'ancrage de
l'activation sur l'horloge applicative au lieu de PostgreSQL et le décodage
du timestamp brut par Drizzle. Ils ont aussi conduit à isoler le répertoire de
couverture par run après une suppression concurrente par la couverture unitaire.
Ces exécutions rouges ne sont pas comptées comme des preuves de réussite.

## Validation globale du candidat

| Contrôle local                               | Résultat                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared avec couverture                       | 68 tests réussis                                                                                                                                             |
| API avec couverture                          | 435 tests réussis, 46 fichiers ; lignes 91,58 %, branches 84 %                                                                                               |
| Web avec couverture                          | 285 tests réussis, 39 fichiers ; lignes 79,78 %, branches 77,26 %                                                                                            |
| ESLint et TypeScript                         | Contrôles de tous les packages réussis                                                                                                                       |
| Build                                        | Shared, API et Web réussis avec `pnpm build`                                                                                                                 |
| Politiques Vercel, CD et sessions E2E        | 9, 8 et 3 tests réussis                                                                                                                                      |
| Smoke Chromium et Firefox sur le build local | 49 scénarios réussis au premier passage ; les trois scénarios ayant dépassé le délai de fermeture du contexte navigateur réussissent au second passage isolé |
| Diff                                         | `git diff --check` sans erreur                                                                                                                               |

La commande finale de couverture API est
`pnpm --filter api exec vitest run --coverage --maxWorkers=2 --testTimeout=20000`.
Le délai du lanceur a été adapté après un timeout de cinq secondes à l'import
des schémas dans un test de configuration sous charge ; les timeouts SQL et
fournisseur du produit restent inchangés. La couverture Web a été exécutée avec
`pnpm --filter web exec vitest run --coverage --maxWorkers=2`.

Le smoke initial `E2E_PRODUCTION=1 pnpm test:e2e:smoke -- --workers=2` compte
49 réussites et trois dépassements du délai de teardown du navigateur. La relance
`E2E_PRODUCTION=1 pnpm --filter web exec playwright test --last-failed --workers=1 --timeout=60000`
valide ces trois scénarios en 19,8 secondes. Les 52 scénarios ont ainsi été
vérifiés, sans présenter le premier run comme intégralement vert. Aucun parcours
Google authentifié ni génération fournisseur réelle n'est revendiqué.

## Fermeture et livraison

Les paiements TEST ne créent plus de crédits IA. Les anciens grants associés à
un abonnement ou préfixés `premium:` sont exclus de la lecture, de la réservation
et de la confirmation des crédits. Les droits de bienvenue et les dons admin
restent utilisables uniquement sous les garde-fous du pilote. Checkout, portail
et sync sont fermés par défaut ; la simulation exige à la fois
`NODE_ENV=development` et `STRIPE_TEST_SIMULATION_ENABLED=true`, sans jamais
financer une IA réelle.

Le pilote réel reste inactif. Il n'existe aucune route, variable d'environnement
ou action de démarrage qui l'active automatiquement. Son interface opérateur
`PilotRepository.activate` exige une référence de revue, la confirmation des
contrôles de solde et des chemins IA, ainsi que le coût de référence en nanoUSD.
Elle refuse une activation antérieure et les provisions historiques non
rapprochées. Les invitations doivent ensuite être attribuées explicitement ;
aucune n'a été attribuée hors fixtures synthétiques.

Le tarif applicatif préparé est de **5 € TTC/mois pour 30 crédits**. La constante
partagée et les affichages concordent ; aucun Price, abonnement ou paramètre
Stripe distant n'a été modifié. La stratégie détaille les coûts et n'en déduit
pas une rentabilité démontrée.

Les changements sont isolés dans `codex/pilot-protections`. Le checkout source
contient un chantier concurrent non commité de gestion des incidents, avec une
migration `0014`. Ce candidat crée `0015` sur son propre historique après `0013`.
Lors de leur intégration commune, réconcilier le journal Drizzle, les snapshots
et les constantes de readiness, puis rejouer les migrations et contrôles de la
révision réunie. Aucun fichier du chantier concurrent n'a été modifié. Aucun
push, déploiement, changement des variables réelles, migration de production,
achat, appel IA payant ou ouverture d'inscription n'est effectué dans ce lot.

La qualification couvre les migrations sur une base neuve, les transactions
réelles et les fournisseurs simulés. Une restauration de la base hébergée, une
connexion Google neuve, une génération chez le fournisseur réel ou une recette
du domaine déployé nécessitent leurs propres preuves conformément au runbook.
Les montants contrôlés utilisent les tarifs versionnés de la politique, avec sa
provision régionale de 10 %, les consommations connues et les provisions encore
incertaines. Cette preuve locale ne vérifie pas un plafond dans le compte du
fournisseur.
