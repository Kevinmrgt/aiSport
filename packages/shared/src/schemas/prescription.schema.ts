import { z } from 'zod';

/** Versioned execution instructions. Unversioned exercises keep their original meaning. */
export const PrescriptionSchema = z.object({
  version: z.literal(2),
  category: z.enum(['strength', 'isometric', 'cardio', 'mobility', 'technique']),
  mode: z.enum(['repetitions', 'interval', 'continuous', 'mobility']),
  sets: z.number().int().min(1).max(12),
  reps: z.number().int().min(1).max(30).optional(),
  // Per set; an estimate, never a countdown, when mode is repetitions.
  work_seconds: z.number().int().min(5).max(10_800),
  rest_seconds: z.number().int().min(0).max(300),
  transition_seconds: z.number().int().min(0).max(60),
  // Consecutive exercises with the same id are performed round by round.
  circuit_id: z.number().int().min(1).max(12).optional(),
});

export type Prescription = z.infer<typeof PrescriptionSchema>;
