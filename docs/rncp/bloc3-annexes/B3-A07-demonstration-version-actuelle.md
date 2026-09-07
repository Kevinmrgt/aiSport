# B3-A07 — Démonstration de la version actuelle

> Compétence : **RNCP39583 C3.4.2 — Présenter la dernière version logicielle**
>
> Produit : Alcide
>
> Contrôle courant : **2026-09-07**
>
> Version : **`0.13.0-rc.8`**
>
> SHA : **`0a2caffc314bbb4697baf2fbbfe39ec74248e038`**
>
> Branche de travail : `main`
>
> `origin/main` : même SHA au moment du contrôle

## 1. Conclusion de la répétition

La candidate `0.13.0-rc.8` est démontrable sur son parcours public : accueil,
connexion, protection des routes et healthchecks Web/API ont été rejoués sur la
production. Le Web public a aussi été rejoué localement, sans overlay d'erreur.
La production répond en HTTP 200 sur les trois endpoints de santé et annonce la
même version ; la readiness déclare la base et la configuration IA `ok`.

La décision est **GO pour la démonstration** :

- **accès jury configuré** : le formulaire n'est rendu que si les huit
  paramètres sont valides, l'accès activé et l'expiration future ; il est
  présent sur la production. Aucun secret n'a été lu ni exposé ;
- **état local DB** : après indisponibilité initiale de Docker, `alcide-db` est
  devenu sain ; les migrations et le seed ont été exécutés sur
  `localhost:5432/alcide` uniquement ;
- **traçabilité distante** : les gates locales qualité et sécurité sont vertes ;
  les overrides et le lockfile corrigé, rattachés au commit `7fc5f01`, sont
  validés par la CI `34108724410` et déployés par la CD `34109152619` ;
- **réserve OAuth distincte** : le workflow `34109534059` a détecté que la
  session Google capturée le 2026-07-21 avait expiré. Il ne prouve aucune
  régression produit ; la démonstration utilise l'accès jury ou le plan B.

L'historique reste visible : premier smoke complet 53/54 puis relance ciblée
1/1, et audit initial à 2 avis high + 1 low. Après correction, le smoke complet
sérialisé passe à 54/54 en 4,4 min et les audits complet/production à zéro. Le
vert décrit l'état validé localement et par la CI courante.

## 2. Périmètre réellement rejoué

| Environnement / contrôle                      | Preuve du 2026-09-07                                                          |    Verdict    |
| --------------------------------------------- | ----------------------------------------------------------------------------- | :-----------: |
| Production `https://ai-sport-web.vercel.app/` | page complète, non vide, titre et CTA visibles                                |    Réussi     |
| Production `/login`                           | Google + formulaire jury visibles, aucune valeur saisie                       | Réussi public |
| Configuration accès jury                      | formulaire visible : activation, schéma, hash et expiration future valides    |    Réussi     |
| Production `/generate`, sans session          | redirection effective vers `/login`                                           |    Réussi     |
| Production Web `/api/health`                  | HTTP 200, `0.13.0-rc.8`                                                       |    Réussi     |
| Production API `/health`                      | HTTP 200, `0.13.0-rc.8`                                                       |    Réussi     |
| Production API `/health/ready`                | HTTP 200, DB et IA `ok`, `0.13.0-rc.8`                                        |    Réussi     |
| Local Web `/`                                 | contenu complet, 0 overlay Next.js                                            |    Réussi     |
| Local `/generate`, sans session               | redirection vers `/login`                                                     |    Réussi     |
| Local Web `/api/health`                       | HTTP 200, `0.13.0-rc.8`                                                       |    Réussi     |
| Local accès jury désactivé                    | formulaire absent avec kill switch `false`                                    |    Réussi     |
| Local PostgreSQL                              | `alcide-db` sain, port 5432 ; aucune base distante touchée                    |    Réussi     |
| Local migrations `0000`–`0006` et seed        | migrations réussies ; contrôle SQL : `users=1`, `workouts=3`                  |    Réussi     |
| Local API                                     | non démarrée faute de secrets de service dans la session                      |   Non testé   |
| Production authentifiée par OAuth             | run `34109534059` : session de juillet expirée avant les assertions métier    | À renouveler  |
| Smoke E2E multi-navigateurs                   | historique 53/54 puis 1/1 ; nouveau run `workers=1` 54/54 en 4,4 min          |  Vert local   |
| Audit complet + production                    | overrides `browserslist@4.28.7` et `postcss-selector-parser@6.1.3`, codes 0/0 |  Vert local   |
| CI/CD du correctif                            | CI `34108724410` et CD `34109152619` réussies sur `0a2caff`                   |    Réussi     |
| Santé après déploiement                       | 150/150 ; p95 maximal 378,64 ms                                               |    Réussi     |
| Validation commanditaire                      | `PV-SIM-01`, acteur `COM-SIM` explicitement fictif                            | Sous réserves |

Les résultats, horodatages, commandes et empreintes des captures sont regroupés
dans
`docs/rncp/bloc3-annexes/preuves-demo-2026-09-07/README.md`.

## 3. Accès jury : préparation sans secret dans Git

Le formulaire visible en production n'est pas un accès anonyme. Il crée une
session Auth.js normale et conserve les contrôles d'ownership. Les huit noms de
variables requis sont documentés dans `apps/web/.env.example` : activation,
identifiant, hash de mot de passe, identifiant utilisateur, e-mail technique,
nom, expiration et version de session. Le mot de passe en clair n'a pas sa
place dans le dépôt, cette annexe, une capture, l'historique du terminal ou le
chat.

### Contrôle de l'accès privé à H-15 et après l'épreuve

1. Confirmer dans le gestionnaire Vercel, sans partager les valeurs, que les
   huit variables existent sur l'environnement Production.
2. Confirmer que l'expiration est postérieure à la fin de l'épreuve et que le
   kill switch est activé uniquement pour la fenêtre nécessaire.
3. Faire une connexion privée avec les identifiants transmis séparément dans
   le dossier confidentiel ; vérifier `/generate`, puis la déconnexion et le
   retour de `/generate` vers `/login`.
4. Contrôler que le compte technique correspond à l'utilisateur PostgreSQL
   attendu et que le solde de génération reste suffisant. Le plafond est global
   au compte jury : ne pas consommer une génération pendant chaque répétition.
5. Transmettre au jury l'URL publique et les identifiants par un canal privé,
   jamais dans le support public ; demander de ne saisir aucune donnée réelle,
   personnelle ou médicale.
6. Après l'épreuve : désactiver l'accès, changer la version de session et
   vérifier qu'une session précédente est révoquée.

La recette `rc.7` du 2026-07-23 (`B2-A42`) et la contre-recette `rc.8`
(`B2-A43`) prouvent qu'un accès authentifié a déjà fonctionné. Elles restent
des **preuves historiques** ; elles ne remplacent pas le contrôle H-15 de
l'accès privé choisi pour la démonstration.

## 4. Données de démonstration et règle de sécurité DB

Le seed versionné crée un utilisateur technique et trois entraînements variés,
sans appel au fournisseur IA. Il est idempotent sur le couple utilisateur/titre.
Sept migrations SQL, de `0000` à `0006`, correspondent aux sept entrées du
journal Drizzle.

La répétition du 2026-09-07 a exclusivement préparé la cible locale
`localhost:5432/alcide`. Après une indisponibilité initiale du moteur Docker,
le conteneur `alcide-db` a été contrôlé (`postgres:16-alpine`, port 5432), puis
démarré directement pour éviter l'interpolation des secrets API/Web par
Compose. Le healthcheck est passé à `healthy`, `pnpm db:migrate` et
`pnpm db:seed` ont réussi, puis une lecture SQL a confirmé `users=1` et
`workouts=3`. **Aucune base distante n'a été touchée.**

Règle avant toute nouvelle tentative : afficher et valider l'hôte, le port et
le nom de la base, sans afficher ses secrets ; interrompre si la cible n'est pas
strictement `localhost:5432/alcide`. Le pas-à-pas de reprise est dans le journal
de preuves.

## 5. Déroulé démontrable en 6 min 30

Le conducteur détaillé, les phrases adaptées au jury et les transitions sont
dans `docs/rncp/bloc3-script-demo-logiciel.md`.

|    Chrono | Action                                               | Message client / jury                                                   | Preuve de pilotage                    |
| --------: | ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| 0:00–0:35 | Web health puis accueil production                   | « Je fixe d'abord la version réellement livrée. »                       | `rc.8`, SHA et supervision            |
| 0:35–1:10 | Ouvrir `/generate` hors session, constater `/login`  | « Une page privée n'est jamais servie sans session. »                   | garde de route                        |
| 1:10–1:45 | Connexion dans un onglet privé déjà préparé          | « L'accès jury est temporaire et révocable. »                           | Auth.js, ownership, quota             |
| 1:45–2:45 | Ouvrir une séance existante et son détail            | « Le besoin sportif devient une séance structurée et persistée. »       | valeur métier sans dépendance IA live |
| 2:45–3:40 | Lancer/pause du timer et montrer le retour de séance | « L'usage va jusqu'à l'exécution et au feedback. »                      | boucle fonctionnelle                  |
| 3:40–4:35 | Programme existant, semaines et séance               | « Le produit organise une progression, pas une réponse isolée. »        | périmètre livré                       |
| 4:35–5:20 | Dashboard                                            | « Les données d'usage sont restituées en indicateurs compréhensibles. » | traçabilité utilisateur               |
| 5:20–5:55 | Readiness API                                        | « La livraison expose l'état Web, API, DB et IA. »                      | exploitabilité                        |
| 5:55–6:30 | Réserves et conclusion                               | « Version démontrable, réserves connues et décisions datées. »          | pilotage transparent                  |

Une génération IA en direct est facultative et hors chemin critique : elle ne
doit être lancée que si la connexion, le quota et le temps restant sont
confirmés. La démonstration principale utilise une séance existante.

## 6. Plan B gradué

| Incident                           | Bascule immédiate                                                                                                        | Ce qui reste prouvable                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Auth jury refusée ou expirée       | rester hors session, montrer redirection et capture 02/03 ; utiliser les preuves authentifiées historiques en les datant | barrière d'accès réelle, conception de l'accès ; pas le parcours privé courant     |
| IA lente/indisponible/quota faible | ouvrir une séance et un programme existants ; ne pas relancer                                                            | consultation, timer, programme, dashboard                                          |
| Production Web indisponible        | ouvrir le Web local déjà préparé ; health local ; captures 01 à 09                                                       | UI publique et protection ; privé seulement si DB/auth local ont été validés avant |
| API ou DB indisponible             | montrer readiness et son statut, puis captures ; ne pas improviser de migration distante                                 | supervision et gestion d'incident                                                  |
| Docker toujours bloqué             | ne pas promettre le mode local complet ; utiliser production + captures                                                  | transparence sur la continuité partielle                                           |
| Réseau de salle absent             | diaporama/captures locales + code/ADR déjà ouverts                                                                       | preuve visuelle de secours, architecture et qualité                                |
| Question sur le flake E2E          | présenter l'historique 53/54 + 1/1, puis le nouveau 54/54 sérialisé                                                      | gate `workers=1` verte ; risque parallèle conservé                                 |

## 7. Checklist de répétition

### Répétition de gate équivalente J-2 — 2026-09-07

- [x] relever le SHA déployé et vérifier les quatre manifests en même version ;
- [x] exécuter les trois healthchecks : 150/150 après CD, horodatage conservé ;
- [x] confirmer la disponibilité de l'accès jury sans exposer le secret : le
      rendu conditionnel du formulaire prouve activation, schéma valide, hash
      analysable, version de session renseignée et expiration future ;
- [x] préserver le quota : aucune génération IA de production lancée pendant la
      répétition ;
- [x] couvrir séance, programme et dashboard par le seed local et les captures ;
- [x] obtenir `docker info`, migrer et seeder **uniquement**
      `localhost:5432/alcide` ;
- [x] rejouer le smoke complet avec `workers=1` : 54/54 sans relance ;
- [x] rejouer les audits complet et production : deux codes 0 ;
- [x] obtenir une CI distante verte sur le correctif : `34108724410` ;
- [x] déployer la baseline par la CD : `34109152619` ;
- [x] faire valider le scénario par le commanditaire fictif `COM-SIM` et
      consigner la décision dans `PV-SIM-01`.

### H-15 — orateur

- [ ] mode Ne pas déranger, zoom 100 %, aucun gestionnaire de secrets à l'écran ;
- [ ] onglets ordonnés : health Web, accueil, onglet authentifié, readiness,
      dossier de captures ;
- [ ] URL `/generate` hors session prête dans un autre profil ;
- [ ] compte de démonstration exempt de données personnelles ;
- [ ] timer d'oral visible mais hors partage ;
- [ ] bascule Plan B répétée en moins de 15 secondes ;
- [ ] fermer terminal, historique et variables d'environnement avant partage.

### Après l'épreuve

- [ ] déconnecter la session ;
- [ ] désactiver/faire tourner l'accès temporaire selon la politique convenue ;
- [ ] supprimer les données de démonstration créées en production si autorisé ;
- [ ] consigner incident, réserve, résultat jury et action de suivi.

## 8. Couverture du critère C3.4.2

| Attendu                        | Réponse vérifiable                                                            | Limite annoncée                                              |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Dernière version identifiée    | 4 manifests + production en `0.13.0-rc.8`, SHA `0a2caff` fixé                 | Vercel n'expose pas directement le SHA dans le healthcheck   |
| Démonstration préparée         | conducteur chronométré 6:30, vocabulaire client/jury                          | OAuth dédié à renouveler si ce mode est retenu               |
| Version opérationnelle montrée | accueil, login, garde et 3 healthchecks production ; Web et DB locale         | API locale non démarrée faute de secrets                     |
| Conditions d'accès             | formulaire jury disponible, canal confidentiel, expiration, révocation, quota | secret volontairement absent des preuves                     |
| Données prêtes                 | 7 migrations appliquées ; seed : 1 utilisateur et 3 séances                   | génération IA live facultative                               |
| Continuité                     | 9 captures vérifiées, plan B gradué                                           | captures privées courantes indisponibles                     |
| Qualité et transparence        | smoke 54/54 ; audits à zéro ; CI/CD `34108724410`/`34109152619` vertes        | run OAuth expiré `34109534059` conservé comme preuve de gate |
| Validation commanditaire       | `PV-SIM-01` : validé sous réserves                                            | décision d'un acteur fictif, pas un avis humain réel         |

## 9. Décision finale

La démonstration est en **GO** sur la candidate actuelle : CI/CD, santé de
production, données locales, smoke, audits, captures et validation simulée sont
tracés. Le run OAuth expiré ne doit pas être annoncé comme vert ; il impose de
renouveler la session dédiée seulement si Google est choisi le jour de l'oral.
Le parcours principal peut employer l'accès jury confidentiel ou le plan B
local/captures. Les actions H-15 et post-épreuve restent naturellement à
exécuter au moment réel de la présentation.
