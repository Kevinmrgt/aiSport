import { z } from 'zod';

// Schéma Zod de validation des inputs HTTP (architecture.md — controller layer)
// OWASP A04: validation systématique côté serveur, jamais faire confiance au client

export const GenerateWorkoutRequestSchema = z.object({
  sport: z
    .string()
    .min(1, 'Le sport ne peut pas être vide')
    .max(100, 'Le sport est trop long'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_minutes: z
    .number()
    .int('La durée doit être un entier')
    .min(15, 'La durée minimum est de 15 minutes')
    .max(180, 'La durée maximum est de 3 heures'),
  goals: z
    .string()
    .min(1, 'Décrivez au moins un objectif')
    .max(500, 'Les objectifs sont trop longs (max 500 caractères)'),
  constraints: z.string().max(500, 'Les contraintes sont trop longues').optional(),
});

export type GenerateWorkoutRequest = z.infer<typeof GenerateWorkoutRequestSchema>;
