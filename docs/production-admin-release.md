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

Le propriétaire doit effectuer sa première connexion Google, vérifier une
séance et un programme réels, puis fournir les informations de l'éditeur et
du contact public, les traitements/transferts et durées de conservation retenus.
Contrats prestataires, budget, alertes, conservation indépendante des sauvegardes
et de leur clé et qualification sportive restent à confirmer avant ouverture.

L'ancienne intégration imposait des clés Stripe de test. Aucune facturation
n'est reprise et aucune opération Stripe distante n'est exécutée. Le propriétaire
conserve la vérification de son tableau de bord et le nettoyage des données de
test éventuelles.
