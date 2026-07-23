import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  handleGenerateProgram,
  handleGetPrograms,
  handleGetProgram,
  handleDeleteProgram,
} from '../src/controllers/program.controller.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/types/app-error.js';

// Mock des services (tests unitaires — pas de BDD réelle)
vi.mock('../src/services/program.service.js', () => ({
  generateAndSaveProgram: vi.fn(),
  getUserPrograms: vi.fn(),
  getProgramDetail: vi.fn(),
  removeProgram: vi.fn(),
}));

import {
  generateAndSaveProgram,
  getUserPrograms,
  getProgramDetail,
  removeProgram,
} from '../src/services/program.service.js';

const mockAuth = { userId: 'user-123', email: 'test@example.com', accessMode: 'jury' as const };
const programId = '22222222-2222-4222-8222-222222222222';
const otherProgramId = '33333333-3333-4333-8333-333333333333';

function createTestApp() {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', async (ctx, next) => {
    ctx.set('auth', mockAuth);
    await next();
  });
  return app;
}

const mockProgramRecord = {
  id: programId,
  userId: 'user-123',
  title: 'Programme Course — 2 semaines (Débutant)',
  sport: 'course',
  difficulty: 'beginner' as const,
  weeksCount: 2,
  sessionsPerWeek: 2,
  sessionDurationMinutes: 30,
  data: {
    title: 'Programme Course — 2 semaines (Débutant)',
    sport: 'course',
    difficulty: 'beginner' as const,
    weeks_count: 2,
    sessions_per_week: 2,
    session_duration_minutes: 30,
    progression_summary: 'Programme progressif',
    weeks: [],
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ProgramController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGenerateProgram', () => {
    it('retourne 400 si les données sont invalides (weeks_count hors limites)', async () => {
      const app = createTestApp();
      app.post('/programs/generate', handleGenerateProgram);

      const res = await app.request('/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'course',
          level: 'beginner',
          weeks_count: 10, // > 4: invalide
          sessions_per_week: 3,
          session_duration_minutes: 30,
          goals: 'Endurance',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si le corps JSON est malformé', async () => {
      const app = createTestApp();
      app.post('/programs/generate', handleGenerateProgram);

      const res = await app.request('/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'pas du json',
      });

      expect(res.status).toBe(400);
    });

    it('retourne 201 avec le résumé du programme créé', async () => {
      vi.mocked(generateAndSaveProgram).mockResolvedValue(mockProgramRecord);

      const app = createTestApp();
      app.post('/programs/generate', handleGenerateProgram);

      const res = await app.request('/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'course',
          level: 'beginner',
          weeks_count: 2,
          sessions_per_week: 2,
          session_duration_minutes: 30,
          goals: 'Améliorer mon endurance',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string; weeksCount: number };
      expect(body.id).toBe(programId);
      expect(body.weeksCount).toBe(2);
      expect(generateAndSaveProgram).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ sport: 'course' }),
        'jury',
      );
    });

    it('retourne 503 si le service IA est indisponible', async () => {
      vi.mocked(generateAndSaveProgram).mockRejectedValue(
        AppError.serviceUnavailable('Impossible de générer le programme'),
      );

      const app = createTestApp();
      app.post('/programs/generate', handleGenerateProgram);

      const res = await app.request('/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'course',
          level: 'beginner',
          weeks_count: 2,
          sessions_per_week: 2,
          session_duration_minutes: 30,
          goals: 'Endurance',
        }),
      });

      expect(res.status).toBe(503);
    });
  });

  describe('handleGetPrograms', () => {
    it('retourne la liste paginée des programmes', async () => {
      const mockResponse = {
        programs: [
          {
            id: 'p1',
            title: 'Programme Test',
            sport: 'yoga',
            difficulty: 'beginner' as const,
            weeksCount: 2,
            sessionsPerWeek: 2,
            sessionDurationMinutes: 30,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 9,
        hasMore: false,
      };
      vi.mocked(getUserPrograms).mockResolvedValue(mockResponse);

      const app = createTestApp();
      app.get('/programs', handleGetPrograms);

      const res = await app.request('/programs');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { programs: unknown[]; total: number };
      expect(body.programs).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe('handleGetProgram', () => {
    it('retourne le programme complet avec data', async () => {
      vi.mocked(getProgramDetail).mockResolvedValue(mockProgramRecord);

      const app = createTestApp();
      app.get('/programs/:id', handleGetProgram);

      const res = await app.request(`/programs/${programId}`);

      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; data: unknown };
      expect(body.id).toBe(programId);
      expect(body.data).toBeDefined();
    });

    it('retourne 404 si le programme est introuvable', async () => {
      vi.mocked(getProgramDetail).mockRejectedValue(AppError.notFound('Programme introuvable'));

      const app = createTestApp();
      app.get('/programs/:id', handleGetProgram);

      const res = await app.request(`/programs/${otherProgramId}`);
      expect(res.status).toBe(404);
    });

    it("retourne 403 si l'ownership est invalide", async () => {
      vi.mocked(getProgramDetail).mockRejectedValue(AppError.forbidden('Accès refusé'));

      const app = createTestApp();
      app.get('/programs/:id', handleGetProgram);

      const res = await app.request(`/programs/${otherProgramId}`);
      expect(res.status).toBe(403);
    });

    it('retourne 400 sans appeler le service si l ID est malforme', async () => {
      const app = createTestApp();
      app.get('/programs/:id', handleGetProgram);

      const res = await app.request('/programs/pas-un-uuid');

      expect(res.status).toBe(400);
      expect(getProgramDetail).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteProgram', () => {
    it('retourne 200 après suppression', async () => {
      vi.mocked(removeProgram).mockResolvedValue(undefined);

      const app = createTestApp();
      app.delete('/programs/:id', handleDeleteProgram);

      const res = await app.request(`/programs/${programId}`, { method: 'DELETE' });
      expect(res.status).toBe(200);
    });

    it('retourne 400 sans appeler le service si l ID est malforme', async () => {
      const app = createTestApp();
      app.delete('/programs/:id', handleDeleteProgram);

      const res = await app.request('/programs/invalide', { method: 'DELETE' });

      expect(res.status).toBe(400);
      expect(removeProgram).not.toHaveBeenCalled();
    });
  });
});
