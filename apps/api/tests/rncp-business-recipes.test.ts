import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { handleGenerateWorkout } from '../src/controllers/workout.controller.js';
import { handleDeleteProgram, handleGetPrograms } from '../src/controllers/program.controller.js';
import { handleCreateSessionLog } from '../src/controllers/session-log.controller.js';
import { handleGetSettings, handleSaveSettings } from '../src/controllers/settings.controller.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/types/app-error.js';

vi.mock('../src/services/workout-ai.service.js', () => ({
  generateWorkout: vi.fn(),
}));

vi.mock('../src/services/program-ai.service.js', () => ({
  generateProgram: vi.fn(),
}));

vi.mock('../src/services/generation-quota.service.js', () => ({
  runWithGenerationQuota: vi.fn(
    async (_userId: string, _accessMode: string, operation: () => Promise<unknown>) => operation(),
  ),
}));

vi.mock('../src/repositories/workout.repository.js', () => ({
  createWorkout: vi.fn(),
  findWorkoutsByUser: vi.fn(),
  findWorkoutById: vi.fn(),
  deleteWorkout: vi.fn(),
  getWorkoutStatsByUser: vi.fn(),
}));

vi.mock('../src/repositories/program.repository.js', () => ({
  createProgram: vi.fn(),
  findProgramsByUser: vi.fn(),
  findProgramById: vi.fn(),
  deleteProgram: vi.fn(),
}));

vi.mock('../src/repositories/session-log.repository.js', () => ({
  createSessionLog: vi.fn(),
  findRecentSessionLogsByUser: vi.fn(),
  getSessionLogStatsByUser: vi.fn(),
}));

vi.mock('../src/repositories/settings.repository.js', () => ({
  findSettingsByUser: vi.fn(),
  upsertSettings: vi.fn(),
}));

import { generateWorkout } from '../src/services/workout-ai.service.js';
import { createWorkout, findWorkoutById } from '../src/repositories/workout.repository.js';
import { deleteProgram, findProgramsByUser } from '../src/repositories/program.repository.js';
import { createSessionLog } from '../src/repositories/session-log.repository.js';
import { findSettingsByUser, upsertSettings } from '../src/repositories/settings.repository.js';

const userId = '11111111-1111-4111-8111-111111111111';
const workoutId = '22222222-2222-4222-8222-222222222222';
const programId = '33333333-3333-4333-8333-333333333333';

function createTestApp(): Hono {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', async (ctx, next) => {
    ctx.set('auth', { userId, email: 'rncp@example.test', accessMode: 'standard' });
    await next();
  });
  return app;
}

const workoutRecord = {
  id: workoutId,
  userId,
  title: 'Fractionne controle',
  sport: 'course',
  difficulty: 'intermediate' as const,
  durationMinutes: 30,
  data: {
    title: 'Fractionne controle',
    sport: 'course',
    difficulty: 'intermediate' as const,
    duration_minutes: 30,
    exercises: [
      {
        name: 'Intervalles',
        description: 'Alternance controlee',
        duration_seconds: 1_800,
        rest_seconds: 0,
      },
    ],
  },
  createdAt: new Date('2026-07-21T08:00:00.000Z'),
  updatedAt: new Date('2026-07-21T08:00:00.000Z'),
};

describe('recettes metier RNCP Bloc 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env['OPENAI_API_KEY'] = 'test-openai-key';
    vi.mocked(findSettingsByUser).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['OPENAI_API_KEY'];
  });

  it('CR-013 retourne une erreur claire et ne persiste rien si OpenAI est indisponible', async () => {
    vi.mocked(generateWorkout).mockRejectedValue(
      AppError.serviceUnavailable('OpenAI est temporairement indisponible. Reessayez plus tard.'),
    );

    const app = createTestApp();
    app.post('/workouts/generate', handleGenerateWorkout);
    const response = await app.request('/workouts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'course',
        level: 'intermediate',
        duration_minutes: 30,
        goals: 'Travailler le rythme',
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'SERVICE_UNAVAILABLE',
      message: 'OpenAI est temporairement indisponible. Reessayez plus tard.',
      statusCode: 503,
    });
    expect(createWorkout).not.toHaveBeenCalled();
  });

  it('CR-018 transmet la pagination et l identite du compte a la couche PostgreSQL', async () => {
    vi.mocked(findProgramsByUser).mockResolvedValue({
      programs: [
        {
          id: programId,
          title: 'Cycle prive du compte',
          sport: 'course',
          difficulty: 'beginner',
          weeksCount: 2,
          sessionsPerWeek: 2,
          sessionDurationMinutes: 30,
          createdAt: '2026-07-21T08:00:00.000Z',
        },
      ],
      total: 3,
      page: 2,
      limit: 1,
      hasMore: true,
    });

    const app = createTestApp();
    app.get('/programs', handleGetPrograms);
    const response = await app.request('/programs?page=2&limit=1');

    expect(response.status).toBe(200);
    expect(findProgramsByUser).toHaveBeenCalledWith(userId, { page: 2, limit: 1 });
    await expect(response.json()).resolves.toMatchObject({
      total: 3,
      page: 2,
      limit: 1,
      hasMore: true,
    });
  });

  it('CR-021 conserve une erreur API explicite lors d une suppression de programme', async () => {
    vi.mocked(deleteProgram).mockRejectedValue(
      AppError.internal('Impossible de supprimer le programme pour le moment.'),
    );

    const app = createTestApp();
    app.delete('/programs/:id', handleDeleteProgram);
    const response = await app.request(`/programs/${programId}`, { method: 'DELETE' });

    expect(response.status).toBe(500);
    expect(deleteProgram).toHaveBeenCalledWith(programId, userId);
    await expect(response.json()).resolves.toMatchObject({
      error: 'INTERNAL_ERROR',
      message: 'Impossible de supprimer le programme pour le moment.',
    });
  });

  it('CR-030 et CR-034 enregistrent la duree active et la note de douleur sous le compte authentifie', async () => {
    vi.mocked(findWorkoutById).mockResolvedValue(workoutRecord);
    vi.mocked(createSessionLog).mockImplementation((ownerId, input) =>
      Promise.resolve({
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
        painNotes: input.painNotes ?? null,
        notes: input.notes ?? null,
        createdAt: new Date('2026-07-21T08:31:00.000Z'),
      }),
    );

    const app = createTestApp();
    app.post('/session-logs', handleCreateSessionLog);
    const response = await app.request('/session-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType: 'workout',
        workoutId,
        title: 'Titre client ignore',
        sport: 'sport client ignore',
        difficulty: 'advanced',
        plannedDurationMinutes: 180,
        completedAt: '2026-07-21T08:30:00.000Z',
        durationSeconds: 487,
        perceivedEffort: 7,
        feedback: 'good',
        painNotes: 'Gene legere au genou gauche',
        notes: 'Rythme regulier',
      }),
    });

    expect(response.status).toBe(201);
    expect(findWorkoutById).toHaveBeenCalledWith(workoutId, userId);
    expect(createSessionLog).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        title: workoutRecord.title,
        sport: workoutRecord.sport,
        difficulty: workoutRecord.difficulty,
        plannedDurationMinutes: workoutRecord.durationMinutes,
        durationSeconds: 487,
        painNotes: 'Gene legere au genou gauche',
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      userId,
      durationSeconds: 487,
      painNotes: 'Gene legere au genou gauche',
    });
  });

  it('CR-037 persiste un modele autorise puis le restitue', async () => {
    vi.mocked(upsertSettings).mockResolvedValue(undefined);

    const app = createTestApp();
    app.put('/settings', handleSaveSettings);
    const saveResponse = await app.request('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5.4' }),
    });

    expect(saveResponse.status).toBe(200);
    expect(upsertSettings).toHaveBeenCalledWith(userId, { aiModel: 'gpt-5.4' });
    vi.mocked(findSettingsByUser).mockResolvedValue({
      provider: 'openai',
      aiApiKeyEncrypted: null,
      aiModel: 'gpt-5.4',
    });
    const readApp = createTestApp();
    readApp.get('/settings', handleGetSettings);
    const getResponse = await readApp.request('/settings');
    await expect(getResponse.json()).resolves.toMatchObject({
      provider: 'openai',
      model: 'gpt-5.4',
    });
  });

  it('CR-038 rejette un modele non autorise sans aucune persistance', async () => {
    const app = createTestApp();
    app.put('/settings', handleSaveSettings);
    const response = await app.request('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-modele-interdit' }),
    });

    expect(response.status).toBe(400);
    expect(upsertSettings).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: 'BAD_REQUEST',
      message: 'Donnees invalides',
    });
  });
});
