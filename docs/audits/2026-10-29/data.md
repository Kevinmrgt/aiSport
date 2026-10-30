# Audit des données, migrations et performances PostgreSQL

Date : 29 octobre 2026. Responsable : agent données dédié. Candidat local :
`cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche `codex/nettoyage-projet`.
La cible confirmée par le propriétaire est ce dépôt sur `www.alcideai.fr`.
Le site actuellement accessible possède des parcours différents ; ni son
schéma de données ni sa révision ne sont attribués au candidat par cet audit.

## Avis

**Valider la reprise de l'existant avant remplacement du site public.** Les
migrations du candidat fonctionnent sur une base neuve et les index usuels
sont présents. Cela ne qualifie pas leur application sur la base hébergée.
Un P1 de préparation et trois P2 de robustesse sont détaillés ci-dessous.
Aucune perte de données ni panne de performance distante n'a été observée.

| ID      | Priorité | Constat                                                                           | Responsable proposé    |
| ------- | -------- | --------------------------------------------------------------------------------- | ---------------------- |
| DATA-01 | P1       | Compatibilité de la base existante et des données historiques non qualifiée       | Données + livraison    |
| DATA-02 | P2       | Invariants métier et forme JSON protégés surtout par l'application                | Backend + données      |
| DATA-03 | P2       | Pagination sans ordre unique, avec décalage et coût croissant des pages profondes | Backend                |
| DATA-04 | P2       | Statistiques et compte/listes lus à plusieurs instants ; capacité non mesurée     | Backend + exploitation |

## Vérifications réelles et périmètre

Base réservée à ce chat : conteneur `alcide-audit-20261029`, PostgreSQL 16,
publication sur boucle locale. Aucun accès à la base hébergée. Le
coordinateur y a exécuté les migrations puis les huit tests repositories et
le test SQL de sécurité : résultats consignés dans `validation.md`.

Cet agent a effectué les contrôles suivants :

- Catalogue de la base migrée : sept migrations enregistrées, seize index
  et vingt et une contraintes dans le schéma public. Le seul `CHECK`
  métier est celui du compteur historique de quotas non négatif.
- Les index utilisateurs/date annoncés par la migration `0005` existent
  effectivement, ainsi que les clés étrangères attendues.
- Un essai SQL dans une transaction a inséré une séance synthétique avec
  `difficulty='invalid_level'`, `duration_minutes=-1` et `data={}`. La base
  l'a acceptée et relue. `ROLLBACK` a ensuite supprimé toutes les écritures ;
  le compte synthétique résiduel est à zéro. Ce test passe directement par
  SQL : il ne démontre pas que les contrôleurs HTTP acceptent ces valeurs.
- Des `EXPLAIN` de consultation par utilisateur ont identifié les index
  `workouts_user_created_idx` et `training_programs_user_created_idx`.
  La base est vide après nettoyage des fixtures : ces plans ne constituent
  ni mesure de latence représentative ni preuve de capacité.

## DATA-01 — P1 — Qualifier la migration de l'existant

**Preuve.** Le journal local `apps/api/drizzle/meta/_journal.json` décrit sept
migrations, de `0000` à `0006`. La migration
`apps/api/drizzle/0004_openai_only_settings.sql:1` modifie des données de
réglages : fournisseur ramené à OpenAI et anciennes clés chiffrées mises à
`NULL`. `0005_query_indexes.sql:1` crée les index, et
`0006_spotty_kingpin.sql:1` ajoute la table historique de quotas. Les tests
exécutés pendant cet audit partent d'une base neuve. Aucun inventaire du
journal, des tables et des données du site public divergent n'a été obtenu.

**Impact.** Réussir la création d'une base vide ne prouve pas la compatibilité
avec un schéma ayant évolué autrement, des anciennes valeurs JSON ou des
réglages présents en production. Les parcours de crédits/offres constatés
sur le domaine public ne sont pas présents dans le candidat : il faut
identifier leur stockage et décider explicitement leur devenir, sans
supposer qu'il s'agit de données jetables. Ce constat ne démontre ni
divergence réelle de schéma ni perte de données déjà survenue.

**Action / responsable.** Données et livraison : relever en lecture seule le
projet et la branche de base réellement utilisés, versions de migrations,
extensions, contraintes et volumes ; comparer au candidat. Définir les
données à conserver et les fonctions supprimées, notamment les éventuels
crédits/abonnements. Préparer une restauration ou copie isolée, puis y
répéter les migrations du SHA candidat et la consultation des données
historiques. Conserver les migrations déjà appliquées et créer des migrations
additives ou compensatoires si nécessaire. L'exercice de sauvegarde et les
RPO/RTO sont détaillés séparément dans `operations.md`.

**Acceptation.** Inventaire expurgé rapproché du journal, sauvegarde
restaurable identifiée, répétition sur cible distincte, comptages et
échantillons contrôlés avant/après ; correspondance des comptes et accès à
leurs séances/programmes/journaux inchangés. Décision documentée sur les
données des fonctions retirées. Temps de migration et verrouillage mesurés,
fenêtre d'intervention définie, retour applicatif compatible avec le schéma
et les données après migration.

## DATA-02 — P2 — Ajouter une défense d'intégrité adaptée

**Preuve.** `apps/api/src/db/schema.ts:72` et `:96` utilisent `text` avec des
valeurs TypeScript, pas un enum PostgreSQL. Les migrations de création
définissent effectivement des colonnes `text` et `integer`, sans `CHECK`
pour les valeurs de niveau, durées, effort ou source. `schema.ts:76` et
`:102` annotent `JSONB` avec `$type<Workout/TrainingProgram>` ; les lectures
restituent directement `row.data` (`program.repository.ts:22`,
`workout.repository.ts:188`). L'interface utilise immédiatement
`program.data.weeks.reduce` (`apps/web/app/programs/[id]/page.tsx:52`).
L'insertion SQL synthétique décrite ci-dessus confirme que la base n'impose
pas ces invariants.

**Impact.** Une migration, un import ou une écriture de maintenance peut
laisser un enregistrement incompatible, même si les requêtes HTTP normales
sont validées par Zod. Une ancienne forme JSON inattendue peut provoquer un
échec au rendu. Les champs principaux dupliqués dans les colonnes et le JSON
ne possèdent pas non plus de contrainte d'accord ; les repositories actuels
les remplissent pourtant ensemble dans une seule insertion.

**Action / responsable.** Backend et données : inventorier les formes JSON
historiques ; introduire une version explicite et une validation/migration
des documents conservés. Ajouter des contraintes SQL simples et stables
pour les catégories et bornes qui doivent survivre à tous les chemins
d'écriture. Ne pas exiger aveuglément les nouvelles règles métier sur toutes
les archives : prévoir une compatibilité ou un traitement de quarantaine
lisible. Les relations `SET NULL` du journal après suppression de sa source
doivent rester compatibles avec les contraintes ajoutées.

**Acceptation.** Tests PostgreSQL rejetant valeurs scalaires hors bornes,
contrôles de lecture des anciennes versions JSON et réponse maîtrisée à un
document invalide ; migrations exécutables sur données historiques
représentatives sans perte silencieuse. Les contrôles HTTP Zod existants
restent nécessaires. Voir [contraintes PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-constraints.html).

## DATA-03 — P2 — Stabiliser la pagination et borner son coût

**Preuve.** Les listes trient seulement par `created_at DESC` puis utilisent
`OFFSET` (`workout.repository.ts:90`, `:92` ;
`program.repository.ts:93`, `:95`). Aucune seconde clé ne départage deux
dates égales. Les paramètres limitent la taille des pages à cinquante, mais
pas leur numéro (`workout.controller.ts:14`, `program.controller.ts:13`).
L'index composite utilisateur/date est présent, ce qui est positif.

**Impact.** L'ordre n'est pas total en cas de dates identiques ; des éléments
peuvent se déplacer entre pages. Des insertions/suppressions entre deux
consultations décalent également les positions. Les lignes sautées doivent
être parcourues pour un `OFFSET` élevé ; aucun ralentissement réel n'est
affirmé faute de volumétrie et de mesure. PostgreSQL recommande un ordre
unique pour `LIMIT/OFFSET` et documente ce coût :
[LIMIT et OFFSET](https://www.postgresql.org/docs/16/queries-limit.html).

**Action / responsable.** Backend : ajouter immédiatement un départage stable
sur l'UUID, puis décider selon les volumes si un curseur `(created_at,id)`
remplace les pages à décalage. Adapter les index au tri final après mesure ;
borner les paramètres et préserver un comportement défini des pages hors
limites.

**Acceptation.** Jeux contenant plusieurs dates égales, pages successives
sans doublon ni omission dans un jeu figé ; tests avec ajouts concurrents
et contrat de navigation explicite ; plans et p95 mesurés sur volumétrie
représentative, notamment une consultation profonde.

## DATA-04 — P2 — Définir la cohérence et mesurer les statistiques

**Preuve.** Comptage et liste sont deux requêtes distinctes dans les deux
repositories. Les statistiques des séances comportent quatre lectures
(`workout.repository.ts:109`), celles du journal deux
(`session-log.repository.ts:93`). Aucun instantané commun n'est demandé.
Le dashboard appelle encore les deux endpoints en parallèle
(`apps/web/app/dashboard/page.tsx:37`). Les agrégations parcourent l'historique
de l'utilisateur, et le pool est limité à trois connexions par processus
(`apps/api/src/db/index.ts:12`).

**Impact.** Une écriture entre deux requêtes peut produire provisoirement un
total différent du détail ou de la somme des regroupements. Il s'agit d'un
risque déduit de l'assemblage, pas d'une corruption persistante reproduite.
Le coût des agrégations et de multiples connexions dépend de l'historique
et du nombre d'instances ; aucune capacité garantie n'est déduite de la base
vide. Le modèle par requête du niveau usuel `Read Committed` est décrit dans
[l'isolation PostgreSQL 16](https://www.postgresql.org/docs/16/transaction-iso.html).

**Action / responsable.** Backend et exploitation : choisir explicitement
la cohérence attendue du dashboard. Si des totaux cohérents sont requis,
regrouper les agrégations ou employer un instantané adapté ; une simple
transaction au niveau `Read Committed` ne suffit pas à figer deux lectures.
Mesurer avec fournisseur IA simulé et historique représentatif avant toute
optimisation supplémentaire. Les limites globales des connexions et les
budgets d'infrastructure relèvent aussi d'OPS-06.

**Acceptation.** Test concurrent création/suppression/consultation conforme
au contrat choisi ; p95, taux d'erreurs et connexions actifs mesurés à la
concurrence cible. Définir les seuils avant la mesure. Ne pas annoncer un
gain ou ajouter une couche de cache sans avoir identifié le coût dominant.

## Fondations présentes et limites

Les écritures principales insèrent colonnes et JSON en une seule opération.
Les listes filtrent leur propriétaire et évitent de charger le JSON complet ;
leurs tailles sont bornées côté contrôleur. Les index utilisateurs/date,
index de sources du journal, clés étrangères, unicités des réglages et
suppression en cascade des dépendances utilisateur sont réellement créés.
Le service de journal vérifie la propriété et recopie les métadonnées de la
source, plutôt que de faire confiance au client. Le pool est borné et les
URLs TLS sont normalisées. L'identité OAuth et l'idempotence des opérations
font l'objet de SEC-01 et QA-03 ; ils ne sont pas recomptés ici.

Guide appliqué : `supabase-postgres-best-practices`, références pagination
et index de clés étrangères. Aucun produit Supabase n'est supposé déployé.
L'audit n'a ni changé le code, ni modifié la base distante, ni appliqué de
migration supplémentaire. Les seules écritures de cet agent étaient
synthétiques, sur la base temporaire, et annulées par transaction. Aucun
test de charge et aucune restauration de données réelles n'ont été faits.
