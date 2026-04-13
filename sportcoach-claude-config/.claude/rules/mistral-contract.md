---
description: Schéma JSON de réponse Mistral pour les entraînements
globs: "apps/api/src/services/**/*.ts,apps/api/src/schemas/**/*.ts"
---

# Contrat JSON Mistral

L'API Mistral DOIT retourner un JSON respectant ce schéma (validé par Zod côté serveur) :

```typescript
const ExerciseSchema = z.object({
  name: z.string(),
  description: z.string(),
  sets: z.number().optional(),
  reps: z.union([z.number(), z.string()]).optional(),
  rest_seconds: z.number(),
  duration_seconds: z.number().optional(),
  tips: z.string().optional(),
});

const PhaseSchema = z.object({
  name: z.string(),
  duration_seconds: z.number(),
  description: z.string(),
});

const WorkoutSchema = z.object({
  title: z.string(),
  sport: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration_minutes: z.number(),
  exercises: z.array(ExerciseSchema),
  warmup: z.array(PhaseSchema).optional(),
  cooldown: z.array(PhaseSchema).optional(),
});
```

## Règles d'intégration

- Le prompt Mistral DOIT demander une réponse en JSON strict
- Parser la réponse avec `WorkoutSchema.safeParse()`
- Si échec : retry 1 fois avec un prompt plus explicite
- Si 2ème échec : erreur propre à l'utilisateur ("Impossible de générer l'entraînement, réessayez")
- Ne JAMAIS exposer la clé API Mistral côté client
- L'appel passe TOUJOURS par le backend Hono
