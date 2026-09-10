import { describe, expect, it } from 'vitest';
import {
  getSessionTiming,
  getSessionPrescriptionIssues,
  WorkoutSchema,
  type Prescription,
} from '@alcide/shared';
import { planSession, SessionPlanningError } from '../src/services/session-planner.service.js';

function strength(name = 'Pompes') {
  return {
    name,
    description: 'Mouvement contrôlé',
    tips: 'Expirez pendant la poussée',
    prescription: {
      version: 2,
      category: 'strength',
      mode: 'repetitions',
      sets: 3,
      reps: 10,
      work_seconds: 30,
      rest_seconds: 90,
      transition_seconds: 30,
    } satisfies Prescription,
  };
}
const phases = {
  warmup: [{ name: 'Marche active', description: 'Progressivement', duration_seconds: 180 }],
  cooldown: [{ name: 'Retour', description: 'Ralentir', duration_seconds: 120 }],
};

describe('composition des séances', () => {
  it('ne laisse pas une variante sans repos éliminer une solution valide', () => {
    const draft = {
      duration_minutes: 15,
      warmup: [{ ...phases.warmup[0]!, duration_seconds: 270 }],
      cooldown: [{ ...phases.cooldown[0]!, duration_seconds: 180 }],
      exercises: [
        {
          ...strength('Fentes'),
          prescription: {
            ...strength().prescription,
            sets: 1,
            rest_seconds: 30,
            transition_seconds: 0,
          },
        },
        {
          name: 'Pompes',
          description: 'Contrôle',
          prescription: {
            version: 2,
            category: 'strength',
            mode: 'interval',
            sets: 1,
            work_seconds: 60,
            rest_seconds: 0,
            transition_seconds: 0,
          } satisfies Prescription,
        },
        {
          name: 'Coordination',
          description: 'Souple',
          prescription: {
            version: 2,
            category: 'technique',
            mode: 'interval',
            sets: 12,
            work_seconds: 10,
            rest_seconds: 10,
            transition_seconds: 0,
          } satisfies Prescription,
        },
      ],
    };
    const result = planSession(draft, 'beginner');
    expect(getSessionPrescriptionIssues(result, 'beginner', 15)).toEqual([]);
    expect(result.exercises[1]!.prescription!.sets).toBe(1);
  });
  it('préserve les solutions de même durée dont le volume de force reste adapté', () => {
    const draft = {
      duration_minutes: 30,
      ...phases,
      exercises: [
        {
          name: 'Coordination',
          description: 'Souple',
          prescription: {
            version: 2,
            category: 'technique',
            mode: 'interval',
            sets: 1,
            work_seconds: 30,
            rest_seconds: 30,
            transition_seconds: 0,
          } satisfies Prescription,
        },
        ...Array.from({ length: 7 }, () => ({
          ...strength('Fentes'),
          prescription: { ...strength().prescription, rest_seconds: 30, transition_seconds: 0 },
        })),
      ],
    };
    const result = planSession(draft, 'beginner');
    expect(getSessionPrescriptionIssues(result, 'beginner', 30)).toEqual([]);
    expect(
      result.exercises.slice(1).reduce((n, ex) => n + ex.prescription!.sets, 0),
    ).toBeLessThanOrEqual(24);
  });
  it.each([15, 20, 30, 45, 55, 60])(
    'compose %imin de force sans toucher aux efforts ni aux repos',
    (duration_minutes) => {
      const exercises = Array.from(
        { length: duration_minutes <= 20 ? 3 : duration_minutes <= 30 ? 5 : 8 },
        (_, i) => strength(`Squats ${i + 1}`),
      );
      const draft = { duration_minutes, ...phases, exercises };
      const original = structuredClone(draft);
      const planned = planSession(draft, 'intermediate');
      const seconds = getSessionTiming(
        planned.exercises,
        planned.warmup,
        planned.cooldown,
      ).plannedSeconds;
      expect(seconds).toBeGreaterThanOrEqual(duration_minutes * 60 - 60);
      expect(seconds).toBeLessThanOrEqual(duration_minutes * 60);
      expect(
        planned.exercises.every(
          (ex) => ex.prescription?.work_seconds === 30 && ex.prescription.rest_seconds === 90,
        ),
      ).toBe(true);
      expect(
        planned.exercises.every(
          (ex) =>
            ex.description === 'Mouvement contrôlé' && ex.tips === 'Expirez pendant la poussée',
        ),
      ).toBe(true);
      expect(draft).toEqual(original);
      expect(getSessionPrescriptionIssues(planned, 'intermediate', duration_minutes)).toEqual([]);
    },
  );
  it.each([15, 20, 45, 55, 60, 90, 120, 180])(
    'compose %imin de cardio continu avec une durée naturelle',
    (duration_minutes) => {
      const cardio = {
        name: 'Footing',
        description: 'Allure confortable',
        prescription: {
          version: 2,
          category: 'cardio',
          mode: 'continuous',
          sets: 1,
          work_seconds: 600,
          rest_seconds: 0,
          transition_seconds: 0,
        } satisfies Prescription,
      };
      const result = planSession({ duration_minutes, exercises: [cardio], ...phases }, 'advanced');
      const total = getSessionTiming(
        result.exercises,
        result.warmup,
        result.cooldown,
      ).plannedSeconds;
      expect(total).toBeGreaterThanOrEqual(duration_minutes * 60 - 60);
      expect(total).toBeLessThanOrEqual(duration_minutes * 60);
      expect(result.exercises[0]?.prescription?.work_seconds % 60).toBe(0);
    },
  );
  it('refuse un créneau irréalisable plutôt que transformer deux pompes en blocs de 16min30', () => {
    const draft = { duration_minutes: 45, exercises: [strength(), strength('Squats')], ...phases };
    expect(() => planSession(draft, 'beginner')).toThrow(SessionPlanningError);
    expect(draft.exercises[0]?.prescription.work_seconds).toBe(30);
  });
  it('rejette 101s et les longues séries avant toute composition', () => {
    const invalid = strength();
    invalid.prescription.rest_seconds = 101;
    expect(() =>
      planSession({ duration_minutes: 20, exercises: [invalid], ...phases }, 'beginner'),
    ).toThrow(/repos/);
    invalid.prescription.rest_seconds = 90;
    invalid.prescription.work_seconds = 990;
    expect(() =>
      planSession({ duration_minutes: 20, exercises: [invalid], ...phases }, 'beginner'),
    ).toThrow(/effort/);
  });
  it('conserve un planning déjà valide et donne une projection de compatibilité exacte pour un circuit', () => {
    const circuit = ['Pompes', 'Squats', 'Fentes'].map((name, index) => ({
      ...strength(name),
      prescription: {
        ...strength(name).prescription,
        circuit_id: 1,
        sets: 4,
        rest_seconds: 30,
        transition_seconds: index === 2 ? 30 : 0,
      },
    }));
    const draft = { duration_minutes: 17, exercises: circuit, ...phases };
    const result = planSession(draft, 'beginner');
    expect(result.exercises.map((ex) => ex.prescription?.sets)).toEqual([4, 4, 4]);
    expect(
      result.exercises.reduce((sum, ex) => sum + (ex.duration_seconds ?? 0) + ex.rest_seconds, 300),
    ).toBe(1020);
    const again = planSession(
      {
        ...result,
        exercises: result.exercises.map((ex) => ({ ...ex, prescription: ex.prescription! })),
      },
      'beginner',
    );
    expect(again).toEqual(result);
    expect(
      WorkoutSchema.safeParse({
        ...result,
        title: 'Circuit',
        sport: 'musculation',
        difficulty: 'beginner',
      }).success,
    ).toBe(true);
  });
});
