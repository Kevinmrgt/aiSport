---
name: generate-workout
description: Workflow de développement de la feature de génération d'entraînement via Mistral AI. Utiliser quand on travaille sur le prompt Mistral, le parsing JSON, ou le service de génération.
---

# Skill — Génération d'entraînement IA

## Workflow

1. L'utilisateur remplit un formulaire : sport, niveau, durée, objectifs, contraintes physiques
2. Le frontend envoie une requête POST au backend Hono
3. Le controller valide les inputs avec Zod
4. Le `MistralService` construit le prompt et appelle l'API Mistral
5. La réponse JSON est parsée et validée avec `WorkoutSchema` (Zod)
6. Si validation OK → stockage en BDD via `WorkoutRepository` → retour au client
7. Si validation KO → retry 1 fois avec prompt plus explicite → sinon erreur propre

## Prompt Mistral

Le prompt DOIT inclure :
- Le sport choisi
- Le niveau de l'utilisateur (débutant, intermédiaire, avancé)
- La durée souhaitée
- Les objectifs spécifiques (force, endurance, souplesse, etc.)
- Les éventuelles contraintes physiques
- L'instruction STRICTE de répondre en JSON selon le schéma défini

## Points de vigilance

- Ne JAMAIS exposer la clé API Mistral côté client
- Timeout de 30s sur l'appel Mistral
- Gérer le JSON tronqué (Mistral peut couper la réponse)
- Gérer les réponses avec du texte autour du JSON (extraire le JSON)
- Logger chaque appel Mistral (durée, succès/échec, tokens utilisés)

## Fichiers concernés

- `apps/api/src/services/mistral.service.ts`
- `apps/api/src/schemas/workout.schema.ts`
- `apps/api/src/controllers/workout.controller.ts`
- `apps/api/src/repositories/workout.repository.ts`
- `apps/web/app/generate/page.tsx`
