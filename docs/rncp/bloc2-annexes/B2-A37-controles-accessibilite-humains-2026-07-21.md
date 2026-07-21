# B2-A37 - Zoom natif, contrastes et contre-recette d'accessibilité

> Date d'exécution : 2026-07-21
> Production observée : `https://ai-sport-web.vercel.app`
> Chromium : `147.0.7727.15`
> Playwright : `1.59.1`
> Baseline corrective déployée : `b002adb0e0e7d8d85ee493d54879e190d77d2078`
> CI : `29845956008` — succès ; CD Vercel : `29846343559` — succès
> Statut : anomalie de reflow corrigée et contre-recettée en production ; contrastes composites et lecteur d'écran réel encore ouverts

## 1. Rejeu complet public et authentifié

La suite `rncp-accessibility-final.spec.ts` a été rejouée avec une vraie session
OAuth locale, ignorée par Git et jamais imprimée dans les sorties.

Contre-recette après déploiement : **33 tests réussis sur 33 en 58,7 secondes**
sur les routes suivantes :

- publiques : `/`, `/login`, `/confidentialite` ;
- privées : `/dashboard`, `/generate`, `/programs`, `/workouts`, `/settings`.

Les contrôles couvrent le reflow 640/320 pixels CSS, le cycle clavier, la
visibilité du focus, `color-contrast`, l'arbre d'accessibilité Chromium et les
alertes du formulaire de génération.

## 2. Zoom navigateur natif à 200 % et 400 %

Le test `scripts/e2e-native-zoom-audit.mjs` charge une extension Chromium locale
réservée à l'audit. Elle applique le zoom natif avec `chrome.tabs.setZoom`, puis
contrôle le facteur réellement obtenu, le `devicePixelRatio`, la largeur CSS,
les débordements et les éléments textuels rognés. Aucun cookie ni identifiant
n'est consigné.

L'audit initial de la production précédente a exécuté **16 mesures sur 16** :
huit routes multipliées par les deux niveaux de zoom. Le facteur obtenu valait
bien `2` puis `4`, sans débordement horizontal global. Le contrôle renforcé a
toutefois détecté quatre échecs à 400 % :

| Route | Texte visuellement rogné |
| --- | --- |
| `/login` | libellé `Séances` d'une métrique |
| `/dashboard` | libellés `Facile` et `Dosé` |
| `/programs` | titres longs des cartes programme |
| `/workouts` | titres longs des cartes séance |

Cause : les composants `MetricPill`, `ProgramCard` et `WorkoutCard` utilisaient
la classe Tailwind `truncate`, donc `overflow: hidden` et une ellipse sans retour
à la ligne.

Correctif : remplacement de la troncature par `break-words` et un
interligne compact. Résultats après correction :

- **55 tests Web sur 55** ;
- typecheck réussi ;
- build Next.js réussi ;
- **6 mesures sur 6** sur les pages publiques de la version locale ;
- **16 mesures sur 16** sur une prévisualisation corrective, sans texte ni
  commande rognés ;
- CI `29845956008` entièrement verte sur le commit `b002adb` ;
- CD Vercel `29846343559` réussi : migration, API, Web et smoke tests ;
- **16 mesures sur 16 sur la production corrigée**, sans prévisualisation,
  avec zoom Chromium natif à 200 % et 400 % ;
- **33/33 tests d'accessibilité de production** après déploiement.

Les rapports avant correction, de prévisualisation et de contre-recette sont
séparés sous `tmp/accessibility-final/native-zoom/` afin de ne pas les
confondre. Le rapport post-déploiement est
`native-zoom-production.json`.

## 3. Contrastes opaques et composites

Le script `scripts/e2e-contrast-incomplete-audit.mjs` a rejoué la règle axe
`color-contrast` sur les huit routes avec la session réelle :

- **0 violation** ;
- 416 nœuds classés `incomplete` : 331 à cause de gradients, 69 à cause de
  pseudo-éléments, 15 textes trop courts et un élément recouvert.

Ces 416 occurrences ne sont pas 416 non-conformités : elles indiquent qu'axe ne
peut pas calculer automatiquement le fond composite final. Les mesures opaques
représentatives déjà consignées dans B2-A36 restent conformes, mais la revue
visuelle exhaustive des fonds composites n'est pas déclarée close.

## 4. Lecteur d'écran

Windows Narrator est disponible sur le poste, mais aucune restitution vocale ne
peut être évaluée de manière fiable dans la session automatisée. Le contrôle de
l'arbre d'accessibilité Chromium est réussi sur les huit routes ; il ne remplace
pas un parcours humain capable de juger l'ordre, les annonces et le confort
d'écoute.

Aucun test réel NVDA, Narrator, JAWS ou VoiceOver n'est donc revendiqué.

## 5. Décision de clôture

Le reflow natif a désormais une méthode reproductible. Le défaut découvert est
corrigé, déployé et contre-recetté : B2-A36-04 et B2-BUG-034 sont clos.
Il reste à traiter séparément :

1. la vérification humaine exhaustive des fonds composites ;
2. un parcours avec un lecteur d'écran réel et la consignation de la restitution.

La conformité RGAA exhaustive reste non revendiquée.
