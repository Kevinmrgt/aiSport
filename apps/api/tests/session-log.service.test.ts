import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOwnedSessionLog } from '../src/services/session-log.service.js';
import { createSessionLog } from '../src/repositories/session-log.repository.js';
import { findWorkoutById } from '../src/repositories/workout.repository.js';
import { findProgramById } from '../src/repositories/program.repository.js';

vi.mock('../src/repositories/session-log.repository.js', () => ({
  createSessionLog: vi.fn(),
}));
vi.mock('../src/repositories/workout.repository.js', () => ({
  findWorkoutById: vi.fn(),
}));
vi.mock('../src/repositories/program.repository.js', () => ({
  findProgramById: vi.fn(),
}));

const userId = '11111111-1111-4111-8111-111111111111';
const workoutId = '22222222-2222-4222-8222-222222222222';
const programId = '33333333-3333-4333-8333-333333333333';
const baseInput = {
  title: 'Titre envoye par le client',
  sport: 'sport falsifie',
  difficulty: 'advanced' as const,
  plannedDurationMinutes: 240,
  completedAt: new Date('2026-07-20T10:00:00.000Z'),
  durationSeconds: 1_800,
  perceivedEffort: 6,
  feedback: 'good' as const,
};

describe('createOwnedSessionLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSessionLog).mockImplementation((ownerId, input) => Promise.resolve({
      id: '44444444-4444-4444-8444-444444444444',
      userId: ownerId,
      sourceType: input.sourceType,
      workoutId: input.workoutId ?? null,
      programId: input.programId ?? null,
      programWeekNumber: input.programWeekNumber ?? null,
      programSessionNumber: input.programSessionNumber ?? null,
      title: input.title,
      sport: input.sport,
      difficulty: input.difficulty,
      plannedDurationMinutes: input.plannedDurationMinutes,
      completedAt: input.completedAt,
      durationSeconds: input.durationSeconds,
      perceivedEffort: input.perceivedEffort,
      feedback: input.feedback,
      painNotes: null,
      notes: null,
      createdAt: new Date('2026-07-20T10:01:00.000Z'),
    }));
  });

  it("verifie l'appartenance d'une seance et utilise ses metadonnees de confiance", async () => {
    vi.mocked(findWorkoutById).mockResolvedValue({
      id: workoutId,
      userId,
      title: 'Seance officielle',
      sport: 'course',
      difficulty: 'beginner',
      durationMinutes: 30,
      data: {
        title: 'Seance officielle',
        sport: 'course',
        difficulty: 'beginner',
        duration_minutes: 30,
        exercises: [{
          name: 'Course',
          description: 'Courir',
          duration_seconds: 1_800,
          rest_seconds: 0,
        }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createOwnedSessionLog(userId, { ...baseInput, sourceType: 'workout', workoutId });

    expect(findWorkoutById).toHaveBeenCalledWith(workoutId, userId);
    expect(createSessionLog).toHaveBeenCalledWith(userId, expect.objectContaining({
      title: 'Seance officielle',
      sport: 'course',
      difficulty: 'beginner',
      plannedDurationMinutes: 30,
      programId: null,
    }));
  });

  it("refuse une seance de programme qui n'existe pas", async () => {
    vi.mocked(findProgramById).mockResolvedValue({
      id: programId,
      userId,
      title: 'Programme',
      sport: 'yoga',
      difficulty: 'intermediate',
      weeksCount: 2,
      sessionsPerWeek: 2,
      sessionDurationMinutes: 30,
      data: {
        title: 'Programme',
        sport: 'yoga',
        difficulty: 'intermediate',
        weeks_count: 2,
        sessions_per_week: 2,
        session_duration_minutes: 30,
        progression_summary: 'Progression',
        weeks: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(createOwnedSessionLog(userId, {
      ...baseInput,
      sourceType: 'program_session',
      programId,
      programWeekNumber: 1,
      programSessionNumber: 1,
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(createSessionLog).not.toHaveBeenCalled();
  });

  it("propage le refus d'acces avant toute insertion", async () => {
    vi.mocked(findWorkoutById).mockRejectedValue(
      Object.assign(new Error('Acces refuse'), { statusCode: 403 }),
    );

    await expect(createOwnedSessionLog(userId, {
      ...baseInput,
      sourceType: 'workout',
      workoutId,
    })).rejects.toMatchObject({ statusCode: 403 });
    expect(createSessionLog).not.toHaveBeenCalled();
  });
});
