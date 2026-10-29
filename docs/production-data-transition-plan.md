# Transition des données vers le dépôt local retenu

La vérification distante du 29 octobre 2026 de la base pointée par le secret
GitHub de migration a constaté PostgreSQL 17 et des
tables de bêta, facturation et administration. Elles contiennent des données,
dont un historique d'abonnement et des événements administratifs.
L'archive chiffrée et la restauration isolée ont été exécutées dans
[le run de vérification](https://github.com/Kevinmrgt/aiSport/actions/runs/40906647794).
La répétition des migrations candidates a échoué. La source est restée intacte.
La correspondance avec la connexion configurée sur Vercel doit encore être
établie ; une empreinte d'adresse serveur différente ne suffit pas, seule,
à conclure qu'il s'agit de deux bases logiques distinctes.

## Ce que le candidat permet déjà

Le dépôt local reste le produit choisi. Le contrôle de lignée refuse tout
historique qui ne correspond pas exactement à un préfixe de ses migrations.
La sauvegarde est chiffrée, les essais portent sur une cible distincte et
les comptes de lignes sont comparés. Les rapprochements de comptes par email
ne sont jamais automatiques.

Cette garde protège les données ; elle ne réalise pas leur conversion.
Le main distant et le candidat local ont des migrations différentes après 0006. Les fonctions retirées de l'interface ne font pas disparaître leurs
données ni les éventuelles obligations associées.

## Décision à obtenir du responsable du produit

Préciser le devenir des comptes, séances, programmes, crédits, abonnements
et traces d'administration de l'offre précédente. Il faut notamment décider
si les utilisateurs conservent leurs droits et leur historique, et comment
les éventuels abonnements sont traités côté fournisseur avant retrait des
routes correspondantes. Un champ ou une table ne permet pas de conclure
qu'une offre est encore active ni qu'elle peut être supprimée.

L'export et l'effacement du nouveau produit ne couvrent pas les tables de
l'autre branche. Une mise en ligne sur cette base sans adaptation serait
donc incorrecte, même si les nouvelles migrations pouvaient être exécutées.
Le champ de suspension et les événements d'administration conservés après
effacement font également partie de cette reprise.

## Lot technique à réaliser après cette décision

1. Conserver une sauvegarde indépendante restaurable et l'accès de secours
   à sa clé. L'artefact GitHub expirant n'est pas cette conservation.
2. Construire une nouvelle copie de qualification, en gardant les migrations
   déjà appliquées et leurs empreintes inchangées. Aucun baseline ou changement
   du registre ne doit servir à contourner la garde.
3. Si la base historique est reprise, ajouter les migrations du nouveau
   produit à son historique canonique ; mettre en cohérence schémas et snapshots
   sans supprimer les tables conservées. Si une autre cible est choisie,
   définir explicitement les transferts, les associations d'identité et
   les contrôles de non-perte. Ne jamais repartir d'une base vide par défaut.
4. Adapter export, effacement, révocation, conservation et suspension aux
   données réellement conservées. Séparer les obligations de conservation
   des données utilisées par le produit et tester leurs droits d'accès.
5. Répéter la conversion sur copie avec jeux anonymes représentatifs et
   contrôles de comptes, contraintes, identités et données métier.
6. Recetter une connexion Google neuve, deux comptes isolés, les parcours
   réels IA, les droits repris et les obligations liées à l'offre antérieure.
7. Préparer la fenêtre de bascule, le couple Web/API, le retour arrière,
   les alertes et les preuves du SHA final. La source ne change qu'après
   satisfaction des préconditions de production.

La PR de préparation technique reste en brouillon. Cette décision de
continuité du produit ne peut pas être remplacée par une attestation
automatique ou par la réussite des tests avec des comptes synthétiques.
