import { describe, expect, it } from 'vitest';
import { getSessionTiming, WorkoutSchema } from '@alcide/shared';
import { sessionDurationBudget } from '../src/services/session-duration-policy.js';
import { workoutOutputSchema, weekOutputSchema } from '../src/services/training-output-schema.js';
import { DraftWorkoutSchema, planSession } from '../src/services/session-planner.service.js';

interface Schema {
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  enum?: unknown[];
}
const input = { sport: 'marche', level: 'advanced' as const, goals: 'Endurance générale' };

describe('one temporal budget for the complete generated session', () => {
  it.each([15, 20, 60, 180])(
    'keeps %i-minute provider bounds compatible with the actual v2 validator',
    (minutes) => {
      const budget = sessionDurationBudget(minutes, input.level);
      const schema = workoutOutputSchema({ ...input, duration_minutes: minutes }).schema as Schema;
      const exerciseArray = schema.properties!['exercises']!;
      const variants = exerciseArray.items!.properties!['prescription']!.anyOf!;
      const continuous = variants.find(
        (variant) => variant.properties!['mode']!.enum?.[0] === 'continuous',
      )!;
      expect(exerciseArray.maxItems).toBe(16);
      expect(variants).toHaveLength(7);
      expect(continuous.properties!['work_seconds']!.minimum).toBe(300);
      expect(continuous.properties!['work_seconds']!.maximum).toBe(budget.continuousMaximumSeconds);
      const warmup = { name: 'Préparation', description: 'Progressivement', duration_seconds: 180 };
      const cooldown = { name: 'Retour', description: 'Progressivement', duration_seconds: 120 };
      const workSeconds = minutes * 60 - 300;
      const draft = DraftWorkoutSchema.parse({
        title: 'Marche',
        sport: 'marche',
        difficulty: 'advanced',
        duration_minutes: minutes,
        warmup: [warmup],
        cooldown: [cooldown],
        exercises: [
          {
            name: 'Marche confortable',
            description: 'Allure confortable',
            tips: null,
            prescription: {
              version: 2,
              category: 'cardio',
              mode: 'continuous',
              sets: 1,
              reps: null,
              work_seconds: workSeconds,
              rest_seconds: 0,
              transition_seconds: 0,
              circuit_id: null,
            },
          },
        ],
      });
      const planned = planSession(draft, 'advanced');
      expect(WorkoutSchema.safeParse(planned).success).toBe(true);
      expect(
        getSessionTiming(planned.exercises, planned.warmup, planned.cooldown).plannedSeconds,
      ).toBe(minutes * 60);
      expect(workSeconds).toBeLessThanOrEqual(budget.continuousMaximumSeconds);
    },
  );

  it('limits continuous blocks by feasibility while preserving sixteen movements for other modes', () => {
    expect(sessionDurationBudget(15, 'beginner')).toMatchObject({
      phaseMinimumSeconds: 300,
      movementMaximumSeconds: 690,
      continuousMaximumCount: 2,
      continuousMaximumSeconds: 660,
    });
    expect(sessionDurationBudget(20, 'beginner').continuousMaximumCount).toBe(3);
    expect(sessionDurationBudget(180, 'beginner').continuousMaximumSeconds).toBe(3600);
    const planned = planSession(
      DraftWorkoutSchema.parse({
        title: 'Intervalles',
        sport: 'marche',
        difficulty: 'beginner',
        duration_minutes: 15,
        warmup: [{ name: 'Préparation', description: 'Progressivement', duration_seconds: 180 }],
        cooldown: [{ name: 'Retour', description: 'Progressivement', duration_seconds: 120 }],
        exercises: Array.from({ length: 3 }, (_, index) => ({
          name: `Marche variée ${index}`,
          description: 'Allure confortable',
          prescription: {
            version: 2,
            category: 'cardio',
            mode: 'interval',
            sets: 4,
            reps: null,
            work_seconds: 30,
            rest_seconds: 30,
            transition_seconds: 0,
            circuit_id: null,
          },
          tips: null,
        })),
      }),
      'beginner',
    );
    expect(planned.exercises).toHaveLength(3);
    expect(WorkoutSchema.safeParse(planned).success).toBe(true);
  });

  it('uses only ordinary provider schema bounds and descriptions, without conditional constraints', () => {
    const schema = weekOutputSchema(
      { ...input, weeks_count: 2, sessions_per_week: 2, session_duration_minutes: 20 },
      1,
    ).schema;
    const forbidden = new Set([
      'if',
      'then',
      'else',
      'contains',
      'minContains',
      'maxContains',
      'prefixItems',
      'dependentSchemas',
    ]);
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        expect(forbidden.has(key)).toBe(false);
        visit(child);
      }
    };
    visit(schema);
  });
});
