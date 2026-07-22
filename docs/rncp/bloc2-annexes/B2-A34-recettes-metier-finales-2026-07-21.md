# B2-A34 — Recettes métier finales — 2026-07-21

> Compétence : C2.3.1 — cahier de recettes.
> Exécution : 21 juillet 2026, de 14 h 23 à 14 h 40 (Europe/Paris).
> Révision de départ : `bac3b916770cabbbc92e3cda0d58ac3ed7e5e119`.
> Baseline du lot de recettes métier testée et déployée : correctifs fusionnés par la PR 43 dans
> `0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`, puis CI `29832575391`, CD
> `29832944876` et E2E OAuth `29833210488` réussis.
> Baseline canonique après le correctif de reflow, sans modification de ces règles métier :
> `b002adb0e0e7d8d85ee493d54879e190d77d2078`, CI `29845956008`, CD `29846343559`.
> Repère documentaire final : tag `rncp-bloc2-2026-07-21-v8`.
> Le SHA effectivement archivé est porté par le manifeste du paquet de remise.

## 1. Environnements et données

| Couche               | Environnement réellement utilisé                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API/Web local        | Windows, Node `24.14.0`, pnpm `11.9.0`, Vitest et build Next.js                                                                   |
| PostgreSQL           | conteneur local `postgres:16-alpine`, base de test sur `localhost:5432`                                                           |
| Parcours authentifié | `https://ai-sport-web.vercel.app`, Chromium Desktop Chrome, session OAuth réelle dédiée et non versionnée                         |
| Identité             | l'adresse du compte de recette a été dérivée de `/api/auth/session` pour vérifier la session, sans être imprimée dans les sorties |

Les tests PostgreSQL créent deux comptes aléatoires et les suppriment en fin de
suite. Le parcours de production utilise uniquement le compte OAuth de recette.

## 2. Anomalies corrigées pendant la recette

### CR-038 — modèle OpenAI non autorisé accepté

L'API acceptait toute chaîne commençant par `gpt-`, alors que l'interface ne
propose que trois modèles. Un appel direct pouvait donc persister une valeur non
autorisée.

Correctif dans `apps/api/src/controllers/settings.controller.ts` :

- liste fermée `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.5` ;
- validation Zod avant tout appel au repository ;
- repli sur `gpt-5.4-mini` à la lecture d'une ancienne valeur inconnue ;
- test HTTP : réponse `400 BAD_REQUEST` et zéro appel à `upsertSettings`.

### CR-030/CR-034 — revalidation de la page courante après journalisation

Une tentative de production a montré que la revalidation de la page Timer
pouvait remonter le composant avant que la confirmation de sauvegarde reste
visible. La séance et le programme ne changent pas lors de la création d'un
journal ; seule la donnée du dashboard doit être invalidée.

Correctif dans les deux pages de séance :

- conservation de `revalidatePath('/dashboard')` ;
- suppression de la revalidation de la page Timer courante ;
- conservation de la revalidation de la fiche programme parente pour une séance
  issue d'un programme.

## 3. Résultats par scénario

| ID     | Exécution et preuve                                                                                                                                                            | Résultat                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| CR-013 | simulations OpenAI `429`, `503` et timeout de `45 000 ms` ; test HTTP `503`, absence d'appel à `createWorkout` ; test UI du message et de la réutilisation du formulaire       | Réussi sur la candidate par simulation déterministe                      |
| CR-018 | page 2/2 rendue côté Web ; paramètres `page=2`, `limit=1` et `userId` transmis ; PostgreSQL réel avec trois programmes du propriétaire et un programme d'un autre compte       | Réussi, pagination et isolation confirmées                               |
| CR-021 | suppression programme en erreur `500` ; message conservé par l'API et confirmation UI maintenue ouverte avec alerte                                                            | Réussi                                                                   |
| CR-030 | création HTTP d'un journal avec durée active `487 s` ; PostgreSQL réel ; parcours production Timer puis enregistrement                                                         | Réussi                                                                   |
| CR-034 | note facultative normalisée puis stockée sous l'identité authentifiée ; page Confidentialité vérifiée ; note de recette saisie en production                                   | Réussi                                                                   |
| CR-035 | annulation, Échap, restauration du focus et panne API testés pour une séance ; confirmation maintenue ouverte                                                                  | Réussi                                                                   |
| CR-037 | changement local autorisé ; en production, changement, rechargement et lecture de la valeur persistée, puis restauration de la valeur initiale dans un bloc `finally`          | Réussi, aucun réglage temporaire laissé                                  |
| CR-038 | valeur `gpt-modele-interdit` envoyée à l'API locale candidate                                                                                                                  | Réussi : `400`, aucune persistance                                       |
| CR-040 | dashboard rendu avec zéro séance et zéro journal                                                                                                                               | Réussi : état « Aucune activité encore », explication et CTA `/generate` |
| CR-041 | rendu de totaux connus (`4`, `3`, `1 h 30`, effort `6.5/10`), agrégation sport ; PostgreSQL réel isolé ; production après journalisation                                       | Réussi                                                                   |
| CR-065 | session OAuth validée, page Programmes ouverte, séance existante ouverte, toutes les phases Timer passées, effort/feedback/note saisis, journal sauvegardé puis dashboard relu | Réussi : compteur « Terminé » de `3` à `4`                               |

## 4. Commandes et sorties conservées

Les commandes ci-dessous ont été lancées avec le runtime Node fourni par
l'espace de travail. Aucun secret ni cookie n'a été affiché.

### Tests ciblés métier

```text
pnpm --filter api exec vitest run \
  tests/rncp-ai-unavailability-recipes.test.ts \
  tests/rncp-business-recipes.test.ts

Test Files  2 passed (2)
Tests       9 passed (9)
```

```text
pnpm --filter web exec vitest run components/rncp-business-recipes.test.tsx

Test Files  1 passed (1)
Tests       9 passed (9)
```

### Suites complètes et PostgreSQL

```text
pnpm --filter api test

Test Files  19 passed (19)
Tests       170 passed (170)
```

```text
pnpm --filter web test

Test Files  14 passed (14)
Tests       55 passed (55)
```

```text
$env:TEST_DATABASE_URL='postgresql://alcide:alcide_dev@localhost:5432/alcide'
pnpm --filter api test:integration

Test Files  1 passed (1)
Tests       8 passed (8)
```

Cette suite PostgreSQL contient notamment : pagination et suppression des
programmes sans exposition inter-compte, journalisation d'une source détenue,
stockage de `painNotes`, statistiques exactes et statistiques vides pour l'autre
compte.

Les sorties ci-dessus sont celles des suites complètes : 170 tests API et 55
tests Web. Les rapports de couverture correspondants instrumentent 155 tests
API et 43 tests Web. Pour PostgreSQL, 8 tests sont instrumentés dans le rapport
de couverture ; la recette de sécurité SQL indépendante porte le total RNCP à 9.
La suite shared compte 14 tests dans les deux présentations.

### Qualité et compilation

```text
pnpm typecheck
packages/shared: Done
apps/api: Done
apps/web: Done
```

```text
pnpm lint
apps/api: Done
apps/web: No ESLint warnings or errors
```

```text
pnpm build
shared: tsc réussi
api: tsc réussi
web: Next.js - Compiled successfully, 13/13 pages générées
```

### Production authentifiée

Commande assainie :

```text
PLAYWRIGHT_AUTH_STORAGE=<fichier local ignoré par Git>
E2E_AUTH_EMAIL=<valeur dérivée de la session, non affichée>
E2E_BASE_URL=https://ai-sport-web.vercel.app
pnpm --filter web exec playwright test \
  --config=playwright.rncp-recipes.config.ts
```

Résultats utiles :

```text
CR-037 : passed (4.6 s), modèle initial restauré
CR-030/034/041/065 : passed (14.5 s)
[RNCP CR-065] dashboard 3 -> 4; formulaire=confirmation-visible
```

## 5. Traçabilité honnête des tentatives

Trois exécutions du parcours authentifié ont eu lieu :

1. la première s'est arrêtée avant l'envoi du journal, car le clic Playwright
   visait l'input radio visuellement masqué ; aucune donnée n'a été créée par
   cette tentative ;
2. la deuxième a atteint l'envoi, puis l'assertion a échoué parce que
   `getByRole('status')` correspondait à trois éléments. Elle a pu créer un
   journal, mais l'incrément du dashboard n'a pas été mesuré pendant cette
   tentative ;
3. la dernière exécution a mesuré explicitement `3 -> 4` et constitue la preuve
   de clôture retenue.

Il n'existe pas d'interface de suppression des journaux. Le journal final — et
éventuellement celui de la deuxième tentative — reste donc dans le compte de
recette. Les champs contiennent uniquement les marqueurs de test suivants :

- douleur : `Recette RNCP : gene legere temporaire, donnee de test.` ;
- notes : `Parcours final automatise du 2026-07-21.`.

## 6. Limites

- CR-013 a été couvert par simulations reproductibles `429`, `503` et timeout ;
  aucune panne réelle d'OpenAI n'a été provoquée en production.
- CR-018 et l'isolation multi-compte de CR-041 ont été exécutés sur PostgreSQL
  local réel, pas avec deux comptes OAuth de production.
- CR-040 est une recette de rendu déterministe avec données vides simulées ; le
  compte de production n'est plus vide.
- CR-065 valide une session OAuth existante et visite les objets déjà présents ;
  il ne rejoue pas l'écran Google ni une nouvelle génération OpenAI.
- Le verrouillage CR-038 et les suppressions de revalidation ont été intégrés à
  la baseline `0d5c6b6041333e2b756e59cb5d4440cc7ef7128b`, puis ont passé la CI
  `29832575391`, le CD `29832944876`, les smoke tests et la contre-recette OAuth
  `29833210488`. Le correctif de reflow ultérieur n'a pas modifié ce périmètre
  métier ; la baseline canonique `b002adb` a ensuite passé la CI `29845956008`
  et le CD `29846343559`. Leur déploiement final n'est donc plus à confirmer.

## 7. Pièces techniques

- `apps/api/tests/rncp-ai-unavailability-recipes.test.ts`
- `apps/api/tests/rncp-business-recipes.test.ts`
- `apps/web/components/rncp-business-recipes.test.tsx`
- `apps/web/tests/e2e/rncp-recipes-final.spec.ts`
- `apps/web/playwright.rncp-recipes.config.ts`
- `apps/api/src/controllers/settings.controller.ts`
- `apps/web/app/workouts/[id]/page.tsx`
- `apps/web/app/programs/[id]/sessions/[sessionId]/page.tsx`

Conclusion : les onze scénarios du lot métier disposent maintenant d'une preuve
exécutée. Les limites de production ci-dessus ne sont pas converties en preuves
plus fortes qu'elles ne le sont.
