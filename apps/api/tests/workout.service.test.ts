import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAndSaveWorkout,
  getUserWorkouts,
  getWorkoutDetail,
  removeWorkout,
} from '../src/services/workout.service.js';
import { AppError } from '../src/types/app-error.js';

// Mock du service Mistral
vi.mock('../src/services/mistral.service.js', () => ({
  generateWorkout: vi.fn(),
}));

// Mock du repository (dépend de la BDD — testé en intégration)
vi.mock('../src/repositories/workout.repository.js', () => ({
  createWorkout: vi.fn(),
  findWorkoutsByUser: vi.fn(),
  findWorkoutById: vi.fn(),
  deleteWorkout: vi.fn(),
  getWorkoutStatsByUser: vi.fn(),
}));

import { generateWorkout as generateWithMistral } from '../src/services/mistral.service.js';
import {
  createWorkout,
  findWorkoutsByUser,
  findWorkoutById,
  deleteWorkout,
} from '../src/repositories/workout.repository.js';

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
    it('génère via Mistral et persiste en BDD', async () => {
      vi.mocked(generateWithMistral).mockResolvedValue(mockWorkoutData);
      vi.mocked(createWorkout).mockResolvedValue(mockWorkoutRecord);

      const result = await generateAndSaveWorkout('user-123', mockInput);

      expect(generateWithMistral).toHaveBeenCalledWith(mockInput);
      expect(createWorkout).toHaveBeenCalledWith('user-123', mockWorkoutData);
      expect(result.id).toBe('workout-abc');
    });

    it('propage les erreurs de Mistral', async () => {
      vi.mocked(generateWithMistral).mockRejectedValue(
        AppError.serviceUnavailable('Mistral indisponible'),
      );

      await expect(generateAndSaveWorkout('user-123', mockInput)).rejects.toThrow(AppError);
      expect(createWorkout).not.toHaveBeenCalled();
    });
  });

  describe('getUserWorkouts', () => {
    it('retourne la liste paginée des workouts de l\'utilisateur', async () => {
      const mockResponse = {
        workouts: [{ id: 'w1', title: 'Séance 1', sport: 'yoga', difficulty: 'beginner' as const, durationMinutes: 45, createdAt: '2026-01-01T00:00:00.000Z' }],
        total: 1, page: 1, limit: 9, hasMore: false,
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
    it('retourne le workout si l\'ownership est valide', async () => {
      vi.mocked(findWorkoutById).mockResolvedValue(mockWorkoutRecord);

      const result = await getWorkoutDetail('workout-abc', 'user-123');

      expect(findWorkoutById).toHaveBeenCalledWith('workout-abc', 'user-123');
      expect(result.id).toBe('workout-abc');
    });

    it('propage l\'erreur 403 si ownership invalide', async () => {
      vi.mocked(findWorkoutById).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(getWorkoutDetail('workout-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('removeWorkout', () => {
    it('supprime le workout si l\'ownership est valide', async () => {
      vi.mocked(deleteWorkout).mockResolvedValue(undefined);

      await removeWorkout('workout-abc', 'user-123');

      expect(deleteWorkout).toHaveBeenCalledWith('workout-abc', 'user-123');
    });

    it('propage l\'erreur 403 si ownership invalide', async () => {
      vi.mocked(deleteWorkout).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(removeWorkout('workout-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
