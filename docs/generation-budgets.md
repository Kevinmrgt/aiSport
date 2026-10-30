# Budgets IA et reprise des générations

La migration `0009_persistent_generation_budget` ajoute un registre
PostgreSQL partagé entre toutes les instances. Aucun prompt, texte de santé,
clé API ou contenu généré n'est enregistré dans ce registre.

## Fonctionnement

Chaque opération possède une clé UUID par utilisateur et une empreinte des
paramètres. L'admission est transactionnelle : une seule exécution peut
posséder cette clé. Le même UUID avec d'autres paramètres retourne 409.
Une opération réussie renvoie sa ressource existante sans appeler l'IA ni
consommer une nouvelle réservation. Si la ressource a ensuite été supprimée,
la lecture renvoie son absence ; le service ne la régénère pas implicitement.

La création de la séance ou du programme et le passage de l'opération à
`succeeded` sont réalisés dans la **même transaction PostgreSQL**. Une panne
entre ces deux écritures ne peut pas laisser un résultat créé sans son état
d'idempotence correspondant.

Avant **chaque tentative HTTP**, le service réserve des appels et des tokens
sur deux compteurs : compte utilisateur et total du service. Cette décision
est atomique, avec verrou partagé entre processus, limites SQL de délai et
contrôle du modèle. Le nombre maximal de tentatives reste deux pour une
séance et deux par semaine pour un programme. Les limites par minute
existantes sont un contrôle complémentaire ; elles ne remplacent pas ce
registre distribué.

Les quantités réservées sont pessimistes : plafond de tokens d'entrée et
plafond de complétion configurés. La borne d'entrée fournie par le transport
IA est vérifiée avant l'appel. Les consommations retournées par le fournisseur
sont enregistrées avant validation du contenu ; des réponses refusées ou
tronquées peuvent donc être comptabilisées. La déduplication utilise une
empreinte de l'identifiant de requête du fournisseur lorsqu'il est fourni.
Un dépassement réel inattendu est ajouté aux réservations.

Une tentative dont le résultat est incertain **n'est jamais remboursée
automatiquement**. Le compteur revient à une nouvelle journée UTC pour les
nouvelles opérations. Une opération admise juste avant minuit conserve son
jour d'admission pendant sa courte durée d'exécution. Ces réservations de
tokens/appels ne sont pas un prix en euros et ne remplacent pas les plafonds
et alertes de facturation du compte fournisseur.

## Configuration et valeurs initiales

Les valeurs sont lues côté API ; elles ne doivent pas devenir des champs
modifiables par l'utilisateur. Une valeur non finie, vide ou hors bornes
provoque un refus de génération.

| Variable                      | Valeur par défaut | Rôle                                                                            |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `AI_USER_DAILY_ATTEMPTS`      | 16                | Tentatives fournisseur par compte et jour d'admission UTC                       |
| `AI_GLOBAL_DAILY_ATTEMPTS`    | 200               | Tentatives globales quotidiennes                                                |
| `AI_USER_DAILY_TOKENS`        | 160000            | Tokens réservés par compte                                                      |
| `AI_GLOBAL_DAILY_TOKENS`      | 2000000           | Tokens réservés globalement                                                     |
| `AI_USER_CONCURRENCY`         | 1                 | Opérations actives par compte                                                   |
| `AI_GLOBAL_CONCURRENCY`       | 4                 | Opérations actives globales                                                     |
| `AI_GENERATION_LEASE_SECONDS` | 120               | Bail de capacité, borné entre 90 et 300 secondes                                |
| `AI_RESERVED_INPUT_TOKENS`    | 16384             | Réservation d'entrée par tentative ; une borne de prompt supérieure est refusée |
| `AI_MAX_COMPLETION_TOKENS`    | 2048              | Réservation maximale de sortie par tentative                                    |
| `AI_ALLOWED_MODELS`           | `gpt-5.4-mini`    | Liste serveur séparée par virgules                                              |
| `AI_DEFAULT_MODEL`            | `gpt-5.4-mini`    | Doit appartenir à la liste autorisée                                            |
| `AI_GENERATION_ENABLED`       | `true`            | Interrupteur supplémentaire par environnement                                   |

Les valeurs initiales limitent l'exposition technique ; elles ne constituent
pas un budget commercial approuvé. Les fixer selon la fréquentation et les
coûts observés, puis rapprocher régulièrement mesures et facture fournisseur.
Un fournisseur qui ne renvoie pas `usage` laisse la réservation maximale en
place, sans inventer une consommation mesurée.

## Arrêt global et reprise

La table `generation_control`, ligne `global`, permet d'arrêter les nouveaux
appels sur **toutes les instances**, indépendamment de leur environnement
local. Le contrôle est revérifié juste avant chaque tentative. Les résultats
déjà créés restent consultables. Les requêtes fournisseur déjà envoyées
peuvent rester facturées et ne sont pas annulées par une modification de
cette ligne.

Depuis `apps/api`, sur une base choisie explicitement :

```text
pnpm exec tsx scripts/generation-control.ts disable --apply
pnpm exec tsx scripts/generation-control.ts enable --apply
```

Ce script exige les accès d'exploitation à la base. Ne pas ajouter de route
publique permettant aux utilisateurs de changer ce contrôle.

Un bail expiré ne donne **jamais** le droit de reprendre automatiquement une
opération : un appel fournisseur peut avoir été envoyé avant l'arrêt du
processus. La même clé renvoie `GENERATION_CONFLICT`, avec invitation à
consulter l'historique. Le budget déjà réservé reste chargé. Si l'échec et
l'absence de ressource sont établis, l'opération passe à `failed` et retourne
`GENERATION_RETRY_REQUIRES_NEW_KEY` lors de la prochaine demande ; un nouveau
clic explicite peut alors utiliser une nouvelle clé.

Le formulaire conserve sa clé après une erreur réseau dont le résultat est
inconnu. Il ne doit pas générer une nouvelle clé à chaque retry réseau ni
relancer automatiquement une génération payante.

## Données et qualification

`generation_operations.user_id` et les compteurs par utilisateur sont
supprimés en cascade avec le compte. Les événements de consommation suivent
leur opération. Les compteurs globaux agrégés restent indépendants des
identités et ne contiennent aucun texte ou identifiant de compte.

Les tests PostgreSQL dédiés couvrent deux processus Node concurrents, un
processus redémarré, plafonds globaux entre comptes, admission concurrente,
replay après succès, bail expiré, arrêt global, déduplication de consommation
et effacement en cascade. Ils utilisent une base locale éphémère ; aucune
requête IA réelle ou payante n'est nécessaire.
