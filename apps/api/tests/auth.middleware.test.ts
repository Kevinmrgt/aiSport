import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';

const MOCK_DB_UUID = 'db-uuid-from-upsert';
const { insertMock, valuesMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
}));

// Mock DB — évite la connexion réelle en tests unitaires
vi.mock('../src/db/index.js', () => ({
  db: {
    insert: insertMock.mockImplementation(() => ({
      values: valuesMock.mockImplementation(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: MOCK_DB_UUID }]),
        })),
      })),
    })),
  },
}));
vi.mock('../src/db/schema.js', () => ({ users: {} }));

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
    const body = (await res.json()) as {
      userId: string;
      email: string;
      accessMode: string;
    };
    expect(body.userId).toBe(MOCK_DB_UUID);
    expect(body.email).toBe('user@example.com');
    expect(body.accessMode).toBe('standard');
  });

  it('propage le mode jury depuis le contexte service-to-service', async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: {
          'x-internal-secret': VALID_SECRET,
          'x-user-id': 'jury-session',
          'x-user-email': 'jury@alcide.invalid',
          'x-auth-method': 'jury',
        },
      }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()) as object).toMatchObject({ accessMode: 'jury' });
  });

  it.each(['Jury — Alcide', '東京 太郎', 'Élodie 🏃'])(
    'restitue le nom Unicode %s à la base sans changer l identité',
    async (name) => {
      const res = await createApp().fetch(
        new Request('http://localhost/protected', {
          headers: {
            'x-internal-secret': VALID_SECRET,
            'x-user-id': 'user-abc',
            'x-user-email': 'user@example.com',
            'x-user-name-utf8': encodeURIComponent(name),
            'x-user-name': 'Ancien nom',
          },
        }),
      );

      expect(res.status).toBe(200);
      expect(valuesMock).toHaveBeenCalledWith({ email: 'user@example.com', name });
      expect(await res.json()).toMatchObject({
        userId: MOCK_DB_UUID,
        email: 'user@example.com',
      });
    },
  );

  it('préserve les pourcentages littéraux de l ancien en-tête', async () => {
    const name = '100% Max %C3%A9';
    const res = await createApp().fetch(
      new Request('http://localhost/protected', {
        headers: {
          'x-internal-secret': VALID_SECRET,
          'x-user-id': 'user-abc',
          'x-user-email': 'user@example.com',
          'x-user-name': name,
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith({ email: 'user@example.com', name });
  });

  it.each(['%', '%ZZ', '%E2%28', '%ED%A0%80'])(
    'rejette le nouvel en-tête mal encodé %s avant tout accès base',
    async (encodedName) => {
      const res = await createApp().fetch(
        new Request('http://localhost/protected', {
          headers: {
            'x-internal-secret': VALID_SECRET,
            'x-user-id': 'user-abc',
            'x-user-email': 'user@example.com',
            'x-user-name-utf8': encodedName,
            'x-user-name': 'Ancien nom',
          },
        }),
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        error: 'BAD_REQUEST',
        message: 'Encodage du nom utilisateur invalide',
      });
      expect(insertMock).not.toHaveBeenCalled();
    },
  );

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
