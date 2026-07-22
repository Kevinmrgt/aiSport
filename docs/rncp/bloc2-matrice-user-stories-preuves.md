# Bloc 2 — Matrice besoins, user stories et preuves

Cette matrice relie les besoins fonctionnels du prototype aux écrans et au code
effectivement présents, aux scénarios du cahier de recettes et aux annexes de
preuve. Elle ne remplace ni le détail des recettes ni les réserves consignées
dans les annexes.

| Besoin / user story | Route ou écran | Composants Web et API | Scénarios de recette | Preuves B2 |
| --- | --- | --- | --- | --- |
| En tant qu'utilisateur, je veux me connecter avec Google, accéder aux pages privées et me déconnecter. | `/login`, callback `/api/auth/[...nextauth]`, puis `/generate` ; redirection vers `/login` depuis les routes privées sans session. | `app/(auth)/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`, contrôle `auth()` dans les pages privées, navigation de `app/layout.tsx`. | CR-001 à CR-004 | B2-A20 (redirections publiques), B2-A24 (démarrage OAuth), B2-A25 (session et déconnexion), B2-A30 (prototype authentifié). |
| En tant qu'utilisateur connecté, je veux générer une séance à partir de mon sport, niveau, durée et objectifs, puis ouvrir son détail. | `/generate` → `/workouts/[id]`. | `WorkoutForm`, action serveur de `app/generate/page.tsx`, `serverApi.generateWorkout()` → `POST /workouts/generate` ; contrôleur, schéma et services Workout/IA de l'API. | CR-010 à CR-015 | B2-A25 (génération réelle et validation), B2-A30 (captures desktop/mobile), B2-A31 (contrats partagés), B2-A34 (erreurs IA et non-persistance). |
| En tant qu'utilisateur connecté, je veux générer un programme structuré sur plusieurs semaines et consulter son contenu. | `/programs/generate` → `/programs/[id]`. | `ProgramForm`, action serveur de `app/programs/generate/page.tsx`, `serverApi.generateProgram()` → `POST /programs/generate` ; contrôleur, schéma et services Program/IA de l'API. | CR-016 et CR-017 | B2-A25 (programme réel 2 semaines/4 séances), B2-A30 (capture du formulaire), B2-A31 (contrats partagés). |
| En tant qu'utilisateur, je veux retrouver uniquement mes séances, les filtrer par sport et niveau et parcourir les pages de résultats. | `/workouts?sport=…&level=…&page=…`. | `app/workouts/page.tsx`, `WorkoutCard`, formulaire GET de filtres ; `serverApi.getWorkouts()` → `GET /workouts` ; contrôleur, service et repository Workout. | CR-022 ; contrôles d'isolation CR-023 et CR-024 | B2-A19 (PostgreSQL réel et ownership), B2-A25 (filtre sport corrigé), B2-A34 (suites API/Web/PostgreSQL finales). |
| En tant qu'utilisateur, je veux lister et paginer mes programmes, puis naviguer entre les semaines et les séances. | `/programs?page=…`, `/programs/[id]`, `/programs/[id]/sessions/[sessionId]`. | `app/programs/page.tsx`, `ProgramCard`, `ProgramWeekTabs` ; `serverApi.getPrograms()` et `getProgram()` → `GET /programs`, `GET /programs/:id`. | CR-018 à CR-020 | B2-A19 (isolation PostgreSQL), B2-A25 (détail et navigation clavier des onglets), B2-A34 (pagination et isolation). |
| En tant que sportif, je veux consulter le déroulé d'une séance et l'exécuter avec un Timer utilisable au clavier. | `/workouts/[id]` et `/programs/[id]/sessions/[sessionId]`. | `WorkoutTimeline`, `Timer`, pages de détail ; `serverApi.getWorkout()` ou `getProgram()` → `GET /workouts/:id` ou `GET /programs/:id`. | CR-019, CR-023 à CR-029 | B2-A25 (détail, Timer, pause/reprise, plein écran et focus), B2-A34 (parcours final CR-065), B2-A36 (clavier et structure automatisables). |
| En tant qu'utilisateur, je veux enregistrer la fin d'une séance avec durée active, effort, ressenti et notes facultatives afin d'alimenter mon suivi. | Formulaire de fin intégré au Timer des deux écrans de séance ; restitution sur `/dashboard`. | `Timer`, `SessionCompletionForm`, actions `completeWorkout()` et `completeProgramSession()` ; `serverApi.createSessionLog()` → `POST /session-logs` ; contrôleur, service et repository SessionLog. | CR-030 à CR-034 et CR-065 | B2-A19 (persistance et ownership PostgreSQL), B2-A34 (durée 487 s, note, parcours production et dashboard `3 → 4`). |
| En tant qu'utilisateur, je veux voir une synthèse personnelle de mes séances créées et terminées, de la durée, de l'effort et des sports pratiqués. | `/dashboard`. | `app/dashboard/page.tsx`, `getTopSports()` ; `serverApi.getStats()` → `GET /workouts/stats` et `getSessionLogStats()` → `GET /session-logs/stats`. | CR-040, CR-041 et CR-065 | B2-A25 (agrégation sport corrigée), B2-A34 (état vide, totaux, isolation et incrément production). |
| En tant qu'utilisateur, je veux connaître le fournisseur IA, choisir un modèle autorisé et recevoir une confirmation ou une erreur explicite. | `/settings`. | `SettingsForm`, action serveur de `app/settings/page.tsx` ; `serverApi.getAiSettings()` et `saveAiSettings()` → `GET /settings`, `PUT /settings` ; contrôleur et repository Settings. | CR-036 à CR-039 | B2-A25 (lecture en production), B2-A34 (persistance, restauration et rejet du modèle non autorisé). |
| En tant qu'utilisateur, je veux supprimer une séance ou un programme après confirmation, sans perdre le contrôle du focus ni masquer une erreur API. | Cartes de `/workouts` et `/programs`, ainsi que détail `/programs/[id]`. | `DeleteConfirmationButton`, `DeleteWorkoutButton`, `DeleteProgramButton` ; `serverApi.deleteWorkout()` et `deleteProgram()` → `DELETE /workouts/:id`, `DELETE /programs/:id`. | CR-021, CR-024 et CR-035 | B2-A19 (suppression et ownership PostgreSQL), B2-A25 (suppression réelle et interaction), B2-A34 (annulation, Échap et erreurs API). |
| En tant qu'utilisateur, y compris au clavier, avec un lecteur d'écran ou sur petit écran, je veux comprendre et actionner les parcours publics et privés sans perte d'information. | `/`, `/login`, `/confidentialite`, `/dashboard`, `/generate`, `/programs`, `/programs/generate`, `/workouts`, `/settings`, dialogues de suppression et Timer. | Structure sémantique des pages et formulaires, `ProgramWeekTabs`, `DeleteConfirmationButton`, `Timer` ; tests Playwright/axe, tests de structure/composants et parcours NVDA. | CR-051 à CR-055 | B2-A20 (public 320 px/clavier/axe), B2-A25 (contrôles authentifiés et focus), B2-A30 (reflow authentifié), B2-A36 (audit automatisable final), B2-A37 (zoom et contrastes), B2-A40 (sémantique), B2-A41 (NVDA réel et écarts). |

## Sources et limite de lecture

- Scénarios et statuts : `docs/bloc2/cahier-recettes.md`.
- Description et statut des annexes : `docs/rncp/bloc2-annexes/index.md`.
- Routes Web : `apps/web/app/` ; composants : `apps/web/components/` ; client
  serveur : `apps/web/lib/server-api.ts`.
- Routes API : `apps/api/src/routes/` ; contrôleurs, services et repositories :
  `apps/api/src/controllers/`, `apps/api/src/services/` et
  `apps/api/src/repositories/`.

La couverture accessibilité ne doit pas être interprétée comme une conformité
RGAA exhaustive : CR-055 est clos avec une réserve documentaire. B2-A37
indique que les 166 contextes composites de l'échantillon sont décidés. B2-A41
consigne la campagne NVDA détaillée sur `rc.4`, les correctifs publiés dans
`rc.5` et la validation NVDA déclarée par l'utilisateur. B2-BUG-044/045 restent
des améliorations P2 non bloquantes ; aucune appréciation auditive détaillée
n'est revendiquée.
