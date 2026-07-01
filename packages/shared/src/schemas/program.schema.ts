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
export const ProgramWeekSchema = z.object({
  week_number: z.number().int().min(1),
  theme: z.string().min(1),
  objective: z.string().min(1),
  sessions: z.array(ProgramSessionSchema).min(1),
});

// Programme complet stocké en JSONB (assemblé par le service après tous les appels IA)
export const TrainingProgramSchema = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  weeks_count: z.number().int().min(2).max(4),
  sessions_per_week: z.number().int().min(2).max(5),
  session_duration_minutes: z.number().int().min(20).max(60),
  progression_summary: z.string().min(1),
  weeks: z.array(ProgramWeekSchema).min(1),
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
