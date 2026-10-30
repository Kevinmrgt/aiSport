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

## Exploitation et reliquat

L'adresse est fournie par le secret GitHub `BOOTSTRAP_ADMIN_EMAIL` ; elle n'est
jamais codée dans le dépôt. La nouvelle base doit être absente. Aucun `DROP`
ni écrasement n'est prévu. Les diagnostics n'exposent ni stderr brut, ni valeurs
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
