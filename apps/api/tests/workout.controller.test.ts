import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  handleGenerateWorkout,
  handleGetWorkouts,
  handleGetWorkout,
  handleDeleteWorkout,
} from '../src/controllers/workout.controller.js';
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
  getWorkoutDetail,
  removeWorkout,
} from '../src/services/workout.service.js';

const mockAuth = { userId: 'user-123', email: 'test@example.com' };
const workoutId = '22222222-2222-4222-8222-222222222222';
const otherWorkoutId = '33333333-3333-4333-8333-333333333333';

function createTestApp() {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', async (ctx, next) => {
    ctx.set('auth', mockAuth);
    await next();
  });
  return app;
}

const mockWorkoutRecord = {
  id: workoutId,
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
    exercises: [{ name: 'Course', description: 'Courir', rest_seconds: 60, duration_seconds: 600 }],
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('WorkoutController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGenerateWorkout', () => {
    it('retourne 201 avec le workout créé', async () => {
      vi.mocked(generateAndSaveWorkout).mockResolvedValue(mockWorkoutRecord);

      const app = createTestApp();
      app.post('/workouts/generate', handleGenerateWorkout);

      const res = await app.fetch(new Request('http://localhost/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: 'course', level: 'beginner', duration_minutes: 30, goals: 'Améliorer endurance' }),
      }));

      expect(res.status).toBe(201);
      const body = (await res.json()) as { title: string };
      expect(body.title).toBe('Séance Test');
    });

    it('retourne 400 si les données sont invalides', async () => {
      const app = createTestApp();
      app.post('/workouts/generate', handleGenerateWorkout);

      const res = await app.fetch(new Request('http://localhost/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: '' }),
      }));

      expect(res.status).toBe(400);
    });

    it('retourne 400 si le corps JSON est malformé', async () => {
      const app = createTestApp();
      app.post('/workouts/generate', handleGenerateWorkout);

      const res = await app.fetch(new Request('http://localhost/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'pas du json{{{',
      }));

      expect(res.status).toBe(400);
    });
  });

  describe('handleGetWorkouts', () => {
    it('retourne la liste des workouts de l\'utilisateur', async () => {
      const mockList = [{
        id: 'w1', title: 'Séance 1', sport: 'yoga',
        difficulty: 'beginner' as const, durationMinutes: 45, createdAt: '2026-01-01T00:00:00.000Z',
      }];
      vi.mocked(getUserWorkouts).mockResolvedValue(mockList);

      const app = createTestApp();
      app.get('/workouts', handleGetWorkouts);

      const res = await app.fetch(new Request('http://localhost/workouts'));
      expect(res.status).toBe(200);
      const body = (await res.json()) as typeof mockList;
      expect(body).toHaveLength(1);
      expect(body[0]?.title).toBe('Séance 1');
    });
  });

  describe('handleGetWorkout', () => {
    it('retourne 200 avec le détail du workout', async () => {
      vi.mocked(getWorkoutDetail).mockResolvedValue(mockWorkoutRecord);

      const app = createTestApp();
      app.get('/workouts/:id', handleGetWorkout);

      const res = await app.fetch(new Request(`http://localhost/workouts/${workoutId}`));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; exercises: unknown[] };
      expect(body.id).toBe(workoutId);
      expect(body.exercises).toHaveLength(1);
    });

    it('propage l\'erreur 404 du service si workout introuvable', async () => {
      const { AppError } = await import('../src/types/app-error.js');
      vi.mocked(getWorkoutDetail).mockRejectedValue(AppError.notFound('Workout introuvable'));

      const app = createTestApp();
      app.get('/workouts/:id', handleGetWorkout);

      const res = await app.fetch(new Request(`http://localhost/workouts/${otherWorkoutId}`));
      expect(res.status).toBe(404);
    });

    it('retourne 400 sans appeler le service si l ID est malforme', async () => {
      const app = createTestApp();
      app.get('/workouts/:id', handleGetWorkout);

      const res = await app.request('/workouts/pas-un-uuid');

      expect(res.status).toBe(400);
      expect(getWorkoutDetail).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteWorkout', () => {
    it('retourne 200 avec message de confirmation', async () => {
      vi.mocked(removeWorkout).mockResolvedValue(undefined);

      const app = createTestApp();
      app.delete('/workouts/:id', handleDeleteWorkout);

      const res = await app.fetch(new Request(`http://localhost/workouts/${workoutId}`, { method: 'DELETE' }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: string };
      expect(body.message).toBe('Entraînement supprimé');
    });

    it('propage l\'erreur 403 si ownership invalide', async () => {
      const { AppError } = await import('../src/types/app-error.js');
      vi.mocked(removeWorkout).mockRejectedValue(AppError.forbidden('Accès refusé'));

      const app = createTestApp();
      app.delete('/workouts/:id', handleDeleteWorkout);

      const res = await app.fetch(new Request(`http://localhost/workouts/${otherWorkoutId}`, { method: 'DELETE' }));
      expect(res.status).toBe(403);
    });

    it('retourne 400 sans appeler le service si l ID est malforme', async () => {
      const app = createTestApp();
      app.delete('/workouts/:id', handleDeleteWorkout);

      const res = await app.request('/workouts/invalide', { method: 'DELETE' });

      expect(res.status).toBe(400);
      expect(removeWorkout).not.toHaveBeenCalled();
    });
  });
});
