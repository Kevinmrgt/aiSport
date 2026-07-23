# B2-A42 — Accès jury sécurisé sans compte Google

## Objet

Permettre au jury de tester le prototype autonome
[https://ai-sport-web.vercel.app](https://ai-sport-web.vercel.app) sans utiliser
un compte Google personnel, tout en conservant les contrôles d'authentification,
d'autorisation et d'isolation des données.

## Conception retenue

- ajout d'un fournisseur Auth.js Credentials identifié `jury` ;
- identité technique stable et e-mail réservé, résolus ensuite en UUID par
  l'API et PostgreSQL ;
- mot de passe aléatoire remis séparément, seul son hash `scrypt` salé est
  configuré dans Vercel ;
- comparaison par `timingSafeEqual`, entrées bornées et message d'échec
  générique ;
- expiration absolue, kill switch et empreinte de configuration revalidés par
  le callback JWT à chaque lecture de session ;
- rotation du hash ou de la version de session invalidant les sessions déjà
  ouvertes ; la version doit aussi être renouvelée avant une réactivation ;
- règle Vercel Firewall active sur le callback jury : 10 tentatives par minute
  et par IP, puis refus ;
- quota de 30 générations réussies maximum, partagé entre séances et
  programmes, conservé dans PostgreSQL et incrémenté atomiquement par l'API ;
- refus de la 31e demande en HTTP 429 avec le code
  `GENERATION_QUOTA_EXCEEDED` ;
- réservation libérée après une erreur IA ou d'enregistrement, mais non
  remboursée lorsqu'une génération réussie est supprimée ;
- comptes Google non limités par ce quota ;
- parcours Google historique inchangé ;
- édition PDF confidentielle générée hors des chemins suivis par Git.

Il ne s'agit pas d'une route ouverte ou d'un contournement applicatif. Après la
connexion, le jury possède une session Auth.js normale. Les pages privées
continuent d'appeler `auth()` et l'API continue d'appliquer l'ownership par
utilisateur.

## Fichiers principaux

- `apps/web/lib/jury-auth.ts` : validation, hash, comparaison et expiration ;
- `apps/web/lib/auth-callbacks.ts` : révocation continue de la session ;
- `apps/web/lib/auth.ts` : fournisseur Credentials ;
- `apps/web/app/(auth)/login/page.tsx` : formulaire accessible ;
- `apps/web/lib/jury-auth.test.ts` et `apps/web/lib/auth.test.ts` : tests
  unitaires ;
- `apps/web/tests/e2e/auth.spec.ts` : parcours navigateur ;
- `apps/api/src/repositories/generation-quota.repository.ts` : réservation et
  décrément atomiques ;
- `apps/api/src/services/generation-quota.service.ts` : règles jury/Google et
  comptabilisation des succès ;
- `apps/api/src/routes/generation-quota.routes.ts` : état du quota protégé ;
- `apps/api/drizzle/0006_spotty_kingpin.sql` : persistance PostgreSQL ;
- `apps/web/components/GenerationQuotaNotice.tsx` : compteur commun accessible ;
- `docs/rncp/tools/build_bloc2_jury_pdfs.py` : édition privée.

## Recettes prévues et résultats

| Contrôle                            | Résultat attendu                                | Résultat                                                  |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Identifiants valides                | session Auth.js puis `/generate`                | réussi localement et en production sur `rc.7`             |
| Mauvais identifiant ou mot de passe | refus générique                                 | réussi localement et en production ; aucune session créée |
| Accès expiré                        | formulaire absent et session refusée            | tests unitaires réussis                                   |
| Kill switch désactivé               | formulaire absent et session existante révoquée | tests callback JWT réussis                                |
| Rotation du hash                    | session existante révoquée                      | tests callback JWT réussis                                |
| Déconnexion                         | cookie supprimé et route privée redirigée       | Playwright local et recette production réussis            |
| Compteur partagé                    | même solde sur les deux pages de génération     | 29/30 après un succès sur les deux pages en production    |
| Plafond concurrent                  | au plus 30 réservations jury acceptées          | intégration PostgreSQL concurrente réussie                 |
| 31e génération                      | HTTP 429 `GENERATION_QUOTA_EXCEEDED`            | tests API et service réussis                               |
| Erreur IA ou DB                     | réservation rendue au compte jury               | tests automatisés réussis                                 |
| Suppression d'un résultat           | aucun remboursement du quota                    | tests automatisés réussis                                 |
| Session Google                      | aucune limite jury appliquée                    | tests d'autorisation réussis                              |
| PDF public                          | URL présente, aucun secret                      | gate documentaire réussie sur les deux PDF `rc.7`         |
| PDF jury privé                      | URL, mode d'emploi et identifiants présents     | hash runtime vérifié avant génération privée              |

## Preuve de production

- commit : `d42e7f2c8fc86f26c46f850d32eb748870c6140d` ;
- CI : `29994929981`, six jobs réussis, 267 tests (14 shared, 179 API,
  74 Web) et intégration PostgreSQL concurrente ;
- CD : `29995297354`, migration, API, Web et smoke tests réussis ;
- healthchecks : API liveness/readiness et Web en HTTP 200, version
  `0.13.0-rc.7`, base et configuration IA `ok` ;
- navigateur intégré : connexion valide vers `/generate`, une génération
  validée puis compteur à 29/30, même solde affiché sur
  `/programs/generate` ;
- console du navigateur : zéro erreur pendant la recette.

## Limites et exploitation

Cette pièce conserve la preuve de mise en service initiale sur `rc.7`. La
contre-recette de la baseline courante `rc.8`, sans nouvelle consommation du
quota, est consignée dans B2-A43.

L'accès est temporaire et doit être désactivé après l'évaluation. Le PDF privé
ne doit pas être publié. La règle de limitation Vercel protège le callback
`/api/auth/callback/jury`, sans remplacer la rotation du secret et de la version
de session. Les données créées pendant l'évaluation sont isolées par le compte
jury mais restent de vraies données de démonstration ; il faut éviter d'y
saisir des informations personnelles ou médicales. Le quota est global pour le
compte jury : il ne se réinitialise ni à la déconnexion, ni sur un autre
navigateur, ni après suppression d'une donnée créée.
