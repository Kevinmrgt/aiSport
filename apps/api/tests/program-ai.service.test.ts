import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateProgram } from '../src/services/program-ai.service.js';
import { getProgramSessionTimedSeconds } from '../src/services/program-duration.service.js';
import { AppError } from '../src/types/app-error.js';
import type { GenerateProgramInput } from '@alcide/shared';
import type { AiConfig } from '../src/services/ai.service.js';

// Mock fetch global (OWASP A10: pas d'appels réels à l'IA en test)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockAiConfig: AiConfig = {
  provider: 'openai',
  apiKey: 'test-key',
};

function formatDurationLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} s`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

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
          description: '5 rounds de 2 min à rythme modéré',
          sets: 5,
          reps: '2 min',
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

function getWeekNumberFromFetchInit(init: unknown): number {
  const body = (init as { body?: unknown } | undefined)?.body;
  if (typeof body !== 'string') return 1;

  const parsed = JSON.parse(body) as { messages?: Array<{ content?: string }> };
  const prompt = parsed.messages?.[0]?.content ?? '';
  const match = prompt.match(/semaine\s+(\d+)\s+sur/i);
  return Number(match?.[1] ?? 1);
}

function mockSuccessfulWeeksByPrompt(): void {
  mockFetch.mockImplementation((_url: unknown, init: unknown) => {
    const weekNumber = getWeekNumberFromFetchInit(init);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponse(weekNumber)),
    });
  });
}

function expectProgramSessionsToMatchDuration(
  result: Awaited<ReturnType<typeof generateProgram>>,
  expectedMinutes: number,
): void {
  const expectedSeconds = expectedMinutes * 60;

  result.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      expect(session.duration_minutes).toBe(expectedMinutes);
      expect(getProgramSessionTimedSeconds(session)).toBe(expectedSeconds);
      session.exercises.forEach((exercise) => {
        expect(exercise.duration_seconds).toBeGreaterThan(0);
        expect(exercise.description).toContain(
          `pendant ${formatDurationLabel(exercise.duration_seconds ?? 0)}`,
        );
        expect(exercise.description).not.toContain('5 rounds de 2 min');
        expect(exercise.sets).toBeUndefined();
        expect(exercise.reps).toBeUndefined();
        expect(exercise.tips).toBe('Le chrono affiché est la référence pour cet exercice.');
      });
    });
  });
}

describe('ProgramAiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env['OPENAI_API_KEY'];
  });

  describe('generateProgram', () => {
    it('retourne un programme valide pour une réponse IA correcte (2 semaines)', async () => {
      mockSuccessfulWeeksByPrompt();

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
      expectProgramSessionsToMatchDuration(result, defaultInput.session_duration_minutes);
    });

    it('extrait le JSON quand le provider ajoute du texte autour', async () => {
      const wrappedJson = `Voici la semaine :\n${JSON.stringify(validWeekResponse(1))}\nBonne pratique!`;
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const weekNumber = getWeekNumberFromFetchInit(init);
        if (weekNumber === 1) {
          return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: wrappedJson } }] }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse(weekNumber)),
        });
      });

      const result = await generateProgram(defaultInput, mockAiConfig);
      expect(result.weeks).toHaveLength(2);
    });

    it('retente une fois par semaine si la validation Zod échoue', async () => {
      const invalidWeek = { ...validWeekResponse(1), sessions: [] };
      const attemptsByWeek = new Map<number, number>();
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const weekNumber = getWeekNumberFromFetchInit(init);
        const attempt = (attemptsByWeek.get(weekNumber) ?? 0) + 1;
        attemptsByWeek.set(weekNumber, attempt);

        if (weekNumber === 1 && attempt === 1) {
          return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(invalidWeek) } }] }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse(weekNumber)),
        });
      });

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

    it("ne retente pas quand l'appel IA atteint le timeout d'une semaine", async () => {
      vi.useFakeTimers();
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const signal = (init as { signal?: AbortSignal }).signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      });

      const generation = generateProgram(defaultInput, mockAiConfig);
      const assertion = expect(generation).rejects.toMatchObject({ statusCode: 503 });

      await vi.advanceTimersByTimeAsync(45_000);

      await assertion;
      expect(mockFetch).toHaveBeenCalledTimes(defaultInput.weeks_count);
    });

    it('ne retente pas une réponse invalide arrivée trop tard pour le budget Vercel', async () => {
      vi.useFakeTimers();
      const invalidWeek = { ...validWeekResponse(1), sessions: [] };
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const weekNumber = getWeekNumberFromFetchInit(init);
        const delayMs = weekNumber === 1 ? 31_000 : 100;
        const response = weekNumber === 1
          ? { choices: [{ message: { content: JSON.stringify(invalidWeek) } }] }
          : mockApiResponse(weekNumber);

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve(response),
            });
          }, delayMs);
        });
      });

      const generation = generateProgram(defaultInput, mockAiConfig);
      const assertion = expect(generation).rejects.toMatchObject({ statusCode: 503 });

      await vi.advanceTimersByTimeAsync(31_000);

      await assertion;
      expect(mockFetch).toHaveBeenCalledTimes(defaultInput.weeks_count);
    });
  });
});
