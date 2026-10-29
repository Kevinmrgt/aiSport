# Audit infrastructure, livraison et exploitation — 29 octobre 2026

Responsable de l'audit : agent exploitation. Révision locale examinée : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche `codex/nettoyage-projet`. Contrôles distants effectués en lecture seule, vers 14 h 41–14 h 46, heure de Paris. Aucun déploiement, migration, restauration, changement de configuration ou appel IA effectué.

## Avis de préparation

**Ouverture publique à différer.** Les services répondent et le dépôt contient une bonne base de CI/CD, mais la révision locale n'est pas qualifiée par la CI distante et son identité n'est pas attestée sur les services publics. Il manque une preuve de restauration, une maîtrise commune des migrations et des critères d'exploitation mesurables. Aucun incident P0 démontré pendant cet audit.

Les constats ci-dessous portent sur le code local pour les mécanismes, et sur les observations GitHub/HTTP pour l'état distant. Ils ne supposent pas que le dernier code local tourne déjà en ligne.

## État distant réellement observé

| Contrôle                      | Observation                                                                                                                                                   | Portée de la preuve                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Web `/api/health`             | HTTP 200, `status=ok`, version `0.13.0-rc.8`, 13:41:47 UTC                                                                                                    | Serveur Web disponible au moment de la requête.                                     |
| API `/health`                 | HTTP 200, `status=ok`, même version, 13:41:48 UTC                                                                                                             | Processus API disponible.                                                           |
| API `/health/ready`           | HTTP 200, `status=ready`, `database=ok`, `aiConfiguration=ok`                                                                                                 | `SELECT 1` réussi ; présence d'une clé IA. Aucun appel fournisseur effectué.        |
| `main` GitHub                 | `fd750f0c6ca9a8bf06bf38c0f03d6a08534d8f5f`                                                                                                                    | Lu avec l'API GitHub `branches/main`, indépendamment des références Git locales.    |
| HEAD local sur GitHub         | API `commits/cb9037f.../check-runs` : HTTP 422 « No commit found » ; le connecteur des statuts combinés renvoie une liste vide                                | Aucun run distant attribuable à cette révision n'a pu être confirmé.                |
| Dernière CI de `main` trouvée | [CI réussie du 14 septembre](https://github.com/Kevinmrgt/aiSport/actions/runs/34872887492), SHA `fd750f0...`                                                 | Preuve historique sur cette révision uniquement.                                    |
| Dernier CD trouvé             | [CD réussi du 14 septembre](https://github.com/Kevinmrgt/aiSport/actions/runs/34873491347), SHA `fd750f0...`                                                  | Les métadonnées GitHub ne prouvent pas, seules, le SHA servi aujourd'hui.           |
| Dernière CI récente du dépôt  | [19 octobre, échec](https://github.com/Kevinmrgt/aiSport/actions/runs/39199140454), SHA `8d3304d...` : audit sécurité et ESLint échoués ; autres jobs ignorés | Une autre révision. Ne prouve pas un échec du HEAD local corrigé.                   |
| Activation CD                 | Variable de dépôt `ENABLE_GHA_VERCEL_CD=true`                                                                                                                 | Le mécanisme automatique est activé ; ce n'est pas une preuve de livraison récente. |
| Protections GitHub            | `main.protected=false`, liste des rulesets vide ; environnements listés sans protection ni politique de branche                                               | Absence de garde de branche et de déploiement confirmée par les API accessibles.    |
| Monitoring                    | [Run du 29 octobre à 07:06 UTC réussi](https://github.com/Kevinmrgt/aiSport/actions/runs/40833336989)                                                         | Derniers runs observés espacés de plusieurs heures, malgré un cron horaire.         |

Liens des sondes : [Web](https://ai-sport-web.vercel.app/api/health), [API](https://ai-sport-api.vercel.app/health), [readiness](https://ai-sport-api.vercel.app/health/ready). Ces réponses ne comportent pas de SHA.

## Constats et actions

### OPS-01 — P1 : révision candidate distincte de la révision distante qualifiée

**Preuve :** tableau d'observations ci-dessus ; le commit local est inconnu de l'API GitHub lors du contrôle. `.github/workflows/deploy-vercel.yml:32`, `:70` et `:136` épinglent correctement le `head_sha` de la CI, mais cette chaîne n'a pas exécuté le HEAD local.

**Impact :** les corrections et le nettoyage locaux ne peuvent être considérés livrés. Une version sémantique identique sur les sondes ne permet pas de distinguer deux builds.

**Action / responsable :** responsable livraison : préparer la PR de la révision candidate, obtenir la CI complète, livrer ce SHA via la chaîne nominale et conserver les identifiants des deux déploiements. Ajouter un champ de révision immuable aux sondes Web et API.

**Acceptation :** CI réussie sur le commit final ; artefacts Web/API et réponses des domaines publics portent ce même SHA ; recette OAuth et métier effectuée sur ces domaines. Conserver séparément preuve de CI, preuve de déploiement et preuve de parcours.

### OPS-02 — P1 : sauvegarde et restauration insuffisamment qualifiées

**Preuve :** `docs/maintenance.md:35` prescrit de créer une sauvegarde/branche et de vérifier la restauration. Le dépôt examiné ne fournit ni compte rendu d'exercice, ni RPO/RTO, ni politique de conservation vérifiée. `.github/workflows/deploy-vercel.yml:55` applique les migrations directement, sans étape de preuve de sauvegarde. Le plan Neon et sa fenêtre de restauration n'ont pas été consultés.

**Impact :** délai de reprise et perte de données acceptable inconnus. Un rollback Vercel ne rétablit pas le schéma ni les données PostgreSQL.

**Action / responsable :** responsable données/exploitation : relever plan et fenêtre de récupération réels, fixer RPO/RTO, identifier sauvegarde et accès de secours, restaurer sur une cible distincte et vérifier volumes, liens utilisateurs, séances et paramètres. Définir une sauvegarde indépendante si la fenêtre native ne couvre pas le besoin.

**Acceptation :** compte rendu daté avec identifiant de sauvegarde, point restauré, cible distincte, vérifications d'intégrité et durée mesurée ; essai du rollback applicatif avec le schéma effectivement restauré. Ne pas tester en écrasant la production.

La restauration native dépend de la fenêtre d'historique configurée : [documentation Neon](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md). L'accès à Neon n'étant pas vérifié, aucune durée de conservation réelle n'est affirmée ici.

### OPS-03 — P1 : les smokes CD ne valident ni contenu JSON ni identité du déploiement

**Preuve :** `.github/workflows/deploy-vercel.yml:121` et `:187` utilisent `curl --fail` sur les URL d'alias configurées. Les sorties `steps.deploy-api.outputs.url` et Web sont capturées, mais ne servent pas à vérifier le build. Aucun contrôle du SHA ou du champ `status` ; le monitoring a, lui, un contrôle JSON (`production-health-monitor.yml:107`). Les sondes exposent seulement une version (`apps/web/app/api/health/route.ts:11`, `apps/api/src/routes/health.routes.ts:4`).

**Impact :** un ancien déploiement sain, un mauvais alias, un corps HTML 200 ou une version différente peuvent laisser la livraison verte. L'API est promue avant le Web, donc une panne du second déploiement laisse temporairement deux versions différentes.

**Action / responsable :** responsable CI/CD : vérifier le déploiement créé puis l'alias public, JSON attendu et SHA attendu ; conserver les révisions antérieures et la procédure de repli coordonnée. Maintenir une compatibilité entre API ancienne/nouvelle et schéma pendant cette période.

**Acceptation :** tests de politique prouvent qu'un JSON incorrect ou un SHA ancien bloque la livraison ; exercice en environnement isolé d'échec du Web après API et reprise vers un couple compatible.

### OPS-04 — P1 : migrations automatiques et manuelles non sérialisées ensemble

**Preuve :** CD utilise le groupe `production-vercel` (`deploy-vercel.yml:12`), la migration manuelle `db-migrate-${{ inputs.environment }}` (`db-migrate.yml:17`). Ces groupes différents ne constituent pas un verrou commun. Le workflow manuel checkout le ref choisi à son déclenchement (`db-migrate.yml:30`) et ne vérifie pas la CI du SHA. Les API GitHub observées ne montrent pas de protection sur `main` ni de restriction des environnements.

**Impact :** un run manuel peut chevaucher une migration CD ou appliquer une révision non qualifiée. Aucun conflit réel n'a été provoqué pendant cet audit.

**Action / responsable :** responsable CI/CD et administrateur GitHub : imposer un même verrou de migration en base ou un chemin de migration unique ; restreindre les révisions autorisées et vérifier le SHA approuvé et sa CI. Protéger `main` avec contrôles requis et politique de déploiement adaptée au fonctionnement du mainteneur.

**Acceptation :** deux tentatives concurrentes sur une base de recette sont sérialisées ; une révision sans CI et un ref non autorisé sont refusés ; la preuve de migration consigne le journal appliqué et le SHA. Les groupes ne sont partagés que si leurs noms sont identiques : [GitHub, contrôle des déploiements et concurrence](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).

### OPS-05 — P1 : surveillance partielle et engagement de reprise non défini

**Preuve :** le cron est horaire (`production-health-monitor.yml:5`), les dernières exécutions constatées du 28 au 29 octobre sont espacées d'environ 3 à 8 heures. Le mécanisme crée une issue après échec (`:140`) et la clôt à la reprise (`:198`). `docs/maintenance.md:22` ne définit pas de permanence. `apps/api/src/lib/readiness.ts:11` vérifie la présence d'une clé IA et `:20` exécute `SELECT 1`, sans contrôler migrations ni OAuth ni disponibilité réelle du fournisseur.

**Impact :** une indisponibilité entre deux contrôles, une panne de connexion Google ou un refus IA peuvent rester invisibles. Une issue créée ne garantit pas que le mainteneur la reçoive à temps.

**Action / responsable :** responsable exploitation : fixer disponibilité cible et délai de prise en charge, valider réception d'alerte et escalade, surveiller erreurs/latences du parcours et fraîcheur de la dernière sonde. Ajouter un contrôle de schéma/readiness ou un contrôle de livraison explicite. Éviter de facturer une génération à chaque sonde : la recette IA réelle peut être contrôlée séparément à faible fréquence et avec budget.

**Acceptation :** panne simulée sur environnement isolé, alerte effectivement reçue et acquittée dans le délai cible ; métriques génération/OAuth consultables ; alerte si la sonde n'a plus tourné. Les intervalles constatés ne prouvent pas la cause des retards GitHub.

### OPS-06 — P1 avant ouverture large : capacité, limites des offres et coûts d'infrastructure non établis

**Preuve :** pool PostgreSQL limité à trois connexions **par processus** (`apps/api/src/db/index.ts:12`), pas de limite globale dans le code. API Vercel à 60 secondes (`apps/api/vercel.json:7`) et programme borné à 55 secondes (`apps/api/src/services/program-ai.service.ts:23`). Le Web attend jusqu'à 120 secondes pour une génération (`apps/web/lib/server-api.ts:32`) sans durée explicite dans son `vercel.json`. Aucune configuration de région dans ces fichiers. Plans, régions, quotas, budgets et alertes des comptes Vercel/Neon non vérifiés ; pas de test de charge authentifié dans cet audit.

**Impact :** la multiplication des instances peut saturer les connexions ou le fournisseur ; une limite Web plus courte peut interrompre une génération API encore active. Les trois sondes HTTP réussies ne mesurent pas le débit métier.

**Action / responsable :** exploitation avec propriétaire produit : relever les offres et limites effectives, vérifier pooler/connexion de migration, rapprocher les régions et fixer budget. Définir cible de concurrence, plafonds de générations et politique de surcharge ; aligner tous les timeouts sur les limites effectives des offres.

**Acceptation :** essai de charge sur cible isolée avec fournisseur simulé puis petit échantillon réel budgété ; mesurer p95, taux d'erreurs, connexions actives, appels simultanés et coût par usage. Fixer seuils acceptables avant le test. Aucun prix ni volume supportable n'est estimé sans ces données.

### OPS-07 — P2 : diagnostic et protection des journaux à compléter

**Preuve :** Web loggue utilisateur, route et URL API (`apps/web/lib/server-api.ts:62`) et erreur API complète (`:110`) ; API loggue `error.details` (`apps/api/src/middleware/error.middleware.ts:9`) et erreurs SQL natives dans les repositories. Aucun identifiant de corrélation Web → API → fournisseur trouvé dans les sources examinées. La configuration de conservation/accès des logs Vercel n'a pas été vérifiée.

**Impact :** diagnostic difficile entre services ; données sensibles possibles dans les messages SQL/fournisseur, selon les erreurs réellement produites. Cela n'établit pas une fuite de production.

**Action / responsable :** exploitation et sécurité : identifiant de requête commun, redaction centralisée, événements autorisés, politique de conservation et droits d'accès ; latence et code d'erreur exploitables sans contenu des notes ni prompts.

**Acceptation :** incident simulé corrélable sur les services ; tests de redaction démontrent l'absence de clé, cookie, notes de douleur, prompt et paramètres SQL dans les logs conservés.

## Fondations déjà présentes

- CI ordonnée avec installation figée, lint/types, couverture, PostgreSQL réel, build et smoke public ; actions tierces épinglées par SHA (`.github/workflows/ci.yml`).
- CD sur succès de CI et checkout du SHA qualifié, migrations avant API puis Web, secrets validés avant utilisation et groupe empêchant deux CD simultanés.
- Liveness et readiness distinctes, réponses sans cache, erreurs utilisateur génériques, validation de configuration au démarrage.
- Migrations versionnées et index utilisateurs/date (`apps/api/drizzle/0005_query_indexes.sql`), fermeture des connexions au SIGTERM en mode serveur, pool borné et normalisation TLS `verify-full`.
- Monitoring avec vérification JSON, artefact, simulation d'alerte et de reprise séparée ; guide d'incident et avertissement explicite sur le rollback de base.

## Limites et ordre de validation

Accès GitHub utilisé en lecture seule par connecteur pour les statuts puis CLI pour Actions, branches, variables et environnements, dont les fonctions nécessaires n'étaient pas disponibles dans le connecteur. Pas d'accès au tableau de bord Vercel/Neon, aux paramètres de compte, à leur facturation ni aux sauvegardes ; pas de collecte de données utilisateurs ni de secrets. Aucun test OAuth réel, aucune génération, aucune restauration et aucun test de charge. Les tests globaux locaux sont pris en charge par le coordinateur.

Ordre conseillé : qualifier le SHA candidat et protections de livraison → prouver sauvegarde/restauration et compatibilité des migrations → renforcer les contrôles du SHA servi et sérialiser migrations → valider alertes, limites et budgets → recette réelle OAuth/IA/isolation sur la révision finale → ouverture progressive avec observation et repli documenté.
