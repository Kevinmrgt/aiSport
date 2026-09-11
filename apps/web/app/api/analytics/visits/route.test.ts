import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

describe('POST /api/analytics/visits', () => {
  const fetchMock = vi.fn();
  const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('API_URL', 'https://api.alcide.test');
    vi.stubEnv('SERVICE_SECRET', 'service-secret');
    fetchMock.mockReset();
    warnMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  afterAll(() => warnMock.mockRestore());

  it('transmet une visite au service interne sans exposer son secret', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(
      new Request('https://app.alcide.test/api/analytics/visits', {
        method: 'POST',
        headers: { origin: 'https://app.alcide.test' },
      }),
    );

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledWith('https://api.alcide.test/analytics/visits', {
      method: 'POST',
      headers: { 'x-internal-secret': 'service-secret' },
      cache: 'no-store',
    });
  });

  it('refuse une origine tierce sans appeler le service interne', async () => {
    const response = await POST(
      new Request('https://app.alcide.test/api/analytics/visits', {
        method: 'POST',
        headers: { origin: 'https://third-party.test' },
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
