import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { handleError } from '../src/middleware/error.middleware.js';
const state = vi.hoisted(() => ({ suspendedAt: null as Date | null, beta: vi.fn() }));
vi.mock('../src/db/index.js', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () =>
            Promise.resolve([
              { id: '11111111-1111-4111-8111-111111111111', suspendedAt: state.suspendedAt },
            ]),
        }),
      }),
    }),
  },
}));
vi.mock('../src/db/schema.js', () => ({ users: {} }));
vi.mock('../src/services/beta-tester.service.js', () => ({ assertActiveBetaSession: state.beta }));
import { authMiddleware } from '../src/middleware/auth.middleware.js';
const headers = {
  'x-internal-secret': 'test-only-service-secret',
  'x-user-id': 'oauth-test',
  'x-user-email': 'member@example.com',
};
function app() {
  const a = new Hono();
  a.onError(handleError);
  a.use('*', authMiddleware);
  a.all('*', (ctx) => ctx.json({ ok: true }));
  return a;
}
describe('suspension persistante', () => {
  beforeEach(() => {
    vi.stubEnv('SERVICE_SECRET', 'test-only-service-secret');
    state.suspendedAt = new Date();
    state.beta.mockResolvedValue({ active: 1, mustChangePassword: 0, generationBalance: 3 });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    '/workouts',
    '/workouts/generate',
    '/programs',
    '/session-logs',
    '/settings',
    '/generation-quota',
    '/admin/members',
    '/billing/checkout',
    '/billing/sync',
  ])('bloque une session existante sur %s', async (path) => {
    const res = await app().request(path, {
      headers,
      method:
        path.includes('generate') || path.includes('checkout') || path.includes('sync')
          ? 'POST'
          : 'GET',
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'ACCOUNT_SUSPENDED' });
  });
  it.each([
    ['GET', '/account/status'],
    ['GET', '/billing/status'],
    ['POST', '/billing/portal'],
  ])('conserve %s %s', async (method, path) =>
    expect((await app().request(path, { headers, method })).status).toBe(200),
  );
  it('la réactivation rend la même session à nouveau utilisable', async () => {
    const a = app();
    expect((await a.request('/workouts', { headers })).status).toBe(403);
    state.suspendedAt = null;
    expect((await a.request('/workouts', { headers })).status).toBe(200);
  });
  it('contrôle aussi les sessions bêta', async () => {
    expect(
      (
        await app().request('/workouts', {
          headers: { ...headers, 'x-auth-method': 'beta', 'x-beta-session-version': 'valid' },
        })
      ).status,
    ).toBe(403);
    expect(state.beta).toHaveBeenCalled();
  });
});
