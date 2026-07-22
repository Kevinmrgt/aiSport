# B2-A40 - Audit semantique assiste du 22 juillet 2026

> Competences : C2.2.1, C2.2.3, C2.3.1, C2.3.2  
> Application observee : `https://ai-sport-web.vercel.app`  
> Baseline de production : `0.13.0-rc.4`, commit `ea703aef912ce9e7c49c4c9b7872a5a7b595b666`
> CI `main` : `29907294766` ; CD : `29907642144`
> Date du controle : 2026-07-22  
> Statut : structure automatisee controlee ; deux anomalies corrigees et
> contre-recettees en production ; restitution vocale reelle non executee.

## Objectif

Ce controle complete les campagnes B2-A36 et B2-A37 par une inspection
authentifiee de la structure semantique exposee par Chromium. Il porte sur les
regions, les titres, les noms accessibles, les relations ARIA, les messages
d'erreur, les onglets, les zones dynamiques du Timer et la confirmation de
suppression.

L'inspection du DOM et de la projection d'accessibilite permet de detecter des
relations absentes ou incoherentes. Elle ne produit pas de restitution audio
et ne remplace donc pas un parcours humain avec Narrator, NVDA, JAWS ou
VoiceOver.

## Perimetre et methode

La session authentifiee a parcouru les huit routes principales suivantes :

| Route | Structure attendue | Ecarts releves |
| ----- | ------------------ | -------------- |
| `/` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/confidentialite` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/dashboard` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/generate` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/programs` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/programs/generate` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/workouts` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |
| `/settings` | langue `fr`, 1 `main`, 1 `h1`, lien d'evitement resolu | aucun |

Sur ces huit routes, l'attribut de langue vaut `fr`, le contenu principal est
identifie par `main#main-content`, les navigations possedent un nom accessible
et aucune image sans alternative n'a ete relevee. Aucun identifiant duplique,
aucune commande visible sans nom et aucune relation `aria-controls` invalide
n'ont ete releves sur ces routes de premier niveau.

Trois routes dynamiques ont ensuite ete inspectees sans publier ni supprimer
de donnee :

- `/programs/{id}` ;
- `/programs/{id}/sessions/{semaine-seance}` ;
- `/workouts/{id}`.

Les deux pages Timer exposent un contenu principal unique, un titre de niveau
1 et les regions dynamiques attendues pour le temps et les messages de statut.
Cette presence est une preuve structurelle ; l'ordre et le confort d'annonce
restent a ecouter avec un lecteur d'ecran reel.

## Formulaire invalide

Le formulaire vide de generation de seance a produit deux messages
`role="alert"`. Les deux champs invalides etaient relies a leurs messages et
aucune cible `aria-describedby` ne manquait. Sur la production `rc.3`, le
focus est toutefois reste sur le bouton d'envoi au lieu d'etre place sur le
premier champ invalide.

Le correctif recherche le premier champ signale par le schema de
validation et lui donne le focus. Il est applique aux formulaires de seance et
de programme dans :

- `apps/web/components/WorkoutForm.tsx` ;
- `apps/web/components/ProgramForm.tsx`.

Les tests de composants verifient desormais la presence des alertes, l'absence
d'appel du service et le focus sur le champ Sport. La suite Web reste verte :
**55/55 tests**, typecheck et lint reussis. Apres deploiement, une soumission
vide sur `/generate` a produit les deux alertes attendues et place le focus sur
`INPUT#input-sport[name="sport"]`. B2-BUG-040 est donc clos en production.

## Onglets d'un programme

La page `/programs/{id}` comportait deux onglets dont `aria-controls`
designait des panneaux absents du DOM lorsque leur semaine n'etait pas active.
Le panneau actif etait utilisable, mais la relation exposee par les onglets
etait incomplete.

`ProgramWeekTabs.tsx` rend maintenant un panneau pour chaque semaine. Les
panneaux inactifs restent presents avec `hidden` et `tabIndex={-1}` ; le
panneau actif demeure focalisable. Un test de non-regression verifie que chaque
valeur `aria-controls` correspond a un element existant et que le panneau
precedent devient masque apres changement d'onglet. Resultat local :
**55/55 tests Web**, typecheck et lint reussis.

La contre-recette sur `/programs/{id}` en production `rc.4` a trouve trois
onglets et trois panneaux. Les trois valeurs `aria-controls` resolvent un
`tabpanel` existant, un seul onglet porte `aria-selected="true"` et les deux
panneaux inactifs sont `hidden`. B2-BUG-041 est donc clos en production.

## Confirmation de suppression

Le bouton de suppression d'une seance a ete active sans confirmer l'action
destructive. Le composant de confirmation obtenu presente :

- un groupe nomme par une cible `aria-labelledby` existante ;
- le focus initial sur le bouton `Confirmer` ;
- deux choix explicites, `Confirmer` et `Annuler` ;
- apres `Annuler`, la disparition du groupe et le retour du focus sur le bouton
  de suppression exact qui l'avait ouvert.

Aucune seance n'a ete supprimee pendant ce controle.

## Anomalies et tracabilite

| Identifiant | Observation en production `rc.3` | Correction `rc.4` | Non-regression | Etat |
| ----------- | -------------------------------- | -------------------------- | -------------- | ---- |
| B2-BUG-040 | apres soumission invalide, le focus reste sur le bouton | focaliser le premier controle invalide dans les deux formulaires | assertions Testing Library, CI `29907294766`, focus `input-sport` observe sur `rc.4` | clos en production |
| B2-BUG-041 | deux onglets referencent des panneaux absents | conserver tous les panneaux dans le DOM et masquer les inactifs | CI `29907294766`, 3/3 cibles resolues et panneaux inactifs masques sur `rc.4` | clos en production |

## Conclusion et limites

L'audit confirme une base semantique coherente sur les huit ecrans principaux
et les trois routes dynamiques examinees. Il apporte aussi une preuve concrete
de la gestion du focus lors de l'annulation d'une suppression et a permis de
detecter deux regressions qui ne ressortaient pas des campagnes precedentes.

Les corrections ont passe la CI/CD et la contre-recette de production. Le rejeu
authentifie a reussi 33/33 tests, le zoom natif 16/16 et l'echantillonnage
composite classe 78/79 signatures et 165/166 contextes en succes automatise ;
le dernier contexte reste reserve a une qualification humaine. Aucune ecoute
avec un lecteur d'ecran n'a ete realisee. Cette annexe renforce donc la preuve
d'actions d'accessibilite, sans constituer une declaration de conformite RGAA
exhaustive.
