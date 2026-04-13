import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';

// OWASP A01: tests de la validation du secret service-to-service
function createApp() {
  const app = new Hono();
  app.onError(handleError);
  app.use('*', authMiddleware);
  app.get('/protected', (ctx) => {
    const auth = ctx.get('auth');
    return ctx.json(auth);
  });
  return app;
}

const VALID_SECRET = 'test-service-secret';

describe('authMiddleware', () => {
  beforeEach(() => {
    process.env['SERVICE_SECRET'] = VALID_SECRET;
  });

  afterEach(() => {
    delete process.env['SERVICE_SECRET'];
  });

  it('retourne 401 si le header x-internal-secret est absent', async () => {
    const app = createApp();
    const res = await app.fetch(new Request('http://localhost/protected'));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('retourne 401 si le secret est incorrect', async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': 'wrong-secret', 'x-user-id': 'user-123' },
      }),
    );

    expect(res.status).toBe(401);
  });

  it('retourne 401 si le secret est correct mais x-user-id est absent', async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': VALID_SECRET },
      }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('peuple ctx.auth et appelle next() si le secret et x-user-id sont valides', async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: {
          'x-internal-secret': VALID_SECRET,
          'x-user-id': 'user-abc',
          'x-user-email': 'user@example.com',
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; email: string };
    expect(body.userId).toBe('user-abc');
    expect(body.email).toBe('user@example.com');
  });

  it('retourne 401 si SERVICE_SECRET n\'est pas configuré', async () => {
    delete process.env['SERVICE_SECRET'];
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': VALID_SECRET, 'x-user-id': 'user-123' },
      }),
    );

    expect(res.status).toBe(401);
  });

  it('console.warn est appelé lors d\'un secret invalide (OWASP A09)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = createApp();

    await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': 'bad', 'x-user-id': 'user-123' },
      }),
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Auth]'),
      expect.any(Object),
    );
    warnSpy.mockRestore();
  });
});
