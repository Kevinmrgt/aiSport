import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  handleCreateSessionLog,
  handleGetRecentSessionLogs,
  handleGetSessionLogStats,
} from '../src/controllers/session-log.controller.js';
import { handleError } from '../src/middleware/error.middleware.js';

vi.mock('../src/services/session-log.service.js', () => ({
  createOwnedSessionLog: vi.fn(),
}));

vi.mock('../src/repositories/session-log.repository.js', () => ({
  findRecentSessionLogsByUser: vi.fn(),
  getSessionLogStatsByUser: vi.fn(),
}));

import { createOwnedSessionLog } from '../src/services/session-log.service.js';
import {
  findRecentSessionLogsByUser,
  getSessionLogStatsByUser,
} from '../src/repositories/session-log.repository.js';

const mockAuth = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'test@example.com',
  accessMode: 'standard' as const,
};
const workoutId = '22222222-2222-2222-2222-222222222222';

function createTestApp() {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', async (ctx, next) => {
    ctx.set('auth', mockAuth);
    await next();
  });
  return app;
}

const mockSessionLog = {
  id: '33333333-3333-3333-3333-333333333333',
  userId: mockAuth.userId,
  sourceType: 'workout' as const,
  workoutId,
  programId: null,
  programWeekNumber: null,
  programSessionNumber: null,
  title: 'Seance tempo',
  sport: 'course',
  difficulty: 'intermediate' as const,
  plannedDurationMinutes: 45,
  completedAt: new Date('2026-05-01T10:00:00.000Z'),
  durationSeconds: 2_700,
  perceivedEffort: 7,
  feedback: 'good' as const,
  painNotes: null,
  notes: 'Rythme stable',
  createdAt: new Date('2026-05-01T10:05:00.000Z'),
};

describe('SessionLogController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCreateSessionLog', () => {
    it('retourne 201 avec le journal cree', async () => {
      vi.mocked(createOwnedSessionLog).mockResolvedValue(mockSessionLog);

      const app = createTestApp();
      app.post('/session-logs', handleCreateSessionLog);

      const res = await app.request('/session-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'workout',
          workoutId,
          title: 'Seance tempo',
          sport: 'course',
          difficulty: 'intermediate',
          plannedDurationMinutes: 45,
          completedAt: '2026-05-01T10:00:00.000Z',
          durationSeconds: 2700,
          perceivedEffort: 7,
          feedback: 'good',
          notes: 'Rythme stable',
        }),
      });

      expect(res.status).toBe(201);
      expect(createOwnedSessionLog).toHaveBeenCalledWith(
        mockAuth.userId,
        expect.objectContaining({
          sourceType: 'workout',
          workoutId,
          perceivedEffort: 7,
        }),
      );
      const body = (await res.json()) as { id: string; completedAt: string };
      expect(body.id).toBe(mockSessionLog.id);
      expect(body.completedAt).toBe('2026-05-01T10:00:00.000Z');
    });

    it('retourne 400 si effort percu est hors bornes', async () => {
      const app = createTestApp();
      app.post('/session-logs', handleCreateSessionLog);

      const res = await app.request('/session-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'workout',
          title: 'Seance tempo',
          sport: 'course',
          difficulty: 'intermediate',
          plannedDurationMinutes: 45,
          completedAt: '2026-05-01T10:00:00.000Z',
          durationSeconds: 2700,
          perceivedEffort: 11,
          feedback: 'good',
        }),
      });

      expect(res.status).toBe(400);
      expect(createOwnedSessionLog).not.toHaveBeenCalled();
    });
  });

  describe('handleGetRecentSessionLogs', () => {
    it('retourne les logs recents avec la limite validee', async () => {
      vi.mocked(findRecentSessionLogsByUser).mockResolvedValue([mockSessionLog]);

      const app = createTestApp();
      app.get('/session-logs/recent', handleGetRecentSessionLogs);

      const res = await app.request('/session-logs/recent?limit=5');

      expect(res.status).toBe(200);
      expect(findRecentSessionLogsByUser).toHaveBeenCalledWith(mockAuth.userId, 5);
      const body = (await res.json()) as { sessionLogs: unknown[] };
      expect(body.sessionLogs).toHaveLength(1);
    });
  });

  describe('handleGetSessionLogStats', () => {
    it('retourne les statistiques formatees', async () => {
      vi.mocked(getSessionLogStatsByUser).mockResolvedValue({
        totalCompleted: 3,
        totalDurationSeconds: 7_200,
        averageEffort: 6.5,
        feedbackCounts: { too_easy: 1, good: 2, too_hard: 0 },
        lastCompletedAt: '2026-05-02T08:00:00.000Z',
      });

      const app = createTestApp();
      app.get('/session-logs/stats', handleGetSessionLogStats);

      const res = await app.request('/session-logs/stats');

      expect(res.status).toBe(200);
      expect(getSessionLogStatsByUser).toHaveBeenCalledWith(mockAuth.userId);
      const body = (await res.json()) as { totalCompleted: number; lastCompletedAt: string };
      expect(body.totalCompleted).toBe(3);
      expect(body.lastCompletedAt).toBe('2026-05-02T08:00:00.000Z');
    });
  });
});
