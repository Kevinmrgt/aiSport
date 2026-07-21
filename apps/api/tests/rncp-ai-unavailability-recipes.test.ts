import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerateWorkoutInput } from '@alcide/shared';
import { generateWorkout } from '../src/services/workout-ai.service.js';

const fetchMock = vi.fn();

const input: GenerateWorkoutInput = {
  sport: 'course',
  level: 'intermediate',
  duration_minutes: 30,
  goals: 'Travailler le rythme',
};

const aiConfig = {
  provider: 'openai' as const,
  apiKey: 'test-key',
  model: 'gpt-5.4-mini',
};

describe('CR-013 - indisponibilite OpenAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [429, 'Too Many Requests'],
    [503, 'Service Unavailable'],
  ])(
    'convertit la reponse HTTP %i du fournisseur en erreur metier 503',
    async (status, statusText) => {
      fetchMock.mockResolvedValue({ ok: false, status, statusText });

      await expect(generateWorkout(input, aiConfig)).rejects.toMatchObject({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('interrompt le fournisseur apres 45 secondes et ne retente pas', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('This operation was aborted', 'AbortError'));
          });
        }),
    );

    const generation = generateWorkout(input, aiConfig);
    const assertion = expect(generation).rejects.toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
    await vi.advanceTimersByTimeAsync(45_000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
