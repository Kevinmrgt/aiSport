import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
const repository = vi.hoisted(() => ({ recordIncident: vi.fn() }));
vi.mock('../src/repositories/incident.repository.js', () => repository);
import {
  captureFailure,
  createIncidentWriter,
  incidentMiddleware,
  sanitizeIncident,
} from '../src/services/incident.service.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/types/app-error.js';
import { logFailure } from '../src/lib/logging.js';
import { callAiProvider } from '../src/services/ai.service.js';

describe('incident collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.recordIncident.mockResolvedValue(undefined);
  });
  it('drops secrets, IDs, query strings and arbitrary codes before hashing', () => {
    const first = sanitizeIncident({
      route: '/workouts/private-id?token=secret',
      code: 'secret@example.com',
      method: 'POST',
      lastRequestId: 'secret',
    });
    const second = sanitizeIncident({ route: '/workouts/other-id', method: 'POST' });
    expect(first).toEqual(second);
    expect(first.route).toBe('/workouts/:id');
    expect(JSON.stringify(first)).not.toMatch(/secret|private-id/);
    expect(
      sanitizeIncident({
        source: 'web',
        route: '/programs/abc',
        code: 'WEB_REACT_BOUNDARY',
        method: 'BROWSER',
      }).route,
    ).toBe('/programs/:id');
    expect(sanitizeIncident({ route: '/arbitrary/private' }).route).toBe('/unknown');
  });
  it('bounds concurrent writes with no queue and swallows failed persistence', async () => {
    let release!: () => void;
    const persist = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const write = createIncidentWriter(persist, 1);
    const first = write(sanitizeIncident({}));
    await write(sanitizeIncident({}));
    expect(persist).toHaveBeenCalledOnce();
    release();
    await first;
    persist.mockRejectedValueOnce(new Error('private-database-error'));
    await expect(write(sanitizeIncident({}))).resolves.toBeUndefined();
  });
  it('does not start detached database work outside an HTTP request lifecycle', () => {
    captureFailure({ code: 'DB_WRITE_FAILED', statusCode: 500 });
    expect(repository.recordIncident).not.toHaveBeenCalled();
  });
  it('awaits persistence, deduplicates the internal error and generic wrapper, ignores 4xx', async () => {
    const app = new Hono();
    app.use('*', incidentMiddleware);
    app.onError(handleError);
    app.get('/workouts/:id', () => {
      logFailure('[Synthetic]', { code: 'DB_WRITE_FAILED', statusCode: 500 });
      throw AppError.internal('private exception');
    });
    app.get('/validation', () => {
      throw AppError.badRequest('Ordinary validation');
    });
    let release!: () => void;
    repository.recordIncident.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const response = Promise.resolve(app.request('/workouts/private-id?token=secret'));
    await vi.waitFor(() => expect(repository.recordIncident).toHaveBeenCalledOnce());
    let completed = false;
    void response.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    release();
    expect((await response).status).toBe(500);
    expect(repository.recordIncident).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DB_WRITE_FAILED', route: '/workouts/:id' }),
    );
    expect((await app.request('/validation')).status).toBe(400);
    expect(repository.recordIncident).toHaveBeenCalledOnce();
  });
  it('captures direct 503 responses and fails open when the database is unavailable', async () => {
    repository.recordIncident.mockRejectedValue(new Error('private connection string'));
    const app = new Hono();
    app.use('*', incidentMiddleware);
    app.onError(handleError);
    app.get('/settings', (ctx) => ctx.json({ error: 'DOWN' }, 503));
    expect((await app.request('/settings')).status).toBe(503);
    expect(repository.recordIncident).toHaveBeenCalledOnce();
    captureFailure({ code: 'BAD_REQUEST', statusCode: 400 });
    expect(repository.recordIncident).toHaveBeenCalledOnce();
  });
  it('distinguishes failed usage accounting from a provider network error', async () => {
    const onAttempt = vi.fn();
    const onUsage = vi.fn(() => {
      throw new Error('private accounting database failure');
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
    try {
      const app = new Hono();
      app.use('*', incidentMiddleware);
      app.onError(handleError);
      app.post('/workouts/generate', async () => {
        try {
          await callAiProvider({ provider: 'openai', apiKey: 'private-key' }, 'private-prompt', {
            onAttempt,
            onUsage,
          });
        } catch {
          throw AppError.serviceUnavailable('Accounting unavailable');
        }
        return new Response();
      });
      expect((await app.request('/workouts/generate', { method: 'POST' })).status).toBe(503);
      expect(onAttempt).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(onUsage).toHaveBeenCalledOnce();
      expect(repository.recordIncident).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          source: 'ai',
          code: 'AI_ACCOUNTING_ERROR',
          statusCode: 503,
        }),
      );
      expect(JSON.stringify(repository.recordIncident.mock.calls)).not.toContain('private');
    } finally {
      fetchMock.mockRestore();
    }
  });
  it('collects a provider 503 exactly once without its body, prompt or key', async () => {
    const onAttempt = vi.fn();
    const onUsage = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'private-provider-token', message: 'private-provider-message' },
        }),
        { status: 503 },
      ),
    );
    try {
      const app = new Hono();
      app.use('*', incidentMiddleware);
      app.onError(handleError);
      app.post('/workouts/generate', async () => {
        try {
          await callAiProvider({ provider: 'openai', apiKey: 'private-key' }, 'private-prompt', {
            onAttempt,
            onUsage,
          });
        } catch {
          throw AppError.serviceUnavailable('Provider unavailable');
        }
        return new Response();
      });
      expect((await app.request('/workouts/generate', { method: 'POST' })).status).toBe(503);
      expect(onAttempt).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(onUsage).not.toHaveBeenCalled();
      expect(repository.recordIncident).toHaveBeenCalledOnce();
      expect(repository.recordIncident).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'ai', code: 'AI_PROVIDER_ERROR', statusCode: 503 }),
      );
      expect(JSON.stringify(repository.recordIncident.mock.calls)).not.toContain('private-');
    } finally {
      fetchMock.mockRestore();
    }
  });
});
