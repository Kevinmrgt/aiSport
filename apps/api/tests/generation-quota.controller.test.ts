import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

vi.mock('../src/services/generation-quota.service.js', () => ({
  getGenerationQuota: vi.fn(),
}));

import { handleGetGenerationQuota } from '../src/controllers/generation-quota.controller.js';
import { getGenerationQuota } from '../src/services/generation-quota.service.js';

describe('GenerationQuotaController', () => {
  it('retourne le quota correspondant au mode d acces authentifie', async () => {
    vi.mocked(getGenerationQuota).mockResolvedValue({
      limited: true,
      limit: 30,
      used: 7,
      remaining: 23,
    });
    const app = new Hono();
    app.use('*', async (ctx, next) => {
      ctx.set('auth', {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'jury@alcide.invalid',
        accessMode: 'jury',
      });
      await next();
    });
    app.get('/generation-quota', handleGetGenerationQuota);

    const response = await app.request('/generation-quota');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      limited: true,
      limit: 30,
      used: 7,
      remaining: 23,
    });
    expect(getGenerationQuota).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', 'jury');
  });
});
