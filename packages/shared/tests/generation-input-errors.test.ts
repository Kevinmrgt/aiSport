import { describe, expect, it } from 'vitest';
import { GenerateProgramInputSchema, GenerateWorkoutInputSchema } from '../src/index.js';

const workout = { sport: 'course', level: 'beginner', duration_minutes: 30, goals: 'Endurance' };
const program = {
  sport: 'fitness',
  level: 'beginner',
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 20,
  goals: 'Reprendre progressivement',
};

describe('generation input contract after Zod migration', () => {
  for (const [name, schema, fixture, fields] of [
    [
      'workout',
      GenerateWorkoutInputSchema,
      workout,
      ['sport', 'level', 'duration_minutes', 'goals'],
    ],
    [
      'program',
      GenerateProgramInputSchema,
      program,
      ['sport', 'level', 'weeks_count', 'sessions_per_week', 'session_duration_minutes', 'goals'],
    ],
  ] as const) {
    for (const field of fields) {
      it(`${name}: rejects a missing or wrongly typed ${field} with a field message`, () => {
        for (const value of [undefined, null, {}]) {
          const result = schema.safeParse({ ...fixture, [field]: value });
          expect(result.success).toBe(false);
          if (!result.success) {
            const issue = result.error.issues.find((candidate) => candidate.path[0] === field);
            expect(issue?.message).toBeTruthy();
            expect(issue?.message).not.toContain('Invalid input');
          }
        }
      });
    }
    it(`${name}: rejects invalid optional constraints and oversized free text`, () => {
      for (const constraints of [false, 'x'.repeat(501)]) {
        expect(schema.safeParse({ ...fixture, constraints }).success).toBe(false);
      }
      expect(schema.safeParse({ ...fixture, constraints: '' }).success).toBe(true);
      expect(schema.safeParse({ ...fixture, goals: 'x'.repeat(501) }).success).toBe(false);
    });
  }
});
