import { describe, expect, it } from 'vitest';
import { GenerateProgramInputSchema, GenerateWorkoutInputSchema } from '@alcide/shared';
import { GenerateProgramRequestSchema } from '../src/schemas/program.input.schema.js';
import { GenerateWorkoutRequestSchema } from '../src/schemas/workout.input.schema.js';

type InputSchema = {
  safeParse: (
    input: unknown,
  ) =>
    | { success: true }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
};

function messageFor(schema: InputSchema, input: unknown, field: string): string | undefined {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

const validWorkout = {
  sport: 'course',
  level: 'beginner',
  duration_minutes: 30,
  goals: 'Améliorer mon endurance',
  constraints: '',
};

const validProgram = {
  sport: 'course',
  level: 'beginner',
  weeks_count: 3,
  sessions_per_week: 3,
  session_duration_minutes: 30,
  goals: 'Améliorer mon endurance',
  constraints: '',
};

describe.each([
  ['partagé', GenerateWorkoutInputSchema],
  ['HTTP', GenerateWorkoutRequestSchema],
])('validation française de la génération de séance — schéma %s', (_name, schema) => {
  it.each([
    ['sport', '', 'Le sport ne peut pas être vide'],
    ['sport', 's'.repeat(101), 'Le sport ne peut pas dépasser 100 caractères'],
    ['duration_minutes', 14, 'La durée minimum est de 15 minutes'],
    ['duration_minutes', 181, 'La durée maximum est de 180 minutes'],
    ['duration_minutes', 30.5, 'La durée doit être un nombre entier'],
    ['goals', '', 'L’objectif ne peut pas être vide'],
    ['goals', 'o'.repeat(501), 'L’objectif ne peut pas dépasser 500 caractères'],
    ['constraints', 'c'.repeat(501), 'Les contraintes ne peuvent pas dépasser 500 caractères'],
  ])('retourne un message français pour la limite de %s', (field, value, expected) => {
    expect(messageFor(schema, { ...validWorkout, [field]: value }, field)).toBe(expected);
  });

  it.each([
    ['sport', 'Le sport est requis'],
    ['level', 'Le niveau est requis'],
    ['duration_minutes', 'La durée est requise'],
    ['goals', 'L’objectif est requis'],
  ])('retourne un message français si %s est absent', (field, expected) => {
    const input: Record<string, unknown> = { ...validWorkout };
    delete input[field];
    expect(messageFor(schema, input, field)).toBe(expected);
  });
});

describe.each([
  ['partagé', GenerateProgramInputSchema],
  ['HTTP', GenerateProgramRequestSchema],
])('validation française de la génération de programme — schéma %s', (_name, schema) => {
  it.each([
    ['sport', '', 'Le sport ne peut pas être vide'],
    ['sport', 's'.repeat(101), 'Le sport ne peut pas dépasser 100 caractères'],
    ['weeks_count', 1, 'Le programme doit durer au moins 2 semaines'],
    ['weeks_count', 5, 'Le programme ne peut pas dépasser 4 semaines'],
    ['weeks_count', 2.5, 'Le nombre de semaines doit être un nombre entier'],
    ['sessions_per_week', 1, 'Il faut au moins 2 séances par semaine'],
    ['sessions_per_week', 6, 'Il ne peut pas y avoir plus de 5 séances par semaine'],
    ['sessions_per_week', 2.5, 'Le nombre de séances par semaine doit être un nombre entier'],
    ['session_duration_minutes', 19, 'Une séance doit durer au moins 20 minutes'],
    ['session_duration_minutes', 61, 'Une séance ne peut pas dépasser 60 minutes'],
    ['session_duration_minutes', 20.5, 'La durée des séances doit être un nombre entier'],
    ['goals', '', 'L’objectif ne peut pas être vide'],
    ['goals', 'o'.repeat(501), 'L’objectif ne peut pas dépasser 500 caractères'],
    ['constraints', 'c'.repeat(501), 'Les contraintes ne peuvent pas dépasser 500 caractères'],
  ])('retourne un message français pour la limite de %s', (field, value, expected) => {
    expect(messageFor(schema, { ...validProgram, [field]: value }, field)).toBe(expected);
  });

  it.each([
    ['sport', 'Le sport est requis'],
    ['level', 'Le niveau est requis'],
    ['weeks_count', 'Le nombre de semaines est requis'],
    ['sessions_per_week', 'Le nombre de séances par semaine est requis'],
    ['session_duration_minutes', 'La durée des séances est requise'],
    ['goals', 'L’objectif est requis'],
  ])('retourne un message français si %s est absent', (field, expected) => {
    const input: Record<string, unknown> = { ...validProgram };
    delete input[field];
    expect(messageFor(schema, input, field)).toBe(expected);
  });
});
