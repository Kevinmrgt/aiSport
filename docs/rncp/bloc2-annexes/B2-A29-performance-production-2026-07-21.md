# B2-A29 - Mesure de performance des healthchecks de production

> Date UTC : 2026-07-21 de 09:36:34 à 09:37:07
> Poste : environnement candidat Windows, réseau réel
> Script : `scripts/measure-production-health.mjs`

## Protocole

Le script a envoyé 50 requêtes séquentielles sans préchauffage et sans
authentification vers chacun des trois endpoints. Une réponse n'est valide que
si HTTP est réussi et si le JSON contient le statut attendu.

Objectif défini avant lecture des résultats :

- 100 % de réponses HTTP/JSON valides ;
- p95 inférieur ou égal à 1 000 ms par endpoint.

Commande :

```text
node scripts/measure-production-health.mjs 50
```

## Résultats bruts synthétisés

| Endpoint            | Succès |   Minimum |   Médiane |       p95 |   Maximum |   Moyenne | Objectif |
| ------------------- | -----: | --------: | --------: | --------: | --------: | --------: | -------- |
| Web `/api/health`   |  50/50 | 172,00 ms | 195,12 ms | 508,63 ms | 552,93 ms | 227,09 ms | atteint  |
| API `/health`       |  50/50 | 167,91 ms | 194,00 ms | 339,66 ms | 491,55 ms | 216,42 ms | atteint  |
| API `/health/ready` |  50/50 | 169,46 ms | 191,51 ms | 267,11 ms | 276,33 ms | 199,70 ms | atteint  |

Total : 150 réponses valides sur 150 et trois objectifs p95 atteints.

## Portée et limites

La readiness exerce réellement la connexion PostgreSQL et vérifie la présence
de la configuration IA. Cette mesure ne remplace pas un test de charge, ne
représente qu'un point réseau et ne mesure pas une génération OpenAI. Les
erreurs fournisseur, retries et timeouts sont couverts par les tests API ; une
génération réelle de production est consignée dans B2-A25 sans durée chiffrée
conservée.
