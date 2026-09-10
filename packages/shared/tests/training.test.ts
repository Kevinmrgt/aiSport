import { describe, expect, it } from 'vitest';
import { PrescriptionSchema, type Prescription } from '../src/schemas/prescription.schema.js';
import { WorkoutSchema, type Exercise } from '../src/schemas/workout.schema.js';
import { TrainingProgramSchema } from '../src/schemas/program.schema.js';
import { buildSessionSchedule, getSessionTiming } from '../src/training/schedule.js';
import { getPrescriptionIssues, getSessionPrescriptionIssues } from '../src/training/rules.js';

const prescription: Prescription = {
  version: 2,
  category: 'strength',
  mode: 'repetitions',
  sets: 3,
  reps: 10,
  work_seconds: 30,
  rest_seconds: 90,
  transition_seconds: 30,
};
const exercise = (changes: Partial<Prescription> = {}, name = 'Pompes'): Exercise => ({
  name,
  description: 'Gardez le corps aligné',
  tips: 'Expirez pendant la poussée',
  rest_seconds: changes.transition_seconds ?? 30,
  prescription: { ...prescription, ...changes },
});
const warmup = [{ name: 'Marche', description: 'Progressivement', duration_seconds: 180 }];
const cooldown = [{ name: 'Retour au calme', description: 'Ralentir', duration_seconds: 120 }];

describe('planning commun', () => {
  it('déroule chaque série, conserve les répétitions manuelles et compte les repos une seule fois', () => {
    const steps = buildSessionSchedule([exercise()], warmup, cooldown);
    expect(steps.map((step) => step.type)).toEqual([
      'warmup',
      'exercise',
      'rest',
      'exercise',
      'rest',
      'exercise',
      'transition',
      'cooldown',
    ]);
    expect(
      steps
        .filter((step) => step.type === 'exercise')
        .map((step) => [step.setNumber, step.reps, step.durationSeconds]),
    ).toEqual([
      [1, 10, null],
      [2, 10, null],
      [3, 10, null],
    ]);
    expect(getSessionTiming([exercise()], warmup, cooldown)).toEqual({
      plannedSeconds: 600,
      timedSeconds: 510,
      estimated: true,
    });
  });
  it('ordonne les circuits par tours et ne rajoute pas un dernier repos', () => {
    const exercises = [
      exercise({ circuit_id: 1, sets: 2, rest_seconds: 30, transition_seconds: 0 }),
      exercise({ circuit_id: 1, sets: 2, rest_seconds: 60, transition_seconds: 15 }, 'Squats'),
    ];
    const steps = buildSessionSchedule(exercises);
    expect(steps.filter((step) => step.type === 'exercise').map((step) => step.title)).toEqual([
      'Pompes',
      'Squats',
      'Pompes',
      'Squats',
    ]);
    expect(getSessionTiming(exercises).plannedSeconds).toBe(255);
    expect(
      steps.filter((step) => step.type === 'rest').map((step) => step.durationSeconds),
    ).toEqual([30, 60, 30]);
  });
  it('conserve le sens des anciennes durées sans multiplier des séries déjà agrégées', () => {
    const legacy = [
      {
        name: 'Pompes',
        description: 'Ancien contenu',
        sets: 3,
        reps: 12,
        duration_seconds: 200,
        rest_seconds: 101,
      },
    ];
    const original = structuredClone(legacy);
    expect(getSessionTiming(legacy).plannedSeconds).toBe(301);
    expect(buildSessionSchedule(legacy).filter((step) => step.type === 'exercise')).toHaveLength(1);
    expect(legacy).toEqual(original);
    expect(
      buildSessionSchedule([{ name: 'Libre', description: 'Au choix', rest_seconds: 0 }])[0]
        ?.durationSeconds,
    ).toBeNull();
  });
  it('supporte un intervalle chronométré et le cardio continu sans séries fantômes', () => {
    const timed = exercise(
      { category: 'cardio', mode: 'interval', reps: undefined, work_seconds: 60, sets: 2 },
      'Course',
    );
    expect(buildSessionSchedule([timed])[0]?.durationSeconds).toBe(60);
    const continuous = exercise(
      {
        category: 'cardio',
        mode: 'continuous',
        reps: undefined,
        work_seconds: 600,
        sets: 1,
        rest_seconds: 0,
        transition_seconds: 0,
      },
      'Footing',
    );
    expect(buildSessionSchedule([continuous])).toHaveLength(1);
    expect(getSessionTiming([continuous]).estimated).toBe(false);
  });
});

describe('prescriptions contrôlées', () => {
  it.each([
    { version: 1 },
    { category: 'unknown' },
    { mode: 'unknown' },
    { sets: 0 },
    { sets: 13 },
    { reps: 0 },
    { work_seconds: 0 },
    { rest_seconds: -1 },
    { transition_seconds: 61 },
    { circuit_id: 0 },
  ])('rejette une structure invalide %j', (patch) => {
    expect(PrescriptionSchema.safeParse({ ...prescription, ...patch }).success).toBe(false);
  });
  it.each([
    { rest_seconds: 101 },
    { work_seconds: 990 },
    { work_seconds: 31 },
    { reps: 25 },
    { reps: undefined },
    { work_seconds: 10 },
    { sets: 5 },
    { rest_seconds: 0 },
    { transition_seconds: 11 },
    { category: 'cardio', mode: 'continuous', work_seconds: 1800, sets: 1 },
    { mode: 'mobility' },
  ] as Partial<Prescription>[])('rejette une prescription incohérente %j', (patch) => {
    expect(getPrescriptionIssues(exercise(patch), 'beginner').length).toBeGreaterThan(0);
  });
  it('garde des limites distinctes selon le niveau et le mouvement', () => {
    const plank = exercise(
      { category: 'isometric', mode: 'interval', reps: undefined, work_seconds: 60 },
      'Gainage',
    );
    expect(getPrescriptionIssues(plank, 'beginner').length).toBeGreaterThan(0);
    expect(getPrescriptionIssues(plank, 'intermediate')).toEqual([]);
    expect(getPrescriptionIssues({ ...plank, name: 'Squat isométrique' }, 'intermediate')).toEqual(
      [],
    );
    const mobility = exercise(
      {
        category: 'mobility',
        mode: 'mobility',
        reps: undefined,
        work_seconds: 30,
        rest_seconds: 0,
      },
      'Mobilité des hanches',
    );
    expect(getPrescriptionIssues(mobility, 'beginner')).toEqual([]);
    const bike = exercise(
      {
        category: 'cardio',
        mode: 'continuous',
        reps: undefined,
        sets: 1,
        work_seconds: 600,
        rest_seconds: 0,
      },
      'Vélo statique',
    );
    expect(getPrescriptionIssues(bike, 'beginner')).toEqual([]);
    const sprint = exercise(
      { category: 'cardio', mode: 'interval', reps: undefined, work_seconds: 180 },
      'Sprint',
    );
    expect(getPrescriptionIssues(sprint, 'beginner').length).toBeGreaterThan(0);
    expect(
      getPrescriptionIssues({ name: 'Pompes', description: 'Test', rest_seconds: 0 }, 'beginner')
        .length,
    ).toBeGreaterThan(0);
  });
  it('rejette les circuits disjoints et incohérents', () => {
    const session = {
      exercises: [exercise({ circuit_id: 1 }), exercise(), exercise({ circuit_id: 1, sets: 2 })],
      warmup,
      cooldown,
    };
    expect(getSessionPrescriptionIssues(session, 'beginner', 20, false).join(' ')).toContain(
      'consécutifs',
    );
    const mismatched = {
      ...session,
      exercises: [exercise({ circuit_id: 1 }), exercise({ circuit_id: 1, sets: 2 })],
    };
    expect(getSessionPrescriptionIssues(mismatched, 'beginner', 20, false).join(' ')).toContain(
      'même nombre',
    );
    expect(getSessionPrescriptionIssues(mismatched, 'beginner', 20, false).join(' ')).toContain(
      'transition',
    );
  });
});

describe('contrats versionnés', () => {
  const continuous = exercise(
    {
      category: 'cardio',
      mode: 'continuous',
      reps: undefined,
      sets: 1,
      work_seconds: 900,
      rest_seconds: 0,
      transition_seconds: 0,
    },
    'Footing',
  );
  const workout = {
    planning_version: 2,
    title: 'Test',
    sport: 'course',
    difficulty: 'beginner',
    duration_minutes: 20,
    exercises: [continuous],
    warmup,
    cooldown,
  };
  it('valide le vrai planning et refuse les efforts trop longs même si le total tombe juste', () => {
    expect(WorkoutSchema.safeParse(workout).success).toBe(true);
    expect(
      WorkoutSchema.safeParse({ ...workout, exercises: [exercise({ work_seconds: 300 })] }).success,
    ).toBe(false);
    expect(WorkoutSchema.safeParse({ ...workout, duration_minutes: 30 }).success).toBe(false);
    expect(WorkoutSchema.safeParse({ ...workout, duration_minutes: 19 }).success).toBe(false);
    expect(WorkoutSchema.safeParse({ ...workout, duration_minutes: 21 }).success).toBe(true);
    expect(WorkoutSchema.safeParse({ ...workout, planning_version: undefined }).success).toBe(
      false,
    );
    expect(
      WorkoutSchema.safeParse({
        ...workout,
        exercises: [{ ...continuous, sets: 99, duration_seconds: 1 }],
      }).success,
    ).toBe(false);
  });
  it('valide chaque séance de programme avec les mêmes règles', () => {
    const program = {
      planning_version: 2,
      title: 'Programme',
      sport: 'course',
      difficulty: 'beginner',
      weeks_count: 2,
      sessions_per_week: 2,
      session_duration_minutes: 20,
      progression_summary: 'Progressivement',
      weeks: [1, 2].map((week_number) => ({
        week_number,
        theme: 'Endurance',
        objective: 'Régularité',
        sessions: [1, 2].map((session_number) => ({ ...workout, session_number, focus: 'Course' })),
      })),
    };
    expect(TrainingProgramSchema.safeParse(program).success).toBe(true);
    program.weeks[0]!.sessions[0]!.exercises = [exercise({ work_seconds: 900 })];
    expect(TrainingProgramSchema.safeParse(program).success).toBe(false);
  });
});
