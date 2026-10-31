# Maintenance et incidents

Le mainteneur assure le code, les déploiements, les données et le suivi des
retours. Les incidents et demandes de support utilisent les modèles GitHub.

## Diagnostic courant

1. Noter le parcours, l'heure, l'environnement et le SHA déployé.
2. Vérifier Web `/api/health`, API `/health` et `/health/ready`.
3. Consulter les logs Vercel et le dernier run CI/CD.
4. Vérifier configuration OAuth, secrets interservices et PostgreSQL selon le
   composant en panne, sans recopier de secret dans le ticket.
5. Reproduire avec des données de test et qualifier l'impact.

| Incident                                                             | Priorité |
| -------------------------------------------------------------------- | -------- |
| Perte de données, faille exploitable ou service indisponible         | P0       |
| Authentification ou génération bloquée pour de nombreux utilisateurs | P1       |
| Fonction dégradée avec contournement                                 | P2       |
| Défaut cosmétique ou documentation mineure                           | P3       |

En P0/P1, privilégier la restauration du service et conserver les éléments
utiles au diagnostic. Les délais dépendent de la disponibilité réelle du
mainteneur ; aucun support permanent n'est actuellement établi.

## Correction et validation

Documenter cause, impact, solution et retour arrière. Exécuter le test de
non-régression concerné, puis lint, types, tests et build. Vérifier la CI sur le
commit à livrer et le parcours après déploiement avant de clore l'issue.
Ne pas masquer un échec en abaissant un seuil ou en ignorant le test concerné.

## Journal des erreurs dans l’administration

La rubrique **Journal → Erreurs et incidents** (`/admin/erreurs`) regroupe les
erreurs techniques de l’API, les échecs du fournisseur IA et les erreurs non
gérées du navigateur. La collecte commence avec la livraison de cette fonction ;
elle ne reprend pas les anciens logs. Les erreurs de saisie et refus d’accès
ordinaires ne deviennent pas des incidents.

Chaque groupe indique son code, son origine, sa gravité, la route concernée,
la méthode, le statut HTTP éventuel, le dernier identifiant de requête, le
nombre d’occurrences et les premières/dernières détections. Les filtres portent
sur la dernière détection. L’identifiant de requête permet le rapprochement
avec les logs techniques. Le suivi **Nouveau / En cours / Résolu** est réservé
aux administrateurs Google vérifiés et ses modifications sont consignées dans
le journal des actions. Une nouvelle occurrence rouvre un groupe résolu.

Le stockage contient uniquement des champs techniques autorisés : aucun
message d’exception, stack, contenu IA, adresse de membre, identifiant de membre,
paramètre d’URL ou secret. Les routes sont remplacées par des modèles connus
(par exemple `/workouts/:id`). Les événements du navigateur passent par une
route de même origine authentifiée ; les visiteurs sans session autorisée ne
sont pas couverts. Le collecteur limite et déduplique ses envois, sans réessai.

La table conserve au plus 2 000 groupes. Les groupes sans nouvelle occurrence
depuis trente jours sont exclus de la consultation et purgés lors d’une collecte
ultérieure, au plus toutes les quinze minutes par processus. Le compteur d’un
groupe actif est cumulatif depuis sa première détection ; il ne représente pas
un nombre d’utilisateurs ni un compteur glissant sur trente jours.

La collecte reste facultative pour les parcours : saturation, indisponibilité
de la base ou échec d’envoi peuvent faire perdre un événement. Les sondes de
disponibilité et logs d’exploitation restent nécessaires, notamment si l’API
ou le Web ne démarrent pas. Ce journal ne déclenche pas d’alerte automatique.

La migration additive `0014_technical_incidents` doit être appliquée par la
procédure de livraison habituelle avant l’utilisation de la nouvelle API.
Pour une recette locale avec les builds Web/API et une base PostgreSQL de test
distincte, définir `TEST_DATABASE_URL` et `LOCAL_INCIDENT_RECIPES=1`, puis lancer
`node scripts/qualify-local-incidents.mjs`. Le runner refuse une base distante
ou sans nom de test/audit, signe ses sessions synthétiques en mémoire et
simule le fournisseur sans appel payant. Il vérifie les accès, la collecte,
la déduplication, le changement de statut, la récidive et les affichages bureau/
mobile. Son rapport expurgé et ses captures se trouvent dans
`tmp/admin-incidents/` ; la recette ne prouve pas une connexion Google distante.

## Base de données

Avant une migration sensible, créer et identifier une sauvegarde ou branche
Neon ; vérifier sa restauration sur une cible distincte. Utiliser des
migrations additives et ne pas modifier un fichier déjà appliqué.
`docker compose down` conserve les données locales ; l'option `-v` supprime
le volume et son contenu et n'est pas une procédure de restauration.

Les scripts `db-backup.mjs` et `db-restore-check.mjs` utilisent un snapshot
cohérent, des comptages et un chiffrement authentifié. La restauration exige
une confirmation explicite, une base distincte et vide et le même majeur
PostgreSQL. Elle refuse d'écraser la source. Le mode `verify` du workflow DB
effectue cette répétition puis applique les migrations candidates sur la
copie seulement. Aucun dump clair ni ligne utilisateur n'est publié en artefact.

Les archives chiffrées Actions expirent après trente jours. Ce mécanisme
manuel n'établit ni cadence de sauvegarde, ni RPO/RTO, ni archivage indépendant.
Définir ces objectifs, organiser une copie extérieure si nécessaire et
conserver la clé de déchiffrement avec un accès et une récupération documentés.
Voir [production-runbook.md](production-runbook.md) pour les commandes,
preuves et conditions de reprise. Les preuves de restauration doivent être
renouvelées après changement de migrations ou expiration de leur validité.

## Mise à jour et support

Installer depuis le lockfile, examiner les dépendances, exécuter les contrôles,
puis livrer par la CI/CD. Réévaluer l'audit à la date de la livraison.

Un ticket contient : symptôme, étapes, résultat attendu/obtenu, environnement,
impact, version et éventuel contournement. Masquer données personnelles,
cookies, clés et informations de connexion.

Les points déjà identifiés sont dans
[release-readiness.md](release-readiness.md).

## Reprise de la surveillance après maintenance

Après une pause volontaire, l'opérateur peut définir la variable GitHub
`PROD_MONITOR_RESUMED_AT` à l'horodatage UTC d'une sonde de production réellement
observée à la reprise. Le moniteur choisit la plus récente de cette date et de
la dernière exécution planifiée. Son rapport conserve la date planifiée
antérieure, la date de reprise et la provenance de la référence retenue.
Une valeur absente ou vide conserve le contrôle historique ; une date invalide
ou future bloque la qualification. Cette référence ne se renouvelle pas
automatiquement : tout nouveau délai supérieur à 120 minutes reste une alerte.
Les contrôles JSON, schéma et SHA continuent à sonder les deux services ; les
simulations d'alerte et de reprise ne constituent jamais des sondes réelles.

Pour la reprise du 30 octobre 2026, la valeur factuelle à configurer est
`2026-10-30T11:43:21.649Z`, issue du [premier contrôle réel après la bascule](https://github.com/Kevinmrgt/aiSport/actions/runs/41050093047).
Ses contrôles Web/API et SHA étaient conformes ; l'échec concernait uniquement
l'intervalle historique laissé par la pause de maintenance. L'opérateur définit
la variable après livraison de ce support, puis rejoue le moniteur en mode
`production` et conserve son résultat.
