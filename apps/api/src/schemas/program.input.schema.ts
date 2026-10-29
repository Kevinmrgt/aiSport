import { z } from 'zod';

// Schéma de validation HTTP pour la génération d'un programme (OWASP A04)
// Limites conservatrices : 4 semaines max, generees en parallele sous le timeout Vercel.
export const GenerateProgramRequestSchema = z.object({
  sport: z
    .string({
      error: (issue) =>
        issue.input === undefined ? 'Le sport est requis' : 'Le sport doit être un texte',
    })
    .min(1, 'Le sport ne peut pas être vide')
    .max(100, 'Le sport ne peut pas dépasser 100 caractères'),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    error: (issue) =>
      issue.input === undefined ? 'Le niveau est requis' : 'Le niveau est invalide',
  }),
  weeks_count: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Le nombre de semaines est requis'
          : 'Le nombre de semaines doit être un nombre',
    })
    .int('Le nombre de semaines doit être un nombre entier')
    .min(2, 'Le programme doit durer au moins 2 semaines')
    .max(4, 'Le programme ne peut pas dépasser 4 semaines'),
  sessions_per_week: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Le nombre de séances par semaine est requis'
          : 'Le nombre de séances par semaine doit être un nombre',
    })
    .int('Le nombre de séances par semaine doit être un nombre entier')
    .min(2, 'Il faut au moins 2 séances par semaine')
    .max(5, 'Il ne peut pas y avoir plus de 5 séances par semaine'),
  session_duration_minutes: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'La durée des séances est requise'
          : 'La durée des séances doit être un nombre',
    })
    .int('La durée des séances doit être un nombre entier')
    .min(20, 'Une séance doit durer au moins 20 minutes')
    .max(60, 'Une séance ne peut pas dépasser 60 minutes'),
  goals: z
    .string({
      error: (issue) =>
        issue.input === undefined ? 'L’objectif est requis' : 'L’objectif doit être un texte',
    })
    .min(1, 'L’objectif ne peut pas être vide')
    .max(500, 'L’objectif ne peut pas dépasser 500 caractères'),
  constraints: z
    .string({ error: 'Les contraintes doivent être un texte' })
    .max(500, 'Les contraintes ne peuvent pas dépasser 500 caractères')
    .optional(),
});
