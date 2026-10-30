import { describe, expect, it, vi } from 'vitest';
import { logFailure, requestId } from '../src/lib/logging.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { Hono } from 'hono';

describe('log boundary', () => {
  it('does not retain arbitrary caller values as correlation IDs', () => {
    const id = requestId('private-prompt-or-token');
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(requestId(id)).toBe(id);
  });

  it('never spreads unexpected fields or exception messages', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      logFailure('test', { code: 'INTERNAL_ERROR', secret: 'SECRET_SENTINEL' } as never);
      const api = new Hono();
      api.onError(handleError);
      api.get('/', () => {
        throw new Error('PRIVATE_HEALTH_NOTE_SENTINEL');
      });
      const response = await api.request('/');
      expect(response.status).toBe(500);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /SECRET_SENTINEL|PRIVATE_HEALTH_NOTE_SENTINEL/,
      );
      expect(await response.text()).not.toContain('PRIVATE_HEALTH_NOTE_SENTINEL');
    } finally {
      log.mockRestore();
    }
  });
});
