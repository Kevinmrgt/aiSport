import { z } from 'zod';

export const SessionSourceTypeSchema = z.enum(['workout', 'program_session']);
export const SessionFeedbackSchema = z.enum(['too_easy', 'good', 'too_hard']);
export const SessionDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const CreateSessionLogInputSchema = z
  .object({
    sourceType: SessionSourceTypeSchema,
    workoutId: z.string().uuid().optional(),
    programId: z.string().uuid().optional(),
    programWeekNumber: z.number().int().min(1).optional(),
    programSessionNumber: z.number().int().min(1).optional(),
    title: z.string().min(1).max(180),
    sport: z.string().min(1).max(100),
    difficulty: SessionDifficultySchema,
    plannedDurationMinutes: z.number().int().min(1).max(240),
    durationSeconds: z.number().int().min(0).max(24 * 60 * 60),
    perceivedEffort: z.number().int().min(1).max(10),
    feedback: SessionFeedbackSchema,
    painNotes: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
    completedAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === 'workout' && !value.workoutId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workoutId'],
        message: "L'ID de la séance est requis",
      });
    }

    if (value.sourceType === 'workout') {
      for (const field of ['programId', 'programWeekNumber', 'programSessionNumber'] as const) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: "Ce champ n'est pas autorise pour une seance simple",
          });
        }
      }
    }

    if (value.sourceType === 'program_session') {
      if (value.workoutId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['workoutId'],
          message: "L'ID de seance simple n'est pas autorise pour une seance de programme",
        });
      }
      if (!value.programId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['programId'],
          message: "L'ID du programme est requis",
        });
      }

      if (!value.programWeekNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['programWeekNumber'],
          message: 'Le numéro de semaine est requis',
        });
      }

      if (!value.programSessionNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['programSessionNumber'],
          message: 'Le numéro de séance est requis',
        });
      }
    }
  });

export type SessionSourceType = z.infer<typeof SessionSourceTypeSchema>;
export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;
export type CreateSessionLogInput = z.infer<typeof CreateSessionLogInputSchema>;
