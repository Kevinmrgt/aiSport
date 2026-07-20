import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/lib/auth';
import { isServerApiNotFound, ServerApiError, serverApi } from './server-api';

const authMock = vi.mocked(auth);

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('serverApi', () => {
  beforeEach(() => {
    authMock.mockResolvedValue({
      user: { id: 'user-1', email: 'sportif@example.test', name: 'Sportif Test' },
    } as never);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env['SERVICE_SECRET'] = 'secret-test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('refuse tout appel sans session avant de contacter l API', async () => {
    authMock.mockResolvedValue(null as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(serverApi.getStats()).rejects.toThrow('Non authentifie');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('transmet l identite serveur et encode les filtres de liste', async () => {
    const fetchMock = vi
      .fn<(url: string, init: RequestInit) => Promise<Response>>()
      .mockResolvedValue(response({ workouts: [], total: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    await serverApi.getWorkouts({ page: 2, limit: 5, sport: 'course a pied', level: 'beginner' });

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(
      'http://localhost:3001/workouts?page=2&limit=5&sport=course+a+pied&level=beginner',
    );
    expect(call?.[1].signal).toBeInstanceOf(AbortSignal);
    expect(call?.[1].headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-internal-secret': 'secret-test',
      'x-user-id': 'user-1',
      'x-user-email': 'sportif@example.test',
      'x-user-name': 'Sportif Test',
    });
  });

  it('couvre les routes de seances, programmes, suivi et parametres', async () => {
    const fetchMock = vi
      .fn<(url: string, init: RequestInit) => Promise<Response>>()
      .mockResolvedValue(response({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await serverApi.generateWorkout({ sport: 'course' } as never);
    await serverApi.getStats();
    await serverApi.getWorkout('workout-1');
    await serverApi.deleteWorkout('workout-1');
    await serverApi.generateProgram({ sport: 'course' } as never);
    await serverApi.getPrograms({ page: 3, limit: 4 });
    await serverApi.getProgram('program-1');
    await serverApi.deleteProgram('program-1');
    await serverApi.createSessionLog({ sourceType: 'workout' } as never);
    await serverApi.getSessionLogStats();
    await serverApi.getRecentSessionLogs();
    await serverApi.getRecentSessionLogs(12);
    await serverApi.getAiSettings();
    await serverApi.saveAiSettings({ model: 'gpt-5.4-mini' });

    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url,
      method: init.method ?? 'GET',
      body: init.body,
    }));
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'http://localhost:3001/workouts/generate', method: 'POST' }),
        expect.objectContaining({ url: 'http://localhost:3001/workouts/workout-1', method: 'DELETE' }),
        expect.objectContaining({ url: 'http://localhost:3001/programs?page=3&limit=4' }),
        expect.objectContaining({ url: 'http://localhost:3001/session-logs/recent?limit=5' }),
        expect.objectContaining({ url: 'http://localhost:3001/session-logs/recent?limit=12' }),
        expect.objectContaining({
          url: 'http://localhost:3001/settings',
          method: 'PUT',
          body: JSON.stringify({ model: 'gpt-5.4-mini' }),
        }),
      ]),
    );
  });

  it('qualifie une reponse 404 avec un type d erreur exploitable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ message: 'Introuvable' }, 404)));

    const error = await serverApi.getWorkout('absent').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServerApiError);
    expect(error).toMatchObject({ message: 'Introuvable', status: 404 });
    expect(isServerApiNotFound(error)).toBe(true);
    expect(isServerApiNotFound(new Error('autre'))).toBe(false);
  });

  it('utilise un message HTTP de repli lorsque le JSON d erreur est invalide', async () => {
    const invalidJson = vi.fn().mockRejectedValue(new Error('JSON invalide'));
    const invalid = {
      ...response({}, 502),
      json: invalidJson,
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(invalid));

    await expect(serverApi.getStats()).rejects.toMatchObject({
      message: 'Erreur API: 502',
      status: 502,
    });
  });

  it('transforme l expiration du delai en erreur 504', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      ),
    );

    const request = expect(serverApi.getStats()).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(15_000);

    await request;
  });
});
