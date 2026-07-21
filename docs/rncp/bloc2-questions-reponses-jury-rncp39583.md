# Questions-réponses jury — Bloc 2 RNCP39583

> Trame de réponse : résultat, preuve, limite, prochaine action.
> Les formulations évitent toute déclaration plus large que les contrôles
> réellement exécutés.

## Questions sur les compétences éliminatoires

### Comment prouvez-vous que le prototype est réellement fonctionnel ?

La recette authentifiée B2-A25 couvre séance, programme, Timer, journal,
dashboard, paramètres, suppressions et déconnexion sur la production. B2-A30
ajoute six tests et des captures anonymisées bureau/mobile. CR-065 ferme le
parcours post-déploiement. La preuve porte sur la baseline `b002adb` et sur les
parcours cités, pas sur toute combinaison possible d'usage.

### Pourquoi les nombres de tests ne sont-ils pas identiques partout ?

Deux périmètres sont publiés. Les suites complètes comptent 170 tests API,
55 Web, 14 shared et neuf contrôles PostgreSQL RNCP. Les rapports de couverture
instrumentent 155 API, 43 Web, 14 shared et huit PostgreSQL. Le neuvième
contrôle PostgreSQL est une recette SQL de sécurité hors instrumentation de
couverture. Les deux séries ne sont donc ni contradictoires ni additionnables.

### Une couverture Web de 69,04 % est-elle suffisante ?

Elle dépasse le seuil de majorité retenu et porte sur les composants et règles
testables dans ce runtime. Les pages serveur difficiles à instancier restent
visibles dans le rapport au lieu d'être exclues artificiellement. Les parcours
de ces pages sont complétés par Playwright et les recettes de production. La
couverture reste un indicateur, pas une preuve unique de qualité.

### Êtes-vous conforme au RGAA ?

Je ne revendique pas une conformité RGAA exhaustive. B2-A36 consigne 33/33
contrôles sur trois pages publiques et cinq privées ; B2-A37 consigne 16/16
mesures de zoom natif à 200/400 % après correction. Axe, l'arbre
d'accessibilité, le clavier, le focus et le reflow couvrent un périmètre utile,
mais ne remplacent pas la revue humaine de tous les critères. Les contrastes
sur fonds composites et un parcours avec lecteur d'écran réel restent ouverts
dans CR-055.

### Pourquoi 58 recettes closes sur 59 ne bloquent-elles pas votre remise ?

L'unique scénario réservé n'est ni caché ni marqué réussi. CR-055 borne les
contrôles d'accessibilité humaine encore nécessaires. CR-062 est désormais
clos par B2-A38, qui combine échec réel de la CI courante, absence de CD,
inventaires Vercel inchangés et test de politique 6/6. Le cahier reste ainsi
auditable. Je ne transforme pas ce ratio en décision d'acquisition ; cette
décision appartient au jury.

## Sécurité et architecture

### Pourquoi le rate limiting n'est-il pas distribué ?

Le prototype applique un quota en mémoire et CR-048 vérifie le 429 avec
`Retry-After` dans un processus. Ce contrôle protège localement mais ne garantit
pas un quota global entre instances serverless ; CR-049 l'enregistre comme
risque architectural hors dénominateur des recettes. L'industrialisation
consisterait à utiliser un store partagé avec incrément atomique et expiration,
puis à exécuter une recette concurrente multi-instance. Aucun rate limit
distribué n'est revendiqué dans l'état remis.

### Pourquoi la CSP conserve-t-elle `unsafe-inline` ?

La CSP de production bloque `unsafe-eval`, limite les origines et complète les
autres headers ; B2-A35 en contrôle l'effet. `unsafe-inline` reste nécessaire à
l'intégration actuelle et réduit la protection contre certaines injections :
il est donc documenté comme risque résiduel, pas présenté comme bonne pratique
aboutie. L'amélioration serait une stratégie de nonces ou de hashes compatible
avec le rendu Next.js, suivie de tests sur chaque route et d'une CSP en mode
report-only avant blocage.

### Comment empêchez-vous l'accès aux données d'un autre utilisateur ?

Le Web transmet une identité issue de la session, l'API vérifie le secret
interservice, puis les services et repositories filtrent les ressources par
propriétaire. Les cas 403 et l'absence d'insertion sont couverts en API et sur
PostgreSQL réel, notamment CR-022, CR-023, CR-031 et CR-032. Un identifiant
envoyé librement par le navigateur n'est pas utilisé comme preuve d'identité.

### Comment traitez-vous SQL injection et XSS ?

Les entrées sont validées par Zod et les requêtes Drizzle sont paramétrées.
B2-A35 insère puis relit une chaîne SQL-like comme donnée tout en vérifiant que
la table reste intacte. Des charges `script` et `img onerror` restent inertes
au rendu React dans Chromium et Firefox. Ces recettes ciblées complètent la
revue OWASP ; elles ne constituent pas un test d'intrusion exhaustif.

### Que faites-vous des données liées à la santé ?

Les journaux et notes facultatives sont rattachés au compte et filtrés par
ownership ; la notice de confidentialité décrit le traitement. Le dossier et
les captures sont anonymisés, et les secrets restent hors navigateur et hors
dépôt. Une industrialisation demanderait en plus une analyse réglementaire et
de conservation adaptée au contexte réel de l'organisme exploitant.

## CI/CD, versions et preuves

### Quel SHA a réellement été déployé ?

Le SHA applicatif est
`b002adb0e0e7d8d85ee493d54879e190d77d2078`. Il est relié à la CI
`29845956008` et au CD `29846343559`. Le SHA
`f92a31eda417bc42c79eb43ec6c588b0e72e6d94` correspond à la consolidation
documentaire et à la source archivée dans le paquet ; il n'est pas présenté
comme un nouveau déploiement. Le manifeste consigne les deux rôles.

### Comment prouvez-vous qu'un échec de CI interdit le CD ?

B2-A38 exécute réellement la CI courante `29856584668` sur la pull request
brouillon isolée `#46`. L'échec ESLint rend les jobs aval `skipped`, aucun run
CD n'est associé au SHA et les inventaires Vercel production API/Web restent
identiques avant/après. Le test `pnpm test:cd-policy` passe également 6/6 sur
le YAML courant. Cette preuve négative ferme CR-062 et complète le chemin vert
`29845956008` vers `29846343559`. La limite est volontaire : aucun commit rouge
n'a été poussé sur `main`, afin de ne pas dégrader la branche de production.

### Le paquet remis est-il reproductible et immuable ?

Le builder refuse un état Git suivi non propre, vérifie la présence des
preuves, la limite de 30 pages du dossier, les trois manuels et l'archive source
filtrée. Le paquet final contient un manifeste avec le SHA archivé et les
empreintes SHA-256 de chaque pièce. Cela prouve l'intégrité de la remise ; la
reproductibilité de l'environnement repose aussi sur Node 24, pnpm et le
lockfile figé.

### Quelle différence faites-vous entre CI et CD ?

La CI établit la qualité du commit : lint, types, tests, PostgreSQL,
accessibilité automatisée, build, audit et images. Le CD ne commence qu'après
ce succès : migration, déploiement API, smoke API, déploiement Web et smoke Web.
Les runs canoniques sont respectivement `29845956008` et `29846343559`.

## Choix et limites d'ingénierie

### Pourquoi Next.js, Hono et Drizzle ?

Next.js structure l'interface et les actions serveur, Hono garde une surface
HTTP légère avec des middlewares testables, et Drizzle fournit un schéma typé,
des migrations et des requêtes paramétrées. La séparation contrôleurs,
services et repositories isole les règles métier des transports et de
PostgreSQL. Ce choix est documenté par les ADR et validé par des tests à chaque
couche.

### Vos mesures prouvent-elles la tenue en charge ?

Non. B2-A29 prouve 150/150 réponses valides sur trois routes et des objectifs
p95 atteints depuis un poste, de façon séquentielle. Elle ne simule ni la
concurrence distribuée ni le coût d'une génération IA réelle. Un test de charge
future devrait définir profils, concurrence, seuils d'erreur, budget fournisseur
et observation base/API/Web.

### Que se passe-t-il si OpenAI est lent ou indisponible ?

L'appel reste côté serveur, avec validation de la sortie, timeout, retry borné
et erreurs structurées. B2-A34 couvre les erreurs attendues, tandis que B2-A25
conserve une génération réelle et son nettoyage. Le plan de secours interdit de
relancer en boucle ou d'exposer une clé pendant l'oral.

### Quelle serait votre première amélioration avant une mise en production à grande échelle ?

Je prioriserais le rate limit distribué, l'observabilité centralisée et la
réduction de la CSP `unsafe-inline`, puis je fermerais CR-055 avec une campagne
humaine d'accessibilité. Chaque changement devrait ajouter une recette
mesurable, passer la même CI et être déployé progressivement avec rollback.

### Que faites-vous si OAuth ou la production tombe pendant la soutenance ?

Je ne présente pas une capture comme une observation live. Le plan de secours
distingue quatre niveaux : parcours live, pages publiques avec preuves OAuth
horodatées, plateformes CI/CD avec annexes, puis paquet local manifesté sans
réseau. B2-A24 à A26 et A30/A34 remplacent le parcours authentifié ; B2-A28/A29
remplacent l'observation de production. La formulation indique toujours la date
et la portée de la preuve.

### Les manuels sont-ils réellement utilisables par un tiers ?

Le paquet contient un manuel de déploiement, un manuel utilisateur et un manuel
de mise à jour. Ils couvrent prérequis, variables sans valeur secrète,
migrations, healthchecks, rollback, parcours métier et procédure de mise à
jour. B2-A22 apporte l'exécution Docker/migration associée. Les valeurs
d'exploitation propres à l'organisation restent volontairement à renseigner.
