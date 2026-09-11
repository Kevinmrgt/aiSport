import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { handleError } from '../src/middleware/error.middleware.js';

const analytics = vi.hoisted(() => ({ recordPageVisit: vi.fn() }));
vi.mock('../src/repositories/visitor-analytics.repository.js', () => analytics);

import { visitorAnalyticsRouter } from '../src/routes/visitor-analytics.routes.js';

function app() {
  const instance = new Hono();
  instance.onError(handleError);
  instance.route('/analytics', visitorAnalyticsRouter);
  return instance;
}

describe('visitor analytics controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SERVICE_SECRET', 'secret');
  });

  it('accepte uniquement les appels internes et enregistre une visite agrégée', async () => {
    expect((await app().request('/analytics/visits', { method: 'POST' })).status).toBe(401);
    expect(
      (
        await app().request('/analytics/visits', {
          method: 'POST',
          headers: { 'x-internal-secret': 'wrong' },
        })
      ).status,
    ).toBe(401);

    analytics.recordPageVisit.mockResolvedValue(undefined);
    const response = await app().request('/analytics/visits', {
      method: 'POST',
      headers: { 'x-internal-secret': 'secret' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(analytics.recordPageVisit).toHaveBeenCalledTimes(1);
  });
});
