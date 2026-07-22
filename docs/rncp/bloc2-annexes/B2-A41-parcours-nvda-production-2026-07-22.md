# B2-A41 - Parcours réel NVDA sur la production

> Date d'exécution : 2026-07-22, de 10:34 à 10:56 UTC  
> Production observée : `https://ai-sport-web.vercel.app`, version `0.13.0-rc.4`  
> Compétences : C2.2.3, C2.3.1 et C2.3.2  
> Statut initial : lecteur d'écran réellement exécuté ; 6 scénarios conformes, 3 partiels et 1 non conforme sur `rc.4`
> Statut final : correctifs publiés dans `rc.5` et grille NVDA validée par le candidat

## 1. Environnement et méthode

Le contrôle a été exécuté dans une session Windows 11 Pro 23H2, build
`22631.5624`, avec une vraie session OAuth du compte de recette dédié.

| Élément | Version ou état |
| --- | --- |
| NVDA | copie portable officielle `2026.1.1` |
| Empreinte de l'installeur | SHA-256 `6E0289EB5A3AA076EB97EA99C5D5465CB48B5ECC6A3257DC3D811F881A1747C9` |
| Synthèse | voix française OneCore ; langue NVDA `fr` |
| Navigateur principal | Google Chrome `150.0.7871.129` |
| Contrôle complémentaire | Firefox `148.0.2`, première restitution réussie mais focus instable dans la session RDP |
| Trace | Visionneuse de parole NVDA et journal niveau entrée/sortie `12` |

La Visionneuse de parole affiche le texte effectivement envoyé par NVDA au
synthétiseur. Chaque scénario a été déclenché au clavier après placement réel
du focus dans le navigateur. Les cookies OAuth sont restés dans le fichier de
session ignoré par Git ; aucun cookie, e-mail ou contenu personnel n'est repris
ci-dessous.

Narrator a aussi été réellement lancé sur le poste, version de fichier
`10.0.22621.6133`. Sa commande de récapitulatif n'a produit aucune sortie
textuelle exploitable dans cette session RDP. Aucun résultat positif Narrator
n'est donc revendiqué.

Cette campagne est un contrôle technique avec un lecteur d'écran réel et une
trace textuelle réelle. Elle ne constitue pas une appréciation auditive humaine
du confort, du rythme ou de la compréhension. Aucun résultat humain fictif n'a
été ajouté.

## 2. Résultats SR-01 à SR-10

| ID | Parcours réellement exécuté | Restitution NVDA observée | Décision |
| --- | --- | --- | --- |
| SR-01 | `/login`, navigation, zone principale et action OAuth | « Navigation principale », « Reprendre votre entrainement. région formulaire », « Continuer avec Google bouton » | Conforme sur le parcours |
| SR-02 | `/dashboard`, lien d'évitement, navigation, région principale et titre | « Aller au contenu principal lien », « Navigation principale navigation région », lien courant « Progression », « Votre progression titre niveau 1 » | Conforme sur le parcours |
| SR-03 | `/generate`, soumission vide | focus sur « Sport (requis) édition obligatoire entrée invalide », puis deux alertes : sport et objectif vides | Conforme sur le parcours |
| SR-04 | génération valide d'une séance | la séance est créée et la navigation atteint son détail, mais NVDA annonce avant le changement de page « alerte Erreur : NEXT_REDIRECT » | **Non conforme : B2-BUG-042** |
| SR-05 | liste des programmes, onglets et séances | « Semaines du programme onglet », « Sem. 1 onglet sélectionné 1 sur 3 » ; flèche droite : « Sem. 2 onglet sélectionné 2 sur 3 » ; liens de séances nommés distinctement | Conforme sur le parcours |
| SR-06 | `/workouts`, filtre et liste | « Niveau liste déroulante Tous les niveaux », « Filtrer bouton », « 9 entrainements sur 13 liste de 9 éléments » | Conforme sur le parcours |
| SR-07 | Timer, démarrage, plein écran, commandes et sortie | étape et titre annoncés ; « Pause bouton bascule enfoncé », « Passer bouton », « Quitter plein ecran bouton » ; Échap restitue le focus au bouton Pause ; aucune annonce à chaque seconde | Conforme sur le parcours |
| SR-08 | `/settings`, modèle et sauvegarde | le libellé, la liste et « Enregistrer bouton » sont restitués ; la sauvegarde réussit et le statut existe dans le DOM, mais aucune annonce spontanée du succès n'est capturée | **Partiel : B2-BUG-043** |
| SR-09 | suppression de la séance de test | « Confirmer la suppression groupe », focus sur « Confirmer bouton » ; Échap restitue le focus au déclencheur ; la suppression confirmée réussit, mais aucun message final explicite n'est annoncé | Partiel ; amélioration suivie |
| SR-10 | déconnexion | la déconnexion atteint `/` et l'action « Se connecter lien » est accessible ; aucun titre de destination n'est capturé spontanément pendant la transition | Partiel ; amélioration suivie |

La séance créée pour SR-04 a été supprimée pendant SR-09. Une nouvelle lecture
authentifiée de `/workouts` a confirmé l'absence de son déclencheur de
suppression (`count = 0`). Aucune donnée métier durable n'a été conservée par
la campagne.

## 3. Correctifs locaux issus de la campagne

Deux correctifs sont appliqués dans la copie de travail :

1. `WorkoutForm` et `ProgramForm` ignorent désormais le signal technique
   `NEXT_REDIRECT` uniquement pour la région d'erreur, après vérification de son
   `digest` Next.js, au lieu de l'exposer comme une erreur métier ;
2. la région `status` de `SettingsForm` reste montée vide avant la sauvegarde,
   puis reçoit le texte de confirmation sans déplacement de focus.

Non-régression locale après correction :

- `components/forms.test.tsx` : **6/6**, avec tests dédiés séance, programme et paramètres ;
- suite complète : **241/241** — shared 14, API 170 et Web 57 ;
- audit de production au seuil `low` : aucune vulnérabilité connue ;
- typecheck Web : réussi ;
- lint Web : réussi sans avertissement applicatif.
- build complet : réussi.

Ces résultats constituaient l'état local avant publication de `rc.5`. La suite
de cette annexe consigne séparément la CI/CD, les contrôles de production et la
validation humaine reçue après déploiement.

## 4. Trace technique expurgée

Le journal brut de la session NVDA porte l'empreinte SHA-256
`4E6A212B4E750799978E6B4E3D0E73B2A74AFDF68959788BC2D17BF104C72CD9`.
Il n'est pas intégré au paquet : le niveau entrée/sortie a aussi capturé du
contenu sans rapport avec la recette lorsque le focus RDP a quitté le
navigateur. Les extraits utiles suivants sont reproduits sans cookie, identité
de compte ni donnée personnelle :

| Ligne du journal brut | Extrait `Speaking` expurgé | Scénario |
| ---: | --- | --- |
| 1558 | `Reprendre votre entrainement.`, `région`, `formulaire`, `Continuer avec Google`, `bouton` | SR-01 |
| 711 | `Votre progression`, `titre`, `niveau 1` | SR-02 |
| 1169 / 1175 | `Sport (requis)`, `édition`, `obligatoire`, `entrée invalide` ; `Objectifs (requis)`, `entrée invalide` | SR-03 |
| 1181 | `alerte`, `Erreur : NEXT_REDIRECT` | SR-04 |
| 1226 | `Sem. 1`, `onglet`, `sélectionné`, `1 sur 3` | SR-05 |
| 1290 | `9 entrainements sur 13`, `liste`, `de 9 éléments` | SR-06 |
| 1342 | `bouton`, `Quitter plein ecran` | SR-07 |
| 1418 | `Enregistrer`, `bouton` | SR-08 |
| 1461 | `Confirmer la suppression`, `groupe`, `Confirmer`, `bouton` | SR-09 |
| 1526 | `Se connecter`, `lien` | SR-10 |

Cette sélection permet d'auditer les décisions sans publier le journal brut
contenant des données hors périmètre. L'absence d'annonce finale sur SR-08 à
SR-10 est une observation de la campagne, pas une preuve par absence de ligne.

## 5. Contre-recette de la version `0.13.0-rc.5`

La correction a été fusionnée dans `main` par la PR `#49`. La baseline
applicative déployée est `b63280f36e44b02d5654a7f4e2caa8413e446bcb`.

| Contrôle | Résultat |
| --- | --- |
| CI `main` | run `29916228789`, six jobs réussis |
| CD `main` | run `29916573448`, migration, API, Web et smoke tests réussis |
| API liveness | HTTP 200, version `0.13.0-rc.5` |
| API readiness | HTTP 200, version `0.13.0-rc.5`, base et configuration IA `ok` |
| Web health | HTTP 200, version `0.13.0-rc.5` |
| Non-régression | 241/241 tests, lint, typecheck, audit `low` et builds réussis |

Après cette publication, l'utilisateur a déclaré : « Pour les tests NVDA j'ai
fait les tests de mon côté c'est validé. » Cette déclaration est enregistrée
comme une validation utilisateur de la contre-recette NVDA de `rc.5` et
rattachée aux correctifs B2-BUG-042 et B2-BUG-043.

Aucun détail supplémentaire de navigateur, version NVDA, verbatim, données ou
protocole n'a été fourni pour ce rejeu ; aucun de ces éléments n'est donc
revendiqué. Le tableau SR-01 à SR-10 et les transcriptions précédentes restent
la trace de la campagne `rc.4` et ne sont pas réécrits comme des résultats
`rc.5`.

| Écart | Décision finale |
| --- | --- |
| B2-BUG-042 / SR-04 | **Clos** sur `rc.5` : correctif déployé, tests séance/programme verts et validation NVDA du candidat |
| B2-BUG-043 / SR-08 | **Clos** sur `rc.5` : région vive persistante, test de focus vert et validation NVDA du candidat |
| B2-BUG-044 / SR-09 | **Ouvert non bloquant** : l'ajout d'un message final reste une amélioration P2 ; aucun résultat détaillé `rc.5` n'est inventé |
| B2-BUG-045 / SR-10 | **Ouvert non bloquant** : une annonce de route dédiée reste une amélioration P2 ; aucun résultat détaillé `rc.5` n'est inventé |

## 6. Décision C2.2.3

Le risque « aucun lecteur d'écran réellement exécuté » est levé : NVDA a été
utilisé sur les parcours publics et authentifiés, avec une sortie textuelle
traçable. Le test a confirmé les noms, rôles, états, régions, alertes, onglets,
commandes du Timer et restitutions de focus sur l'échantillon.

C2.2.3 est **acquise sur le périmètre présenté du Bloc 2** : B2-BUG-042/043
sont déployés et contre-recettés, et les 166 contextes composites sont décidés
séparément dans B2-A37. B2-BUG-044/045 restent des améliorations P2 ouvertes et
non bloquantes. Cette conclusion ne constitue ni une déclaration de conformité
RGAA exhaustive ni une généralisation à tous les lecteurs d'écran et
navigateurs.
