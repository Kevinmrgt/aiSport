import { z } from 'zod';

// Schéma de validation HTTP pour la génération d'un programme (OWASP A04)
// Limites conservatrices : 4 semaines max, generees en parallele sous le timeout Vercel.
export const GenerateProgramRequestSchema = z.object({
  sport: z
    .string({
      required_error: 'Le sport est requis',
      invalid_type_error: 'Le sport doit être un texte',
    })
    .min(1, 'Le sport ne peut pas être vide')
    .max(100, 'Le sport ne peut pas dépasser 100 caractères'),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Le niveau est requis',
    invalid_type_error: 'Le niveau est invalide',
  }),
  weeks_count: z
    .number({
      required_error: 'Le nombre de semaines est requis',
      invalid_type_error: 'Le nombre de semaines doit être un nombre',
    })
    .int('Le nombre de semaines doit être un nombre entier')
    .min(2, 'Le programme doit durer au moins 2 semaines')
    .max(4, 'Le programme ne peut pas dépasser 4 semaines'),
  sessions_per_week: z
    .number({
      required_error: 'Le nombre de séances par semaine est requis',
      invalid_type_error: 'Le nombre de séances par semaine doit être un nombre',
    })
    .int('Le nombre de séances par semaine doit être un nombre entier')
    .min(2, 'Il faut au moins 2 séances par semaine')
    .max(5, 'Il ne peut pas y avoir plus de 5 séances par semaine'),
  session_duration_minutes: z
    .number({
      required_error: 'La durée des séances est requise',
      invalid_type_error: 'La durée des séances doit être un nombre',
    })
    .int('La durée des séances doit être un nombre entier')
    .min(20, 'Une séance doit durer au moins 20 minutes')
    .max(60, 'Une séance ne peut pas dépasser 60 minutes'),
  goals: z
    .string({
      required_error: 'L’objectif est requis',
      invalid_type_error: 'L’objectif doit être un texte',
    })
    .min(1, 'L’objectif ne peut pas être vide')
    .max(500, 'L’objectif ne peut pas dépasser 500 caractères'),
  constraints: z
    .string({ invalid_type_error: 'Les contraintes doivent être un texte' })
    .max(500, 'Les contraintes ne peuvent pas dépasser 500 caractères')
    .optional(),
});
