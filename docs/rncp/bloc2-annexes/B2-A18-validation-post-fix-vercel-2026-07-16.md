# B2-A18 - Validation post-fix Vercel - 2026-07-16

Date de controle : 2026-07-16, Europe/Paris.
Perimetre : Bloc 2 RNCP39583, version applicative `0.12.0`, production Vercel Web/API apres correction des erreurs de build.

Cette annexe complete B2-A17. B2-A17 reste la preuve historique de la production OpenAI du 2026-07-15 ; B2-A18 consolide l'etat final apres la PR corrective Vercel #20 et le commit courant `533f17b`.

## 1. Etat Git et pull requests

| Element | Resultat | Preuve |
|---|---|---|
| Branche de reference | `main` alignee sur `origin/main` | `git log -1 --oneline --decorate` |
| Commit courant | `533f17be8fd50cfef3c60b3792a549a6ad80c386` | `ci: ignore major Dependabot action updates` |
| Correction Vercel | PR #20 fusionnee | `https://github.com/Kevinmrgt/aiSport/pull/20` |
| Merge PR #20 | `dac51e9b64da4c3084453c68b89b50d27fdb71b3` | `fix: stabilize Vercel builds (#20)` |
| PR Dependabot rouge | PR #25 fermee comme hors perimetre Bloc 2 | `https://github.com/Kevinmrgt/aiSport/pull/25` |

Decision : l'etat de reference pour le dossier Bloc 2 est `main` au commit `533f17b`.

## 2. GitHub Actions

| Workflow | Run | Commit | Resultat | Decision Bloc 2 |
|---|---:|---|---|---|
| `CI - Alcide` | `29489995458` | `533f17b` | Succes | Preuve CI verte finale |
| `Monitoring - Production health` | `29496100988` | `533f17b` | Succes | Monitoring production retabli |
| `CD - Vercel` | `29490217892` | `533f17b` | Echec configuration | `VERCEL_TOKEN` invalide cote GitHub, non bloquant pour la production deja deployee |

Jobs CI valides dans le run `29489995458` :

- lint et typecheck ;
- audit securite ;
- tests unitaires et coverage ;
- E2E smoke et accessibilite ;
- build packages ;
- build Docker API/Web.

Conclusion CI/CD : la chaine qualite est verte sur `main`. Le workflow CD GitHub custom reste a relancer apres regeneration du secret `VERCEL_TOKEN`, mais la production Vercel via Git integration et les healthchecks sont operationnels.

## 2.1 Synchronisation configuration Vercel API

Controle complementaire realise le 2026-07-16 apres preparation du paquet jury :

```text
vercel project inspect ai-sport-api
=> Root Directory: apps/api
=> Framework Preset: Other
=> Build Command: cd ../.. && pnpm --filter shared build && pnpm --filter api build
=> Output Directory: public
=> Install Command: cd ../.. && pnpm install --frozen-lockfile --prod=false
PATCH Vercel API
=> ai-sport-api.commandForIgnoringBuildStep = node ../../scripts/vercel-ignore-build.mjs api
=> ai-sport-web.commandForIgnoringBuildStep = node ../../scripts/vercel-ignore-build.mjs web
```

Decision : les reglages dashboard Vercel API sont alignes avec `apps/api/vercel.json`, et les deux projets Vercel utilisent le meme ignored build step que le repo. Les previews documentaires peuvent etre ignorees par `scripts/vercel-ignore-build.mjs`, tandis que les builds production continuent obligatoirement.

## 3. Healthchecks production

Commandes executees depuis le poste local :

```text
Invoke-WebRequest https://ai-sport-api.vercel.app/health
=> 200
=> {"status":"ok","service":"alcide-api","timestamp":"2026-07-16T12:23:48.540Z","version":"0.12.0"}

Invoke-WebRequest https://ai-sport-web.vercel.app/api/health
=> 200
=> {"status":"ok","service":"alcide-web","timestamp":"2026-07-16T12:23:48.966Z","version":"0.12.0"}
```

La racine Web `https://ai-sport-web.vercel.app` repond egalement en HTTP 200.

## 4. Validation navigateur connecte

Controle realise dans le navigateur interne Codex sur la production `https://ai-sport-web.vercel.app`, avec session Google active.

| Parcours | Resultat | URL finale ou preuve |
|---|---|---|
| Ouverture `/generate` | Formulaire seance affiche, utilisateur connecte | Navigation principale et bouton `Se deconnecter` visibles |
| Generation seance OpenAI | Succes, redirection vers detail workout avec programme et timer | `/workouts/f1d03237-7987-4fef-b8b8-145edc26ec61` |
| Detail seance | Programme course a pied 30 min genere, timer utilisable | Titre : `Seance reprise progressive - endurance fondamentale` |
| Ouverture `/programs/generate` | Formulaire programme affiche | Cycle 3 semaines, 3 seances/semaine, 30 min |
| Generation programme OpenAI | Succes, redirection vers detail programme | `/programs/e818c9a6-f09c-4387-972f-b8d2fc59327b` |
| Detail programme | Programme 3 semaines, 9 seances planifiees | Titre : `Programme Alcide Course a pied - 3 semaines (Debutant)` |

## 5. Captures produites le 2026-07-16

| Preuve | Fichier |
|---|---|
| Formulaire generation seance avant soumission | `docs/rncp/bloc2-annexes/screenshots/B2-A18-generation-seance-form-production-2026-07-16.png` |
| Detail seance apres generation reelle | `docs/rncp/bloc2-annexes/screenshots/B2-A18-generation-seance-after-wait-production-2026-07-16.png` |
| Formulaire generation programme avant soumission | `docs/rncp/bloc2-annexes/screenshots/B2-A18-generation-programme-form-production-2026-07-16.png` |
| Etat generation programme en cours | `docs/rncp/bloc2-annexes/screenshots/B2-A18-generation-programme-after-wait-production-2026-07-16.png` |
| Detail programme apres generation reelle | `docs/rncp/bloc2-annexes/screenshots/B2-A18-generation-programme-current-production-2026-07-16.png` |

## 6. OpenAI cote serveur

Constats :

- le formulaire UI affiche le modele configure par Alcide, sans champ de cle API utilisateur ;
- l'utilisateur ne saisit aucune cle OpenAI ;
- les generations seance et programme aboutissent en production ;
- B2-A17 prouvait deja les logs `provider: 'openai'` et l'absence d'exposition de `OPENAI_API_KEY` dans le HTML/logs.

Decision : le Bloc 2 doit presenter OpenAI comme fournisseur unique gere cote serveur par l'application.

## 7. Points de suivi restants

| Point | Impact Bloc 2 | Decision |
|---|---|---|
| `CD - Vercel` GitHub custom rouge | Non bloquant produit : production et monitoring OK | Regenerer `VERCEL_TOKEN` si le workflow custom doit etre vert |
| CR-013 coupure IA reelle | Non bloquant : erreurs IA couvertes par tests unitaires | Rejouer en preview si le jury exige une panne reelle |
| E2E complet `generate.spec.ts` | Non bloquant : smoke/accessibilite CI verts et parcours reel navigateur valide | Relancer quand l'environnement local Node/pnpm est repare |
| Warning SSL PostgreSQL | Durcissement configuration | Mettre explicitement `sslmode=verify-full` dans `DATABASE_URL` |
| Favicon | Cosmetique | Ajouter un favicon lors d'une passe UI |

## 8. Decision orchestrateur

Bloc 2 valide techniquement au 2026-07-16 pour :

- C2.1.1 : environnements et healthchecks production operationnels ;
- C2.1.2 : CI verte, monitoring production vert, CD custom documente comme action de configuration ;
- C2.2.1 : prototype Web/API parcouru en session connectee ;
- C2.2.2 : harnais de tests unitaires et coverage valides en CI ;
- C2.2.3 : OpenAI cote serveur, secrets non exposes, accessibilite et securite controlees ;
- C2.3.1 : cahier de recettes relie aux preuves ;
- C2.3.2 : plan de correction des bogues disponible ;
- C2.4.1 : documentation utilisateur, mise a jour, CI/CD et deploiement disponibles.

Decision : **Bloc 2 pret a etre remis au jury avec B2-A18 comme annexe finale post-fix**.
