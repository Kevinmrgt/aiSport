import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { adminMiddleware } from '../src/middleware/admin.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';

function appFor(auth: { email: string; accessMode: 'standard' | 'jury' | 'beta' }) {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', async (ctx, next) => { ctx.set('auth', { userId: 'user', ...auth, mustChangePassword: false, generationBalance: null }); await next(); });
  app.use('*', adminMiddleware);
  app.get('/', (ctx) => ctx.json({ ok: true }));
  return app;
}

describe('adminMiddleware', () => {
  it('autorise exclusivement une session Google dont l e-mail est configuré', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'dev@alcide.test, other@alcide.test');
    await expect(appFor({ email: 'DEV@ALCIDE.TEST', accessMode: 'standard' }).request('/')).resolves.toMatchObject({ status: 200 });
    await expect(appFor({ email: 'intrus@alcide.test', accessMode: 'standard' }).request('/')).resolves.toMatchObject({ status: 403 });
    await expect(appFor({ email: 'dev@alcide.test', accessMode: 'beta' }).request('/')).resolves.toMatchObject({ status: 403 });
    vi.unstubAllEnvs();
  });
});
