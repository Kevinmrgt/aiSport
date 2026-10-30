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
          description: 'Posture confortable et mouvement contrôlé',
          sets: 5,
          reps: '8-10',
          duration_seconds: 1_260,
          rest_seconds: 60,
          tips: 'Gardez une intensité confortable.',
        },
      ],
      warmup: [
        { name: 'Échauffement', duration_seconds: 300, description: 'Rotation articulaire' },
      ],
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
          duration_seconds: 1_440,
          rest_seconds: 60,
        },
      ],
      warmup: [{ name: 'Échauffement', duration_seconds: 180, description: 'Mobilité douce' }],
      cooldown: [{ name: 'Retour au calme', duration_seconds: 120, description: 'Marche lente' }],
    },
  ],
});

const mockApiResponse = (weekNumber: number) => ({
  choices: [
    { finish_reason: 'stop', message: { content: JSON.stringify(validWeekResponse(weekNumber)) } },
  ],
});

function getWeekNumberFromFetchInit(init: unknown): number {
  const body = (init as { body?: unknown } | undefined)?.body;
  if (typeof body !== 'string') return 1;

  const parsed = JSON.parse(body) as { messages?: Array<{ role?: string; content?: string }> };
  const prompt = parsed.messages?.find((message) => message.role === 'user')?.content ?? '';
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
      });
      if (session.session_number === 1) {
        expect(session.exercises[0]?.description).toBe('Posture confortable et mouvement contrôlé');
        expect(session.exercises[0]?.sets).toBe(5);
        expect(session.exercises[0]?.reps).toBe('8-10');
        expect(session.exercises[0]?.tips).toBe('Gardez une intensité confortable.');
      }
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
            json: () =>
              Promise.resolve({
                choices: [{ finish_reason: 'stop', message: { content: wrappedJson } }],
              }),
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
            json: () =>
              Promise.resolve({
                choices: [
                  { finish_reason: 'stop', message: { content: JSON.stringify(invalidWeek) } },
                ],
              }),
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
        json: () =>
          Promise.resolve({
            choices: [{ finish_reason: 'stop', message: { content: 'pas du JSON' } }],
          }),
      });

      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toThrow(AppError);
      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it('lance AppError.serviceUnavailable sur erreur HTTP du provider (429)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' });

      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toMatchObject({
        statusCode: 503,
      });
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
        const response =
          weekNumber === 1
            ? {
                choices: [
                  { finish_reason: 'stop', message: { content: JSON.stringify(invalidWeek) } },
                ],
              }
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

    it('régénère une durée incohérente sans étirer les exercices ni effacer les consignes', async () => {
      const attempts = new Map<number, number>();
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const weekNumber = getWeekNumberFromFetchInit(init);
        const attempt = (attempts.get(weekNumber) ?? 0) + 1;
        attempts.set(weekNumber, attempt);
        const week = validWeekResponse(weekNumber);
        if (weekNumber === 1 && attempt === 1)
          week.sessions[0]!.exercises[0]!.duration_seconds = 20;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(week) } }],
            }),
        });
      });
      const result = await generateProgram(defaultInput, mockAiConfig);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.weeks[0]!.sessions[0]!.exercises[0]!.duration_seconds).toBe(1260);
      expect(result.weeks[0]!.sessions[0]!.exercises[0]!.tips).toBe(
        'Gardez une intensité confortable.',
      );
    });

    it('une erreur permanente annule la semaine voisine et ne déclenche pas de retry', async () => {
      let siblingAborted = false;
      mockFetch.mockImplementation((_url: unknown, init: unknown) => {
        const weekNumber = getWeekNumberFromFetchInit(init);
        if (weekNumber === 1)
          return Promise.resolve({
            ok: false,
            status: 401,
            headers: new Headers(),
            json: () => Promise.resolve({ error: { code: 'invalid_api_key' } }),
          });
        const signal = (init as RequestInit).signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            siblingAborted = true;
            reject(new Error('aborted'));
          });
        });
      });
      await expect(generateProgram(defaultInput, mockAiConfig)).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(siblingAborted).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('passe les hooks de budget à chaque appel et garde les consignes hors du message utilisateur', async () => {
      mockSuccessfulWeeksByPrompt();
      const onAttempt = vi.fn();
      await generateProgram(defaultInput, mockAiConfig, { onAttempt });
      expect(onAttempt).toHaveBeenCalledTimes(2);
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      if (typeof init.body !== 'string') throw new Error('Corps JSON attendu dans le mock HTTP');
      const body = JSON.parse(init.body) as {
        messages: [{ role: string; content: string }, { role: string; content: string }];
      };
      expect(body.messages[0].role).toBe('developer');
      expect(body.messages[0].content).not.toContain(defaultInput.goals);
      expect(body.messages[1].content).toContain(defaultInput.goals);
      expect(body.messages[1].content).not.toContain('charges maximales, volume eleve');
    });
  });
});
