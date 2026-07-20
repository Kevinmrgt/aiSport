# B2-A24 — Démarrage OAuth Google en production

> Date d'observation : 2026-07-20
> Production observée : `https://ai-sport-web.vercel.app`
> Version servie au début du contrôle : `0.13.0-rc.1`

## Parcours réellement exécuté

1. ouverture directe de `/dashboard` sans session ;
2. redirection observée vers `/login` ;
3. présence d'un unique bouton accessible `Continuer avec Google` ;
4. activation du bouton ;
5. arrivée sur la page officielle `accounts.google.com` avec le formulaire
   `Adresse e-mail ou téléphone`.

La requête OAuth observée utilise :

- le scope `openid profile email` ;
- PKCE avec `code_challenge_method=S256` ;
- le callback HTTPS
  `https://ai-sport-web.vercel.app/api/auth/callback/google`.

## Limite explicite

Aucun identifiant, mot de passe ou code 2FA n'a été saisi. Le consentement, le
retour Auth.js, le cookie de session et les parcours authentifiés ne sont donc
pas déclarés validés. Cette étape requiert l'action du titulaire du compte
Google dans l'onglet de navigateur laissé ouvert.
