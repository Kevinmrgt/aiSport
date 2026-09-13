# Administration Alcide

L’espace /admin possède son propre cadre et une navigation regroupée par usage. Les adresses de l’application restent identiques malgré le déplacement des pages dans le groupe (site).

## Pages

- /admin : indicateurs et comptes à suivre ; /admin/statistiques : séries sur 7, 30 et 90 jours.
- /admin/membres et /admin/membres/[id] : recherche, filtres, état, soldes et dernières activités enregistrées.
- /admin/beta et /admin/beta/nouveau : accès de test ; les actions de gestion sont dans la fiche membre.
- /admin/abonnements et /admin/credits : états Stripe, échéances, dotations et ajustements.
- /admin/seances, /admin/programmes et leurs fiches : consultation des entraînements et activités liées.
- /admin/configuration/modeles et /admin/configuration/plateforme : valeurs enregistrées et modification.
- /admin/journal : auteur, cible, motif, date et changements.

Les listes sont paginées côté serveur par 25. Recherche, filtres et pagination sont conservés dans l’URL. Les liens de pagination font une navigation complète ; les liens admin ne préchargent pas les fiches et listes voisines. Le tiroir mobile utilise un dialogue natif avec fermeture Échap et retour du focus.

## Droits et suspension

Configurer les mêmes ADMIN_EMAILS côté Web et API. Les droits nécessitent une session standard ; les sessions bêta, jury et l’adresse réservée au jury ne deviennent pas administrateur.

Chaque lecture et mutation API contrôle les droits. Les Server Actions et accès directs Web sont également protégés. users.suspended_at est vérifié sur chaque requête protégée : une session déjà ouverte ne contourne pas la suspension. Les comptes administrateurs sont protégés.

Le membre suspendu voit /compte-suspendu. Les requêtes GET /account/status, GET /billing/status et POST /billing/portal restent accessibles pour consulter l’état, gérer un abonnement existant et se déconnecter. La création d’un abonnement et les fonctions sportives restent bloquées.

## Soldes et journal

Les générations bêta sont indépendantes des crédits standard. Ces derniers distinguent accueil, Premium et offerts. Les crédits offerts n’expirent pas et passent par les réservations, consommations et restitutions existantes.

Une attribution offerte exige un motif et une clé UUID. La même clé rejouée ne crée pas de nouvelle dotation ; des valeurs différentes produisent un conflit. Les ajustements bêta utilisent aussi cette protection. Les verrous et transactions empêchent les soldes négatifs et les doubles attributions concurrentes.

Chaque mutation administrateur écrit son journal dans la même transaction. Une erreur du journal annule la mutation. Les lectures administrateur ne créent ni compte de facturation ni dotation d’accueil. Un retrait bêta conserve le membre, les données sportives et le journal. Les mots de passe temporaires sont seulement renvoyés au moment de leur création/réinitialisation et ne sont jamais journalisés.

La migration 0011_admin_workspace.sql ajoute la suspension, les tables de journal et le début du suivi. Elle reprend les ajustements bêta historiques disponibles ; les autres actions sont suivies à partir de l’installation de la migration.

## Validation et déploiement

Commandes usuelles :

```sh
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter api test:integration:coverage
pnpm --filter api test:admin:integration
```

Les tests PostgreSQL nécessitent TEST_DATABASE_URL. La suite admin accepte uniquement une base locale alcide_admin_* ou le service PostgreSQL éphémère /alcide lorsque CI=true. Elle fait désormais partie de la suite d’intégration globale et de son rapport de couverture.

La recette navigateur utilise des comptes fictifs, une base PostgreSQL isolée et des sessions Auth.js signées avec des secrets locaux aléatoires. Elle ne constitue pas une validation du consentement OAuth Google externe. Les scénarios administrateur ont été exécutés avec un frontal local HTTPS/2, comme en production : le serveur Next local en HTTP/1.1 présentait des interruptions intermittentes de réponses de navigation sous l’automatisation.

Le workflow CD existant applique la migration avant de livrer l’API, puis le Web, après réussite de la CI sur main. La migration est additive et a été validée sur PostgreSQL 16 local. Aucun changement de configuration Stripe n’est nécessaire : la facturation reste en mode test.

Suppression définitive d’un membre, modification des entraînements, remboursements et résiliation depuis Alcide restent hors de cette version.
