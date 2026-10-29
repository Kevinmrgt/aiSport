import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { resolveGoogleIdentity } from '../src/repositories/identity.repository.js';
import { assertGoogleSessionActive } from '../src/services/account-session.service.js';
import type * as AccountSession from '../src/services/account-session.service.js';

const MOCK_DB_UUID = 'db-uuid-from-upsert';

// Identity persistence has its own PostgreSQL integration tests.
vi.mock('../src/repositories/identity.repository.js', () => ({
  resolveGoogleIdentity: vi.fn().mockResolvedValue('db-uuid-from-upsert'),
}));
vi.mock('../src/services/account-session.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountSession>()),
  assertGoogleSessionActive: vi.fn().mockResolvedValue(undefined),
}));

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
    vi.clearAllMocks();
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
    const issuedAt = Date.now();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: {
          'x-internal-secret': VALID_SECRET,
          'x-user-id': 'user-abc',
          'x-user-email': 'user@example.com',
          'x-auth-issued-at': String(issuedAt),
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      userId: string;
      email: string;
    };
    expect(body.userId).toBe(MOCK_DB_UUID);
    expect(body.email).toBe('user@example.com');
    expect(resolveGoogleIdentity).toHaveBeenCalledWith({
      subject: 'user-abc',
      email: 'user@example.com',
      name: null,
      issuedAt,
    });
    expect(assertGoogleSessionActive).toHaveBeenCalledBefore(vi.mocked(resolveGoogleIdentity));
  });

  it('refuse une session sans date avant toute résolution ou recréation de compte', async () => {
    const res = await createApp().request('/protected', {
      headers: {
        'x-internal-secret': VALID_SECRET,
        'x-user-id': 'google-sub',
        'x-user-email': 'user@example.com',
      },
    });
    expect(res.status).toBe(401);
    expect(resolveGoogleIdentity).not.toHaveBeenCalled();
  });

  it('decode un nom Unicode borne et rejette un encodage invalide avant la base', async () => {
    const issuedAt = Date.now();
    const headers = {
      'x-internal-secret': VALID_SECRET,
      'x-user-id': 'google-unicode',
      'x-user-email': 'synthetic@example.test',
      'x-auth-issued-at': String(issuedAt),
      'x-user-name-encoded': encodeURIComponent('张伟 💪 Élodie'),
    };
    expect((await createApp().request('/protected', { headers })).status).toBe(200);
    expect(resolveGoogleIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ name: '张伟 💪 Élodie' }),
    );
    vi.mocked(resolveGoogleIdentity).mockClear();
    for (const invalid of ['%ZZ', '%0Ainjection', 'x'.repeat(4097)]) {
      expect(
        (
          await createApp().request('/protected', {
            headers: {
              ...headers,
              'x-user-name-encoded': invalid,
            },
          })
        ).status,
      ).toBe(400);
    }
    expect(resolveGoogleIdentity).not.toHaveBeenCalled();
  });

  it('rejette un sujet contenant des espaces avant de résoudre le compte', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/protected', {
        headers: {
          'x-internal-secret': VALID_SECRET,
          'x-user-id': 'bad subject',
          'x-user-email': 'user@example.com',
        },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("retourne 401 si SERVICE_SECRET n'est pas configuré", async () => {
    delete process.env['SERVICE_SECRET'];
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': VALID_SECRET, 'x-user-id': 'user-123' },
      }),
    );

    expect(res.status).toBe(401);
  });

  it("console.warn est appelé lors d'un secret invalide (OWASP A09)", async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = createApp();

    await app.fetch(
      new Request('http://localhost/protected', {
        headers: { 'x-internal-secret': 'bad', 'x-user-id': 'user-123' },
      }),
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Auth]'), expect.any(Object));
    warnSpy.mockRestore();
  });
});
