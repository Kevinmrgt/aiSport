import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAndSaveWorkout,
  getUserWorkouts,
  getWorkoutDetail,
  removeWorkout,
} from '../src/services/workout.service.js';
import { AppError } from '../src/types/app-error.js';

// Mock du service IA
vi.mock('../src/services/workout-ai.service.js', () => ({
  generateWorkout: vi.fn(),
}));

// Mock de resolveAiConfig pour éviter l'import de la BDD
vi.mock('../src/controllers/settings.controller.js', () => ({
  resolveAiConfig: vi.fn().mockResolvedValue({ provider: 'openai', apiKey: 'test-key' }),
}));

vi.mock('../src/services/generation-quota.service.js', () => ({
  runWithGenerationQuota: vi.fn(
    async (_userId: string, _accessMode: string, operation: () => Promise<unknown>) => operation(),
  ),
}));

// Mock du repository (dépend de la BDD — testé en intégration)
vi.mock('../src/repositories/workout.repository.js', () => ({
  createWorkout: vi.fn(),
  findWorkoutsByUser: vi.fn(),
  findWorkoutById: vi.fn(),
  deleteWorkout: vi.fn(),
  getWorkoutStatsByUser: vi.fn(),
}));

import { generateWorkout as generateWithAi } from '../src/services/workout-ai.service.js';
import {
  createWorkout,
  findWorkoutsByUser,
  findWorkoutById,
  deleteWorkout,
} from '../src/repositories/workout.repository.js';
import { runWithGenerationQuota } from '../src/services/generation-quota.service.js';

const mockWorkoutData = {
  title: 'Séance Test',
  sport: 'course',
  difficulty: 'beginner' as const,
  duration_minutes: 30,
  exercises: [{ name: 'Footing', description: 'Courir', rest_seconds: 60, duration_seconds: 600 }],
};

const mockWorkoutRecord = {
  id: 'workout-abc',
  userId: 'user-123',
  title: 'Séance Test',
  sport: 'course',
  difficulty: 'beginner' as const,
  durationMinutes: 30,
  data: mockWorkoutData,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockInput = {
  sport: 'course',
  level: 'beginner' as const,
  duration_minutes: 30,
  goals: 'Endurance',
};

describe('WorkoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAndSaveWorkout', () => {
    it('génère via le service IA et persiste en BDD', async () => {
      vi.mocked(generateWithAi).mockResolvedValue(mockWorkoutData);
      vi.mocked(createWorkout).mockResolvedValue(mockWorkoutRecord);

      const result = await generateAndSaveWorkout('user-123', mockInput);

      expect(generateWithAi).toHaveBeenCalledWith(
        mockInput,
        expect.objectContaining({ provider: 'openai' }),
      );
      expect(createWorkout).toHaveBeenCalledWith('user-123', mockWorkoutData);
      expect(result.id).toBe('workout-abc');
    });

    it('propage les erreurs du service IA', async () => {
      vi.mocked(generateWithAi).mockRejectedValue(
        AppError.serviceUnavailable('OpenAI indisponible'),
      );

      await expect(generateAndSaveWorkout('user-123', mockInput)).rejects.toThrow(AppError);
      expect(createWorkout).not.toHaveBeenCalled();
    });

    it('applique le quota partage au compte jury', async () => {
      vi.mocked(generateWithAi).mockResolvedValue(mockWorkoutData);
      vi.mocked(createWorkout).mockResolvedValue(mockWorkoutRecord);

      await generateAndSaveWorkout('user-123', mockInput, 'jury');

      expect(runWithGenerationQuota).toHaveBeenCalledWith('user-123', 'jury', expect.any(Function));
    });
  });

  describe('getUserWorkouts', () => {
    it("retourne la liste paginée des workouts de l'utilisateur", async () => {
      const mockResponse = {
        workouts: [
          {
            id: 'w1',
            title: 'Séance 1',
            sport: 'yoga',
            difficulty: 'beginner' as const,
            durationMinutes: 45,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 9,
        hasMore: false,
      };
      vi.mocked(findWorkoutsByUser).mockResolvedValue(mockResponse);

      const result = await getUserWorkouts('user-123');

      expect(findWorkoutsByUser).toHaveBeenCalledWith('user-123', {});
      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0]?.title).toBe('Séance 1');
      expect(result.total).toBe(1);
    });

    it('passe les filtres et la pagination au repository', async () => {
      const mockResponse = { workouts: [], total: 0, page: 2, limit: 9, hasMore: false };
      vi.mocked(findWorkoutsByUser).mockResolvedValue(mockResponse);

      await getUserWorkouts('user-123', { page: 2, sport: 'yoga' });

      expect(findWorkoutsByUser).toHaveBeenCalledWith('user-123', { page: 2, sport: 'yoga' });
    });
  });

  describe('getWorkoutDetail', () => {
    it("retourne le workout si l'ownership est valide", async () => {
      vi.mocked(findWorkoutById).mockResolvedValue(mockWorkoutRecord);

      const result = await getWorkoutDetail('workout-abc', 'user-123');

      expect(findWorkoutById).toHaveBeenCalledWith('workout-abc', 'user-123');
      expect(result.id).toBe('workout-abc');
    });

    it("propage l'erreur 403 si ownership invalide", async () => {
      vi.mocked(findWorkoutById).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(getWorkoutDetail('workout-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('removeWorkout', () => {
    it("supprime le workout si l'ownership est valide", async () => {
      vi.mocked(deleteWorkout).mockResolvedValue(undefined);

      await removeWorkout('workout-abc', 'user-123');

      expect(deleteWorkout).toHaveBeenCalledWith('workout-abc', 'user-123');
    });

    it("propage l'erreur 403 si ownership invalide", async () => {
      vi.mocked(deleteWorkout).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(removeWorkout('workout-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
