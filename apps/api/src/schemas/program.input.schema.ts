import { z } from 'zod';

// Schéma de validation HTTP pour la génération d'un programme (OWASP A04)
// Limites conservatrices : 4 semaines max, generees en parallele sous le timeout Vercel.
export const GenerateProgramRequestSchema = z.object({
  sport: z.string().min(1).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  weeks_count: z.number().int().min(2).max(4),
  sessions_per_week: z.number().int().min(2).max(5),
  session_duration_minutes: z.number().int().min(20).max(60),
  goals: z.string().min(1).max(500),
  constraints: z.string().max(500).optional(),
});
