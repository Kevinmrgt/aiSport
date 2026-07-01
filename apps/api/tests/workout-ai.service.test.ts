import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWorkout } from '../src/services/workout-ai.service.js';
import { AppError } from '../src/types/app-error.js';
import type { GenerateWorkoutInput } from '@alcide/shared';
import type { AiConfig } from '../src/services/ai.service.js';

// Mock fetch global (OWASP A10: pas d'appels réels à l'IA en test)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockAiConfig: AiConfig = {
  provider: 'openai',
  apiKey: 'test-key',
};

const validWorkoutResponse = {
  title: 'Séance Course à Pied Débutant',
  sport: 'course à pied',
  difficulty: 'beginner',
  duration_minutes: 30,
  exercises: [
    {
      name: 'Footing léger',
      description: 'Course à allure confortable',
      duration_seconds: 600,
      rest_seconds: 60,
      tips: 'Respiration nasale',
    },
  ],
  warmup: [
    {
      name: 'Échauffement articulaire',
      duration_seconds: 300,
      description: 'Rotation des articulations',
    },
  ],
};

const validApiResponse = {
  choices: [{ message: { content: JSON.stringify(validWorkoutResponse) } }],
};

const defaultInput: GenerateWorkoutInput = {
  sport: 'course à pied',
  level: 'beginner',
  duration_minutes: 30,
  goals: 'Améliorer mon endurance',
};

describe('WorkoutAiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['OPENAI_API_KEY'];
  });

  describe('generateWorkout', () => {
    it('retourne un workout valide pour une réponse IA correcte', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
      });

      const result = await generateWorkout(defaultInput, mockAiConfig);

      expect(result.title).toBe('Séance Course à Pied Débutant');
      expect(result.sport).toBe('course à pied');
      expect(result.difficulty).toBe('beginner');
      expect(result.duration_minutes).toBe(30);
      expect(result.exercises).toHaveLength(1);
    });

    it('extrait le JSON quand le provider ajoute du texte autour', async () => {
      const wrappedJson = `Voici votre programme:\n${JSON.stringify(validWorkoutResponse)}\nBonne séance!`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: wrappedJson } }],
        }),
      });

      const result = await generateWorkout(defaultInput, mockAiConfig);
      expect(result.title).toBe('Séance Course à Pied Débutant');
    });

    it('retente une fois si la validation Zod échoue', async () => {
      // Premier essai: JSON invalide (champ manquant)
      const invalidWorkout = { ...validWorkoutResponse, exercises: [] };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(invalidWorkout) } }],
          }),
        })
        // Deuxième essai: réponse valide
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validApiResponse),
        });

      const result = await generateWorkout(defaultInput, mockAiConfig);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.exercises).toHaveLength(1);
    });

    it('lance AppError.serviceUnavailable après 2 échecs de parsing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'pas du JSON valide' } }],
        }),
      });

      await expect(generateWorkout(defaultInput, mockAiConfig)).rejects.toThrow(AppError);
      await expect(generateWorkout(defaultInput, mockAiConfig)).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it('lance AppError.serviceUnavailable sur erreur HTTP du provider (429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(generateWorkout(defaultInput, mockAiConfig)).rejects.toThrow(AppError);
      await expect(generateWorkout(defaultInput, mockAiConfig)).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it("ne retente pas quand l'appel IA atteint le timeout de séance", async () => {
      vi.useFakeTimers();
      try {
        mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('This operation was aborted', 'AbortError'));
            });
          });
        });

        const generation = generateWorkout(defaultInput, mockAiConfig);
        const assertion = expect(generation).rejects.toMatchObject({ statusCode: 503 });
        await vi.advanceTimersByTimeAsync(45_000);

        await assertion;
        expect(mockFetch).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
