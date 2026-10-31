import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiAccountingError, callAiProvider } from '../src/services/ai.service.js';

const incident = vi.hoisted(() => vi.fn());
vi.mock('../src/services/incident.service.js', () => ({ captureIncident: incident }));

describe('incident reporting preserves the mandatory AI accounting gate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it.each(['onAttempt', 'onUsage'] as const)(
    'reports an absent %s and refuses the HTTP call',
    async (missing) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      const options = missing === 'onAttempt' ? { onUsage: vi.fn() } : { onAttempt: vi.fn() };
      await expect(
        callAiProvider({ provider: 'openai', apiKey: 'synthetic' }, 'synthetic', options),
      ).rejects.toBeInstanceOf(AiAccountingError);
      expect(fetch).not.toHaveBeenCalled();
      expect(incident).toHaveBeenCalledWith({
        source: 'ai',
        code: 'AI_ACCOUNTING_ERROR',
        statusCode: 503,
      });
    },
  );
  it('reports a rejected accounting admission without retaining its raw error or contacting the provider', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      callAiProvider({ provider: 'openai', apiKey: 'synthetic' }, 'synthetic', {
        onAttempt: vi.fn().mockRejectedValue(new Error('synthetic-private-database-value')),
        onUsage: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AiAccountingError);
    expect(fetch).not.toHaveBeenCalled();
    expect(incident).toHaveBeenCalledWith({
      source: 'ai',
      code: 'AI_ACCOUNTING_ERROR',
      statusCode: 503,
    });
    expect(JSON.stringify(incident.mock.calls)).not.toContain('synthetic-private-database-value');
  });
});
