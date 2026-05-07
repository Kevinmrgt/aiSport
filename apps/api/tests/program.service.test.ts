import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAndSaveProgram,
  getUserPrograms,
  getProgramDetail,
  removeProgram,
} from '../src/services/program.service.js';
import { getProgramSessionTimedSeconds } from '../src/services/program-duration.service.js';
import { AppError } from '../src/types/app-error.js';

// Mock du service Mistral
vi.mock('../src/services/mistral-program.service.js', () => ({
  generateProgram: vi.fn(),
}));

// Mock de resolveAiConfig pour éviter l'import de la BDD
vi.mock('../src/controllers/settings.controller.js', () => ({
  resolveAiConfig: vi.fn().mockResolvedValue({ provider: 'mistral', apiKey: 'test-key' }),
}));

// Mock du repository (dépend de la BDD — testé en intégration)
vi.mock('../src/repositories/program.repository.js', () => ({
  createProgram: vi.fn(),
  findProgramsByUser: vi.fn(),
  findProgramById: vi.fn(),
  deleteProgram: vi.fn(),
}));

import { generateProgram as generateWithMistral } from '../src/services/mistral-program.service.js';
import {
  createProgram,
  findProgramsByUser,
  findProgramById,
  deleteProgram,
} from '../src/repositories/program.repository.js';

const mockProgramData = {
  title: 'Programme Course — 2 semaines (Débutant)',
  sport: 'course à pied',
  difficulty: 'beginner' as const,
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 30,
  progression_summary: 'Programme progressif de 2 semaines',
  weeks: [
    {
      week_number: 1,
      theme: 'Adaptation',
      objective: 'Prendre les marques',
      sessions: [
        {
          session_number: 1,
          title: 'Séance 1',
          focus: 'Endurance',
          duration_minutes: 30,
          exercises: [{ name: 'Footing', description: 'Courir', rest_seconds: 60, duration_seconds: 600 }],
        },
      ],
    },
    {
      week_number: 2,
      theme: 'Construction',
      objective: 'Progresser',
      sessions: [
        {
          session_number: 1,
          title: 'Séance 3',
          focus: 'Endurance+',
          duration_minutes: 30,
          exercises: [{ name: 'Jogging', description: 'Rythme moyen', rest_seconds: 60, duration_seconds: 900 }],
        },
      ],
    },
  ],
};

const mockProgramRecord = {
  id: 'program-abc',
  userId: 'user-123',
  title: 'Programme Course — 2 semaines (Débutant)',
  sport: 'course à pied',
  difficulty: 'beginner' as const,
  weeksCount: 2,
  sessionsPerWeek: 2,
  sessionDurationMinutes: 30,
  data: mockProgramData,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockInput = {
  sport: 'course à pied',
  level: 'beginner' as const,
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 30,
  goals: 'Améliorer mon endurance',
};

describe('ProgramService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAndSaveProgram', () => {
    it('génère via Mistral et persiste en BDD', async () => {
      vi.mocked(generateWithMistral).mockResolvedValue(mockProgramData);
      vi.mocked(createProgram).mockResolvedValue(mockProgramRecord);

      const result = await generateAndSaveProgram('user-123', mockInput);

      expect(generateWithMistral).toHaveBeenCalledWith(mockInput, expect.objectContaining({ provider: 'mistral' }));
      expect(createProgram).toHaveBeenCalledWith('user-123', mockProgramData);
      expect(result.id).toBe('program-abc');
    });

    it('propage les erreurs de Mistral sans appeler le repository', async () => {
      vi.mocked(generateWithMistral).mockRejectedValue(
        AppError.serviceUnavailable("Impossible de générer le programme"),
      );

      await expect(generateAndSaveProgram('user-123', mockInput)).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(createProgram).not.toHaveBeenCalled();
    });
  });

  describe('getUserPrograms', () => {
    it('retourne la liste paginée des programmes de l\'utilisateur', async () => {
      const mockResponse = {
        programs: [{
          id: 'p1',
          title: 'Programme Test',
          sport: 'yoga',
          difficulty: 'beginner' as const,
          weeksCount: 3,
          sessionsPerWeek: 3,
          sessionDurationMinutes: 45,
          createdAt: '2026-01-01T00:00:00.000Z',
        }],
        total: 1, page: 1, limit: 9, hasMore: false,
      };
      vi.mocked(findProgramsByUser).mockResolvedValue(mockResponse);

      const result = await getUserPrograms('user-123');

      expect(findProgramsByUser).toHaveBeenCalledWith('user-123', {});
      expect(result.programs).toHaveLength(1);
      expect(result.programs[0]?.title).toBe('Programme Test');
    });
  });

  describe('getProgramDetail', () => {
    it('retourne le programme si l\'ownership est valide', async () => {
      vi.mocked(findProgramById).mockResolvedValue(mockProgramRecord);

      const result = await getProgramDetail('program-abc', 'user-123');

      expect(findProgramById).toHaveBeenCalledWith('program-abc', 'user-123');
      expect(result.id).toBe('program-abc');
      expect(getProgramSessionTimedSeconds(result.data.weeks[0]!.sessions[0]!)).toBe(30 * 60);
    });

    it('propage l\'erreur 403 si ownership invalide', async () => {
      vi.mocked(findProgramById).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(getProgramDetail('program-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('propage l\'erreur 404 si programme introuvable', async () => {
      vi.mocked(findProgramById).mockRejectedValue(AppError.notFound('Programme'));

      await expect(getProgramDetail('inexistant', 'user-123')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('removeProgram', () => {
    it('supprime le programme si l\'ownership est valide', async () => {
      vi.mocked(deleteProgram).mockResolvedValue(undefined);

      await removeProgram('program-abc', 'user-123');

      expect(deleteProgram).toHaveBeenCalledWith('program-abc', 'user-123');
    });

    it('propage l\'erreur 403 si ownership invalide', async () => {
      vi.mocked(deleteProgram).mockRejectedValue(AppError.forbidden('Accès refusé'));

      await expect(removeProgram('program-abc', 'autre-user')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
