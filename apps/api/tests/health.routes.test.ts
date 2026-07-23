import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/readiness.js', () => ({
  checkReadiness: vi.fn(),
}));

import { healthRouter } from '../src/routes/health.routes.js';
import { checkReadiness } from '../src/lib/readiness.js';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  version: string;
};

describe('healthRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an uncached ok status with the application version', async () => {
    const response = await healthRouter.request('/');
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(body).toMatchObject({
      status: 'ok',
      service: 'alcide-api',
      version: '0.13.0-rc.7',
    });
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('retourne 200 quand PostgreSQL et la configuration IA sont disponibles', async () => {
    vi.mocked(checkReadiness).mockResolvedValue({
      ready: true,
      checks: { database: 'ok', aiConfiguration: 'ok' },
    });

    const response = await healthRouter.request('/ready');
    const body = (await response.json()) as { status: string; checks: unknown };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.checks).toEqual({ database: 'ok', aiConfiguration: 'ok' });
  });

  it('retourne 503 si une dependance critique est indisponible', async () => {
    vi.mocked(checkReadiness).mockResolvedValue({
      ready: false,
      checks: { database: 'unavailable', aiConfiguration: 'ok' },
    });

    const response = await healthRouter.request('/ready');

    expect(response.status).toBe(503);
  });
});
