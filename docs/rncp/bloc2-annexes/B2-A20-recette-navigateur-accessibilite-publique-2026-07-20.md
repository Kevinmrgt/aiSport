# B2-A20 — Recette navigateur et accessibilité publique du 2026-07-20

> Compétences : C2.2.3 et C2.3.1
> Version observée : `69b21ef-dirty`, version locale `0.13.0-rc.1`
> Environnement : Windows, Node.js `v24.14.0`, Playwright `1.59.1`

## Périmètre réellement exécuté

Les contrôles ont été exécutés dans les navigateurs Playwright Chromium et
Firefox. Aucun navigateur manuel n'était disponible dans cette session
(aucun navigateur détecté) : aucune inspection via ce navigateur n'est donc
revendiquée.

Commandes finales réussies :

```text
pnpm exec playwright test tests/e2e/browser-evidence.spec.ts --project=chromium --reporter=list
12 passed (43.1s)

pnpm exec playwright test tests/e2e/browser-evidence.spec.ts --project=firefox --reporter=list
12 passed (56.6s)
```

Une tentative ciblée supplémentaire sur `/dashboard` a expiré sans sortie
pendant un conflit de build. Elle n'est ni conservée dans le test final ni
comptée dans les 24 résultats ci-dessus.

## Résultats observés

### Pages publiques à 320 × 720 px

| Route | HTTP | Largeur document Chromium/Firefox | Erreurs JS | Violations axe ciblées | Capture |
|---|---:|---:|---:|---:|---|
| `/` | 200 | 320 / 320 px | 0 / 0 | 0 / 0 | PNG Chromium + Firefox |
| `/login` | 200 | 320 / 320 px | 0 / 0 | 0 / 0 | PNG Chromium + Firefox |
| `/confidentialite` | 200 | 320 / 320 px | 0 / 0 | 0 / 0 | PNG Chromium + Firefox |
| `/cette-page-nexiste-pas` | 404 attendu | 320 / 320 px | 0 / 0 | 0 / 0 | PNG Chromium + Firefox |

`axe-core` a été exécuté avec les tags `wcag2a`, `wcag2aa`, `wcag21a` et
`wcag21aa`. Ce résultat automatisé ne constitue pas un audit RGAA manuel.

Chromium a journalisé une erreur console réseau pour la navigation HTTP 404 :
`Failed to load resource: the server responded with a status of 404 (Not Found)`.
Firefox n'a pas émis ce message. Les deux JSON bruts conservent cette différence.
Aucune `pageerror` JavaScript n'a été observée.

### Clavier et focus

- sur `/`, `/login` et `/confidentialite`, la première touche Tab a focalisé le
  lien « Aller au contenu principal » dont la cible observée est
  `#main-content` ;
- après Entrée, l'élément actif observé est `MAIN#main-content` dans les deux
  navigateurs ; Chromium conserve le fragment dans l'URL, Firefox non ;
- le bouton de connexion a été focalisé et son nom accessible vérifié comme
  « Continuer avec Google » dans les deux navigateurs ;
- le fournisseur OAuth n'a pas été ouvert et aucune connexion n'a été tentée.

### Protection sans session

Les routes `/generate`, `/programs`, `/workouts` et `/settings` ont réellement
abouti à `http://localhost:3000/login` avec le titre de connexion attendu, dans
Chromium et Firefox. `/dashboard` reste non exécuté dans cette annexe.

## Anomalies détectées et corrections

1. Le lien d'évitement modifiait le fragment sans focaliser systématiquement le
   contenu. Correction : `tabIndex={-1}` sur `main#main-content`.
2. La lettre décorative « G » était incluse dans le nom accessible du bouton
   Google. Correction : `aria-hidden="true"` sur ce décor.
3. L'inspection des captures à 320 px a révélé un contraste visuellement faible
   sur la page de connexion et le pied de page. Correction : panneau sombre sur
   la zone de connexion et textes de pied de page assombris. Une mesure manuelle
   des ratios reste à effectuer avant de conclure sur le critère RGAA.

Après ces corrections, les runs finaux séparés Chromium et Firefox sont ceux
indiqués plus haut. Le typage Web et le lint Web ont également réussi.

## Artefacts bruts

Le dossier `browser-evidence-2026-07-20/` contient 32 fichiers :

- 8 captures PNG, quatre routes dans deux navigateurs ;
- 8 JSON de page avec URL, statut HTTP, viewport, largeur, console,
  `pageerror` et violations axe ;
- 6 JSON clavier ;
- 2 JSON sur le bouton Google ;
- 8 JSON de redirection sans session.

## Non exécuté — ne pas présenter comme preuve

- OAuth Google réel, création de session et déconnexion ;
- pages et composants authentifiés ;
- audit manuel RGAA complet, zoom 200/400 %, lecteur d'écran et technologies
  d'assistance ;
- mesure manuelle de tous les contrastes ;
- `/dashboard` dans cette recette instrumentée ;
- production et SHA final immuable.
