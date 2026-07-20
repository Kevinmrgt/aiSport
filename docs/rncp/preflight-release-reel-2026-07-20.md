# Préflight de release — observations réelles du 20 juillet 2026

> Nature du document : relevé factuel daté. Ce document ne valide pas la candidate
> en cours de modification et ne remplace ni une CI sur son SHA final, ni un test
> d'authentification réel, ni un audit RGAA manuel.

## Périmètre et horodatage

- contrôle effectué le 20 juillet 2026 entre 07:29 UTC et 08:08 UTC ;
- dépôt contrôlé : `https://github.com/Kevinmrgt/aiSport.git` ;
- compte GitHub CLI authentifié : `Kevinmrgt` ;
- branche de travail : `codex/finalize-bloc2-jury-pack` ;
- HEAD versionné de cette branche au moment du contrôle :
  `69b21efeb36be79a70475c702384c47f7d0ecb12` ;
- l'arbre de travail contient des modifications non commitées : il n'existe donc
  pas encore de SHA final représentant la candidate corrigée.

## État GitHub réellement observé

- `main` et `origin/main` pointent sur
  `533f17be8fd50cfef3c60b3792a549a6ad80c386` ;
- la pull request [#26](https://github.com/Kevinmrgt/aiSport/pull/26) est ouverte,
  fusionnable et sans conflit, mais ses checks réussis portent sur `69b21ef`, avant
  les corrections non commitées présentes dans l'arbre de travail ;
- la dernière CI réussie sur `main` est le
  [run 29489995458](https://github.com/Kevinmrgt/aiSport/actions/runs/29489995458),
  sur le SHA `533f17b` ;
- le workflow `DB - Drizzle migrations` ne possède aucune exécution historique
  visible : la migration candidate `0005_query_indexes.sql` n'est pas prouvée
  appliquée en production ;
- le dernier CD réussi est le
  [run 29721620945](https://github.com/Kevinmrgt/aiSport/actions/runs/29721620945),
  exécuté manuellement le 20 juillet 2026 sur ce même SHA `533f17b` ;
- le dépôt ne contient aucun tag Git et aucune GitHub Release au moment du relevé ;
- la branche `main` n'est pas protégée ;
- l'environnement GitHub `Production` existe mais ne comporte aucune règle de
  protection ni approbateur obligatoire.

Les secrets GitHub nécessaires au CD Vercel sont présents par leur nom :
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID` et
`VERCEL_WEB_PROJECT_ID`. Leurs valeurs ne sont ni lisibles ni reproduites dans ce
document. Le secret GitHub `OPENAI_API_KEY` n'apparaît pas dans l'inventaire du
dépôt ; cela ne permet pas de conclure sur la présence de la variable dans les
environnements Vercel, qui sont distincts.

## État Vercel réellement observé

Les liens locaux `.vercel/project.json`, non suivis par Git, désignent bien les
projets `ai-sport-api` et `ai-sport-web`. L'accès Vercel a été confirmé par le
connecteur authentifié et par le CD GitHub réussi ; aucune session Vercel CLI
locale n'est configurée sur la machine du contrôle.

Le CD réel a exécuté avec succès `vercel pull --environment=production` pour les
deux projets. Les noms des variables Vercel n'ont toutefois pas pu être énumérés
avec les accès en lecture disponibles. Leur présence individuelle n'est donc pas
affirmée ici ; elle devra être vérifiée par `vercel env ls` avec une session
autorisée ou par les contrôles fonctionnels du déploiement final.

Les derniers déploiements de production des deux projets sont dans l'état
`READY` et portent tous les deux le SHA `533f17b` :

- API : `https://ai-sport-api.vercel.app` ;
- Web : `https://ai-sport-web.vercel.app`.

Plusieurs previews API antérieures de la pull request sont en `ERROR`. Par
exemple, le déploiement du SHA `2674bd3` porte l'erreur Vercel
`BUILD_FAILED: Resource provisioning failed` sans journal de build disponible.
Cette erreur est historique : elle ne correspond pas au SHA candidat courant.
Le projet API a ensuite été configuré avec `previewDeploymentsDisabled=true`
pour ne pas provisionner de ressource Neon de preview ; aucun statut API de PR
n'est donc attendu tant que cette politique reste active. La validation de la
candidate API doit provenir de la CI (build/tests/Docker), puis du workflow CD
de production sur le SHA fusionné avec migration et smoke readiness réussis.
L'état de la production existante ne suffit toujours pas à valider la candidate.

Les paramètres des deux projets indiquent un runtime Node.js `24.x`. L'écart
initial avec Node.js 20 dans le dépôt a été corrigé dans l'arbre candidat :
`.nvmrc`, moteurs des packages, CI/CD et images Docker ciblent désormais Node
24. Ce correctif n'est pas encore validé par la CI du SHA final au moment du
présent relevé.

Le connecteur Vercel n'a remonté aucun groupe d'erreurs runtime sur les dernières
24 heures au moment du contrôle. Cette observation limitée dans le temps ne
prouve pas l'absence d'erreurs futures ni l'exécution de tous les parcours.

## Sondes HTTP réelles

Relevé direct effectué vers 08:03 UTC :

| URL | Résultat observé | Interprétation limitée |
|---|---:|---|
| `https://ai-sport-api.vercel.app/health` | HTTP 200, `status: ok`, version `0.12.0` | API déployée vivante |
| `https://ai-sport-api.vercel.app/health/ready` | HTTP 404 | la readiness corrigée n'est pas encore déployée |
| `https://ai-sport-web.vercel.app/api/health` | HTTP 200, `status: ok`, version `0.12.0` | serveur Web déployé vivant |
| `https://ai-sport-web.vercel.app/` | HTTP 200 | page publique accessible |
| `https://ai-sport-web.vercel.app/login` | HTTP 200 | écran de connexion accessible |
| `https://ai-sport-web.vercel.app/api/auth/providers` | HTTP 200, fournisseur `google` déclaré | configuration publique Auth.js exposée ; ne prouve pas une connexion aboutie |
| `https://ai-sport-web.vercel.app/confidentialite` | HTTP 404 | la nouvelle page n'est pas encore déployée |

Le dernier rapport de monitoring disponible est l'artefact
`production-health-report` du
[run 29724791971](https://github.com/Kevinmrgt/aiSport/actions/runs/29724791971),
contrôlé à `2026-07-20T07:29:54Z`. Il prouve deux réponses HTTP 200 en version
`0.12.0` sur `/health` et `/api/health`. Il ne contrôle pas PostgreSQL, OpenAI,
l'authentification ou un parcours métier.

Dans le code candidat, `/health/ready` exécute réellement `select 1` sur
PostgreSQL. Pour OpenAI, cette sonde contrôle seulement la présence de
`OPENAI_API_KEY`, pas la joignabilité de l'API OpenAI. Elle ne doit donc pas être
présentée comme une preuve de connectivité OpenAI.

## Conditions avant toute déclaration de release candidate validée

1. figer toutes les modifications dans un SHA unique ;
2. pousser ce SHA sur la pull request et attendre ses nouveaux checks ;
3. obtenir le succès du job PostgreSQL d'intégration sur ce même SHA ;
4. vérifier les previews Vercel créées pour ce SHA ;
5. exécuter un vrai parcours Google/Auth.js avec un compte de test autorisé ;
6. fusionner seulement après les contrôles, puis attendre la CI `main` et le CD ;
7. contrôler en production `/health/ready`, `/api/health`, `/confidentialite` et
   un parcours métier authentifié ;
8. lancer le monitoring sur le nouveau SHA et archiver son artefact ;
9. créer le tag seulement après ces vérifications et reporter SHA, tag, runs et
   URLs dans le manifeste de dépôt.

Les étapes techniques GitHub/Vercel peuvent être automatisées une fois le SHA
figé. La connexion Google réelle, les éventuelles valeurs de secrets absentes et
les essais manuels avec technologies d'assistance exigent une intervention de
l'utilisateur ; aucun résultat ne doit être prérempli à leur place.
