# Abonnements Stripe — mode test

Cette intégration ne prélève pas d'argent réel. Les clés `sk_live_` et les événements réels sont refusés. Aucun déploiement ni migration de la base distante n'a été effectué dans cette intervention.

## Offre et comportement

- Compte Google : 3 crédits de bienvenue, une seule fois, sans expiration.
- Premium : 9,99 € TTC par mois, renouvellement automatique, 30 crédits par période mensuelle payée, sans report des crédits inutilisés.
- Une séance coûte 1 crédit ; un programme coûte autant de crédits que de semaines.
- Les crédits Premium sont utilisés avant les crédits de bienvenue.
- Le débit est réservé avant la génération et confirmé dans la transaction qui sauvegarde le résultat. Un échec restitue les crédits au lot d'origine. Les réservations abandonnées sont récupérables après 10 minutes.
- La résiliation via le portail Stripe prend effet à la fin de la période payée. Le paiement d'un nouveau mois est nécessaire pour obtenir 30 nouveaux crédits.
- Les accès jury et bêta conservent leurs règles antérieures.

Les pages `/tarifs` et `/abonnement` utilisent les composants, couleurs et styles existants d'Alcide. La saisie de carte est hébergée par Stripe ; Alcide ne reçoit aucun numéro de carte.

## Configuration locale

Les identifiants de test fournis sont conservés dans `.env.stripe.test`, à la racine, fichier ignoré par Git. Ne pas le partager ou le commiter. La clé publique n'est pas nécessaire au paiement hébergé choisi ; la clé secrète reste exclusivement côté API.

Variables requises côté API :

| Variable                          | Usage                                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`               | Clé secrète du compte Stripe de test                             |
| `STRIPE_WEBHOOK_SECRET`           | Signature du relais local ou de l'endpoint distant correspondant |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Tarif test mensuel de 999 centimes EUR, taxes incluses           |
| `STRIPE_PORTAL_CONFIGURATION_ID`  | Portail test configuré pour résilier en fin de période           |
| `FRONTEND_URL`                    | Origine du site, utilisée pour les retours de paiement           |
| `DATABASE_URL`                    | Base de développement dédiée, avec les migrations appliquées     |
| `SERVICE_SECRET`                  | Secret de service identique côté API et web                      |

Conserver la configuration Google/Auth.js existante côté web et un `API_URL` pointant sur cette API. En local, placer la configuration API dans `apps/api/.env.local`, puis lancer depuis la racine :

```powershell
pnpm build:shared
pnpm --filter api dev:stripe
```

Dans un second terminal, démarrer le web avec sa configuration locale habituelle :

```powershell
pnpm --filter web dev
```

Le script `dev:stripe` charge `.env`, `.env.local` de l'API puis le fichier privé `.env.stripe.test`. Les variables déjà définies dans le processus sont prioritaires. Les commandes de migration ne chargent pas ce fichier automatiquement : définir explicitement `DATABASE_URL` pour la base de développement visée avant `pnpm db:migrate`. La migration `0008_stripe_billing.sql` doit être appliquée avant de démarrer cette version de l'API.

## Notifications Stripe

Avec la CLI officielle Stripe authentifiée sur le même compte de test, démarrer le relais vers le port de l'API (3001 par défaut) :

```powershell
stripe listen --latest --events checkout.session.completed,invoice.paid,invoice.payment_failed,invoice.payment_action_required,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted --forward-to http://localhost:3001/billing/webhook
```

Le secret `whsec_` du relais utilisé doit correspondre à `STRIPE_WEBHOOK_SECRET`. Redémarrer l'API si ce secret change. La session de test vérifiée utilisait le relais officiel et une base locale isolée ; elle ne remplace pas un endpoint permanent.

Pour un environnement distant de test, créer un endpoint Stripe de **test** vers `https://<domaine-api>/billing/webhook`, avec les mêmes événements et la version API `2026-08-26.dahlia`, puis utiliser **son propre** secret de signature côté serveur. Ne pas réutiliser le secret de la CLI pour cet endpoint. Les webhooks signés sont vérifiés sur le corps brut ; les doublons sont ignorés et l'état courant de l'abonnement est relu chez Stripe.

Le retour de Checkout synchronise aussi la session du seul utilisateur connecté. Il ne suffit pas à assurer les renouvellements : les notifications doivent rester opérationnelles.

## Ressources du compte de test

- Tarif : `price_1UEOJ8CGHSNEMs6SfSBDnvHM`.
- Configuration du portail : `bpc_1UEOJ8CGHSNEMs6S6A5iaeXQ`.
- Le script `node apps/api/scripts/setup-stripe-test.mjs` crée ou retrouve les ressources de test ; il n'affiche aucune clé.

## Vérification et limites

Recette du 11 septembre 2026 : 252 tests API, 164 tests web et 6 tests SQL réussis ; compilation API et build de production web réussis. Les pages tarifs et abonnement ont été contrôlées à 1440 px et 390 px : aucun débordement horizontal ni violation détectée par axe sur les règles WCAG 2 A/AA et 2.1 A/AA. Cela ne constitue pas une certification d'accessibilité exhaustive.

Le paiement fictif a attribué 30 crédits Premium en conservant les 3 crédits de bienvenue. La résiliation depuis le portail a été reconnue, y compris lorsque Stripe utilise `cancel_at` plutôt que `cancel_at_period_end` : accès conservé jusqu'au 11 octobre 2026. Les serveurs, la base en mémoire et le relais utilisés pour cette recette ont ensuite été arrêtés.

```powershell
pnpm --filter api test
pnpm --filter web test
# Base locale dédiée, déjà migrée ; ne jamais employer la base de production :
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres'
pnpm --filter api test:billing:integration
```

Les tests couvrent les signatures, l'autorisation, les événements dupliqués, les factures payées/non payées, les crédits concurrents, les erreurs de sauvegarde, l'expiration et la résiliation. Le scénario navigateur vérifié utilise une session Google simulée uniquement dans l'environnement local isolé, un vrai Checkout Stripe de test, une carte fictive et le portail de résiliation. Il ne constitue pas un test OAuth Google réel. Aucun appel IA payant n'a été lancé pendant ce scénario. Les tests SQL ont été exécutés sur PGlite local ; refaire la recette sur le PostgreSQL cible avant publication.

Avant une mise en ligne de test : sauvegarder la base cible, appliquer la migration, configurer les secrets serveur et l'endpoint test, déployer API et web ensemble, puis vérifier la connexion Google réelle et un cycle de paiement complet. Le passage aux paiements réels nécessite une décision et une validation distinctes, notamment sur les obligations commerciales, fiscales et les conditions de vente.
