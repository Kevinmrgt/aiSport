import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWorkout } from '../src/services/mistral.service.js';
import { AppError } from '../src/types/app-error.js';
import type { GenerateWorkoutInput } from '@sportcoach/shared';

// Mock fetch global (OWASP A10: pas d'appels réels à Mistral en test)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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

describe('MistralService', () => {
  beforeEach(() => {
    process.env['MISTRAL_API_KEY'] = 'test-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['MISTRAL_API_KEY'];
  });

  describe('generateWorkout', () => {
    it('retourne un workout valide pour une réponse Mistral correcte', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validApiResponse,
      });

      const result = await generateWorkout(defaultInput);

      expect(result.title).toBe('Séance Course à Pied Débutant');
      expect(result.sport).toBe('course à pied');
      expect(result.difficulty).toBe('beginner');
      expect(result.duration_minutes).toBe(30);
      expect(result.exercises).toHaveLength(1);
    });

    it('extrait le JSON quand Mistral ajoute du texte autour', async () => {
      const wrappedJson = `Voici votre programme:\n${JSON.stringify(validWorkoutResponse)}\nBonne séance!`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: wrappedJson } }],
        }),
      });

      const result = await generateWorkout(defaultInput);
      expect(result.title).toBe('Séance Course à Pied Débutant');
    });

    it('retente une fois si la validation Zod échoue', async () => {
      // Premier essai: JSON invalide (champ manquant)
      const invalidWorkout = { ...validWorkoutResponse, exercises: [] };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(invalidWorkout) } }],
          }),
        })
        // Deuxième essai: réponse valide
        .mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse,
        });

      const result = await generateWorkout(defaultInput);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.exercises).toHaveLength(1);
    });

    it('lance AppError.serviceUnavailable après 2 échecs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'pas du JSON valide' } }],
        }),
      });

      await expect(generateWorkout(defaultInput)).rejects.toThrow(AppError);
      await expect(generateWorkout(defaultInput)).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it('gère l\'absence de clé API Mistral', async () => {
      delete process.env['MISTRAL_API_KEY'];

      // Vérifie que c'est bien un AppError avec statusCode 500 (Internal, pas 503)
      // car la vérification de la clé se fait avant les retries
      const error = await generateWorkout(defaultInput).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(500);
    });

    it('gère les erreurs HTTP de Mistral (status 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(generateWorkout(defaultInput)).rejects.toThrow(AppError);
    });
  });
});
