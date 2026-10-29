# Audit IA sportive et maîtrise de la génération — 29 octobre 2026

Révision examinée : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche locale `codex/nettoyage-projet`. Responsable : agent IA dédié. Le code local diffère du `main` distant identifié par l'audit exploitation ; ce rapport ne certifie pas le comportement du déploiement public.

## Conclusion

Les réponses sont validées et les délais bornés, mais une durée mathématiquement exacte ne garantit pas une séance cohérente ni adaptée aux contraintes. Un défaut concret doit être corrigé avant l'ouverture : la normalisation des programmes supprime systématiquement les consignes personnalisées et peut transformer des exercices courts en blocs très longs. La qualification des contenus sportifs et la maîtrise persistante du budget restent également à établir. Aucun appel OpenAI réel ou payant, aucune donnée utilisateur et aucune base distante n'ont été utilisés.

P1 : à résoudre avant ouverture publique. P2 : amélioration de fiabilité à planifier avec décision explicite pour une bêta bornée. Aucun P0 ni incident corporel démontré.

## AI-01 — P1 — La normalisation des programmes écrase les consignes et force les durées sans validation sportive

**Preuves.** `apps/api/src/services/program-duration.service.ts:104` redistribue le temps restant entre les exercices. Aux lignes 134–145, le service supprime `sets` et `reps`, remplace toutes les descriptions par une phrase générique et remplace tous les conseils par une référence au chrono. Cette transformation s'applique à chaque programme généré (`apps/api/src/services/program-ai.service.ts:206`) et également à la lecture des programmes existants (`apps/api/src/services/program.service.ts:37`). La fonction n'a pas accès aux contraintes utilisateur ni à une typologie d'exercices.

**Reproduction locale.** Appel du vrai module compilé `normalizeProgramSessionDuration` avec une fixture sans réseau : deux exercices de 20 secondes, deux séries de cinq répétitions et des descriptions/conseils distincts, cible 20 minutes. Résultat : deux exercices de 600 secondes, séries et répétitions absentes, descriptions personnalisées et conseils supprimés. Le total retourné est exactement 1 200 secondes. La fixture établit l'altération du contenu ; elle ne démontre pas qu'un modèle a effectivement généré une recommandation dangereuse.

**Impact.** Une consigne technique ou une restriction formulée dans la description ou les conseils peut disparaître. La durée peut être considérablement augmentée sans réévaluation du mouvement. L'absence d'échauffement reste autorisée et n'est pas réparée par cette redistribution. Modifier la fonction modifie aussi le rendu de programmes historiques, même sans réécriture des lignes en base.

**Action / responsable.** Backend IA + référent sportif : préserver les consignes pertinentes, distinguer le temps d'un bloc de ses séries/répétitions et définir les ajustements admissibles par format d'exercice. Refuser ou régénérer un contenu dont la durée ne peut être corrigée dans ces limites. Versionner la normalisation des contenus historiques et examiner son caractère idempotent avant migration.

**Acceptation.** Régression sur la fixture ci-dessus et sur programmes de force, endurance et contraintes : aucune perte de consignes, aucun changement implicite de format d'exercice ; corrections de durée limitées par des règles approuvées. Recette humaine de la sortie réellement affichée, et pas seulement du JSON fournisseur.

## AI-02 — P1 — La sûreté du contenu sportif n'est pas qualifiée par les contrôles de structure

**Preuves.** Les prompts interpolent directement objectifs et contraintes libres (`apps/api/src/services/workout-ai.service.ts:40`, `apps/api/src/services/program-ai.service.ts:33`). Les formulaires proposent explicitement un exemple de douleur (`apps/web/components/WorkoutForm.tsx:197`, `apps/web/components/ProgramForm.tsx:274`). Les schémas vérifient types, bornes et arithmétique (`packages/shared/src/schemas/workout.schema.ts:21`, `packages/shared/src/schemas/program.schema.ts:42`), sans vérifier l'adéquation des mouvements aux contraintes ni la cohérence charge/récupération. Les semaines sont générées indépendamment et en parallèle (`apps/api/src/services/program-ai.service.ts:195`) ; la phase « charges maximales, volume élevé » est fixée pour l'avant-dernière semaine, sans règle spécifique au niveau débutant (`apps/api/src/services/program-ai.service.ts:8`).

L'examen des suites `workout-ai.service.test.ts`, `program-ai.service.test.ts` et `shared-contracts.test.ts` montre des réponses simulées pour format, durée, erreurs et délais. Aucun corpus de qualification sportive ou compte rendu de revue des sorties réelles n'a été trouvé dans le périmètre examiné. Ce constat est une absence de garantie, pas la preuve que toutes les sorties sont inadaptées.

**Action / responsable.** Responsable produit + professionnel compétent en entraînement + QA IA : préciser les publics et usages couverts, les demandes à refuser ou orienter, les règles de progression/récupération et un corpus d'évaluation. Inclure les contraintes contradictoires, instructions hostiles, demandes hors périmètre et niveaux débutants ; conserver une possibilité de signalement. Une modération générale ne remplace pas l'évaluation de l'adéquation sportive. Éviter de collecter des informations sensibles supplémentaires sans nécessité documentée.

**Acceptation.** Corpus daté et résultats associés au modèle, au prompt, au code et à la normalisation ; chaque scénario critique respecte la règle produit ou déclenche une réponse prudente ; revue humaine des exemples représentatifs avant ouverture. Rejouer ce contrôle lors d'un changement de modèle ou de prompt. OpenAI recommande des tests adversariaux et une revue humaine adaptée à l'enjeu ; cette recommandation ne constitue pas une certification de l'application. [Official OpenAI documentation](https://developers.openai.com/api/docs/guides/safety-best-practices).

## AI-03 — P1 avant ouverture large — Les dépenses ne sont ni réservées ni rapprochées par opération

**Preuves.** Le limiteur repose sur une `Map` de processus, cinq demandes par minute et par utilisateur (`apps/api/src/middleware/rate-limit.middleware.ts:12`). Il ne tient pas compte du nombre de semaines et ne survit pas à un changement d'instance. Un programme lance jusqu'à quatre semaines, chacune avec deux tentatives au maximum (`apps/api/src/services/program-ai.service.ts:136`, 195). La réponse fournisseur est réduite à `choices[0].message.content` (`apps/api/src/services/ai.service.ts:85`) : ni `usage`, ni modèle effectivement servi, ni identifiant fournisseur ne sont enregistrés. Un utilisateur authentifié peut choisir l'un des trois modèles autorisés via les réglages API (`apps/api/src/controllers/settings.controller.ts:9`, 41), même si l'interface masque ce réglage.

**Ordre de grandeur technique.** Une séance peut entraîner deux appels ; un programme de quatre semaines peut en entraîner huit. À 2 048 `max_completion_tokens` par appel (`ai.service.ts:75`), le plafond cumulé de complétion est de 16 384 tokens par programme, auxquels s'ajoutent les entrées répétées. Ce calcul décrit une borne de configuration, pas une consommation mesurée ni un prix. Le plafond inclut aussi les tokens de raisonnement selon le modèle, comme indiqué dans la [référence Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Aucune facture ou permission d'accès aux modèles du compte OpenAI n'a été contrôlée.

**Action / responsable.** Backend + exploitant : réserver atomiquement un budget persistant avant les appels ; limiter simultanéité et volume journalier par compte et globalement, en pondérant les programmes et modèles. Mesurer tokens, tentatives, latence et succès avec identifiant d'opération pseudonyme, sans journaliser le texte sensible. Préparer un arrêt de génération lors d'un seuil global, un rapprochement avec la consommation fournisseur et une règle de reprise/idempotence.

**Acceptation.** Deux instances concurrentes ne dépassent pas le budget réservé ; redémarrage sans remise à zéro ; refus avant tout appel lorsque le plafond est atteint ; test de huit tentatives de programme comptabilisées ; alerte et arrêt vérifiés. Définir ensuite un budget monétaire à partir de l'usage prévu et des tarifs réellement applicables. Recoupe SEC-03 et les constats de capacité de l'audit exploitation.

## AI-04 — P2 — La gestion des réponses ne distingue pas troncature, refus et erreur transitoire

**Preuves.** `apps/api/src/services/ai.service.ts:17` ne type que le contenu. Le code ne traite ni `finish_reason` ni `message.refusal`, et utilise `response_format: json_object` (`ai.service.ts:76`). Les réponses sans contenu ou invalides retombent sur des erreurs génériques et peuvent être retentées. `workout-ai.service.ts:173` et `program-ai.service.ts:169` ne distinguent pas les erreurs HTTP permanentes des incidents transitoires.

**Action / responsable.** Backend IA : traiter explicitement refus, complétion interrompue, troncature et erreurs permanentes ; réserver les retries aux cas éligibles et respecter les indications de limitation. Étudier `json_schema` pour les modèles utilisés, en gardant les contrôles Zod et métier. JSON mode ne garantit pas le schéma ; Structured Outputs garantit la structure prise en charge, sans garantir la justesse sportive. [Official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

**Acceptation.** Tests simulés `refusal`, `length`, réponse vide, JSON incorrect, 401/400, 429 et 5xx : comportement explicite, absence de retry pour une erreur permanente et contenu invalide jamais sauvegardé. Une recette bornée devra ensuite qualifier le modèle et les paramètres exacts sur le compte réel.

## AI-05 — P2 — L'échec d'une semaine laisse les autres appels continuer

**Preuves et reproduction.** `Promise.all` à `apps/api/src/services/program-ai.service.ts:195` échoue dès la première semaine rejetée. Chaque appel possède son propre `AbortController` local (`apps/api/src/services/ai.service.ts:39`), sans signal partagé d'opération. Simulation locale du vrai `generateProgram` avec `fetch` remplacé : semaine 1 renvoie 401, semaine 2 répond après 600 ms. Le service retourne `SERVICE_UNAVAILABLE` après deux tentatives de la première semaine avec trois appels au total et un appel toujours actif ; la semaine 2 se termine après ce retour d'erreur. Aucun réseau réel n'a été utilisé.

**Impact.** Travail fournisseur inutile après un échec définitif et durée de traitement résiduelle. Interrompre le transport ne garantit pas à lui seul l'annulation du calcul ni de la facturation déjà engagée. Le même manque de signal de bout en bout empêche de garantir l'arrêt à la fermeture du parcours utilisateur.

**Action / responsable.** Backend : propager un signal d'opération aux appels parallèles, arrêter les tâches restantes après échec définitif et comptabiliser celles déjà engagées. Relier ce mécanisme aux limites de simultanéité et à l'état persistant de génération.

**Acceptation.** Simulation précédente : le signal des appels restants est annulé, aucune nouvelle tentative n'est lancée après l'échec global et leur état/coût restent rapprochables. Tester également l'abandon du client sans prétendre que cela rembourse les tokens engagés.

## AI-06 — P2 — Les instructions applicatives et les textes utilisateur partagent le même message

**Preuves.** `apps/api/src/services/ai.service.ts:73` place l'intégralité du prompt dans un message `user`. Le nom `SYSTEM_MESSAGE` du générateur de programmes (`program-ai.service.ts:15`) désigne seulement une chaîne concaténée au même message (`program-ai.service.ts:94`). Sport, objectifs et contraintes libres peuvent donc contenir des instructions mélangées aux règles applicatives.

**Impact.** Surface de détournement du contenu ou de non-respect des contraintes. Aucune injection réussie auprès d'OpenAI n'a été tentée ou démontrée. Le service n'expose pas d'outil ni de recherche de données d'autres utilisateurs dans cet appel ; il ne faut pas déduire de ce constat une exfiltration de la base ou de la clé serveur.

**Action / responsable.** Backend IA : placer la politique applicative dans le rôle approprié, transmettre les champs utilisateur comme données structurées distinctes et préciser leur caractère non fiable ; qualifier des cas adversariaux. Cette séparation renforce le contrôle sans constituer une défense suffisante seule. Voir les [bonnes pratiques de sûreté OpenAI](https://developers.openai.com/api/docs/guides/safety-best-practices).

**Acceptation.** Vérification de la construction des messages et corpus d'instructions hostiles dans chaque champ ; la réponse respecte le périmètre sportif ou est refusée, sans sauvegarde de contenu hors règles.

## Garanties existantes et limites

- Clé lue exclusivement côté API depuis l'environnement et URL fournisseur fixe ; aucune clé demandée dans les formulaires.
- Entrées limitées en longueur et bornes de durée/fréquence vérifiées côté serveur.
- Séances : sport, niveau, durée et somme des blocs vérifiés avant sauvegarde ; programmes : numérotation et nombres de semaines/séances contrôlés.
- Délais fournisseur de 45 secondes et budget applicatif de 55 secondes pour préserver la limite Vercel de 60 secondes ; les timeouts ne déclenchent pas un nouveau retry. Les tests existants couvrent ces chemins.
- Aucune réponse fictive de secours n'est présentée comme une génération réussie lors d'une indisponibilité.

Cet audit n'est pas une expertise médicale et ne formule pas de prescription d'entraînement. Les reproductions établissent des comportements logiciels sur des fixtures artificielles. Aucun contenu réel du modèle, taux de réussite, tarif, droit d'accès au modèle, consommation ou configuration du compte fournisseur n'est certifié. Les traitements de données sensibles et leurs bases légales relèvent aussi du rapport vie privée. La recette finale doit porter sur les sorties réelles de la révision livrée, dans un budget explicitement borné.
