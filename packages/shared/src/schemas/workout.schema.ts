import { z } from 'zod';

// Contrat JSON Mistral — validé par Zod (mistral-contract.md)

export const ExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.union([z.number().int().positive(), z.string()]).optional(),
  rest_seconds: z.number().int().nonnegative(),
  duration_seconds: z.number().int().positive().optional(),
  tips: z.string().optional(),
});

export const PhaseSchema = z.object({
  name: z.string().min(1),
  duration_seconds: z.number().int().positive(),
  description: z.string().min(1),
});

export const WorkoutSchema = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_minutes: z.number().int().positive(),
  exercises: z.array(ExerciseSchema).min(1),
  warmup: z.array(PhaseSchema).optional(),
  cooldown: z.array(PhaseSchema).optional(),
});

// Schéma de l'input utilisateur pour générer un entraînement
export const GenerateWorkoutInputSchema = z.object({
  sport: z.string().min(1).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_minutes: z.number().int().min(15).max(180),
  goals: z.string().min(1).max(500),
  constraints: z.string().max(500).optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;
export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;
