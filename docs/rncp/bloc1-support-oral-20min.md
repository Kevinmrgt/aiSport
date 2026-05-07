# Plan de support oral Bloc 1 RNCP39583 - SportCoach IA

> Épreuve : **Bloc 1 - Cadrer un projet de développement d'applications logicielles**  
> Format officiel : **30 minutes**, dont **20 minutes de présentation** et **10 minutes d'échange avec le jury**  
> Objectif du support : présenter un cadrage projet clair, orienté client/jury, avec preuves et préconisation.

---

## 1. Intention de présentation

Message central à faire passer :

> SportCoach IA est un projet de développement logiciel faisable, utile et maîtrisé, car le besoin est cadré, les parties prenantes sont identifiées, les risques et coûts sont anticipés, et l'architecture retenue est justifiée par une comparaison technique, sécurité et budget.

Angle recommandé :

- ne pas raconter uniquement le code ;
- parler comme face à un client qui doit valider le lancement ;
- citer les preuves projet sans ouvrir trop de fichiers ;
- insister sur les compétences éliminatoires : parties prenantes, faisabilité/budget, architecture comparée, charge, argumentaire.

Nombre conseillé de slides : **12 slides**.

---

## 2. Plan minuté sur 20 minutes

| Temps | Slide | Titre | Message clé | Preuves à afficher ou citer |
|---:|---:|---|---|---|
| 0:00-1:00 | 1 | Contexte Bloc 1 | L'épreuve porte sur le cadrage amont, pas seulement sur l'application développée | `docs/rncp/matrice-conformite-rncp39583.md`, PDF règlement spécial |
| 1:00-2:30 | 2 | Projet et problématique | SportCoach IA répond au besoin d'entraînements personnalisés accessibles et rapides | `README.md`, `docs/rncp/dossier-professionnel-rncp39583.md` |
| 2:30-4:00 | 3 | Analyse de la demande | Le besoin est transformé en objectifs métier, contraintes et valeur utilisateur | `apps/web/app/generate/page.tsx`, `apps/web/app/programs/generate/page.tsx` |
| 4:00-5:30 | 4 | Parties prenantes | Le périmètre projet est cadré par acteurs, rôles, attentes et implication | Section parties prenantes du livrable Bloc 1 |
| 5:30-7:00 | 5 | Diagnostic et opportunités | Le projet se justifie face aux solutions génériques, apps fermées et prompts IA non structurés | `docs/bloc4/veille-technologique.md`, `docs/adr/` |
| 7:00-9:00 | 6 | Risques majeurs | Les risques IA, sécurité, coûts, disponibilité et déploiement sont identifiés et suivis | `docs/security/owasp-review.md`, `rate-limit.middleware.ts`, `ai.service.ts` |
| 9:00-10:30 | 7 | Faisabilité technique | Le MVP est faisable avec contraintes connues et conditions de lancement | `docs/deployment.md`, `docs/ci-cd.md`, `docker-compose.yml` |
| 10:30-13:00 | 8 | Comparaison des solutions | Les choix techniques sont argumentés : Next.js, Hono, PostgreSQL/Drizzle, Mistral, Vercel/Neon | `docs/adr/ADR-001` à `ADR-007` |
| 13:00-15:00 | 9 | Architecture proposée | L'architecture sépare web, API, DB, IA, auth, CI/CD et protège les secrets | Schéma Mermaid du livrable, `apps/web/lib/server-api.ts`, `apps/api/src/app.ts` |
| 15:00-16:30 | 10 | Fonctions attendues | Les fonctionnalités sont priorisées Must/Should/Could pour chiffrer le projet | `apps/api/src/routes/index.ts`, `packages/shared/src/` |
| 16:30-18:30 | 11 | Charge et budget | Le projet est estimé en jours-homme, coût humain, fonctionnement et marge de risque | Section charge/budget du livrable Bloc 1 |
| 18:30-20:00 | 12 | Préconisation client | Recommandation : lancer un MVP pilote sous conditions de sécurité, budget IA et monitoring | Conclusion du livrable Bloc 1 |

---

## 3. Détail conseillé par slide

### Slide 1 - Contexte Bloc 1

Message clé : "Je présente ici le cadrage du projet, conformément au Bloc 1 RNCP39583."

À dire :

- oral individuel de 30 minutes ;
- 20 minutes de présentation, 10 minutes d'échange ;
- objectif : démontrer besoin, risques, faisabilité, architecture, charge, budget et préconisation.

À afficher :

- intitulé officiel : **Cadrer un projet de développement d'applications logicielles** ;
- liste des compétences éliminatoires C1.1.1, C1.2.2, C1.3.2, C1.4.1, C1.6.

### Slide 2 - Projet et problématique

Message clé : "SportCoach IA aide un sportif non expert à obtenir une séance ou un programme personnalisé."

À dire :

- application web full-stack ;
- l'utilisateur choisit sport, niveau, objectifs et contraintes ;
- il obtient une séance ou un programme généré par IA, sauvegardé et exécutable avec timer.

Preuves :

- `README.md`;
- parcours `/generate`, `/programs/generate`, `/workouts/[id]`.

### Slide 3 - Analyse de la demande

Message clé : "Le besoin initial a été transformé en objectifs métier et contraintes projet."

À afficher :

| Besoin | Réponse |
|---|---|
| Personnalisation | Formulaire + IA |
| Sécurité | Auth + ownership |
| Historique | PostgreSQL |
| Exécution | Timer |
| Démonstration | Vercel/Neon + Docker |

À préciser :

- commanditaire présenté comme fictif dans la mise en situation ;
- aucun entretien réel n'est revendiqué comme preuve.

### Slide 4 - Parties prenantes

Message clé : "Le périmètre est cadré par rôles, attentes et niveau d'implication."

À afficher :

- commanditaire fictif : coach / structure sportive ;
- utilisateurs finaux ;
- développeur / équipe projet ;
- jury RNCP ;
- fournisseurs externes : IA, OAuth, hébergement, base de données, CI/CD.

Phrase utile :

> Le fournisseur IA n'est pas seulement une dépendance technique : il influence le coût, la disponibilité, la qualité et la sécurité du projet.

### Slide 5 - Diagnostic et opportunités

Message clé : "Le projet se justifie car les alternatives ne couvrent pas à la fois personnalisation, persistance, sécurité et exécution."

À afficher :

- situation avant projet : pas d'application dédiée ;
- limites : PDF générique, apps fermées, chatbot non structuré ;
- opportunités : personnalisation, suivi, dashboard, extension coach.

Preuves :

- `docs/bloc4/veille-technologique.md`;
- `docs/adr/ADR-003-mistral-ai.md`.

### Slide 6 - Risques majeurs

Message clé : "Les risques ne sont pas ignorés : ils sont priorisés et reliés à des contrôles."

À afficher sous forme de tableau court :

| Risque | Criticité | Mitigation |
|---|---:|---|
| Sortie IA invalide | Élevée | JSON mode + Zod + retry |
| Coût IA | Élevée | Rate limiting + plafond |
| Accès données autre utilisateur | Élevée | Auth + ownership |
| Secret exposé | Élevée | server-only + env |
| Déploiement sans migration | Élevée | workflow DB manuel |
| Monitoring insuffisant | Moyenne | healthchecks + alerting à ajouter |

Preuves :

- `docs/security/owasp-review.md`;
- `apps/api/src/middleware/auth.middleware.ts`;
- `apps/api/src/middleware/rate-limit.middleware.ts`;
- `.github/workflows/db-migrate.yml`.

### Slide 7 - Faisabilité technique

Message clé : "Le MVP est techniquement faisable, avec des conditions claires avant production réelle."

À afficher :

| Domaine | Avis |
|---|---|
| Frontend | Faisable, implémenté |
| Backend | Faisable, architecture en couches |
| DB | Faisable, migrations Drizzle |
| IA | Faisable sous contrôle coût/qualité |
| Sécurité | Faisable pour MVP, durcissement production |
| Déploiement | Faisable, Vercel/Neon documenté |

Phrase utile :

> Je recommande le lancement d'un pilote, pas une ouverture commerciale sans monitoring ni plafond IA.

### Slide 8 - Comparaison des solutions

Message clé : "Les choix retenus résultent d'arbitrages, pas d'habitudes."

À afficher :

| Sujet | Comparaison | Choix |
|---|---|---|
| Frontend | Next.js vs SPA Vite | Next.js |
| API | Hono vs Express/Fastify/Nest | Hono |
| DB | PostgreSQL/Drizzle vs Prisma/Supabase/Firebase | PostgreSQL/Drizzle |
| IA | Mistral vs OpenAI/Anthropic/local | Mistral par défaut |
| Hébergement | Vercel/Neon vs Fly/VPS/Railway | Vercel/Neon |
| CI/CD | GitHub Actions vs Vercel auto-deploy seul | GitHub Actions |

Preuves :

- ADR-001 à ADR-007.

### Slide 9 - Architecture proposée

Message clé : "L'architecture isole les responsabilités et protège les secrets."

À afficher :

- schéma web -> server-only -> API Hono -> services -> Drizzle/PostgreSQL -> IA ;
- GitHub Actions -> Vercel/Neon ;
- Auth.js Google -> session -> user identity.

À dire :

- le navigateur ne reçoit ni `SERVICE_SECRET`, ni clé IA ;
- l'API ne sauvegarde qu'après validation Zod ;
- PostgreSQL reste portable.

### Slide 10 - Fonctionnalités attendues

Message clé : "Les fonctionnalités ont été hiérarchisées pour permettre le chiffrage."

À afficher :

- Must : auth, génération séance, persistance, liste/détail, sécurité, déploiement ;
- Should : programmes, timer, suivi session, dashboard, paramètres IA ;
- Could : monitoring avancé, export PDF, PWA ;
- Won't MVP : paiement, mobile natif, conseil médical.

Preuves :

- `apps/api/src/routes/index.ts`;
- `apps/web/app/`;
- `packages/shared/src/index.ts`.

### Slide 11 - Charge et budget

Message clé : "Le cadrage aboutit à une charge et un budget prévisionnels, avec hypothèses explicites."

À afficher :

- charge totale : **81 JH**, soit **567 heures** ;
- coût humain valorisé : **36 450 EUR HT** ;
- marge risque 15% : **5 468 EUR HT** ;
- total réalisation estimé : **42 818 EUR HT** ;
- fonctionnement prototype : **0 à 50 EUR/mois** ;
- pilote pro : **55 à 180 EUR/mois**.

À préciser :

- ce n'est pas une facture réelle du projet RNCP ;
- les coûts cloud/IA sont à vérifier selon usage et tarifs au lancement.

### Slide 12 - Préconisation client

Message clé : "Je recommande de lancer un MVP pilote sous conditions."

À afficher :

Décision proposée :

> Valider le cadrage du MVP SportCoach IA pour un pilote limité, avec budget mensuel plafonné, périmètre centré sur génération / persistance / timer / suivi, et sécurisation progressive avant production commerciale.

Conditions :

- plafond IA ;
- monitoring externe ;
- limites d'usage sportif ;
- tests DB à ajouter ;
- validation démonstration complète.

Conclusion orale :

> Le projet est faisable, cohérent et défendable, mais il doit rester piloté comme un produit logiciel : risques, coûts et dépendances doivent être surveillés dès le pilote.

---

## 4. Questions probables du jury et réponses préparées

### Q1. Quel est le commanditaire du projet ?

Réponse :

> Dans le cadre de l'épreuve, je présente un commanditaire fictif réaliste : une structure sportive ou un coach souhaitant proposer un outil numérique d'aide à l'entraînement. Je ne revendique pas d'entretien client réel ; j'ai formalisé le besoin à partir du contexte projet et des preuves fonctionnelles.

### Q2. En quoi ce Bloc 1 n'est-il pas juste une description technique ?

Réponse :

> Le document part du besoin, des parties prenantes, des risques, de la faisabilité, de la charge et du budget. La technique sert à justifier une recommandation client, elle n'est pas le point de départ unique.

### Q3. Pourquoi Next.js plutôt qu'une SPA React classique ?

Réponse :

> Next.js permet d'utiliser Server Actions et un module `server-only` pour appeler l'API sans exposer le secret interne au navigateur. Cela simplifie la sécurité et s'intègre bien à Vercel.

### Q4. Pourquoi Hono plutôt qu'Express ou NestJS ?

Réponse :

> Hono est léger, typé, adapté à une API MVP et n'impose pas de sur-architecture. NestJS aurait été pertinent pour une grande équipe, mais trop lourd ici. Express est mature, mais moins typé nativement.

### Q5. Comment évitez-vous qu'un utilisateur voie les données d'un autre ?

Réponse :

> Chaque requête protégée passe par `authMiddleware`, puis les repositories filtrent avec le `userId`. Les tables `workouts`, `training_programs` et `session_logs` sont liées à l'utilisateur.

### Q6. Que se passe-t-il si l'IA renvoie un mauvais JSON ?

Réponse :

> La sortie est extraite, parsée et validée par Zod. Si elle n'est pas conforme, le service fait une tentative supplémentaire avec un prompt renforcé. Après échec, une erreur propre est renvoyée, sans persister de donnée invalide.

### Q7. Comment maîtrisez-vous les coûts IA ?

Réponse :

> Le MVP utilise un modèle léger par défaut, limite les générations par utilisateur, et prévoit un plafond mensuel fournisseur. Pour un pilote, je recommande de suivre le volume de tokens et d'ajuster le modèle selon usage réel.

### Q8. Quelle est la limite principale du projet aujourd'hui ?

Réponse :

> La limite principale pour une production réelle est l'industrialisation : monitoring externe, alerting, tests DB et limites d'usage sportif doivent être renforcés. Pour un MVP de démonstration et pilote limité, la base est faisable.

### Q9. Pourquoi Vercel + Neon ?

Réponse :

> Cette cible permet une mise en ligne rapide, HTTPS automatique, rollback Vercel, PostgreSQL managé et intégration GitHub Actions. Docker Compose reste disponible pour la portabilité.

### Q10. Quelle architecture serait nécessaire à plus grande échelle ?

Réponse :

> Je remplacerais le rate limiting in-memory par Redis/Upstash, ajouterais monitoring et logs structurés, mettrais des tests DB automatisés, et suivrais les coûts IA par utilisateur. La base PostgreSQL et la séparation API/services facilitent cette évolution.

### Q11. Pourquoi stocker du JSONB pour les entraînements ?

Réponse :

> La structure d'un entraînement IA peut évoluer : exercices, échauffement, récupération, conseils. JSONB permet de stocker ce contenu flexible, tout en gardant les champs principaux normalisés pour lister, filtrer et calculer des statistiques.

### Q12. Quel est le risque environnemental ?

Réponse :

> Le projet n'a pas encore de bilan carbone mesuré. Les choix limitent toutefois l'infrastructure permanente : cloud managé, serverless, rate limiting, prompts contraints. Une étape d'industrialisation devrait mesurer appels IA, tokens, trafic et consommation cloud.

### Q13. Comment avez-vous estimé la charge ?

Réponse :

> J'ai découpé le périmètre en lots : cadrage, conception, frontend, backend, base, IA, sécurité, tests, CI/CD, documentation et maintenance. Chaque lot est estimé en jours-homme de 7 heures avec une marge de risque.

### Q14. Que demandez-vous au client à la fin du cadrage ?

Réponse :

> Je demande la validation d'un MVP pilote, pas une production commerciale immédiate : périmètre validé, budget plafonné, risques acceptés, monitoring à ajouter, et démonstration de bout en bout à valider.

---

## 5. Preuves à préparer avant l'oral

| Preuve | Pourquoi l'afficher |
|---|---|
| `docs/rncp/bloc1-cadrage-projet-rncp39583.md` | Livrable principal Bloc 1 |
| `docs/rncp/matrice-conformite-rncp39583.md` | Montrer l'alignement référentiel |
| `docs/adr/` | Justifier les choix techniques |
| `docs/security/owasp-review.md` | Prouver la prise en compte sécurité |
| `.github/workflows/ci.yml` | Prouver qualité, tests, build, audit |
| `docs/ci-cd.md` et `docs/deployment.md` | Prouver faisabilité déploiement |
| `apps/api/src/db/schema.ts` | Montrer modèle de données et ownership |
| `apps/web/lib/server-api.ts` | Montrer protection des secrets côté serveur |
| `packages/shared/src/schemas/` | Montrer les contrats Zod |
| `apps/web/components/Timer.tsx` | Montrer que la génération devient une séance exécutable |

---

## 6. Chronométrage d'entraînement

Pour tenir 20 minutes :

| Passage | Durée cible |
|---|---:|
| Contexte + projet | 2 min 30 |
| Demande + parties prenantes | 3 min |
| Diagnostic + risques | 3 min 30 |
| Faisabilité + comparaisons | 4 min |
| Architecture + fonctionnalités | 3 min 30 |
| Charge + budget + préconisation | 3 min 30 |

Conseil de soutenance :

- garder 2 ou 3 preuves code maximum à l'écran ;
- ne pas ouvrir trop de fichiers pendant les 20 minutes ;
- utiliser les preuves comme réponses pendant les 10 minutes d'échange ;
- conclure explicitement par la décision client recommandée.
