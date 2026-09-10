import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { betaPasswordChangedMiddleware } from '../src/middleware/beta-password.middleware.js';
import { credentialRateLimitMiddleware } from '../src/middleware/credential-rate-limit.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { internalSecretMiddleware } from '../src/middleware/internal-secret.middleware.js';

function protectedApp() {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', internalSecretMiddleware);
  app.get('/', (ctx) => ctx.json({ ok: true }));
  return app;
}

describe('beta security middlewares', () => {
  beforeEach(() => { vi.stubEnv('SERVICE_SECRET', 'secret'); });

  it('refuse un secret interne absent ou incorrect et laisse passer le bon', async () => {
    expect((await protectedApp().request('/')).status).toBe(401);
    expect((await protectedApp().request('/', { headers: { 'x-internal-secret': 'wrong' } })).status).toBe(401);
    expect((await protectedApp().request('/', { headers: { 'x-internal-secret': 'secret' } })).status).toBe(200);
  });

  it('bloque uniquement les beta-testeurs qui doivent changer leur mot de passe', async () => {
    const app = new Hono();
    app.onError(handleError);
    app.use('*', async (ctx, next) => { ctx.set('auth', { accessMode: 'beta', mustChangePassword: true }); await next(); });
    app.use('*', betaPasswordChangedMiddleware);
    app.get('/', (ctx) => ctx.json({ ok: true }));
    expect((await app.request('/')).status).toBe(403);

    const standard = new Hono();
    standard.onError(handleError);
    standard.use('*', async (ctx, next) => { ctx.set('auth', { accessMode: 'standard', mustChangePassword: true }); await next(); });
    standard.use('*', betaPasswordChangedMiddleware);
    standard.get('/', (ctx) => ctx.json({ ok: true }));
    expect((await standard.request('/')).status).toBe(200);
  });

  it('mémorise les identifiants et limite la onzième tentative sur la même adresse', async () => {
    const app = new Hono();
    app.onError(handleError);
    app.post('/', credentialRateLimitMiddleware, (ctx) => ctx.json({ received: ctx.get('betaCredentials') }));
    const email = `limit-${Date.now()}@example.com`;
    for (let index = 0; index < 10; index += 1) {
      const response = await app.request('/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'x' }) });
      expect(response.status).toBe(200);
    }
    const limited = await app.request('/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'x' }) });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    const invalid = await app.request('/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' });
    expect(invalid.status).toBe(200);
  });
});
