import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimitMiddleware } from '../src/middleware/rate-limit.middleware.js';
import { authMiddleware } from '../src/middleware/auth.middleware.js';
import { handleError } from '../src/middleware/error.middleware.js';

// Mock DB — authMiddleware upsert utilisateur, évite la connexion réelle
vi.mock('../src/db/index.js', () => ({
  db: {
    insert: vi.fn(() => {
      let capturedEmail = 'unknown';
      return {
        values: vi.fn((vals: { email: string; name?: string | null }) => {
          capturedEmail = vals.email;
          return {
            onConflictDoUpdate: vi.fn(() => ({
              returning: vi.fn(() =>
                Promise.resolve([{ id: `uuid-${capturedEmail}` }]),
              ),
            })),
          };
        }),
      };
    }),
  },
}));
vi.mock('../src/db/schema.js', () => ({ users: {} }));

// OWASP A04: tests du rate limiter sur /workouts/generate

const VALID_SECRET = 'test-service-secret';
const USER_ID = 'user-rate-test';

function createApp() {
  const app = new Hono();
  app.onError(handleError);
  // authMiddleware peuple ctx.auth (requis par rateLimitMiddleware)
  app.use('*', authMiddleware);
  app.post('/generate', rateLimitMiddleware, (ctx) => ctx.json({ ok: true }));
  return app;
}

function makeRequest(userId = USER_ID) {
  return new Request('http://localhost/generate', {
    method: 'POST',
    headers: {
      'x-internal-secret': VALID_SECRET,
      'x-user-id': userId,
      'x-user-email': `${userId}@test.com`,
    },
  });
}

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    process.env['SERVICE_SECRET'] = VALID_SECRET;
    // Réinitialiser le store entre les tests via vi.resetModules() n'est pas
    // nécessaire ici — chaque userId unique isolé les tests
  });

  it('autorise les premières requêtes dans la fenêtre', async () => {
    const app = createApp();
    const userId = 'user-allow-test';

    const res = await app.fetch(makeRequest(userId));
    expect(res.status).toBe(200);
  });

  it('retourne 429 après MAX_REQUESTS dans la même fenêtre', async () => {
    const app = createApp();
    const userId = 'user-block-test';

    // 5 requêtes autorisées
    for (let i = 0; i < 5; i++) {
      const res = await app.fetch(makeRequest(userId));
      expect(res.status).toBe(200);
    }

    // 6ème requête → bloquée
    const res = await app.fetch(makeRequest(userId));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('inclut le header Retry-After dans la réponse 429', async () => {
    const app = createApp();
    const userId = 'user-retry-after-test';

    for (let i = 0; i < 5; i++) {
      await app.fetch(makeRequest(userId));
    }

    const res = await app.fetch(makeRequest(userId));
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('isole les fenêtres par userId — un utilisateur différent n\'est pas bloqué', async () => {
    const app = createApp();
    const userId1 = 'user-isolated-1';
    const userId2 = 'user-isolated-2';

    // Épuiser le quota pour userId1
    for (let i = 0; i < 5; i++) {
      await app.fetch(makeRequest(userId1));
    }
    const blocked = await app.fetch(makeRequest(userId1));
    expect(blocked.status).toBe(429);

    // userId2 ne doit pas être affecté
    const allowed = await app.fetch(makeRequest(userId2));
    expect(allowed.status).toBe(200);
  });

  it('console.warn est appelé lors d\'un dépassement de limite (OWASP A09)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = createApp();
    const userId = 'user-warn-test';

    for (let i = 0; i < 5; i++) {
      await app.fetch(makeRequest(userId));
    }
    await app.fetch(makeRequest(userId));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RateLimit]'),
      expect.any(Object),
    );
    warnSpy.mockRestore();
  });
});
