import { describe, expect, it } from 'vitest';

import {
  CreateSessionLogInputSchema,
  GenerateProgramInputSchema,
  GenerateWorkoutInputSchema,
  ProgramWeekSchema,
  TrainingProgramSchema,
  WorkoutSchema,
} from '../src/index.js';

const exercise = {
  name: 'Course',
  description: 'Allure régulière',
  rest_seconds: 60,
  duration_seconds: 1_020,
};

const phase = {
  name: 'Échauffement',
  description: 'Mobilité progressive',
  duration_seconds: 60,
};

const programSession = (sessionNumber: number) => ({
  session_number: sessionNumber,
  title: `Séance ${sessionNumber}`,
  focus: 'Endurance',
  duration_minutes: 20,
  exercises: [exercise],
  warmup: [phase],
  cooldown: [phase],
});

const programWeek = (weekNumber: number) => ({
  week_number: weekNumber,
  theme: `Semaine ${weekNumber}`,
  objective: 'Progresser régulièrement',
  sessions: [programSession(1), programSession(2)],
});

const program = {
  title: 'Programme endurance',
  sport: 'Course à pied',
  difficulty: 'beginner' as const,
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 20,
  progression_summary: 'Deux semaines progressives',
  weeks: [programWeek(1), programWeek(2)],
};

const sessionLogBase = {
  title: 'Séance terminée',
  sport: 'Course à pied',
  difficulty: 'beginner' as const,
  plannedDurationMinutes: 20,
  durationSeconds: 1_200,
  perceivedEffort: 6,
  feedback: 'good' as const,
};

describe('WorkoutSchema', () => {
  it('accepte une séance dont la durée détaillée correspond à la durée annoncée', () => {
    expect(
      WorkoutSchema.safeParse({
        title: 'Séance endurance',
        sport: 'Course à pied',
        difficulty: 'beginner',
        duration_minutes: 20,
        exercises: [exercise],
        warmup: [phase],
        cooldown: [phase],
      }).success,
    ).toBe(true);
  });

  it('refuse une durée d’exercice absente et un total incohérent', () => {
    const result = WorkoutSchema.safeParse({
      title: 'Séance incomplète',
      sport: 'Course à pied',
      difficulty: 'beginner',
      duration_minutes: 20,
      exercises: [{ ...exercise, duration_seconds: undefined }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['exercises.0.duration_seconds', 'duration_minutes']),
      );
    }
  });
});

describe('schémas des entrées de génération', () => {
  it('valide les deux formulaires conformes', () => {
    expect(
      GenerateWorkoutInputSchema.safeParse({
        sport: 'Natation',
        level: 'intermediate',
        duration_minutes: 45,
        goals: 'Endurance',
        constraints: 'Sans matériel',
      }).success,
    ).toBe(true);
    expect(
      GenerateProgramInputSchema.safeParse({
        sport: 'Natation',
        level: 'advanced',
        weeks_count: 4,
        sessions_per_week: 5,
        session_duration_minutes: 60,
        goals: 'Préparer une compétition',
      }).success,
    ).toBe(true);
  });

  it('refuse les bornes et valeurs utilisateur invalides', () => {
    expect(
      GenerateWorkoutInputSchema.safeParse({
        sport: '',
        level: 'expert',
        duration_minutes: 14,
        goals: '',
      }).success,
    ).toBe(false);
    expect(
      GenerateProgramInputSchema.safeParse({
        sport: 'X'.repeat(101),
        level: 'beginner',
        weeks_count: 1,
        sessions_per_week: 6,
        session_duration_minutes: 61,
        goals: '',
        constraints: 'X'.repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe('schémas de programme', () => {
  it('accepte un programme cohérent', () => {
    expect(TrainingProgramSchema.safeParse(program).success).toBe(true);
  });

  it('refuse les numéros de séance dupliqués', () => {
    const week = programWeek(1);
    week.sessions[1] = programSession(1);
    expect(ProgramWeekSchema.safeParse(week).success).toBe(false);
  });

  it.each([
    ['nombre de semaines', { weeks: [programWeek(1)] }],
    ['numérotation des semaines', { weeks: [programWeek(1), programWeek(1)] }],
    [
      'nombre de séances',
      { weeks: [{ ...programWeek(1), sessions: [programSession(1)] }, programWeek(2)] },
    ],
    [
      'durée annoncée',
      {
        weeks: [
          {
            ...programWeek(1),
            sessions: [{ ...programSession(1), duration_minutes: 21 }, programSession(2)],
          },
          programWeek(2),
        ],
      },
    ],
    [
      'durée détaillée',
      {
        weeks: [
          {
            ...programWeek(1),
            sessions: [
              { ...programSession(1), exercises: [{ ...exercise, duration_seconds: 900 }] },
              programSession(2),
            ],
          },
          programWeek(2),
        ],
      },
    ],
  ])('refuse une incohérence de %s', (_label, override) => {
    expect(TrainingProgramSchema.safeParse({ ...program, ...override }).success).toBe(false);
  });
});

describe('CreateSessionLogInputSchema', () => {
  it('accepte une séance simple et une séance de programme cohérentes', () => {
    expect(
      CreateSessionLogInputSchema.safeParse({
        ...sessionLogBase,
        sourceType: 'workout',
        workoutId: '2a4d598f-48a7-4068-8219-49ac6660adaa',
      }).success,
    ).toBe(true);
    expect(
      CreateSessionLogInputSchema.safeParse({
        ...sessionLogBase,
        sourceType: 'program_session',
        programId: 'e1fdc5af-84fc-4114-8af6-046daadd5f0d',
        programWeekNumber: 1,
        programSessionNumber: 2,
      }).success,
    ).toBe(true);
  });

  it('refuse une séance simple sans identifiant et avec des champs programme', () => {
    const result = CreateSessionLogInputSchema.safeParse({
      ...sessionLogBase,
      sourceType: 'workout',
      programId: 'e1fdc5af-84fc-4114-8af6-046daadd5f0d',
      programWeekNumber: 1,
      programSessionNumber: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(4);
    }
  });

  it('refuse une séance de programme sans ses références ou liée à une séance simple', () => {
    const result = CreateSessionLogInputSchema.safeParse({
      ...sessionLogBase,
      sourceType: 'program_session',
      workoutId: '2a4d598f-48a7-4068-8219-49ac6660adaa',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(4);
    }
  });
});
