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

Chaque tentative HTTP reçoit un reçu UUID immuable avant sa réservation.
L'entrée est bornée par le nombre d'octets UTF-8 du prompt, des instructions
et du schéma JSON, avec une marge de protocole. Cette borne et le plafond
de sortie demandé pour cet appel doivent rester sous les plafonds serveur.
Le débit préalable utilise **leur somme**, et non les deux maxima de
configuration pour tous les appels.

La génération calcule la place restante pour son retour de correction avec
la même formule UTF-8 que le transport, après le prompt original et le schéma.
Si la proposition précédente ne tient pas, le retour conserve des diagnostics
bornés et demande une nouvelle composition au lieu de recopier ce brouillon.
Les objectifs utilisateur et le schéma restent intacts ; les caractères UTF-8
ne sont pas coupés et le plafond d'entrée n'est pas augmenté. Une demande
initiale qui dépasse la politique reste refusée avant l'appel fournisseur.

L'orchestrateur conserve la preuve des admissions réussies par reçu, avec
une copie immuable de leurs bornes. La réponse de ce même HTTP transporte
son reçu vers la comptabilisation ; des semaines parallèles ne peuvent pas
échanger leurs réserves. Le modèle renvoyé par le fournisseur peut avoir un
nom de version plus précis que l'alias demandé ; cette différence n'invalide
pas la preuve de réservation.

Quand une mesure fournisseur complète est disponible, l'événement et le
règlement sont atomiques : le compteur évolue de
`tokens réellement mesurés - provision de cet appel`. Une consommation
supérieure à la provision est donc ajoutée, et une consommation inférieure
libère seulement l'écart de ce reçu prouvé. L'événement est unique par reçu,
même sans identifiant fournisseur et même après un double callback.
La mesure est enregistrée avant validation du contenu ; une réponse refusée,
tronquée ou un planning invalide peut avoir été facturé et reste mesuré.
Les compteurs de tentatives ne diminuent jamais lors du règlement.

Une tentative sans mesure complète, dont le résultat est incertain ou dont
le reçu n'a pas d'admission prouvée **ne donne aucune restitution**.
Sans preuve d'admission, un usage transmis est ajouté conservativement sans
retirer une autre provision. La colonne historique `reserved_tokens`
représente donc les consommations mesurées confirmées **plus** les provisions
encore inconnues ; ce n'est pas une facture en euros.

Avant une nouvelle admission, une transaction sous le même verrou rapproche
les anciennes opérations de ce compte admises pendant le même jour UTC
PostgreSQL que la nouvelle admission, qui sont terminées et dont le bail
est expiré. Il faut un événement par tentative, des reçus fournisseur uniques
anciens reconnus par leur empreinte SHA-256, et des sommes d'entrée, sortie
et total cohérentes avec l'opération. Les UUID aléatoires de l'ancien fallback,
les opérations partielles, les sommes incohérentes et les baux actifs sont
exclus. Seule la différence positive entre provision et mesure complète
est retranchée de l'opération et des deux scopes de son jour UTC. Les deux
scopes doivent exister et leurs compteurs doivent rester cohérents.
L'audit `generation.budget.settled`, acteur `system`, est écrit dans cette
même transaction, avec les compteurs avant/après et aucun prompt ou secret.
Un second passage ne libère rien ; une panne de l'audit annule tout le
rapprochement. Les jours précédents restent inchangés. Aucun historique n'est réinitialisé
ni bail forcé à expirer.

Le compteur revient à une nouvelle journée UTC pour les nouvelles
opérations. Une opération admise juste avant minuit conserve son jour
pendant sa courte durée d'exécution. Les limites quotidiennes de tokens,
de tentatives et de concurrence restent cumulatives et inchangées. Ces
compteurs ne remplacent pas les plafonds et alertes du compte fournisseur.

## Configuration et valeurs initiales

Les valeurs sont lues côté API ; elles ne doivent pas devenir des champs
modifiables par l'utilisateur. Une valeur non finie, vide ou hors bornes
provoque un refus de génération.

| Variable                      | Valeur par défaut | Rôle                                                                           |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `AI_USER_DAILY_ATTEMPTS`      | 16                | Tentatives fournisseur par compte et jour d'admission UTC                      |
| `AI_GLOBAL_DAILY_ATTEMPTS`    | 200               | Tentatives globales quotidiennes                                               |
| `AI_USER_DAILY_TOKENS`        | 160000            | Tokens réservés par compte                                                     |
| `AI_GLOBAL_DAILY_TOKENS`      | 2000000           | Tokens réservés globalement                                                    |
| `AI_USER_CONCURRENCY`         | 1                 | Opérations actives par compte                                                  |
| `AI_GLOBAL_CONCURRENCY`       | 4                 | Opérations actives globales                                                    |
| `AI_GENERATION_LEASE_SECONDS` | 120               | Bail de capacité, borné entre 90 et 300 secondes                               |
| `AI_RESERVED_INPUT_TOKENS`    | 16384             | Plafond de la borne d'entrée par HTTP ; la borne effective est provisionnée    |
| `AI_MAX_COMPLETION_TOKENS`    | 11000             | Plafond de sortie par HTTP ; le maximum demandé pour cet appel est provisionné |
| `AI_ALLOWED_MODELS`           | `gpt-5.4-mini`    | Liste serveur séparée par virgules                                             |
| `AI_DEFAULT_MODEL`            | `gpt-5.4-mini`    | Doit appartenir à la liste autorisée                                           |
| `AI_GENERATION_ENABLED`       | `true`            | Interrupteur supplémentaire par environnement                                  |

Les valeurs initiales limitent l'exposition technique ; elles ne constituent
pas un budget commercial approuvé. Les fixer selon la fréquentation et les
coûts observés, puis rapprocher régulièrement mesures et facture fournisseur.
Un fournisseur qui ne renvoie pas `usage` laisse la provision de cet appel en
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
consulter l'historique. La provision de toute tentative non mesurée reste chargée. Si l'échec et
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
effacement en cascade, bornes hétérogènes, règlement mesuré idempotent et rapprochement des seuls historiques complets. Ils utilisent une base locale éphémère ; aucune
requête IA réelle ou payante n'est nécessaire.
