import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context } from 'hono';
const mocks = vi.hoisted(() => ({
  listAdminIncidents: vi.fn(),
  updateAdminIncident: vi.fn(),
  recordBrowserIncident: vi.fn(),
}));
vi.mock('../src/repositories/incident.repository.js', () => mocks);
vi.mock('../src/services/incident.service.js', () => ({
  recordBrowserIncident: mocks.recordBrowserIncident,
  captureFailure: vi.fn(),
}));
vi.mock('../src/db/index.js', () => ({ db: {} }));
vi.mock('../src/middleware/auth.middleware.js', () => ({
  authMiddleware: async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.req.header('x-user-email')) return ctx.json({}, 401);
    ctx.set('auth', {
      userId: ctx.req.header('x-user-id') ?? 'test-user',
      email: ctx.req.header('x-user-email')!,
      accessMode: 'standard',
      mustChangePassword: false,
      generationBalance: null,
    });
    await next();
  },
}));
import { incidentRouter } from '../src/routes/incident.routes.js';
import { adminBetaRouter } from '../src/routes/admin-beta.routes.js';
import { handleError } from '../src/middleware/error.middleware.js';
const headers = {
  'x-user-email': 'admin@alcide.invalid',
  'x-email-verified': 'true',
  'content-type': 'application/json',
};
const id = '11111111-1111-4111-8111-111111111111';
function app() {
  const app = new Hono();
  app.onError(handleError);
  app.route('/incidents', incidentRouter);
  app.route('/admin', adminBetaRouter);
  return app;
}
describe('incident routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_EMAILS', 'admin@alcide.invalid');
    mocks.listAdminIncidents.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
  });
  afterEach(() => vi.unstubAllEnvs());
  it('requires authentication and administrator rights for reads and mutations', async () => {
    for (const [path, method] of [
      ['/admin/incidents', 'GET'],
      ['/admin/incidents/' + id, 'PATCH'],
    ]) {
      expect((await app().request(path!, { method })).status).toBe(401);
      expect(
        (
          await app().request(path!, {
            method,
            headers: { ...headers, 'x-user-email': 'member@alcide.invalid' },
          })
        ).status,
      ).toBe(403);
    }
    expect(mocks.listAdminIncidents).not.toHaveBeenCalled();
    expect(mocks.updateAdminIncident).not.toHaveBeenCalled();
  });
  it('validates filters and mutation, takes the audit actor from auth', async () => {
    expect(
      (await app().request('/admin/incidents?source=ai&severity=error&status=new', { headers }))
        .status,
    ).toBe(200);
    expect(mocks.listAdminIncidents).toHaveBeenCalledWith({
      page: 1,
      source: 'ai',
      severity: 'error',
      status: 'new',
    });
    expect((await app().request('/admin/incidents?from=2026-02-30', { headers })).status).toBe(400);
    mocks.updateAdminIncident.mockResolvedValue({ id, status: 'resolved' });
    expect(
      (
        await app().request('/admin/incidents/' + id, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'resolved' }),
        })
      ).status,
    ).toBe(200);
    expect(mocks.updateAdminIncident).toHaveBeenCalledWith(id, 'resolved', 'admin@alcide.invalid');
    expect(
      (
        await app().request('/admin/incidents/' + id, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'resolved', actor: 'forged' }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app().request('/admin/incidents/invalid', {
          method: 'PATCH',
          headers,
          body: '{"status":"resolved"}',
        })
      ).status,
    ).toBe(400);
  });
  it('accepts only authenticated bounded browser reports, rate limits and returns 204', async () => {
    const payload = JSON.stringify({ kind: 'unhandled_error', path: '/dashboard' });
    expect((await app().request('/incidents', { method: 'POST', body: payload })).status).toBe(401);
    const browserHeaders = { ...headers, 'x-user-id': 'browser-test' };
    for (let i = 0; i < 10; i++)
      expect(
        (
          await app().request('/incidents', {
            method: 'POST',
            headers: browserHeaders,
            body: payload,
          })
        ).status,
      ).toBe(204);
    const blocked = await app().request('/incidents', {
      method: 'POST',
      headers: browserHeaders,
      body: payload,
    });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).not.toBeNull();
    expect(mocks.recordBrowserIncident).toHaveBeenCalledTimes(10);
    expect(
      (
        await app().request('/incidents', {
          method: 'POST',
          headers: { ...headers, 'x-user-id': 'invalid-browser' },
          body: JSON.stringify({ kind: 'react_boundary', path: '/dashboard', message: 'secret' }),
        })
      ).status,
    ).toBe(400);
  });
});
