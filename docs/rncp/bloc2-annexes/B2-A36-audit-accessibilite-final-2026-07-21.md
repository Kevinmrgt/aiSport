# B2-A36 - Audit accessibilite final public et authentifie

> Repère de lecture : les 55 tests Web cités dans cette preuve correspondent à la campagne du 21 juillet. La baseline finale `rc.5` ajoute deux tests de non-régression et compte 57 tests Web, soit 241 tests au total.

> Date d'execution : 2026-07-21
> Application observee : `https://ai-sport-web.vercel.app`
> Source locale au debut du controle : `bac3b916770cabbbc92e3cda0d58ac3ed7e5e119`
> Contre-recette après déploiement du correctif de reflow : 33/33 et zoom natif
> 16/16 sur `b002adb0e0e7d8d85ee493d54879e190d77d2078`, après CI `29845956008`
> et CD `29846343559`.
> Référence : résultats datés et révisions indiquées dans chaque partie.
> Le SHA effectivement archivé est porté par le manifeste du paquet de remise.
> Referentiel de travail : RGAA 4.1.2 et WCAG 2.1 A/AA
> Statut : preuves renforcees, conformite RGAA exhaustive non revendiquee

## Objet et perimetre

Cette campagne ferme les controles automatisables restes ouverts sur un
echantillon public et prive : reflow CSS, complete par un zoom Chromium natif
a 200 % et 400 % dans B2-A37,
parcours clavier, visibilite du focus, contrastes calculables, structure et
annonces exposees aux technologies d'assistance.

Pages publiques testees :

- `/` ;
- `/login` ;
- `/confidentialite`.

Pages privees testees avec une vraie session Auth.js locale :

- `/dashboard` ;
- `/generate` ;
- `/programs` ;
- `/workouts` ;
- `/settings`.

Un controle navigateur authentifie independant a aussi couvert
`/programs/generate`. Les champs `hidden` ajoutes par Next.js pour les Server
Actions ont ete exclus des controles de labels : ils ne sont ni visibles, ni
modifiables, ni atteignables au clavier.

## Protection de la session

Le `storageState` OAuth utilise est un fichier local ignore par Git et non
suivi. La configuration dediee desactive traces, captures et videos pour eviter
d'enregistrer des cookies ou des donnees de compte. Le test verifie uniquement
la presence d'un cookie de session Auth.js sans imprimer son nom complet, sa
valeur, l'adresse electronique ou le contenu du fichier.

## Methode reproductible

La suite dediee se trouve dans
`apps/web/tests/e2e/rncp-accessibility-final.spec.ts` et sa configuration dans
`apps/web/playwright.rncp-accessibility.config.ts`. Elle a ete executee avec
Chromium et Playwright, en production, avec un worker unique :

```powershell
$env:PLAYWRIGHT_AUTH_STORAGE='<chemin local ignore par Git>'
$env:E2E_BASE_URL='https://ai-sport-web.vercel.app'
pnpm --filter web exec playwright test --config=playwright.rncp-accessibility.config.ts
```

Les controles sont les suivants :

1. reflow a 640 pixels CSS, approximation de mise en page d'un viewport bureau de
   1280 pixels zoome a 200 % ;
2. reflow a 320 pixels CSS, approximation de mise en page du meme viewport zoome a
   400 % ;
3. parcours `Tab` complet de toutes les commandes visibles, jusqu'a la sortie
   du document, avec comparaison a l'inventaire des elements tabulables ;
4. verification de `:focus-visible` et d'un indicateur perceptible, par contour
   ou ombre de focus, a chaque etape ;
5. regle `color-contrast` d'axe sans filtrage par severite, completee par le
   calcul sRGB du ratio texte/fond du bouton principal opaque ;
6. inspection de l'arbre d'accessibilite Chromium par CDP : `RootWebArea`,
   `main`, `navigation` et au moins un titre nomme ;
7. declenchement des erreurs de `/generate` et controle des regions
   `role="alert"`.

L'inspection CDP est une lecture de l'arbre d'accessibilite. Elle ne constitue
pas un test avec un lecteur d'ecran.

## Resultats Playwright

Résultat post-déploiement : **33 tests réussis sur 33**, en 58,7 secondes.

| Controle                               | Pages                   | Resultat                                                      |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| Reflow 640 et 320 pixels CSS           | 3 publiques + 5 privees | 8/8, aucun `scrollWidth` superieur au viewport                |
| Cycle clavier complet et focus visible | 3 publiques + 5 privees | 8/8, aucune commande omise, aucun piege detecte               |
| Contrastes                             | 3 publiques + 5 privees | 8/8 tests sans violation axe ; mesure representative conforme |
| Arbre d'accessibilite                  | 3 publiques + 5 privees | 8/8, racine, contenu principal, navigation et titre exposes   |
| Erreurs dynamiques                     | `/generate`             | erreurs de champs exposees avec `role="alert"`                |

Le controle navigateur authentifie independant a confirme l'absence de
debordement horizontal sur `/generate`, `/programs/generate`, `/workouts`,
`/dashboard` et `/settings` a 640 x 720 puis 320 x 720 pixels. Les largeurs de
document relevees etaient respectivement 625 et 305 pixels, donc inferieures a
la largeur utile du viewport. Aucun identifiant HTML duplique n'a ete trouve
sur les etats stabilises.

Le rejeu du 2026-07-21 a de nouveau lance les **33 tests** sur la production
avec la session OAuth locale et s'est termine avec le code 0. Le zoom natif a
ete rejoue separement sur les huit routes : **16/16 mesures**, facteur obtenu
2x puis 4x, aucun debordement horizontal et aucun texte ou controle rogne.

## Contrastes mesures

Les ratios sRGB du texte sur le fond opaque du bouton principal sont :

| Pages                                                            | Ratio minimal mesure | Seuil AA texte normal |
| ---------------------------------------------------------------- | -------------------: | --------------------: |
| `/`, `/login`, `/confidentialite`                                |              17,36:1 |                 4,5:1 |
| `/dashboard`, `/generate`, `/programs`, `/workouts`, `/settings` |               8,19:1 |                 4,5:1 |

Axe a mesure en plus 1 texte sur `/`, 2 sur `/login`, aucun sur
`/confidentialite` ni sur le dashboard vide, 1 sur `/generate`, 4 sur
`/programs`, 10 sur `/workouts` et 1 sur `/settings`. Aucune violation de la
regle `color-contrast` n'a ete renvoyee.

Chaque page conserve toutefois **une verification axe incomplete** en raison
des fonds composites, transparences ou images. Les ratios ci-dessus sont donc
des mesures representatives, pas une mesure exhaustive de chaque texte, et ne
suffisent pas a declarer une conformite RGAA complete.

Le script `scripts/rncp-a11y-contrast-sampling.ps1` a ensuite regroupe les 416
occurrences par cause axe, couleurs CSS, fond, graisse, corps et seuil WCAG. Il
produit **79 signatures de rendu**, dont **34 P1** et **45 P2**, et **166
contextes route-signature**. Ce tri rend la revue humaine bornée et
reproductible ; toutes les signatures conservent le statut
`human_review_required` tant qu'un operateur n'a pas saisi le ratio mesure, sa
decision et la preuve.

## Structure et annonces

Les huit pages de l'echantillon exposent dans l'arbre d'accessibilite une
racine de document, une region principale, une navigation nommee et au moins un
titre. Sur `/generate`, l'envoi du formulaire vide rend visibles plusieurs
erreurs, dont `#input-sport-error` et `#goals-error`, chacune exposee avec
`role="alert"`.

Le controle independant a detecte deux `h1` sur `/generate` et
`/programs/generate` : un titre de page et un titre de formulaire. Le titre de
chaque formulaire a ete corrige en `h2` dans `WorkoutForm.tsx` et
`ProgramForm.tsx`. Le test de non-regression
`apps/web/components/rncp-accessibility-structure.test.tsx` verifie que les deux
titres internes restent de niveau 2 et continuent de nommer leur formulaire. Resultat :
**2 tests reussis sur 2**. Cette correction a ete integree a la baseline
`0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`, puis verifiee par la CI
`29832575391`, le CD `29832944876` et la contre-recette de production 33/33.

## Anomalies et corrections

| Identifiant | Observation                                                                | Action                                                                                      | Etat                                            |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| B2-A36-01   | Deux `h1` sur chacune des pages de generation                              | Titres internes passes en `h2` et test de non-regression ajoute                             | Corrige et contre-recette en production 33/33   |
| B2-A36-02   | Axe ne peut pas calculer les contrastes composites                         | Audit detaille rejoue : 0 violation, 19 nœuds calcules conformes et 416 nœuds incomplets regroupes en 79 signatures ; échantillonnage pixel du 2026-07-22 : 69 signatures sans alerte, 8 avec alerte et 2 non concluantes ; correctifs locaux à redéployer et contre-recetter | Partiellement couvert, voir B2-A37 |
| B2-A36-03   | Aucun lecteur d'ecran reel utilise pendant cette campagne                  | Narrator disponible, NVDA absent ; grille operateur prete pour une restitution documentee | Ouvert : aucune ecoute realisee |
| B2-A36-04   | Limite historique : le reflow initial reposait uniquement sur des viewports CSS | Audit natif à 200/400 %, détection puis correction des troncatures de métriques et cartes | Clos : correctif `b002adb` déployé, zoom natif production 16/16, voir B2-A37 |

## Conclusion et limites

Les sous-controles reflow, clavier, focus visible, structure de l'arbre et
annonces d'erreur sont couverts sur l'echantillon. Les contrastes opaques
representatifs respectent largement le seuil AA et aucune violation axe n'est
remontee.

Le scenario d'accessibilite ne doit cependant pas etre marque entierement clos
tant que les points suivants ne sont pas realises et consignes :

- verification manuelle des contrastes composites signales `incomplete` ;
- parcours avec un vrai lecteur d'ecran, par exemple NVDA ou Narrator.

En particulier, **aucun test NVDA, Narrator, JAWS ou VoiceOver n'a ete realise**
ici. L'arbre d'accessibilite Chromium apporte une preuve structurelle utile,
mais ne permet pas de conclure sur la qualite de la restitution vocale ni sur
le confort d'usage reel. Le statut global reste donc « conformite RGAA non
determinee », sans revendication de conformite exhaustive.

## Addendum du 22 juillet 2026

Le rejeu de la production a confirmé **33/33 tests**, **0 violation axe** et le
même périmètre de **79 signatures / 166 contextes**. L'échantillonnage des
pixels composites, détaillé dans B2-A37, a isolé 14 alertes sur 8 signatures et
2 contextes non concluants. Les contrastes concernés ont été renforcés dans la
source locale ; **55/55 tests Web**, le typecheck et le lint réussissent.

Cet addendum ne transforme pas la production observée le 21 juillet : les
correctifs devaient encore être déployés puis contre-recettés. La mesure des
deux contextes non concluants et les dix parcours Narrator/NVDA restaient
ouverts à la date de cette campagne. Le rejeu `rc.4` consigné dans B2-A37 ferme
ensuite les 166 contextes composites de l'échantillon, dont le dernier par une
borne conservatrice à 15,00:1. La campagne réelle NVDA ultérieure est consignée
dans B2-A41 ; aucune validation auditive humaine n'y est revendiquée.
