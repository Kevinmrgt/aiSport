import { describe, expect, it } from 'vitest';
import {
  CreateSessionLogInputSchema,
  TrainingProgramSchema,
  WorkoutSchema,
} from '@alcide/shared';

function programSession(sessionNumber: number) {
  return {
    session_number: sessionNumber,
    title: `Seance ${sessionNumber}`,
    focus: 'Endurance',
    duration_minutes: 30,
    exercises: [{
      name: 'Course',
      description: 'Courir',
      duration_seconds: 1_800,
      rest_seconds: 0,
    }],
  };
}

function validProgram() {
  return {
    title: 'Programme coherent',
    sport: 'course',
    difficulty: 'beginner' as const,
    weeks_count: 2,
    sessions_per_week: 2,
    session_duration_minutes: 30,
    progression_summary: 'Progression controlee',
    weeks: [1, 2].map((weekNumber) => ({
      week_number: weekNumber,
      theme: `Semaine ${weekNumber}`,
      objective: 'Progresser',
      sessions: [programSession(1), programSession(2)],
    })),
  };
}

describe('contrats metier partages', () => {
  it("accepte une seance dont le detail correspond exactement a la duree annoncee", () => {
    const result = WorkoutSchema.safeParse({
      title: 'Seance coherente',
      sport: 'course',
      difficulty: 'beginner',
      duration_minutes: 30,
      warmup: [{ name: 'Echauffement', description: 'Bouger', duration_seconds: 300 }],
      exercises: [{
        name: 'Course',
        description: 'Courir',
        duration_seconds: 1_440,
        rest_seconds: 60,
      }],
    });

    expect(result.success).toBe(true);
  });

  it('refuse une seance dont la duree detaillee est incoherente', () => {
    const result = WorkoutSchema.safeParse({
      title: 'Seance incoherente',
      sport: 'course',
      difficulty: 'beginner',
      duration_minutes: 30,
      exercises: [{
        name: 'Course',
        description: 'Courir',
        duration_seconds: 600,
        rest_seconds: 60,
      }],
    });

    expect(result.success).toBe(false);
  });

  it('accepte une seance de force en repetitions avec un budget temps explicite', () => {
    const result = WorkoutSchema.safeParse({
      title: 'Force minutee',
      sport: 'musculation',
      difficulty: 'intermediate',
      duration_minutes: 45,
      warmup: [{ name: 'Mobilite', description: 'Mobiliser', duration_seconds: 120 }],
      exercises: [{
        name: 'Developpe couche',
        description: 'Effectuer les series dans le budget temps',
        sets: 4,
        reps: '8-10',
        duration_seconds: 2_400,
        rest_seconds: 120,
      }],
      cooldown: [{ name: 'Retour au calme', description: 'Respirer', duration_seconds: 60 }],
    });

    expect(result.success).toBe(true);
  });

  it('refuse un programme qui ne respecte pas le nombre et les numeros demandes', () => {
    const program = validProgram();
    program.weeks = [{
      week_number: 99,
      theme: 'Invalide',
      objective: 'Invalide',
      sessions: [programSession(99)],
    }];

    expect(TrainingProgramSchema.safeParse(program).success).toBe(false);
  });

  it('accepte un programme complet aux durees et numeros coherents', () => {
    expect(TrainingProgramSchema.safeParse(validProgram()).success).toBe(true);
  });

  it('refuse de melanger une seance simple et une reference de programme', () => {
    const result = CreateSessionLogInputSchema.safeParse({
      sourceType: 'workout',
      workoutId: '22222222-2222-4222-8222-222222222222',
      programId: '33333333-3333-4333-8333-333333333333',
      title: 'Seance',
      sport: 'course',
      difficulty: 'beginner',
      plannedDurationMinutes: 30,
      durationSeconds: 1_800,
      perceivedEffort: 5,
      feedback: 'good',
    });

    expect(result.success).toBe(false);
  });
});
