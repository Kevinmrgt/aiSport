# Première production réservée à l'administrateur

Le 30 octobre 2026, le propriétaire a demandé la mise en production en ne
conservant que son compte administrateur. Cette décision remplace le choix
de reprise historique encore ouvert dans le rapport du 29 octobre.

Le workflow `Production - Closed admin release` sépare `plan` (lecture seule),
`rehearse` (sauvegarde chiffrée de la source Vercel, restauration isolée et
import sélectif sur copie), puis `deploy` (CI du SHA exact, preuves archivées,
nouvelle base, constructions sans alias, contrôles JSON/SHA et refus HTTP401,
puis promotion des deux services avec retour arrière).

L'ancienne base n'est ni réinitialisée ni supprimée. Les autres comptes,
séances, programmes, journaux et réglages ne sont pas importés dans la nouvelle
production. Ils restent dans l'ancienne base et sa sauvegarde pour retour arrière.
Seuls le profil et les éventuelles identités Google de l'administrateur sont
copiés, sans secrets OAuth, sessions, anciens réglages ou clés IA.

Le Web reçoit `AUTH_URL` et `NEXTAUTH_URL` à `https://www.alcideai.fr`.
Le callback Google attendu est
`https://www.alcideai.fr/api/auth/callback/google`. Les URI OAuth déjà autorisées
sont conservées ; la configuration Google réelle doit autoriser ce callback.

L'API utilise la connexion dédiée `ALCIDE_DATABASE_URL` lorsqu'elle est présente,
sinon `DATABASE_URL`. Une connexion dédiée vide ou invalide bloque le démarrage ;
elle ne provoque aucun repli vers l'ancienne base. La validation, le pool et la
sonde de santé partagent cette résolution. La livraison relit les variables et
les fixe dans les configurations privées des fonctions Node construites ; les
fonctions Edge conservent leur format. Aucun secret de ces fichiers n'est
archivé dans les preuves.

Pour vérifier les URL Web protégées par Vercel, la livraison crée si nécessaire
un accès d'automatisation temporaire, transmis uniquement par en-tête au candidat.
Elle vérifie aussi le callback Google canonique et révoque cet accès avant toute
promotion. Les redirections SSO provisoires de Vercel sont réessayées pendant
au plus 15 secondes de délai cumulé ; les contrôles JSON et de révision restent
stricts. Un échec déclenche également sa révocation ; la protection du projet
et les accès préexistants ne sont pas désactivés.

## Première connexion et contrôle d'accès

Les deux services reçoivent `PRODUCTION_ACCESS_MODE=admin-only` et une
allowlist `ADMIN_EMAILS` serveur. Google doit fournir `email_verified=true` ;
les anciens cookies sans cette preuve sont refusés. L'API exige aussi
l'attestation du Web et le secret service, avant toute création de compte.

La source ne possède pas de compte Google lié au profil administrateur.
`BOOTSTRAP_ADMIN_USER_ID` est donc configuré côté API avec l'UUID privé réellement
copié. La première connexion Google vérifiée du propriétaire peut lier ce seul
profil sous verrou SQL. Un autre UUID, une adresse différente, plusieurs
adresses autorisées, une session non vérifiée ou révoquée, ou un autre compte
déjà lié empêchent cette liaison. Le mode public ne réalise aucun rapprochement
automatique par email.

## Mises à jour après la première connexion

Dès que la base active contient une identité Google ou de nouvelles données,
le mode `update` remplace le bootstrap initial. Il exige le SHA exact qualifié,
le nom actuel de la base et `update_confirm=preserve-live-admin-production`,
avec `reuse_existing=false` et sans confirmation de copie.

Ce mode vérifie en lecture seule la connexion applicative dédiée, le nom SQL,
le compte administrateur et son UUID, les politiques fermées et la lignée
appliquée exacte. Un suffixe en attente est accepté uniquement par la grammaire
additive fermée : nouvelles tables avec types primitifs et défauts constants,
index et clés étrangères sur ces nouvelles tables, colonnes nullables sans
défaut ajoutées aux tables existantes. Aucune modification des treize premières
migrations, DML, suppression, changement de type ou contrainte ajoutée aux
anciennes tables n'est autorisé.

Avant toute écriture sur la base active, la préparation sauvegarde son contenu
entier en AES-256-GCM et restaure toutes les tables sur PostgreSQL isolé de même
version majeure. Les comptes de lignes doivent correspondre au manifeste.
Le suffixe candidat est ensuite appliqué à cette copie sous le verrou SQL
commun. Dans une transaction unique, les comptes et empreintes SHA-256 de
toutes les lignes et colonnes préexistantes, les contraintes, index, déclencheurs,
politiques, propriétaire et identité Google sont vérifiés avant commit.
Les empreintes de données restent en mémoire. La preuve publique contient les
résultats, les hashes SQL exacts du suffixe, le SHA candidat et le lien SHA-256
vers la preuve de restauration.

La phase release exige cette preuve fraîche, le backup chiffré intact et la CI
verte du SHA exact. Elle applique le même suffixe sur la même base active sous
le verrou `pg_advisory_lock(1946010371, 1)` et répète les contrôles avant commit,
puis construit et vérifie les candidats. Aucun bootstrap, import sélectif,
reset, remplacement de base ou baselining n'intervient. Les séances, programmes,
identités, réglages et compteurs sont conservés.

Le rollback applicatif restaure les paramètres et alias précédents. Les ajouts
SQL validés restent en place, compatibles avec l'ancien déploiement ; aucune
restauration automatique sur la base active ne peut écraser des données créées
après la sauvegarde. Les contrôles de candidats, de callback et de révision
restent obligatoires. L'API reçoit `AI_MAX_COMPLETION_TOKENS=11000` pour la
capacité du planificateur de septembre ; les budgets quotidiens et globaux ne
sont pas augmentés par ce workflow.

## Alias et retour arrière vérifié

Avant de modifier les paramètres Vercel, le workflow relève chaque alias public
par `GET /v4/aliases/{hostname}?projectId=...`. Il vérifie le projet, le déploiement
READY, sa métadonnée `sourceRevision` et la santé publique au même SHA. Cette
référence peut avoir une révision différente entre API et Web au départ. Le
champ `projects.targets.production` n'est pas une preuve d'alias servi et n'est
plus utilisé pour choisir le rollback.

Après promotion, une réponse saine portant exactement l'ancien SHA capturé
peut être réessayée ; le contrôle de l'affectation peut aussi attendre exactement
l'ancien déploiement. Les attentes sont 1, 2, 4, 8, 15, 15 et 15 secondes, avec
huit essais maximum et une échéance de 90 secondes avant un nouvel essai.
L'essai déjà engagé reste borné par la lecture d'alias (30 secondes) et la
requête de santé (20 secondes) ; aucune attente n'est illimitée. Un troisième SHA,
HTTP 500/503, du JSON invalide ou une readiness incorrecte bloque immédiatement.
Ces attentes concernent seulement les alias publics, jamais les URL candidates.
Les deux alias sont revérifiés au SHA qualifié après les deux promotions ; un
couple de versions différentes ne constitue pas une livraison complète.

En cas d'échec, les compensations restaurent les paramètres et vérifient leur
valeur, type, portée et absence initiale. Le rollback réaffecte les références
capturées, Web avant API, pour les composants dont la promotion a été tentée,
puis contrôle l'affectation et la santé de chacun au SHA antérieur propre à ce
composant. Les jetons temporaires créés par le workflow sont révoqués avant la
première promotion, avec compensation idempotente en cas d'erreur.

`rollbackComplete` exige ces vérifications. En cas de valeur `false`, consulter
`rollback.api` et `rollback.web` : échec de commande, convergence de l'alias,
lecture de l'environnement et nettoyage du jeton sont distingués sans valeurs
privées. Utiliser les `previousAliasReferences` vérifiées pour la reprise ; ne
pas sélectionner un déploiement d'après son seul statut production. Une commande
de promotion expirée peut continuer côté fournisseur : le succès de la commande
ou son erreur ne remplace donc pas la vérification des alias servis.

Contrats officiels : [Get an Alias](https://vercel.com/docs/rest-api/aliases/get-an-alias)
et [Vercel promote](https://vercel.com/docs/cli/promote).

## Publication explicite des coordonnées légales

Le secret GitHub `PRODUCTION_LEGAL_PUBLISHER_JSON` transporte une map JSON de
coordonnées publiques fournies et vérifiées par l'éditeur. Il ne faut y placer
aucun contact administratif privé, secret technique, donnée de compte ou URL de
base. Les valeurs réelles restent hors du dépôt, des tests et des preuves.

L'entrée `publisher_confirm` est vide par défaut : le secret est alors ignoré et
les variables légales existantes restent inchangées. Seule la valeur exacte
`publish-provided-required-notices`, en mode `deploy` ou `update`, autorise leur
application. La préparation valide déjà le payload, sans l'appliquer. La phase
release conserve les contrôles de CI, sauvegarde chiffrée et restauration isolée
avant toute écriture des variables.

La whitelist exige `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_ADDRESS`,
`LEGAL_OPERATOR_REGISTRATION`, `LEGAL_CONTACT_EMAIL`, `LEGAL_CONTACT_PHONE`,
`LEGAL_PUBLICATION_DIRECTOR`, `LEGAL_HOSTING_NAME` et `LEGAL_HOSTING_CONTACT`.
Le nom doit contenir la désignation légale réellement retenue, y compris la
mention EI lorsqu'elle s'applique. `LEGAL_DATA_HOSTING_NAME` et
`LEGAL_DATA_HOSTING_CONTACT` sont facultatifs mais doivent être fournis ensemble.
`LEGAL_VAT_NUMBER` est facultatif ; l'omettre conserve sa valeur antérieure.
L'omission d'une paire facultative conserve aussi les valeurs existantes.
Il n'existe pas d'opération de suppression via ce payload. Les clés inconnues,
objets imbriqués, valeurs vides, caractères de contrôle, balisage et URI
exécutables sont refusés. Le JSON est borné à 16 Kio et chaque champ est borné.

Seul le projet Web reçoit les clés fournies, sans préfixe `NEXT_PUBLIC_`. Le
workflow capture leurs anciennes valeurs, types, portées et absences, relit les
écritures, puis transmet les mêmes valeurs au build et aux fonctions Node du
candidat. Les variables partagées avec Preview ou Development sont scindées
pour préserver ces portées. Une configuration de fonction manquante, une
lecture du pull incohérente ou un artefact d'un autre projet bloque la promotion
et déclenche les compensations avec relecture. Le JSON de transport n'est pas
transmis aux commandes de sauvegarde ou Vercel ; les arguments de déploiement
ne contiennent que les noms des variables.

Les preuves donnent uniquement le nombre de clés et les résultats techniques.
Elles n'attestent ni la véracité des coordonnées, ni la conformité juridique
complète. Le texte des mentions est destiné à être rendu publiquement par le
Web. Cette injection ne configure ni la base légale des traitements, ni leurs
transferts, ni leurs durées de conservation et n'autorise aucune ouverture du
service ou recette IA payante.

## Recette API optionnelle avec le fournisseur réel

L'entrée `qualification_confirm` reste vide par défaut. Seule la valeur exacte
`one-workout-one-program-existing-admin`, avec un mode `deploy` ou `update`,
active la recette après la réussite des deux promotions. La validation des
entrées refuse les autres combinaisons avant toute modification distante.

La recette relit la CI du SHA, les deux configurations fermées, les affectations
réelles des domaines et les révisions publiques. Elle exige l'unique compte
administrateur épinglé avec sa liaison Google déjà présente ; elle ne crée ni
identité, ni session, ni JWT. Son authentification est un appel administratif
service-à-service avec le secret existant. Le nom stocké est réémis exactement
pour préserver le profil lors de la résolution d'identité.

Cette vérification est explicitement différente d'une nouvelle connexion Google
et d'un parcours navigateur : le rapport indique `googleFreshLoginTested=false`
et `browserInteractionTested=false`. Les identifiants d'alias/projet/déploiement
et le SHA sont contrôlés avant chaque transport privilégié, sans suivre de
redirection vers un autre hôte.

Le script envoie au maximum une demande de séance de marche de quinze minutes
et une demande de programme de deux semaines, deux séances de vingt minutes
par semaine. Les reprises internes du fournisseur restent soumises aux mêmes
budgets et limites applicatives. Un échec arrête les nouvelles demandes ; les
clés restent identiques lors d'une relance GitHub du même run pour empêcher un
nouvel appel payé involontaire.

Les contenus restent en mémoire privée. Les contrats de prescriptions v2,
durées prévues, persistance et comptabilité sont vérifiés. Le nettoyage ne vise
que les ressources rattachées en lecture seule aux deux clés de cette recette.
La restitution des crédits virtuels passe par l'API d'administration normale,
avec audit et clé idempotente, uniquement lorsque le débit et la suppression
sont prouvés. Les coûts IA réellement consommés et les tentatives ne sont pas
annulés. Toute incertitude ou activité concurrente empêche une dotation aveugle
et produit `manualCleanupRequired`.

Le rapport expurgé `admin-production-recipe.json` est borné à `RUNNER_TEMP` et
joint aux preuves du workflow. Il ne contient aucun nom, sujet Google, secret,
URL de base, prompt, contenu généré ou erreur brute. Le script ne demande aucun
secret OpenAI, Google ou Stripe supplémentaire et n'exécute aucun SQL d'écriture.

## Exploitation et reliquat

L'adresse est fournie par le secret GitHub `BOOTSTRAP_ADMIN_EMAIL` ; elle n'est
jamais codée dans le dépôt. La création exige une base absente. Une reprise
explicite avec `reuse_existing=true` ne réutilise une base existante qu'après
vérification intégrale en lecture seule : même compte et mêmes identités,
historique canonique exact, aucune séance, session, préférence ou compteur.
Toute différence bloque la reprise, sans correction ni écrasement. Aucun `DROP`
n'est prévu. Les diagnostics n'exposent ni stderr brut, ni valeurs
d'environnement. La livraison automatique générale `ENABLE_GHA_VERCEL_CD` est
désactivée pendant la transition ; le workflow fermé effectue la livraison.
Avant réactivation, synchroniser ses connexions avec la nouvelle cible et
satisfaire son préflight. Aucune validation juridique ou sportive, connexion
Google réelle ou réception d'alerte n'est inventée.

Lors d'une première initialisation, le propriétaire effectue sa connexion
Google ; les mises à jour conservent ensuite cette liaison. La vérification
navigateur et une connexion neuve restent distinguées de la recette API.
Avant l'ouverture, il faut fournir les informations de l'éditeur et
du contact public, les traitements/transferts et durées de conservation retenus.
Contrats prestataires, budget, alertes, conservation indépendante des sauvegardes
et de leur clé et qualification sportive restent à confirmer avant ouverture.

Le produit restauré de référence `fd750f0` contient les offres, abonnements et
crédits en mode Stripe de test. Les anciennes données de facturation ne sont pas
importées dans la base active. La recette API ne lance ni Checkout ni paiement
Stripe ; sa restitution porte uniquement sur ses crédits virtuels prouvés.
L'activation d'encaissements réels reste une décision et une livraison séparées.
