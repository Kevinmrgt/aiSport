# C4.1.2 — Preuve de supervision de production

## Objet et périmètre

Ce document décrit la preuve reproductible de supervision du service Alcide, configurée dans [`.github/workflows/production-health-monitor.yml`](../../.github/workflows/production-health-monitor.yml). Elle contribue au critère C4.1.2 par la détection automatisée de l'indisponibilité des interfaces publiques et par l'ouverture, le suivi puis la clôture d'une alerte GitHub.

Le périmètre est limité aux deux endpoints HTTP publics. Il ne mesure ni la charge, ni les métriques d'infrastructure, ni le contenu métier authentifié. Il ne remplace donc pas une supervision applicative complète ni une astreinte humaine.

## Faits configurés dans le dépôt

| Élément              | Configuration réellement appliquée                                                                                                                                   | Finalité                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Planification        | Cron `17 * * * *`                                                                                                                                                    | Une exécution à la minute 17 de chaque heure (UTC dans GitHub Actions).                                                        |
| Déclenchement manuel | `workflow_dispatch`, avec `check_mode` : `production`, `simulate_alert`, `simulate_recovery`                                                                         | Contrôler le dispositif à la demande.                                                                                          |
| Sonde API            | `${PROD_API_HEALTH_URL}` ou, à défaut, `https://ai-sport-api.vercel.app/health/ready` ; JSON attendu : `.status == "ready"`                                          | Vérifier que l'API se déclare prête à traiter des requêtes.                                                                    |
| Sonde web            | `${PROD_WEB_HEALTH_URL}` ou, à défaut, `https://ai-sport-web.vercel.app/api/health` ; JSON attendu : `.status == "ok"`                                               | Vérifier la disponibilité du point de santé de l'application web.                                                              |
| Seuil de réponse     | Code HTTP entre 200 inclus et 300 exclu                                                                                                                              | Écarter les réponses non réussies.                                                                                             |
| Délai et reprises    | `curl --max-time 20 --retry 2 --retry-delay 5`                                                                                                                       | Échouer après 20 s par tentative, avec au plus deux nouvelles tentatives espacées de 5 s. Aucun seuil de latence n'est défini. |
| Rapport              | Répertoire `monitoring-report/`, artefact GitHub `production-health-report`, même en échec                                                                           | Conserver les URLs, horodatage, mode, codes et charges JSON utiles au diagnostic.                                              |
| Alerte d'incident    | En cas d'échec, issue GitHub automatique, label `monitoring`, titre `Production healthcheck failed` ; une issue ouverte identique est commentée plutôt que dupliquée | Informer les collaborateurs du dépôt disposant des notifications GitHub et centraliser le suivi.                               |
| Retour à la normale  | En cas de succès, commentaire puis fermeture de l'issue ouverte `monitoring` de même titre                                                                           | Tracer la reprise et clôturer l'incident technique.                                                                            |
| Autorisation GitHub  | `permissions: issues: write` et jeton éphémère natif `github.token`                                                                                                  | Permettre seulement la gestion des issues par le workflow ; aucun secret personnalisé ni compte externe n'est requis.          |

Les variables de configuration GitHub `PROD_API_HEALTH_URL` et `PROD_WEB_HEALTH_URL` sont facultatives : en leur absence, les deux URLs de repli ci-dessus sont utilisées. Elles ne sont pas des secrets.

## Démonstration d'alerte sûre

Les modes `simulate_alert` et `simulate_recovery` ne lancent aucune requête HTTP vers les URLs de production et ne modifient aucune ressource de production. Ils écrivent seulement un résultat explicitement simulé dans l'artefact puis exercent le circuit GitHub d'alerte.

| Mode manuel         | Résultat attendu                                              | Effet GitHub attendu                                                                                                      |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `simulate_alert`    | Le job échoue volontairement après avoir produit le rapport.  | Création ou commentaire de l'issue **`[TEST] Production healthcheck alert simulation`**, avec le label `monitoring-test`. |
| `simulate_recovery` | Le job réussit volontairement après avoir produit le rapport. | Commentaire puis fermeture de l'issue de test ouverte correspondante.                                                     |
| `production`        | Les deux sondes HTTP réelles sont exécutées.                  | Issue `monitoring` ouverte/commentée en cas d'échec, fermée en cas de succès.                                             |

La séparation du titre et du label garantit qu'une simulation ne crée pas, ne commente pas et ne ferme pas l'issue réservée aux alertes de production. La simulation ne requiert aucun secret renseigné par une personne ; le seul jeton utilisé est le jeton éphémère fourni par GitHub Actions, limité ici à la permission `issues: write`.

## Protocole de captures à exécuter manuellement avant dépôt

Les captures suivantes sont une action humaine à réaliser dans l'interface GitHub du dépôt. Elles ne sont pas présentes dans ce dépôt au moment de la rédaction de ce document.

1. Ouvrir **Actions** → **Monitoring - Production health** → **Run workflow**. Sélectionner `simulate_alert` et lancer le workflow. Capturer le formulaire avec la valeur sélectionnée, sans faire apparaître de donnée personnelle.
2. À la fin du run, capturer la page de synthèse : job rouge attendu, nom du run, date/heure et commit. Capturer le log de l'étape **Check API and Web health** montrant `Mode: simulate_alert` et `Production endpoints: not probed`.
3. Ouvrir l'artefact `production-health-report`, puis capturer `production-health.md` : il doit contenir le mode, le résultat intentionnel et l'absence de sonde de production.
4. Ouvrir l'onglet **Issues** et capturer l'issue `[TEST] Production healthcheck alert simulation` avec son label `monitoring-test`, son lien vers le run et son corps indiquant le caractère simulé. Ne pas présenter cette issue comme un incident réel.
5. Relancer manuellement le même workflow avec `simulate_recovery`. Capturer la synthèse verte, l'artefact et l'issue de test fermée avec son commentaire de reprise.
6. Conserver les captures dans un dossier de preuves daté, en notant l'URL du run et de l'issue de test. Vérifier avant dépôt qu'elles ne contiennent ni jeton, ni adresse personnelle, ni information métier sensible.

## Lecture de la preuve

**Faits démontrables par le code :** cadence horaire, URLs et contrats JSON attendus, délais/réessais, conservation de l'artefact, règles d'ouverture/mise à jour/clôture d'issues, et cloisonnement des simulations.

**Faits à établir par l'action humaine :** exécution effective dans GitHub Actions, contenu visuel du rapport généré, réception de la notification GitHub par les abonnés du dépôt, et cycle réel d'ouverture puis de fermeture de l'issue de test. Les captures du protocole apportent cette dernière preuve sans provoquer de modification de production.

**Destinataire et canal :** le canal d'alerte est une issue du dépôt GitHub. Les destinataires sont les collaborateurs qui surveillent le dépôt ou sont abonnés aux notifications GitHub ; le workflow ne configure ni e-mail, ni SMS, ni outil externe de type Better Stack.
