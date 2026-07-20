import { z } from 'zod';

// Schéma Zod de validation des inputs HTTP (architecture.md — controller layer)
// OWASP A04: validation systématique côté serveur, jamais faire confiance au client

export const GenerateWorkoutRequestSchema = z.object({
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
  duration_minutes: z
    .number({
      required_error: 'La durée est requise',
      invalid_type_error: 'La durée doit être un nombre',
    })
    .int('La durée doit être un nombre entier')
    .min(15, 'La durée minimum est de 15 minutes')
    .max(180, 'La durée maximum est de 180 minutes'),
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

export type GenerateWorkoutRequest = z.infer<typeof GenerateWorkoutRequestSchema>;
