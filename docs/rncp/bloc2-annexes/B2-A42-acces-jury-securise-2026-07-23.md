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
- `docs/rncp/tools/build_bloc2_jury_pdfs.py` : édition privée.

## Recettes prévues et résultats

| Contrôle                            | Résultat attendu                                | Résultat                                                                   |
| ----------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Identifiants valides                | session Auth.js puis `/generate`                | tests unitaires réussis ; recette production à compléter après déploiement |
| Mauvais identifiant ou mot de passe | refus générique                                 | tests unitaires réussis                                                    |
| Accès expiré                        | formulaire absent et session refusée            | tests unitaires réussis                                                    |
| Kill switch désactivé               | formulaire absent et session existante révoquée | tests callback JWT réussis                                                 |
| Rotation du hash                    | session existante révoquée                      | tests callback JWT réussis                                                 |
| Déconnexion                         | cookie supprimé et route privée redirigée       | Playwright local et recette production à compléter                         |
| PDF public                          | URL présente, aucun secret                      | gate documentaire à exécuter                                               |
| PDF jury privé                      | URL, mode d'emploi et identifiants présents     | contrôle privé à exécuter                                                  |

## Limites et exploitation

L'accès est temporaire et doit être désactivé après l'évaluation. Le PDF privé
ne doit pas être publié. La règle de limitation Vercel protège le callback
`/api/auth/callback/jury`, sans remplacer la rotation du secret et de la version
de session. Les données créées pendant l'évaluation sont isolées par le compte
jury mais restent de vraies données de démonstration ; il faut éviter d'y
saisir des informations personnelles ou médicales.
