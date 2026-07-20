import { z } from 'zod';

// Contrat JSON IA — validé par Zod

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

export const WorkoutSchema = z
  .object({
    title: z.string().min(1),
    sport: z.string().min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    duration_minutes: z.number().int().positive(),
    exercises: z.array(ExerciseSchema).min(1),
    warmup: z.array(PhaseSchema).optional(),
    cooldown: z.array(PhaseSchema).optional(),
  })
  .superRefine((workout, ctx) => {
    workout.exercises.forEach((exercise, index) => {
      if (exercise.duration_seconds === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exercises', index, 'duration_seconds'],
          message: 'La duree est requise pour garantir la duree totale de la seance',
        });
      }
    });

    const phaseSeconds = [...(workout.warmup ?? []), ...(workout.cooldown ?? [])]
      .reduce((total, phase) => total + phase.duration_seconds, 0);
    const exerciseSeconds = workout.exercises.reduce(
      (total, exercise) => total + (exercise.duration_seconds ?? 0) + exercise.rest_seconds,
      0,
    );
    const expectedSeconds = workout.duration_minutes * 60;
    const actualSeconds = phaseSeconds + exerciseSeconds;

    if (actualSeconds !== expectedSeconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration_minutes'],
        message: `La duree detaillee (${actualSeconds}s) doit correspondre a la duree annoncee (${expectedSeconds}s)`,
      });
    }
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
