import { z } from 'zod';

// Schéma Zod de validation des inputs HTTP (architecture.md — controller layer)
// OWASP A04: validation systématique côté serveur, jamais faire confiance au client

export const GenerateWorkoutRequestSchema = z.object({
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
  duration_minutes: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'La durée est requise' : 'La durée doit être un nombre',
    })
    .int('La durée doit être un nombre entier')
    .min(15, 'La durée minimum est de 15 minutes')
    .max(180, 'La durée maximum est de 180 minutes'),
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

export type GenerateWorkoutRequest = z.infer<typeof GenerateWorkoutRequestSchema>;
