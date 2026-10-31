// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/server-api', () => ({ serverFetch: mocks.fetch }));
import { POST } from './route';
function request(
  body: unknown = { kind: 'unhandled_error', path: '/dashboard' },
  headers: Record<string, string> = {},
) {
  return new Request('https://app.test/api/incidents', {
    method: 'POST',
    headers: { origin: 'https://app.test', 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('AUTH_URL', 'https://app.test');
  vi.stubEnv('NEXTAUTH_URL', undefined);
  mocks.auth.mockResolvedValue({ user: { id: 'session-user' } });
  mocks.fetch.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
describe('POST /api/incidents', () => {
  it('accepte l’origine publique configurée derrière une écoute interne sans croire les en-têtes proxy', async () => {
    const req = new Request('http://127.0.0.1:3007/api/incidents', {
      method: 'POST',
      headers: {
        origin: 'https://app.test',
        'content-type': 'application/json',
        'x-forwarded-host': 'foreign.test',
      },
      body: '{"kind":"unhandled_error","path":"/dashboard"}',
    });
    expect((await POST(req)).status).toBe(204);
    const forged = request(undefined, {
      origin: 'https://foreign.test',
      'x-forwarded-host': 'foreign.test',
    });
    expect((await POST(forged)).status).toBe(403);
  });
  it('utilise la session serveur et canonicalise avant le transfert', async () => {
    const result = await POST(
      request({ kind: 'react_boundary', path: '/workouts/private-id?token=secret' }),
    );
    expect(result.status).toBe(204);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      '/incidents',
      { method: 'POST', body: '{"kind":"react_boundary","path":"/workouts/:id"}' },
      2_000,
    );
  });
  it.each(['https://evil.test', 'null', ''])(
    'refuse une origine tierce ou absente %s',
    async (origin) => {
      const req = request(undefined, { origin });
      if (origin === '') req.headers.delete('origin');
      expect((await POST(req)).status).toBe(403);
      expect(mocks.auth).not.toHaveBeenCalled();
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it('refuse les sessions absentes et ne permet pas de choisir son identité', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ user: { id: 'session-user' } });
    expect(
      (await POST(request({ kind: 'unhandled_error', path: '/', userId: 'forged' }))).status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    'not-json',
    { kind: 'arbitrary', path: '/' },
    { kind: 'unhandled_error', path: '/', message: 'private' },
  ])('refuse les données non prévues', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('borne aussi le corps réel sans content-length et vérifie le type', async () => {
    expect((await POST(request(' '.repeat(1_025)))).status).toBe(413);
    expect((await POST(request(undefined, { 'content-length': '99999' }))).status).toBe(413);
    expect((await POST(request(undefined, { 'content-type': 'text/plain' }))).status).toBe(415);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('échoue silencieusement sans fuite ni nouvelle collecte', async () => {
    mocks.fetch.mockRejectedValue(new Error('sensitive internal failure'));
    const response = await POST(request());
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
});
