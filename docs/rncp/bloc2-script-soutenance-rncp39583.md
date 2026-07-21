# Script de soutenance — Bloc 2 RNCP39583

> Durée cible : 14 minutes 30, hors questions.
> Le candidat ne prononce aucune adresse électronique, aucun secret et aucune
> donnée de santé personnelle. Les données affichées sont dédiées à la recette.

## Avant de commencer

Ouvrir uniquement les supports nécessaires : application, dossier principal,
annexes, run CI `29845956008`, run CD `29846343559` et `MANIFESTE.txt`. Fermer
les consoles contenant des variables d'environnement. Vérifier que le zoom de
présentation rend le texte lisible au jury.

Phrase d'ouverture à conserver :

> « Je présente les preuves du Bloc 2 sur la baseline applicative `b002adb`.
> Le bloc comporte neuf compétences, dont quatre éliminatoires. Je vais
> distinguer ce qui a été exécuté, ce qui est automatisé et l'unique réserve
> qui reste ouverte. »

## Déroulé chronométré

### 0:00–0:45 — Cadre et fil conducteur

- Afficher la synthèse du dossier, section 2.
- Annoncer neuf compétences, quatre éliminatoires et 59 recettes : 58 closes,
  une réservée.
- Expliquer que chaque affirmation renvoie à une annexe, un run ou un manuel.

Transition : « Je commence par la chaîne qui rend l'application
reproductible, puis je démontre les quatre compétences éliminatoires. »

### 0:45–2:00 — C2.1.1, architecture et environnements

- Montrer le schéma de la section 5 : Next.js vers API Hono, services,
  repositories, PostgreSQL/OpenAI.
- Citer Node 24, pnpm figé, PostgreSQL 16, Docker, Vercel et Neon.
- Donner trois mesures A29 : 150/150 réponses valides ; p95 Web 508,63 ms,
  API 339,66 ms et readiness 267,11 ms.
- Borner immédiatement la preuve : mesure séquentielle, sans charge distribuée
  et sans chronométrage d'une génération IA payante.

### 2:00–3:00 — C2.1.2, intégration continue

- Afficher le run `29845956008` et ses six jobs verts.
- Résumer les gates : lint, types, tests/couvertures, PostgreSQL réel,
  Playwright/axe, build, audit low et images Docker.
- Montrer que la CI porte exactement le SHA court `b002adb`.
- Citer B2-A38 : la CI courante `29856584668` échoue réellement sur la PR
  isolée `#46`, les jobs aval sont `skipped`, aucun CD n'est créé et les
  inventaires Vercel production restent inchangés ; `test:cd-policy` passe 6/6.

Phrase de précision : « Les suites complètes comptent 170 tests API, 55 Web,
14 shared et neuf contrôles PostgreSQL RNCP ; les rapports de couverture ont
un sous-ensemble instrumenté, présenté séparément. »

### 3:00–5:00 — C2.2.1, prototype — éliminatoire

Parcours live minimal, sans création destructive :

1. ouvrir l'accueil connecté et annoncer la protection OAuth ;
2. ouvrir le formulaire de génération et montrer labels, validation et reflow ;
3. ouvrir un programme existant, changer d'onglet semaine au clavier ;
4. ouvrir une séance, démarrer puis mettre en pause le Timer ;
5. montrer le journal et le dashboard, puis les paramètres.

Si une opération réelle d'IA risque de ralentir l'oral, ne pas la lancer. Montrer
le résultat existant et renvoyer à B2-A25/B2-A34 pour la création, la
journalisation et le nettoyage réellement exécutés. Montrer ensuite les
captures bureau/mobile B2-A30.

### 5:00–6:30 — C2.2.2, tests — éliminatoire

- Afficher le tableau de couverture de la section 8 et B2-A31.
- Expliquer un test par couche : contrat Zod partagé, service API, composant
  React et repository PostgreSQL avec ownership.
- Citer les lignes couvertes : shared 100 %, API 85,64 %, Web 69,04 % et
  PostgreSQL 93,70 %.
- Expliquer que les pages serveur non unitaires sont complétées par Playwright,
  sans gonfler artificiellement la couverture.

### 6:30–9:00 — C2.2.3, sécurité et accessibilité — éliminatoire

Sécurité :

- montrer B2-A35 ; citer ownership, validation Zod, requêtes paramétrées,
  secret interservice, CORS, CSP et audit de dépendances ;
- rappeler les exécutions SQL-like, XSS inerte, absence de secret dans le
  navigateur et refus d'une origine hostile ;
- annoncer les risques résiduels : rate limit en mémoire et CSP contenant
  encore `unsafe-inline`.

Accessibilité :

- montrer B2-A36/B2-A37 : 33/33 contrôles sur pages publiques/privées et
  zoom Chromium natif 16/16 à 200/400 % après correction ;
- citer reflow, clavier, focus, structure, alertes et arbre d'accessibilité ;
- dire exactement : « Ce résultat ne constitue pas une déclaration exhaustive
  de conformité RGAA. La revue humaine des fonds composites et le parcours
  avec lecteur d'écran réel restent ouverts. »

### 9:00–10:00 — C2.2.4, déploiement et versionnement

- Afficher le run CD `29846343559` : migration, API, smoke API, Web, smoke Web.
- Citer les réponses HTTP 200 et la readiness PostgreSQL/configuration IA `ok`.
- Distinguer le SHA applicatif `b002adb` du SHA documentaire `f92a31e`.

### 10:00–12:00 — C2.3.1, cahier de recettes — éliminatoire

- Afficher la matrice fonction → scénario → preuve du cahier.
- Donner le résultat exact : 58 scénarios clos sur 59.
- Montrer une recette nominale, une erreur et une sécurité : CR-016 génération,
  CR-015 panne IA et CR-043 XSS, par exemple.
- Présenter CR-055 comme l'unique réserve. Montrer que CR-062 est fermé par
  B2-A38, tout en disant qu'aucun commit volontairement rouge n'a été poussé
  sur `main`.

Phrase de cadrage : « Une réserve n'est pas transformée en succès. Elle indique
le contrôle manquant, la preuve disponible et l'action qui permettrait de la
fermer. »

### 12:00–13:00 — C2.3.2, correction des bogues

- Ouvrir le plan B2-A13.
- Raconter un cycle complet : reproduction d'une troncature à 400 %, correction
  par retour à la ligne, tests Web/typecheck/build, CI/CD puis contre-recette
  16/16 en production.
- Citer aussi la correction des vulnérabilités `brace-expansion` et
  `shell-quote` documentée par B2-A27.

### 13:00–14:00 — C2.4.1, documentation d'exploitation

- Montrer les trois manuels : déploiement, utilisateur et mise à jour.
- Expliquer le parcours d'un exploitant : prérequis, variables sans valeur
  secrète, migrations, healthchecks, rollback et mise à jour.
- Montrer que les manuels sont inclus dans les annexes et dans l'archive source.

### 14:00–14:30 — Conclusion

> « La baseline `b002adb` relie le prototype, les tests, la CI et le CD. Les
> quatre compétences éliminatoires ont des preuves primaires identifiées. Le
> dossier ne revendique ni audit RGAA exhaustif, ni rate limit distribué, ni
> replay négatif du workflow courant. Ces limites sont consignées dans les
> l'unique réserve CR-055 et dans les risques d'architecture. »

Afficher le manifeste, puis rendre la parole au jury.

## Discipline de preuve pendant les questions

- Répondre d'abord par le résultat, puis par la preuve et enfin par la limite.
- Ne jamais dire « conforme RGAA » ; dire « contrôles exécutés sur le périmètre
  documenté ».
- Ne jamais attribuer le déploiement à `f92a31e` ; seul `b002adb` est la
  baseline applicative déployée.
- Ne pas additionner les tests instrumentés et les suites complètes.
- Si une page live diffère des captures, arrêter la démonstration live et
  appliquer le plan de secours au lieu d'improviser une explication.
