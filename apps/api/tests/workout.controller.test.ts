import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { handleGenerateWorkout, handleGetWorkouts } from '../src/controllers/workout.controller.js';
import { handleError } from '../src/middleware/error.middleware.js';

// Mock des services (tests unitaires — pas de BDD réelle)
vi.mock('../src/services/workout.service.js', () => ({
  generateAndSaveWorkout: vi.fn(),
  getUserWorkouts: vi.fn(),
  getWorkoutDetail: vi.fn(),
  removeWorkout: vi.fn(),
}));

import {
  generateAndSaveWorkout,
  getUserWorkouts,
} from '../src/services/workout.service.js';

const mockAuth = { userId: 'user-123', email: 'test@example.com' };

function createTestApp() {
  const app = new Hono();
  // Handler d'erreurs via app.onError() — API idiomatique Hono
  app.onError(handleError);
  app.use('*', async (ctx, next) => {
    ctx.set('auth', mockAuth);
    await next();
  });
  return app;
}

describe('WorkoutController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGenerateWorkout', () => {
    it('retourne 201 avec le workout créé', async () => {
      const mockWorkout = {
        id: 'workout-123',
        userId: 'user-123',
        title: 'Séance Test',
        sport: 'course',
        difficulty: 'beginner' as const,
        durationMinutes: 30,
        data: {
          title: 'Séance Test',
          sport: 'course',
          difficulty: 'beginner' as const,
          duration_minutes: 30,
          exercises: [
            { name: 'Course', description: 'Courir', rest_seconds: 60, duration_seconds: 600 },
          ],
        },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };

      vi.mocked(generateAndSaveWorkout).mockResolvedValue(mockWorkout);

      const app = createTestApp();
      app.post('/workouts/generate', handleGenerateWorkout);

      const req = new Request('http://localhost/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'course',
          level: 'beginner',
          duration_minutes: 30,
          goals: 'Améliorer endurance',
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(201);
      const body = (await res.json()) as { title: string };
      expect(body.title).toBe('Séance Test');
    });

    it('retourne 400 si les données sont invalides', async () => {
      const app = createTestApp();
      app.post('/workouts/generate', handleGenerateWorkout);

      const req = new Request('http://localhost/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Manque: sport, level, duration_minutes, goals
          sport: '',
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });
  });

  describe('handleGetWorkouts', () => {
    it('retourne la liste des workouts de l\'utilisateur', async () => {
      const mockList = [
        {
          id: 'w1',
          title: 'Séance 1',
          sport: 'yoga',
          difficulty: 'beginner' as const,
          durationMinutes: 45,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      vi.mocked(getUserWorkouts).mockResolvedValue(mockList);

      const app = createTestApp();
      app.get('/workouts', handleGetWorkouts);

      const req = new Request('http://localhost/workouts');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);
      const body = (await res.json()) as typeof mockList;
      expect(body).toHaveLength(1);
      expect(body[0]?.title).toBe('Séance 1');
    });
  });
});
