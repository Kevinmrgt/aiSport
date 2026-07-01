# Preuve de suivi projet datee - Bloc 3 RNCP39583

> Projet : Alcide / alcide
> Type de preuve : export Kanban et tableau de pilotage
> Date locale : 2026-05-07, 13:22 CEST, Europe/Paris
> Version suivie : 0.12.0
> Responsable pilotage : Kevin

---

## 1. Synthese de pilotage

| Axe suivi | Statut au 2026-05-07 | Indicateur | Preuve |
|---|---|---:|---|
| Version applicative | Validee | `0.12.0` | `package.json`, `apps/api/package.json`, `CHANGELOG.md` |
| API production | Redeployee | `READY` | Vercel deployment `dpl_9nZvY94JBLsaLseM8gDCZtNQ4Z8k` |
| Healthcheck API | Valide | HTTP 200, `version:"0.12.0"` | `curl https://alcide-api.vercel.app/health` |
| Tests API | Valides | 70 tests passants | `pnpm --filter api test`, 2026-05-07 |
| Suivi projet | Ajoute | 1 export Kanban date | Present document |

---

## 2. Export Kanban date

| ID | Lot / tache | Priorite | Statut | Responsable | Echeance | Preuve / commentaire |
|---|---|---|---|---|---|---|
| B3-DEPLOY-API-012 | Redeployer l'API pour aligner `/health` avec la version courante | Haute | Termine | Kevin | 2026-05-07 | Deployment Vercel `dpl_9nZvY94JBLsaLseM8gDCZtNQ4Z8k` |
| B3-HEALTH-012 | Verifier que `/health` ne renvoie plus `version:"0.1.0"` | Haute | Termine | Kevin | 2026-05-07 | Alias production `https://alcide-api.vercel.app/health` renvoie `version:"0.12.0"` |
| B3-TEST-API-012 | Securiser la non-regression API avant redeploiement | Haute | Termine | Kevin | 2026-05-07 | `pnpm --filter api test` : 70 tests passants |
| B3-PILOTAGE-012 | Ajouter une preuve de suivi projet datee | Haute | Termine | Kevin | 2026-05-07 | Export Kanban et tableau de pilotage dans ce fichier |
| B3-MONITORING-V2 | Ajouter une preuve de monitoring externe avec alerte | Moyenne | A faire | Kevin | V2 | Mentionne comme dette de pilotage dans Bloc 3 / Bloc 4 |
| B3-GH-PROJECT-V2 | Dupliquer cet export dans GitHub Projects si requis par le jury | Moyenne | A faire | Kevin | Avant soutenance si necessaire | Le present fichier sert de base d'import ou de capture |

---

## 3. Tableau de pilotage

| KPI | Cible | Mesure au 2026-05-07 | Statut |
|---|---:|---:|---|
| Version API exposee par `/health` | `0.12.0` | `0.12.0` | Conforme |
| Disponibilite healthcheck API | HTTP 200 | HTTP 200 | Conforme |
| Tests unitaires API | 100% passants | 70 / 70 | Conforme |
| Deployment Vercel API | `READY` | `READY` | Conforme |
| Preuve de suivi Bloc 3 | Document date | Present fichier | Conforme |

---

## 4. Preuve brute du redeploiement API

Commande de redeploiement production executee depuis la racine du depot :

```powershell
npx --yes vercel@latest deploy --prod --yes --force
```

Resultat Vercel utile :

```text
Deployment ID: dpl_9nZvY94JBLsaLseM8gDCZtNQ4Z8k
Target: production
Status: READY
Production URL: https://alcide-omx9ulhvv-kevinmrgts-projects.vercel.app
Alias: https://alcide-api.vercel.app
Created: 2026-05-07 13:20:56 CEST
```

Verification sur l'alias public :

```powershell
curl.exe -s --max-time 30 https://alcide-api.vercel.app/health
```

Sortie constatee :

```json
{"status":"ok","timestamp":"2026-05-07T11:22:06.395Z","version":"0.12.0"}
```

Verification sur l'URL exacte du deploiement :

```json
{"status":"ok","timestamp":"2026-05-07T11:22:06.424Z","version":"0.12.0"}
```

---

## 5. Decision de pilotage

Le Bloc 3 attend une preuve que la derniere version logicielle est suivie, livree et verifiable. La decision du 2026-05-07 est donc :

| Decision | Justification | Impact |
|---|---|---|
| Garder `0.12.0` comme version de demonstration | Version presente dans `package.json`, `apps/api/package.json` et `CHANGELOG.md` | Coherence entre documentation, code et endpoint `/health` |
| Redeployer l'API au lieu de modifier le code | Le code local et les tests etaient deja alignes sur `0.12.0` | Correction du decalage production sans changement fonctionnel inutile |
| Ajouter un export Kanban local | GitHub Projects n'etait pas necessaire pour prouver immediatement le suivi | Preuve datee, versionnable et reutilisable en soutenance |
