# Setup MCP et outillage agent - Alcide

> Objectif : donner a Codex les outils gratuits necessaires pour gerer le repo, les preuves RNCP Bloc 4, les tests et la supervision sans disperser les informations.

## Etat mis en place

| Outil                     | Statut                                       | Usage                                                               |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Filesystem MCP            | Configure en local dans `.codex/config.toml` | Lecture/ecriture limitee au repo `AISport`                         |
| Playwright MCP            | Configure en local dans `.codex/config.toml` | Verification navigateur et captures de preuves                      |
| Vercel MCP                | Configure en local dans `.codex/config.toml` | Deploiement, inspection et aide Vercel                              |
| GitHub CLI                | Authentifie localement                       | Issues, labels, workflows, PR si besoin                             |
| GitHub Actions monitoring | Ajoute                                       | Healthchecks production horaires + issue automatique en cas d'echec |
| GitHub issue templates    | Ajoutes                                      | Anomalies Bloc 4 et cas support client                              |

Redemarrer Codex apres modification de `.codex/config.toml` pour charger les nouveaux serveurs MCP locaux.

## Configuration active Codex

Fichier local : `.codex/config.toml`

Exemple versionne : `docs/mcp/codex-config.example.toml`

Serveurs actives :

- `filesystem` : acces au dossier `C:\Users\Kevin\Documents\AISport`.
- `playwright` : pilotage navigateur via `@playwright/mcp@latest`.
- `vercel` : outillage Vercel via `@vercel/mcp-server`.

## GitHub MCP

Le repo est deja relie a GitHub avec `origin = https://github.com/Kevinmrgt/aiSport.git`, et le GitHub CLI est authentifie sur le compte `Kevinmrgt`.

Pour un vrai GitHub MCP dans Codex, utiliser de preference le connecteur GitHub de Codex ou le serveur officiel GitHub MCP. Le fichier `docs/mcp/codex-config.example.toml` donne un exemple de configuration, mais il ne doit pas contenir de token en clair.

Variables a garder hors Git :

```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "ghp_..."
```

Permissions minimales recommandees pour un PAT :

- `repo` pour issues, PR et contenus de depot prive ;
- `workflow` uniquement si Codex doit modifier ou declencher des workflows.

## Monitoring gratuit sans compte externe

Le workflow `.github/workflows/production-health-monitor.yml` tourne toutes les heures et verifie :

- `https://ai-sport-api.vercel.app/health`
- `https://ai-sport-web.vercel.app/api/health`

Il produit un artifact `production-health-report`. En cas d'echec, il ouvre ou commente une issue GitHub `Production healthcheck failed` avec le rapport et le lien du run.

Variables GitHub optionnelles :

| Variable              | Valeur par defaut                            |
| --------------------- | -------------------------------------------- |
| `PROD_API_HEALTH_URL` | `https://ai-sport-api.vercel.app/health`     |
| `PROD_WEB_HEALTH_URL` | `https://ai-sport-web.vercel.app/api/health` |

## Monitoring Better Stack a brancher

Better Stack Free est recommande pour une preuve plus forte de C4.1.2 :

1. Creer un compte Better Stack.
2. Ajouter un monitor HTTP pour l'API `/health`.
3. Ajouter un monitor HTTP pour le Web `/api/health`.
4. Configurer les alertes e-mail.
5. Declencher une alerte de test ou capturer la configuration.
6. Joindre les captures au dossier Bloc 4.

Preuves a capturer :

- liste des monitors actifs ;
- detail d'un monitor avec URL, frequence et seuil ;
- destinataire d'alerte ;
- incident de test ou notification d'alerte ;
- status page si activee.

## Regles de securite

- Ne jamais committer de PAT, token Vercel, secret Auth.js, secret Google OAuth ou cle OpenAI.
- Limiter le filesystem MCP au repertoire du projet.
- Garder les captures support anonymisees.
- Laisser les workflows GitHub creer les preuves, puis relier ces preuves dans `docs/rncp/bloc4-mco-rncp39583.md`.
