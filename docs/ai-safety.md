# Génération IA : garanties logicielles et qualification restante

## Périmètre produit

Alcide prépare des activités sportives générales. Le service ne constitue
ni un diagnostic, ni un traitement, ni une rééducation. Avant tout appel
fournisseur, le code refuse les demandes contenant les situations médicales
et instructions de contournement reconnues par son filtre conservateur.
Il demande alors de ne transmettre qu'un objectif sportif général, et
oriente la reprise en contexte médical vers un avis professionnel.

Ce filtre textuel n'est pas une classification exhaustive : paraphrases,
langues non couvertes et ambiguïtés peuvent lui échapper, et il peut refuser
une formulation bénigne. Il réduit les cas évidents, sans certifier la
sûreté sportive ni remplacer la minimisation des données des formulaires.

## Consignes et durée

Les consignes prioritaires sont envoyées dans un message `developer`.
Objectifs et contraintes sont sérialisés comme données dans un message
`user`. L'instruction de progression modérée ne prescrit plus une semaine
de charges maximales. Les sorties explicitement risquées reconnues sont
refusées ; un refus ne déclenche pas de nouvelle tentative automatique.
Échauffement et retour au calme sont requis dans chaque nouvelle séance.

La fonction historiquement appelée « normalisation » ne redistribue plus
les secondes et ne remplace plus descriptions, conseils, séries ou
répétitions. La durée détaillée doit correspondre à la durée demandée.
Un écart, même petit, provoque une nouvelle génération dans la limite des
tentatives et délais, puis un échec lisible. La lecture historique doit
restituer les données validées, sans réécriture opportuniste des consignes.

Cette règle protège l'intégrité des consignes : elle ne prouve pas que le
modèle a proposé un mouvement ou un volume approprié.

## Contrat fournisseur et budget

Une réponse est exploitable seulement si `finish_reason` vaut `stop`, que
le contenu n'est pas un refus et que le JSON respecte le contrat métier.
Troncature, filtrage et protocole inattendu échouent explicitement.

Les erreurs permanentes d'identifiants, droits ou requête ne sont pas
retentées. Les codes fournisseur de crédit/quota/dépense épuisés ne le sont
pas non plus. Les erreurs temporaires peuvent être retentées une fois.
`Retry-After` est un minimum respecté : si le délai annoncé dépasse dix
secondes ou le temps restant, l'opération échoue sans retenter plus tôt.
Sans indication serveur, le délai de repli comporte une petite variation.
Les échéances globales restent bornées pour laisser de la place à la
persistance dans l'enveloppe d'exécution.

Une erreur de semaine annule ses voisines et attend leur terminaison avant
de rendre le résultat. Un `AbortSignal` externe est propagé aux appels et
aux délais de reprise. L'annulation locale ne prouve pas à elle seule que
le fournisseur n'a rien facturé.

`AiExecutionOptions` permet au service appelant de brancher une réservation
persistante : `onAttempt({model,maxCompletionTokens})` est attendu avant
chaque `fetch`; son échec empêche cet appel. `onUsage` reçoit les compteurs
et l'identifiant de requête lorsqu'ils sont valides, y compris pour une
complétion refusée ou tronquée. Une réponse sans mesure valide doit rester
comptée prudemment par le mécanisme de budget. Un échec du suivi n'entraîne
jamais automatiquement un second appel payant.

`store:false` est envoyé. Aucun prompt, contenu fournisseur brut, clé ou
message de validation contenant une saisie n'est journalisé par ces
services ; seuls catégories d'erreur et compteurs techniques le sont.
Les conditions de conservation du compte fournisseur restent à vérifier
séparément : cette option ne constitue pas une garantie de rétention nulle.

## Corpus et preuve avant ouverture

Les tests locaux utilisent uniquement un `fetch` simulé :

- `program-duration.service.test.ts` protège la conservation des consignes,
  le refus de deux blocs de 20 secondes étirés vers vingt minutes et les
  écarts de durée.
- `ai.service.test.ts` protège rôles, usage, réservation avant HTTP,
  refus/troncature, erreurs permanentes, délais et annulation.
- `ai-safety.test.ts` contient des demandes médicales et hostiles, des
  objectifs généraux acceptés et des sorties explicitement risquées.
- Les tests de génération vérifient régénération d'une durée incorrecte et
  annulation effective d'une semaine voisine en cas d'erreur permanente.

Ces tests sont un corpus logiciel, sans appel IA réel. Avant ouverture,
un professionnel compétent doit encore examiner des sorties représentatives
sur les sports, niveaux, volumes, récupération et limites retenus par le
produit. La recette doit identifier modèle, prompt, révision et résultat
affiché. Aucune validation sportive humaine n'est affirmée par ce document.
Les changements de modèle ou de prompt imposent de rejouer cette recette.

## Sources fournisseur

Contrats vérifiés dans l'[API Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create),
la [gestion des erreurs](https://developers.openai.com/api/docs/guides/error-codes)
et les [limites de débit](https://developers.openai.com/api/docs/guides/rate-limits),
consultés le 29 octobre 2026. Ces sources décrivent le protocole fournisseur,
pas une certification sportive de l'application.
