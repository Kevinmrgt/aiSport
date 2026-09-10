import { describe, expect, it } from 'vitest';
import {
  getSessionTiming,
  getSessionPrescriptionIssues,
  getSessionDurationBounds,
  WorkoutSchema,
  type Prescription,
} from '@alcide/shared';
import {
  DraftExerciseSchema,
  correctionFeedback,
  generationDiagnostics,
  planSession,
  SessionPlanningError,
} from '../src/services/session-planner.service.js';

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
  it('réserve le diagnostic de correction à toutes les séances sans publier les noms des exercices', () => {
    const error = new SessionPlanningError([
      ...Array.from(
        { length: 10 },
        () => 'Séance 1 : Mouvement personnel : repos hors des paliers autorisés',
      ),
      'Séance 2 : Autre mouvement privé : effort trop long',
    ]);
    const feedback = correctionFeedback(error, '{}');
    expect(feedback).toContain('Séance 1');
    expect(feedback).toContain('Séance 2');
    const logged = JSON.stringify(generationDiagnostics(error));
    expect(logged).not.toContain('Mouvement personnel');
    expect(logged).not.toContain('mouvement privé');
  });
  const boxing = (name: string, sets = 3, work_seconds = 180) => ({
    name,
    description: 'Technique contrôlée',
    prescription: {
      version: 2,
      category: 'technique',
      mode: 'interval',
      sets,
      work_seconds,
      rest_seconds: 60,
      transition_seconds: 30,
    } satisfies Prescription,
  });
  const boxingPhases = {
    warmup: [{ ...phases.warmup[0]!, duration_seconds: 600 }],
    cooldown: [{ ...phases.cooldown[0]!, duration_seconds: 300 }],
  };
  it('accepte null uniquement pour les champs facultatifs du brouillon', () => {
    const draft = {
      ...boxing('Sac'),
      tips: null,
      prescription: { ...boxing('Sac').prescription, reps: null, circuit_id: null },
    };
    const parsed = DraftExerciseSchema.parse(draft);
    expect(parsed.tips).toBeUndefined();
    expect(parsed.prescription.reps).toBeUndefined();
    expect(parsed.prescription.circuit_id).toBeUndefined();
    expect(
      DraftExerciseSchema.safeParse({
        ...draft,
        prescription: { ...draft.prescription, sets: null },
      }).success,
    ).toBe(false);
    expect(() =>
      planSession(
        {
          duration_minutes: 15,
          ...phases,
          exercises: [
            { ...strength(), prescription: { ...strength().prescription, reps: undefined } },
          ],
        },
        'intermediate',
      ),
    ).toThrow(/répétitions/);
  });
  it('accepte 61min pour une cible de 60min sans modifier les rounds ni les phases', () => {
    const draft = {
      duration_minutes: 60,
      ...boxingPhases,
      exercises: ['Sac direct', 'Sac crochet', 'Shadowboxing', 'Déplacements'].map((name) =>
        boxing(name),
      ),
    };
    const original = structuredClone(draft);
    const result = planSession(draft, 'intermediate');
    expect(getSessionTiming(result.exercises, result.warmup, result.cooldown).plannedSeconds).toBe(
      3660,
    );
    expect(result.exercises.map((ex) => ex.prescription)).toEqual(
      draft.exercises.map((ex) => ex.prescription),
    );
    expect(getSessionPrescriptionIssues(result, 'intermediate', 60)).toEqual([]);
    expect(draft).toEqual(original);
    expect(result.warmup.map((phase) => phase.name)).toEqual(
      draft.warmup.map((phase) => phase.name),
    );
    expect(
      planSession(
        {
          ...result,
          exercises: result.exercises.map((ex) => ({ ...ex, prescription: ex.prescription! })),
        },
        'intermediate',
      ),
    ).toEqual(result);
  });
  it.each([120, 150])('limite à 120s le raccourcissement des phases (%is requises)', (overrun) => {
    const draft = {
      duration_minutes: 60,
      warmup: [{ ...phases.warmup[0]!, duration_seconds: 900 + overrun }],
      cooldown: boxingPhases.cooldown,
      exercises: ['Sac', 'Shadowboxing', 'Déplacements', 'Esquives'].map((name) => boxing(name)),
    };
    if (overrun > 120)
      expect(() => planSession(draft, 'intermediate')).toThrow(SessionPlanningError);
    else {
      const result = planSession(draft, 'intermediate');
      expect(result.warmup[0]!.duration_seconds).toBe(900);
      expect(getSessionPrescriptionIssues(result, 'intermediate', 60)).toEqual([]);
    }
  });
  it('raccourcit aussi une phase légèrement au-dessus du ratio, sans modifier le minimum', () => {
    const draft = {
      duration_minutes: 15,
      warmup: [{ ...phases.warmup[0]!, duration_seconds: 300 }],
      cooldown: phases.cooldown,
      exercises: [
        {
          name: 'Footing',
          description: 'Souple',
          prescription: {
            version: 2,
            category: 'cardio',
            mode: 'continuous',
            sets: 2,
            work_seconds: 480,
            rest_seconds: 0,
            transition_seconds: 0,
          } satisfies Prescription,
        },
      ],
    };
    const result = planSession(draft, 'beginner');
    expect(result.warmup[0]!.duration_seconds).toBe(270);
    expect(result.exercises[0]!.prescription!.sets).toBe(1);
    expect(getSessionPrescriptionIssues(result, 'beginner', 15)).toEqual([]);
  });
  it('réduit les séries excessives avant de vérifier les plafonds finaux', () => {
    const draft = {
      duration_minutes: 60,
      ...boxingPhases,
      exercises: [
        boxing('Sac', 6),
        boxing('Shadowboxing', 4, 120),
        { ...strength(), prescription: { ...strength().prescription, sets: 6 } },
      ],
    };
    const result = planSession(draft, 'intermediate');
    expect(result.exercises[2]!.prescription!.sets).toBe(5);
    expect(getSessionTiming(result.exercises, result.warmup, result.cooldown).plannedSeconds).toBe(
      3540,
    );
    expect(result.warmup).toEqual(draft.warmup);
    expect(result.cooldown).toEqual(draft.cooldown);
    expect(getSessionPrescriptionIssues(result, 'intermediate', 60)).toEqual([]);
  });
  it('réduit aussi un volume total initial excessif sans relâcher la limite finale', () => {
    const draft = {
      duration_minutes: 25,
      ...phases,
      exercises: Array.from({ length: 7 }, () => ({
        ...strength(),
        prescription: {
          ...strength().prescription,
          sets: 4,
          rest_seconds: 30,
          transition_seconds: 0,
        },
      })),
    };
    const result = planSession(draft, 'beginner');
    expect(getSessionPrescriptionIssues(result, 'beginner', 25)).toEqual([]);
    expect(
      result.exercises.reduce((sum, ex) => sum + ex.prescription!.sets, 0),
    ).toBeLessThanOrEqual(24);
  });
  it('ne raccourcit pas les phases sous leurs minima pour conserver des rounds', () => {
    const draft = {
      duration_minutes: 60,
      ...phases,
      exercises: [boxing('Sac', 12), boxing('Shadowboxing', 4)],
    };
    const result = planSession(draft, 'intermediate');
    expect(result.warmup).toEqual(draft.warmup);
    expect(result.cooldown).toEqual(draft.cooldown);
    expect(getSessionPrescriptionIssues(result, 'intermediate', 60)).toEqual([]);
  });
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
      expect(seconds).toBeGreaterThanOrEqual(getSessionDurationBounds(duration_minutes).minSeconds);
      expect(seconds).toBeLessThanOrEqual(getSessionDurationBounds(duration_minutes).maxSeconds);
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
      expect(total).toBeGreaterThanOrEqual(getSessionDurationBounds(duration_minutes).minSeconds);
      expect(total).toBeLessThanOrEqual(getSessionDurationBounds(duration_minutes).maxSeconds);
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
  it('canonise les transitions internes inutilisées sans toucher aux repos du circuit', () => {
    const exercises = ['Pompes', 'Squats', 'Fentes'].map((name) => ({
      ...strength(name),
      prescription: {
        ...strength().prescription,
        sets: 4,
        circuit_id: 1,
        rest_seconds: 30,
        transition_seconds: 30,
      },
    }));
    const draft = { duration_minutes: 17, ...phases, exercises };
    const original = structuredClone(draft);
    const result = planSession(draft, 'beginner');
    expect(result.exercises.map((ex) => ex.prescription!.transition_seconds)).toEqual([0, 0, 30]);
    expect(result.exercises.map((ex) => ex.prescription!.rest_seconds)).toEqual([30, 30, 30]);
    expect(getSessionTiming(result.exercises, result.warmup, result.cooldown).plannedSeconds).toBe(
      1020,
    );
    expect(draft).toEqual(original);
  });
});
