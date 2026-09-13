import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Hono, type Context } from 'hono';
import { handleError } from '../src/middleware/error.middleware.js';
const repository = vi.hoisted(() => ({
  getAdminSummary: vi.fn(),
  listAdminMembers: vi.fn(),
  getAdminMember: vi.fn(),
  listAdminSubscriptions: vi.fn(),
  listAdminCredits: vi.fn(),
  listAdminAudit: vi.fn(),
  listAdminContents: vi.fn(),
  getAdminContent: vi.fn(),
  suspendAdminMember: vi.fn(),
  grantAdminCredits: vi.fn(),
}));
vi.mock('../src/repositories/admin.repository.js', () => repository);
vi.mock('../src/middleware/auth.middleware.js', () => ({
  authMiddleware: async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.req.header('x-user-email')) return ctx.json({}, 401);
    ctx.set('auth', {
      userId: '11111111-1111-4111-8111-111111111111',
      email: ctx.req.header('x-user-email')!,
      accessMode: ctx.req.header('x-mode') ?? 'standard',
    });
    await next();
  },
}));
vi.mock('../src/db/index.js', () => ({ db: {} }));
import { adminBetaRouter } from '../src/routes/admin-beta.routes.js';
const id = '11111111-1111-4111-8111-111111111111';
function app() {
  const a = new Hono();
  a.onError(handleError);
  a.route('/admin', adminBetaRouter);
  return a;
}
const headers = { 'x-user-email': 'admin@example.com', 'content-type': 'application/json' };
describe('administration HTTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.com');
    repository.listAdminMembers.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    '/members',
    '/members/' + id,
    '/credits',
    '/audit',
    '/workouts',
    '/programs',
    '/subscriptions',
    '/platform-settings',
  ])('protège la lecture %s', async (path) => {
    expect((await app().request('/admin' + path)).status).toBe(401);
    for (const identity of [
      { 'x-user-email': 'member@example.com' },
      { ...headers, 'x-mode': 'jury' },
      { ...headers, 'x-mode': 'beta' },
    ])
      expect((await app().request('/admin' + path, { headers: identity })).status).toBe(403);
    expect(repository.listAdminMembers).not.toHaveBeenCalled();
  });
  it('valide les filtres et interdit la mise en cache', async () => {
    const response = await app().request('/admin/members?q=Elodie&page=2&beta=empty', { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(repository.listAdminMembers).toHaveBeenCalledWith({
      q: 'Elodie',
      page: 2,
      beta: 'empty',
    });
    for (const query of [
      'page=0',
      'page=1.5',
      'userId=invalid',
      'from=2026-02-30',
      'from=2026-09-10&to=2026-01-01',
    ])
      expect((await app().request('/admin/members?' + query, { headers })).status).toBe(400);
  });
  it('valide les mutations et utilise l’auteur authentifié', async () => {
    let r = await app().request('/admin/members/' + id + '/suspension', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        suspended: true,
        reason: 'Contrôle du compte',
        actorEmail: 'forged@example.com',
      }),
    });
    expect(r.status).toBe(200);
    expect(repository.suspendAdminMember).toHaveBeenCalledWith(
      id,
      true,
      'Contrôle du compte',
      'admin@example.com',
    );
    r = await app().request('/admin/members/' + id + '/credits', {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 5, reason: 'Geste de test', requestId: id }),
    });
    expect(r.status).toBe(200);
    expect(repository.grantAdminCredits).toHaveBeenCalledWith(
      id,
      { amount: 5, reason: 'Geste de test', requestId: id },
      'admin@example.com',
    );
    for (const amount of [0, -1, 1.5, 10001])
      expect(
        (
          await app().request('/admin/members/' + id + '/credits', {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount, reason: 'Test', requestId: id }),
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await app().request('/admin/members/' + id + '/suspension', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ suspended: true, reason: '' }),
        })
      ).status,
    ).toBe(400);
  });
  it('interdit les mutations aux non-administrateurs', async () => {
    for (const mode of ['jury', 'beta'])
      expect(
        (
          await app().request('/admin/members/' + id + '/credits', {
            method: 'POST',
            headers: { ...headers, 'x-mode': mode },
            body: JSON.stringify({ amount: 5, reason: 'Test', requestId: id }),
          })
        ).status,
      ).toBe(403);
    expect(repository.grantAdminCredits).not.toHaveBeenCalled();
  });
});
