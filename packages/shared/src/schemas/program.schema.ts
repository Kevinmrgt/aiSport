import { z } from 'zod';
import { ExerciseSchema, PhaseSchema } from './workout.schema.js';

// Contrat JSON IA pour les programmes multi-semaines
// Chaque semaine est générée par un appel IA indépendant (budget token)

// Une séance dans un programme (même structure qu'un Workout, sans sport/difficulty redondants)
export const ProgramSessionSchema = z.object({
  session_number: z.number().int().min(1),
  title: z.string().min(1),
  focus: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  exercises: z.array(ExerciseSchema).min(1),
  warmup: z.array(PhaseSchema).optional(),
  cooldown: z.array(PhaseSchema).optional(),
});

// Une semaine dans un programme (retournée par chaque appel IA)
export const ProgramWeekSchema = z
  .object({
    week_number: z.number().int().min(1),
    theme: z.string().min(1),
    objective: z.string().min(1),
    sessions: z.array(ProgramSessionSchema).min(1),
  })
  .superRefine((week, ctx) => {
    const sessionNumbers = week.sessions.map((session) => session.session_number);
    const expectedNumbers = week.sessions.map((_, index) => index + 1);
    if (
      new Set(sessionNumbers).size !== sessionNumbers.length
      || sessionNumbers.some((number, index) => number !== expectedNumbers[index])
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sessions'],
        message: 'Les numeros de seance doivent etre uniques et consecutifs a partir de 1',
      });
    }
  });

// Programme complet stocké en JSONB (assemblé par le service après tous les appels IA)
export const TrainingProgramSchema = z
  .object({
    title: z.string().min(1),
    sport: z.string().min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    weeks_count: z.number().int().min(2).max(4),
    sessions_per_week: z.number().int().min(2).max(5),
    session_duration_minutes: z.number().int().min(20).max(60),
    progression_summary: z.string().min(1),
    weeks: z.array(ProgramWeekSchema).min(1),
  })
  .superRefine((program, ctx) => {
    if (program.weeks.length !== program.weeks_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weeks'],
        message: `Le programme doit contenir exactement ${program.weeks_count} semaines`,
      });
    }

    const weekNumbers = program.weeks.map((week) => week.week_number);
    if (
      new Set(weekNumbers).size !== weekNumbers.length
      || weekNumbers.some((number, index) => number !== index + 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weeks'],
        message: 'Les numeros de semaine doivent etre uniques et consecutifs a partir de 1',
      });
    }

    program.weeks.forEach((week, weekIndex) => {
      if (week.sessions.length !== program.sessions_per_week) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weeks', weekIndex, 'sessions'],
          message: `Chaque semaine doit contenir exactement ${program.sessions_per_week} seances`,
        });
      }

      week.sessions.forEach((session, sessionIndex) => {
        if (session.duration_minutes !== program.session_duration_minutes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['weeks', weekIndex, 'sessions', sessionIndex, 'duration_minutes'],
            message: `La duree annoncee doit etre de ${program.session_duration_minutes} minutes`,
          });
        }

        const phaseSeconds = [...(session.warmup ?? []), ...(session.cooldown ?? [])]
          .reduce((total, phase) => total + phase.duration_seconds, 0);
        const exerciseSeconds = session.exercises.reduce(
          (total, exercise) => total + (exercise.duration_seconds ?? 0) + exercise.rest_seconds,
          0,
        );
        const expectedSeconds = program.session_duration_minutes * 60;
        if (phaseSeconds + exerciseSeconds !== expectedSeconds) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['weeks', weekIndex, 'sessions', sessionIndex],
            message: `La duree detaillee doit etre exactement de ${expectedSeconds} secondes`,
          });
        }
      });
    });
  });

// Input utilisateur pour générer un programme
export const GenerateProgramInputSchema = z.object({
  sport: z.string().min(1).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  weeks_count: z.number().int().min(2).max(4),
  sessions_per_week: z.number().int().min(2).max(5),
  session_duration_minutes: z.number().int().min(20).max(60),
  goals: z.string().min(1).max(500),
  constraints: z.string().max(500).optional(),
});

export type ProgramSession = z.infer<typeof ProgramSessionSchema>;
export type ProgramWeek = z.infer<typeof ProgramWeekSchema>;
export type TrainingProgram = z.infer<typeof TrainingProgramSchema>;
export type GenerateProgramInput = z.infer<typeof GenerateProgramInputSchema>;
