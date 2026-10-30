# Audit UX, accessibilité et préparation produit — 29 octobre 2026

Responsable : agent UX dédié. Code candidat examiné : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche `codex/nettoyage-projet`. Lecture statique des formulaires, navigation, timer, journal, états de chargement et d'erreur, présentation et métadonnées. Aucun fichier applicatif modifié, aucune connexion ou génération soumise.

## Deux périmètres à conserver distincts

Le 29 octobre, vers 13:47–13:49 UTC, le navigateur public redirige `https://ai-sport-web.vercel.app/` vers `https://www.alcideai.fr/`. L'interface servie diffère visiblement du code candidat : H1 « Créer une séance », navigation « L'approche / Les programmes / Les offres », route `/tarifs`, et page de connexion contenant « Accès jury » et « Accès bêta ». Le candidat local n'a ni route tarifs ni ces deux accès temporaires. Le SHA réellement servi par ce domaine n'a pas été déterminé par cet agent ; les observations ne sont donc attribuées ni au HEAD local ni automatiquement au dernier CD GitHub connu.

La page tarifs annonce « Paiements de test · aucun prélèvement réel », des crédits de bienvenue et un abonnement Premium. Aucune interaction de paiement n'a été effectuée. La cible confirmée par le propriétaire est le dépôt aiSport actuel sur `www.alcideai.fr` : cet état distant doit donc être remplacé par le candidat qualifié, avec vérification du mapping Vercel, des callbacks OAuth et des données. Il ne faut pas réintroduire la facturation absente du candidat pour reproduire l'ancien site. Vérifier le retrait effectif des accès temporaires ; leur présence visuelle ne prouve pas qu'ils permettent encore une connexion. Ce constat rejoint le risque de livraison du rapport exploitation.

## Contrôles navigateur réellement effectués

| Surface publique déployée          | Observation                                                                                           | Limite                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Accueil, 390 × 844                 | Mise en page lisible sur la capture ; largeur document = 390 px, pas de débordement horizontal mesuré | Émulation de viewport, pas essai sur téléphone réel                          |
| Accueil, 1440 × 900                | Navigation principale complète ; largeur document = 1440 px                                           | Pas de mesure exhaustive de performance ou de contraste                      |
| Première tabulation sur l'accueil  | Le lien « Aller au contenu principal » reçoit le focus et apparaît dans le viewport                   | Ce contrôle ne qualifie pas toute la navigation clavier                      |
| Connexion, 320 × 720               | H1 « Connexion », aucune boîte de contenu principal dépassant les bords dans le contrôle DOM effectué | Aucune connexion Google, jury ou bêta soumise                                |
| `/programs/generate`, sans session | Redirection vers `/login?callbackUrl=%2Fprograms%2Fgenerate`                                          | Retour après OAuth non exécuté ; ce comportement distant diffère du candidat |
| `/tarifs`                          | Page d'offres et signalement des paiements de test accessibles                                        | Facturation, Stripe et crédits non audités par cet agent                     |

Captures locales, ignorées par Git : `tmp/production-audit-2026-10-29/mobile-home.png`, `mobile-login.png`, `desktop-home.png`. Elles documentent le site effectivement observé, pas le rendu du candidat.

## Constats sur le code candidat

P2 désigne un défaut ou une amélioration de parcours à traiter ; P3 une finition de présentation. Aucun P0 ou P1 exclusivement UX n'a été démontré. La discordance des versions reste une condition préalable à toute qualification finale.

### UX-01 — P2 — La déconnexion disparaît sur petit écran

**Preuve.** `apps/web/app/layout.tsx:99` contient l'unique formulaire de déconnexion ; son bouton porte `hidden … sm:flex` à la ligne 109. Il est donc masqué sous 640 px. La navigation mobile réutilise `NAV_ITEMS` (`layout.tsx:33`, 127), qui ne contient que Progression, Séance, Programmes, Historique et Coach. `apps/web/app/settings/page.tsx` est une présentation du coach, sans commande de compte ou de déconnexion.

**Impact.** Un utilisateur connecté sur téléphone n'a pas de commande visible pour terminer sa session ou changer de compte. Constat statique ; aucune session privée n'a été créée pour le reproduire dans un navigateur.

**Action / responsable.** Frontend : rendre la déconnexion accessible à tous les breakpoints, par exemple dans un menu de compte identifié ou sur une page de compte.

**Acceptation.** À 320, 390, 768 et 1440 px, avec session réelle, la commande est atteignable au clavier et au toucher ; après activation, session terminée, routes privées refusées, destination et focus compréhensibles.

### UX-02 — P2 — Une contrainte physique trop longue bloque le formulaire sans explication

**Preuve.** Les schémas limitent `constraints` à 500 caractères (`packages/shared/src/schemas/workout.schema.ts:90`, `program.schema.ts:156`). Les formulaires enregistrent toutes les erreurs dans `fieldErrors` puis positionnent le focus (`WorkoutForm.tsx:48`, `ProgramForm.tsx:72`). Cependant les zones `constraints` (`WorkoutForm.tsx:192`, `ProgramForm.tsx:269`) n'affichent pas `errors.constraints`, n'ont ni `aria-invalid`, ni association à un message d'erreur, ni `maxLength` ou indication de limite. Les champs objectifs ont, eux, un message associé.

**Impact.** Avec des valeurs autrement valides et 501 caractères de contraintes, la validation refuse la soumission et revient sur le champ, sans indiquer quoi corriger. Le comportement découle du schéma et du rendu ; aucune génération réelle n'est nécessaire pour le vérifier.

**Action / responsable.** Frontend : annoncer la limite, afficher l'erreur associée au champ et préserver la saisie. Une limite native peut compléter ce retour sans remplacer les contrôles serveur.

**Acceptation.** Test de formulaire avec 500 puis 501 caractères : valeur limite acceptée, dépassement expliqué visuellement et au lecteur d'écran, aucun appel de génération en cas d'erreur, correction puis soumission possible.

### UX-03 — P2 — La connexion ramène toujours à la génération de séance

**Preuve.** Les pages privées renvoient simplement vers `/login` sans conserver la destination, par exemple `apps/web/app/programs/generate/page.tsx:13`. Le formulaire Google impose ensuite `redirectTo: '/generate'` (`apps/web/app/(auth)/login/page.tsx:29`).

**Impact.** Le visiteur qui choisit « Planifier un cycle » ou ouvre une ressource privée perd son intention après connexion. Cela diffère du site distant, dont la redirection publique conserve un `callbackUrl` ; ce constat concerne le candidat uniquement.

**Action / responsable.** Frontend/authentification : transmettre puis valider une destination interne autorisée, avec destination de repli explicite.

**Acceptation.** Depuis un profil sans session, ouvrir la création de programme ou une ressource accessible au compte, se connecter et atteindre la destination demandée. Refuser une destination externe ou mal formée.

### UX-04 — P2 — La séance en cours n'a pas de reprise après rechargement

**Preuve.** L'étape, le temps restant, le statut et la durée active résident dans `useState`/`useRef` (`apps/web/components/Timer.tsx:178–190`). Aucune sauvegarde/reprise de cette exécution n'est présente. L'écriture du journal intervient à la fin via `SessionCompletionForm`, pas au démarrage.

**Impact.** Un rechargement, une fermeture ou une navigation qui démonte le timer perd la progression de l'exécution. C'est un risque de continuité déduit du code, pas la preuve d'un incident observé sur téléphone. Le calcul par échéance `Date.now()` protège déjà mieux le temps restant qu'un simple décrément par intervalle, tant que le composant reste vivant.

**Action / responsable.** Produit + frontend : décider explicitement du comportement attendu, puis proposer une reprise bornée par utilisateur/séance ou un avertissement avant abandon. La sauvegarde ne doit pas inclure de notes sensibles inutiles.

**Acceptation.** Test démarrage/pause, navigation/rechargement et retour : reprise proposée ou abandon explicitement confirmé ; temps et étape cohérents ; aucun journal créé en double. Vérifier aussi retour après mise en veille sur de vrais navigateurs mobiles.

### UX-05 — P3 — L'accueil conserve du texte de conception et des jauges fictives

**Preuve.** `apps/web/app/page.tsx:148–155` présente « Scroll immersif », « Le fond reste en place, le contenu avance » et une phrase décrivant la révision de la page d'accueil. Des jauges fixes affichent 74 « prêt » (`page.tsx:90`) et 84 « plan » (`apps/web/app/programs/generate/page.tsx:55`) sans mesure liée au compte ou à une progression. Plusieurs textes visibles ont perdu leurs accents.

**Impact.** Ces éléments décrivent la fabrication de l'interface ou suggèrent un état chiffré sans signification produit. Ils ne figurent pas sous cette forme dans l'accueil distant observé.

**Action / responsable.** Produit/contenu : remplacer les notes de conception par un bénéfice ou une aide concrète ; supprimer, expliquer comme illustration ou relier les jauges à une valeur réelle ; réviser le français visible.

**Acceptation.** Relecture des pages publiques et privées sans texte de chantier ni indicateur présenté comme réel sans source ; terminologie cohérente séance/programme/coach.

### UX-06 — P3 — Les métadonnées publiques restent génériques

**Preuve.** Le candidat définit un titre et une description communs dans `apps/web/app/layout.tsx:24`, avec une exception pour la confidentialité. Aucun fichier `robots`, `sitemap` ou configuration canonique/Open Graph n'est présent dans `apps/web/app` au moment de la revue.

**Impact.** Les pages partagées et indexées sont moins faciles à distinguer. L'absence de ces fichiers n'empêche pas techniquement le fonctionnement du service et n'est pas, en elle-même, un blocage d'ouverture.

**Action / responsable.** Frontend + produit : une fois le domaine canonique fixé, définir les métadonnées et aperçus utiles aux pages publiques, puis décider explicitement de l'indexation des pages de compte.

**Acceptation.** Vérifier titres, descriptions, URL canonique et aperçu de partage sur l'origine finale ; contenu privé toujours protégé par l'authentification, indépendamment des consignes d'indexation.

## Acquis et qualification restante

Le candidat possède déjà labels explicites, focus sur le premier champ invalide, annonces de chargement et d'erreur, lien d'évitement, titres et repères, confirmation de suppression, onglets navigables au clavier, gestion du focus en plein écran du timer, pages de chargement et état d'erreur avec reprise. Les listes fournissent des états vides orientés vers une action utile.

La politique de contact support public manque dans le candidat et le pied de page ; le rapport vie privée traite le responsable et le contact. Définir aussi un canal utilisable pour un incident de compte ou de génération, sans inviter à publier des données personnelles dans une issue publique.

Ce travail ne constitue pas une déclaration de conformité RGAA/WCAG. Aucun audit complet de contraste composite, aucun lecteur d'écran, aucune session privée, aucune connexion Google, aucun timer sur téléphone réel ni test de paiement n'a été exécuté par cet agent. Les résultats historiques de juillet et un smoke public actuel ne prouvent pas les transitions privées : reprendre NVDA/clavier, suppression, déconnexion, focus de destination, erreurs de formulaires et zoom 200/400 % sur la révision finalement livrée, en enregistrant navigateur, technologie d'assistance, scénario et résultat.
