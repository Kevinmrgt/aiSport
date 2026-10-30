# Recette locale de production authentifiée

## Résultat vérifié — 29 octobre 2026

La recette complète a réussi : **6 scénarios sur 6**, avec les builds de
production Web et API et PostgreSQL local réellement migré sur le port 22133. Le rapport expurgé est `tmp/production-remediation/fullstack.json`,
contre-recette `61f5b631-5343-446f-b666-04702fdfebf0` du 29 octobre à 16:07 UTC,
build Web `GBB64nJhG5rrSvc-o82ay`, après correction du minuteur détectée en CI.
Il confirme cinq tentatives du fournisseur simulé, dont deux échecs 503
volontaires, aucun appel fournisseur réel et le nettoyage des comptes.
Les ports 3007 et 3008 ont été vérifiés libres après la recette.

La recette a détecté puis permis de corriger une liste restée périmée après
suppression : l'action serveur supprimait déjà la ligne en base, mais la
carte restait affichée. `DeleteConfirmationButton` appelle désormais
`router.refresh()` après le succès. La régression vérifie la disparition
réelle de la carte et l'absence de séance en base. Les erreurs retournées
ou levées conservent la confirmation et ne rafraîchissent pas la page.

Le build Web, ses contrôles lint et types intégrés, les 17 tests ciblés du
minuteur/journal et les trois tests du helper réussissent. Après la correction de revalidation
du minuteur, la couverture Web complète réussit : 93 tests, branches 71,44 %,
lignes 79,69 %, instructions 78,13 %.

Sur le build précédent `mnYQ_z4-lHPlNV0gxYrBb`, les contrôles axe ciblés ont
réussi sur Chromium et Firefox : **4/4**, puis la suite publique complète : **50/50** en 1,6 minute,
avec deux workers. Commande : `E2E_PRODUCTION=1 pnpm test:e2e:smoke --workers=2`.
Le premier passage à six workers avait détecté le nom accessible incohérent
du lien de marque et un délai de navigation Firefox. Le lien utilise
maintenant son contenu comme nom accessible, avec un espace explicite entre
Alcide et Pulse ; aucun délai ni assertion n'a été assoupli. La recette 6/6
avait été répétée sur ce build, puis sur le nouveau build après correction
du minuteur. La validation Linux finale relève du nouveau passage CI.

## Périmètre et limites

La CI Linux `40906634694` a ensuite détecté une autre régression réelle :
le journal était bien enregistré (HTTP 201 et une ligne SQL), mais la
revalidation de l'action serveur renvoyait de nouvelles références de
tableaux identiques. L'effet de `Timer` remettait alors la séance au début
et démontait le formulaire avant son message de succès. La remise à zéro
compare maintenant le contenu des étapes et le contexte de séance, en
mémoire uniquement. Elle reste active si le contenu ou l'identité de séance
change. Aucun délai ni assertion du runner n'a été modifié pour ce correctif.
La régression unitaire simule une sauvegarde différée avec revalidation
avant et après sa résolution, vérifie la conservation des notes, du succès
et du bouton désactivé, et interdit une deuxième sauvegarde.

Deux sessions Auth.js sont signées avec un secret
de test, des sujets Google synthétiques distincts, `identityVersion: 2`,
`authMethod: google` et un `authIssuedAt` en millisecondes. Cette technique
ne prouve ni une connexion Google neuve ni la configuration OAuth distante.

Les appels vers OpenAI sont interceptés exclusivement par un helper de
test et reçoivent du JSON déterministe conforme aux paramètres demandés.
Aucun appel fournisseur réel ou payant n'est autorisé. Cette simulation
ne constitue pas une qualification des sorties sportives d'un modèle réel.

Les scénarios exécutés couvrent la création d'une séance et d'un programme de
deux semaines depuis l'interface, la persistance après rechargement, le
minuteur puis l'enregistrement du journal et le dashboard, la suppression,
le refus de lecture entre deux comptes et la déconnexion. Une panne IA
simulée vérifie la conservation de la saisie et l'absence de nouvelle séance
persistée. Le réessai manuel après cette panne n'est pas couvert par cette
recette.

## Outils et exécution

Les fichiers de recette sont :

- `apps/web/scripts/local-production-recipes.mjs` : orchestration, sessions
  en mémoire, assertions navigateur et rapport expurgé ;
- `apps/api/tests/helpers/local-ai-fixture.mjs` : fournisseur déterministe
  réservé à cette recette, avec contrôle explicite de son activation ;
- `apps/web/scripts/local-production-recipes.test.mjs` : refus des bases
  distantes, formes et durées des réponses simulées.

Le Web est lié à
`127.0.0.1:3007`, l'API à `127.0.0.1:3008`. `TEST_DATABASE_URL` doit pointer
explicitement vers une base locale dont le nom indique un usage de test ou
d'audit ; toute cible distante sera refusée. Le coordinateur fournit la
base isolée. Le build doit être terminé avant la recette.

Après compilation des packages partagés, de l'API et du Web, définir
`TEST_DATABASE_URL` vers la base isolée et lancer depuis la racine :

```powershell
$env:LOCAL_PRODUCTION_RECIPES = '1'
$env:LOCAL_RECIPES_SCOPE = 'all'
# Définir TEST_DATABASE_URL vers la base PostgreSQL locale isolée.
node apps/web/scripts/local-production-recipes.mjs
```

Le runner refuse les ports déjà occupés et génère des secrets aléatoires
uniquement en mémoire. Les services utilisent `NODE_ENV=production` ; le
stub n'autorise aucune sortie réseau et ne lit aucune véritable clé IA.
Le test vérifie les actions serveur de création, et non une simple réponse
simulée dans le navigateur. La suppression du compte de recette n'est pas
un test du parcours UI d'effacement : le nettoyage utilise une requête
ciblée sur ses deux adresses synthétiques.

Les contrôles du helper peuvent se lancer sans build ni serveurs :

```text
node --test apps/web/scripts/local-production-recipes.test.mjs
```

Les budgets du processus de recette sont explicitement bornés à 16 tentatives
par utilisateur et 200 globalement par jour, 160 000 jetons par utilisateur
et 2 000 000 globalement. Ces valeurs concernent seulement la base d'audit ;
la recette ne remet aucun compteur partagé à zéro.

Le rapport est `tmp/production-remediation/fullstack.json`, sans
cookie, jeton, trace navigateur, donnée de compte réel ou secret. Le
nettoyage doit viser uniquement les processus démarrés par la recette et
ses identités synthétiques, sans vider les tables ou compteurs partagés.
