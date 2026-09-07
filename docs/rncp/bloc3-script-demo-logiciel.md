# Script de démonstration logiciel Bloc 3 — Alcide

> Épreuve : RNCP39583 Bloc 3
>
> Version démontrée : **`0.13.0-rc.8`**
>
> SHA de répétition : **`d950b6b790a8b11153995bf817b7cb0d583d36da`**
>
> Production : `https://ai-sport-web.vercel.app` et
> `https://ai-sport-api.vercel.app`
>
> Durée verrouillée : **6 min 30**
>
> Répétition documentée : `docs/rncp/bloc3-annexes/B3-A07-demonstration-version-actuelle.md`

## 1. Fil conducteur

> Je présente Alcide comme un parcours sportif complet : accéder de façon
> sécurisée à son espace, consulter une séance, l'exécuter, organiser sa
> progression et lire son suivi. À chaque étape, je montre aussi comment la
> version est vérifiée, supervisée et sécurisée.

Ne pas présenter la génération IA comme l'unique valeur du produit. Le chemin
principal s'appuie sur des données existantes et tient sans appel IA en direct.
Les gates locales audit et E2E sont désormais vertes. Ne pas transformer ce
résultat local en preuve de livraison distante : les overrides et le lockfile
sont rattachés au commit `7fc5f01`, dont la CI distante reste à obtenir. Conserver l'historique du
premier smoke instable dans l'explication.

## 2. Préparation des onglets

Dans cet ordre :

1. `https://ai-sport-web.vercel.app/api/health` ;
2. `https://ai-sport-web.vercel.app/` ;
3. un profil hors session prêt à ouvrir
   `https://ai-sport-web.vercel.app/generate` ;
4. un profil authentifié par le propriétaire de l'accès jury, avant partage
   d'écran, avec une séance et un programme existants ;
5. `https://ai-sport-api.vercel.app/health/ready` ;
6. `docs/rncp/bloc3-annexes/preuves-demo-2026-09-07/` ouvert localement.

Si le quatrième onglet n'a pas été validé à J-2, ne pas tenter de retrouver ou
de créer un secret pendant l'oral : annoncer le périmètre public et basculer sur
les captures/preuves historiques datées.

## 3. Conducteur mot à mot — 6 min 30

### 0:00–0:35 — Fixer la version

**Action.** Montrer le JSON du health Web, puis l'accueil.

**Dire.**

> Je commence par la version réellement servie, `0.13.0-rc.8`. Le healthcheck
> Web répond en HTTP 200 avec cette version. L'accueil formule la promesse en
> langage utilisateur : des séances adaptées et un suivi dans un espace
> personnel.

**Transition.** « Avant le métier, je vérifie la frontière d'accès. »

### 0:35–1:10 — Prouver la protection

**Action.** Dans le profil hors session, ouvrir `/generate`. Montrer l'URL
finale `/login`, sans saisir de valeur.

**Dire.**

> La génération est une page privée. Sans session, la demande aboutit à la
> connexion : le contenu utilisateur n'est pas rendu. Deux voies existent,
> Google et un accès jury temporaire, révocable et limité. Le mot de passe
> n'est jamais stocké dans ce dépôt ni affiché dans le support.

**Transition.** « Je passe maintenant à une session préparée hors partage. »

### 1:10–1:45 — Entrer dans l'espace préparé

**Action.** Basculer vers l'onglet déjà authentifié. Montrer brièvement la
navigation et, s'il est visible, le compteur de quota, sans déclencher de
génération.

**Dire.**

> L'accès jury crée une session Auth.js normale : les mêmes contrôles
> d'autorisation et d'isolation s'appliquent. Sa date d'expiration, son kill
> switch et sa version permettent de le révoquer. Un quota global protège aussi
> le coût des générations.

**Interdit.** Ne jamais ouvrir Vercel, un `.env`, un gestionnaire de mots de
passe ou l'onglet réseau pendant le partage.

### 1:45–2:45 — Consulter une séance

**Action.** Ouvrir `/workouts`, puis une séance existante. Pointer titre,
durée, niveau, échauffement, exercices et récupération.

**Dire.**

> Une demande sportive est transformée en objet structuré, validé puis
> persisté pour son propriétaire. J'utilise ici une séance existante : la valeur
> métier reste démontrable sans rendre l'oral dépendant de la latence du
> fournisseur IA.

**Si une génération est demandée.** Montrer le formulaire ; lancer uniquement
si le quota, le réseau et deux minutes de marge sont confirmés. Sinon dire :

> La génération en direct est un enrichissement ; elle n'est pas sur le chemin
> critique de cette démonstration.

### 2:45–3:40 — Exécuter et enregistrer

**Action.** Lancer le timer, montrer pause/reprise, puis pointer le mécanisme de
fin et de retour utilisateur sans attendre la durée réelle.

**Dire.**

> Alcide ne s'arrête pas à produire un texte. Le timer accompagne l'exécution,
> et la fin de séance recueille effort perçu et retour. C'est la boucle complète
> entre recommandation, action et donnée de suivi.

### 3:40–4:35 — Montrer la progression

**Action.** Ouvrir `/programs`, un programme existant, puis pointer semaines et
séances.

**Dire.**

> Le programme organise plusieurs séances dans le temps. Cette vue traduit
> l'évolution du périmètre : d'une séance ponctuelle vers une progression
> structurée, tout en gardant des données rattachées au même utilisateur.

### 4:35–5:20 — Restituer le suivi

**Action.** Ouvrir `/dashboard` et pointer deux ou trois indicateurs maximum.

**Dire.**

> Le tableau de bord restitue les séances et les retours sous une forme lisible.
> Il rend le parcours observable par l'utilisateur, au lieu de laisser les
> données dans la seule base technique.

**Si le dashboard est vide.** Ne pas improviser : expliquer qu'il se nourrit
des séances terminées, puis afficher la capture de secours historique en
précisant sa date/version.

### 5:20–5:55 — Prouver l'exploitabilité

**Action.** Basculer sur `/health/ready` de l'API.

**Dire.**

> La readiness complète la simple disponibilité : elle vérifie l'API, l'accès
> à PostgreSQL et la configuration IA. Lors de la répétition du 7 septembre,
> les trois healthchecks ont répondu en HTTP 200 et en `rc.8`.

### 5:55–6:30 — Clore avec une décision honnête

**Dire.**

> La candidate est disponible et le parcours public a été rejoué. Le contrôle
> qualité compte 261 tests unitaires passants. Le premier smoke complet du jour
> a fait 53 sur 54 puis le cas ciblé 1 sur 1 ; après sérialisation, un nouveau
> run complet passe 54 sur 54 en 4,4 minutes. Les audits complet et production
> passent aussi à zéro après deux overrides qualifiés. Ces gates sont vertes
> localement ; le lockfile est rattaché au commit `7fc5f01`, dont la CI distante
> reste nécessaire avant de l'attribuer à une livraison.

Arrêter ici. Ne pas ouvrir le code sauf question du jury.

## 4. Plan B en moins de 15 secondes

| Signal                    | Phrase courte                                                                     | Action                                                       |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Login refusé              | « L'accès courant n'est pas validé ; je ne vais pas fabriquer une réussite. »     | capture login + redirection ; poursuivre health/architecture |
| IA lente                  | « La dépendance externe sort du chemin critique. »                                | séance existante                                             |
| Production indisponible   | « Je bascule sur la répétition locale et ses preuves horodatées. »                | local Web puis captures 06–09                                |
| API/DB rouge              | « La readiness joue son rôle d'alerte ; je poursuis sans mutation distante. »     | capture 05 + explication du runbook                          |
| Réseau absent             | « Je déroule le même parcours sur les preuves de secours. »                       | captures 01–09, puis preuves historiques privées datées      |
| Question sur le flake E2E | « Le premier run a révélé une course ; la gate sérialisée est maintenant verte. » | annoncer 53/54 + 1/1, puis 54/54 avec `workers=1`            |

## 5. Local : procédure conditionnelle

Le 2026-09-07, seul le Web local a été validé. Docker Desktop n'a pas répondu ;
la DB locale n'a pas été migrée/seedée. Ne promettre le mode complet que si la
procédure suivante a réussi avant l'épreuve.

```powershell
docker info
$env:DATABASE_URL='postgresql://alcide:alcide_dev@localhost:5432/alcide'
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Le fichier Compose exige aussi des variables pour interpoler les services non
lancés. N'utiliser que des sentinelles locales de processus pour la préparation,
jamais des secrets de production, et ne rien écrire dans un fichier suivi par
Git. Refuser l'exécution si la `DATABASE_URL` n'est pas strictement locale.

## 6. Checklist orateur

### Avant partage

- [ ] version/SHA et 3 healthchecks relus ;
- [ ] compte jury validé par son propriétaire, expiration et quota confirmés ;
- [ ] séance, programme et dashboard déjà ouverts ;
- [ ] captures 01–09 rendues et lisibles ;
- [ ] historique terminal, variables et gestionnaires de secrets fermés ;
- [ ] chrono 6:30 testé, bascule Plan B en moins de 15 s ;
- [ ] historique et état courant mémorisés : 53/54 + 1/1, puis 54/54
      sérialisé ; audit initial 3 avis, puis audits à zéro ;
- [ ] statut commité en `7fc5f01` mais non validé par CI distante annoncé exactement.

### Pendant

- [ ] dire ce que l'écran prouve, pas ce qu'il pourrait prouver ;
- [ ] ne saisir aucune donnée personnelle/médicale réelle ;
- [ ] ne lancer l'IA qu'avec marge et quota ;
- [ ] préciser que `54/54` est le second run complet avec `workers=1`, pas la
      disparition prouvée de la course en parallèle ni une CI distante ;
- [ ] ne jamais montrer de secret.

### Après

- [ ] déconnexion ;
- [ ] révocation/rotation de l'accès temporaire par son propriétaire ;
- [ ] consignation des écarts, incidents et décisions.

## 7. Réponses courtes aux questions probables

**Pourquoi ne pas générer en direct ?**

Pour démontrer le produit, pas la qualité du réseau du jour. La génération peut
être montrée sur demande, mais une séance existante sécurise le temps et le
quota.

**L'accès jury fonctionne-t-il aujourd'hui ?**

Le formulaire est visible et une recette `rc.8` a réussi le 23 juillet. La
session du 7 septembre n'avait pas le secret : je ne revendique donc pas de
nouvelle connexion authentifiée avant la gate J-2.

**Le local complet est-il prêt ?**

Le Web public est validé. Les migrations et le seed sont cohérents dans le
dépôt, mais leur exécution est bloquée tant que le moteur Docker local ne
répond pas.

**Tous les tests sont-ils verts ?**

Les gates locales actuelles sont vertes : smoke complet sérialisé 54/54 et
audits complet/production à zéro. Je conserve l'historique 53/54 puis 1/1 du
mode parallèle. Les overrides et le lockfile sont rattachés au commit
`7fc5f01`, mais pas encore validés par une CI distante : je ne présente donc pas la
livraison distante comme corrigée.
