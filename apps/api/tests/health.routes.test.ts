import { describe, expect, it } from 'vitest';

import { healthRouter } from '../src/routes/health.routes.js';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  version: string;
};

describe('healthRouter', () => {
  it('returns an uncached ok status with the application version', async () => {
    const response = await healthRouter.request('/');
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(body).toMatchObject({
      status: 'ok',
      service: 'alcide-api',
      version: '0.12.0',
    });
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
