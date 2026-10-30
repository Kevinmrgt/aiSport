import type { AiAttempt, AiUsage } from '../src/services/ai.service.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AiAccountingError,
  AiCancelledError,
  AiProviderError,
  AiResponseError,
  callAiProvider,
  waitForAiRetry,
} from '../src/services/ai.service.js';
import { AppError } from '../src/types/app-error.js';

const fetchMock = vi.fn();
const config = { provider: 'openai' as const, apiKey: 'test-only', model: 'gpt-5.4-mini' };
function response(overrides: object = {}) {
  return {
    ok: true,
    headers: new Headers({ 'x-request-id': 'request-test' }),
    json: () =>
      Promise.resolve({
        model: config.model,
        choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        ...overrides,
      }),
  };
}

describe('contrat fournisseur IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('réserve avant HTTP, sépare instructions et données et mesure la consommation', async () => {
    const events: string[] = [];
    fetchMock.mockImplementation(() => {
      events.push('fetch');
      return Promise.resolve(response());
    });
    const usage = vi.fn(() => {
      events.push('usage');
    });
    const result = await callAiProvider(config, 'données utilisateur', {
      systemMessage: 'règles prioritaires',
      onAttempt: (attempt) => {
        events.push('reserve');
        expect(attempt.maxCompletionTokens).toBe(2048);
        expect(attempt.inputTokensUpperBound).toBe(
          new TextEncoder().encode('règles prioritairesdonnées utilisateur').byteLength + 256,
        );
      },
      onUsage: usage,
    });
    expect(events).toEqual(['reserve', 'fetch', 'usage']);
    expect(result).toBe('{"ok":true}');
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    if (typeof init.body !== 'string') throw new Error('Corps JSON attendu dans le mock HTTP');
    const body = JSON.parse(init.body) as {
      messages: Array<{ role: string; content: string }>;
      store: boolean;
    };
    expect(body.messages).toEqual([
      { role: 'developer', content: 'règles prioritaires' },
      { role: 'user', content: 'données utilisateur' },
    ]);
    expect(body.store).toBe(false);
    expect(usage).toHaveBeenCalledWith(
      {
        receiptId: expect.any(String) as string,
        model: config.model,
        inputTokens: 12,
        outputTokens: 8,
        totalTokens: 20,
        requestId: 'request-test',
      },
      expect.objectContaining({
        receiptId: expect.any(String) as string,
        maxCompletionTokens: 2048,
      }),
    );
  });

  it('refuse un appel quand la réservation échoue, sans consommation fournisseur', async () => {
    await expect(
      callAiProvider(config, 'data', {
        onAttempt: () => {
          throw AppError.tooManyRequests('Budget épuisé');
        },
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuse une panne du suivi budgétaire sans exposer son erreur interne', async () => {
    await expect(
      callAiProvider(config, 'data', {
        onAttempt: () => {
          throw new Error('secret interne');
        },
      }),
    ).rejects.toBeInstanceOf(AiAccountingError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['refusal', { finish_reason: 'stop', message: { content: null, refusal: 'refus sensible' } }],
    ['truncated', { finish_reason: 'length', message: { content: '{"partiel":true}' } }],
    ['filtered', { finish_reason: 'content_filter', message: { content: null } }],
    ['protocol', { finish_reason: 'tool_calls', message: { content: '{}' } }],
  ])(
    'ne considère pas une réponse %s comme exploitable, mais comptabilise son usage',
    async (reason, choice) => {
      fetchMock.mockResolvedValue(response({ choices: [choice] }));
      const onUsage = vi.fn();
      await expect(callAiProvider(config, 'data', { onUsage })).rejects.toMatchObject({ reason });
      expect(onUsage).toHaveBeenCalledTimes(1);
    },
  );

  it.each([400, 401, 403, 404])('ne réessaie pas un HTTP permanent %i', async (status) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    });
    let error: unknown;
    try {
      await callAiProvider(config, 'data');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AiProviderError);
    expect(await waitForAiRetry(error, Date.now() + 50_000, 5_000)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ne retente pas un quota facturation 429', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: () => Promise.resolve({ error: { code: 'insufficient_quota' } }),
    });
    let error: unknown;
    try {
      await callAiProvider(config, 'data');
    } catch (caught) {
      error = caught;
    }
    expect(await waitForAiRetry(error, Date.now() + 50_000, 5_000)).toBe(false);
  });

  it('respecte Retry-After et abandonne un délai qui dépasse le budget local', async () => {
    vi.useFakeTimers();
    const retry = waitForAiRetry(new AiProviderError(429, true, 2_000), Date.now() + 20_000, 5_000);
    const complete = vi.fn();
    void retry.then(complete);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(complete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await retry).toBe(true);
    expect(
      await waitForAiRetry(new AiProviderError(503, true, 120_000), Date.now() + 50_000, 5_000),
    ).toBe(false);
  });

  it('annule aussi une attente Retry-After sans nouvelle tentative', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const retry = waitForAiRetry(
      new AiProviderError(429, true, 2_000),
      Date.now() + 20_000,
      5_000,
      controller.signal,
    );
    controller.abort();
    expect(await retry).toBe(false);
  });

  it('propage le signal externe aux appels et refuse les requêtes déjà annulées', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const call = callAiProvider(config, 'data', { signal: controller.signal });
    const assertion = expect(call).rejects.toBeInstanceOf(AiCancelledError);
    controller.abort();
    await assertion;
    await expect(
      callAiProvider(config, 'data', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AiCancelledError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('les refus ne sont jamais candidats au retry automatique', async () => {
    expect(await waitForAiRetry(new AiResponseError('refusal'), Date.now() + 50_000, 5_000)).toBe(
      false,
    );
  });
});

describe('HTTP-local immutable accounting receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps heterogeneous bounds with their own usage when parallel HTTP responses arrive backwards', async () => {
    const release: Array<() => void> = [];
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release.push(() => resolve({ ...response(), headers: new Headers() }));
        }),
    );
    const admitted: Array<{
      receiptId?: string;
      maxCompletionTokens: number;
      inputTokensUpperBound: number;
    }> = [];
    const usage = vi.fn<(usage: AiUsage, attempt?: Readonly<AiAttempt>) => void>();
    const onAttempt = (attempt: (typeof admitted)[number]) => {
      expect(Object.isFrozen(attempt)).toBe(true);
      admitted.push(attempt);
    };
    const a = callAiProvider(config, 'small', { maxTokens: 100, onAttempt, onUsage: usage });
    const b = callAiProvider(config, 'much larger prompt', {
      maxTokens: 900,
      onAttempt,
      onUsage: usage,
    });
    await vi.waitFor(() => expect(release).toHaveLength(2));
    release[1]!();
    await b;
    release[0]!();
    await a;
    expect(admitted[0]!.receiptId).not.toBe(admitted[1]!.receiptId);
    expect(usage.mock.calls[0]![0]).toMatchObject({ receiptId: admitted[1]!.receiptId });
    expect(usage.mock.calls[0]![1]).toEqual(admitted[1]);
    expect(usage.mock.calls[1]![1]).toEqual(admitted[0]);
    expect(usage.mock.calls[0]![1]?.maxCompletionTokens).toBe(900);
    expect(usage.mock.calls[1]![1]?.maxCompletionTokens).toBe(100);
  });
  it('reports no confirmed usage when a response omits its usage measurement', async () => {
    fetchMock.mockResolvedValue(response({ usage: undefined }));
    const usage = vi.fn(),
      admission = vi.fn();
    await callAiProvider(config, 'data', { onAttempt: admission, onUsage: usage });
    expect(admission).toHaveBeenCalledOnce();
    expect(usage).not.toHaveBeenCalled();
  });
});
