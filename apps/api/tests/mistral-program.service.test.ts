import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateProgram } from '../src/services/mistral-program.service.js';
import { AppError } from '../src/types/app-error.js';
import type { GenerateProgramInput } from '@sportcoach/shared';
import type { AiConfig } from '../src/services/ai.service.js';

// Mock fetch global (OWASP A10: pas d'appels réels à l'IA en test)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockAiConfig: AiConfig = {
  provider: 'mistral',
  apiKey: 'test-key',
};

const defaultInput: GenerateProgramInput = {
  sport: 'course à pied',
  level: 'beginner',
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 30,
  goals: 'Améliorer mon endurance',
};

const validWeekResponse = (weekNumber: number) => ({
  week_number: weekNumber,
  theme: weekNumber === 1 ? 'Adaptation' : 'Construction',
  objective: `Objectif de la semaine ${weekNumber}`,
  sessions: [
    {
      session_number: 1,
      title: `Séance 1 — Semaine ${weekNumber}`,
      focus: 'Endurance de base',
      duration_minutes: 30,
      exercises: [
        {
          name: 'Footing léger',
          description: 'Course à allure confortable',
          duration_seconds: 600,
          rest_seconds: 60,
        },
      ],
      warmup: [{ name: 'Échauffement', duration_seconds: 300, description: 'Rotation articulaire' }],
      cooldown: [{ name: 'Retour au calme', duration_seconds: 180, description: 'Marche lente' }],
    },
    {
      session_number: 2,
      title: `Séance 2 — Semaine ${weekNumber}`,
      focus: 'Récupération active',
      duration_minutes: 30,
      exercises: [
        {
          name: 'Jogging',
          description: 'Rythme conversationnel',
          duration_seconds: 900,
          rest_seconds: 60,
        },
      ],
    },
  ],
});

const mockApiResponse = (weekNumber: number) => ({
  choices: [{ message: { content: JSON.stringify(validWeekResponse(weekNumber)) } }],
});

describe('MistralProgramService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['MISTRAL_API_KEY'];
  });

  describe('generateProgram', () => {
    it('retourne un programme valide pour une réponse IA correcte (2 semaines)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse(1)) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse(2)) });

      const result = await generateProgram(defaultInput, mockAiConfig);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.title).toContain('course à pied');
      expect(result.sport).toBe('course à pied');
      expect(result.difficulty).toBe('beginner');
      expect(result.weeks_count).toBe(2);
      expect(result.sessions_per_week).toBe(2);
      expect(result.weeks).toHaveLength(2);
      expect(result.weeks[0]?.week_number).toBe(1);
      expect(result.weeks[1]?.week_number).toBe(2);
    });

    it('extrait le JSON quand le provider ajoute du texte autour', async () => {
      const wrappedJson = `Voici la semaine :\n${JSON.stringify(validWeekResponse(1))}\nBonne pratique!`;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: wrappedJson } }] }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse(2)) });

      const result = await generateProgram(defaultInput, mockAiConfig);
      expect(result.weeks).toHaveLength(2);
    });

    it('retente une fois par semaine si la validation Zod échoue', async () => {
      const invalidWeek = { ...validWeekResponse(1), sessions: [] };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(invalidWeek) } }] }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse(1)) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse(2)) });

      const result = await generateProgram(defaultInput, mockAiConfig);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.weeks).toHaveLength(2);
    });

    it('lance AppError.serviceUnavailable si une semaine échoue après 2 tentatives', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'pas du JSON' } }] }),
      });

      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toThrow(AppError);
      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toMatchObject({ statusCode: 503 });
    });

    it('lance AppError.serviceUnavailable sur erreur HTTP du provider (429)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' });

      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toMatchObject({ statusCode: 503 });
    });
  });
});
