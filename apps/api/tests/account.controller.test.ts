import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { handleDeleteAccount, handleExportAccount } from '../src/controllers/account.controller.js';
import { handleError } from '../src/middleware/error.middleware.js';
import { eraseOwnedAccount, exportOwnedAccount } from '../src/services/account.service.js';

vi.mock('../src/services/account.service.js', () => ({
  eraseOwnedAccount: vi.fn(),
  exportOwnedAccount: vi.fn(),
}));

function app() {
  const api = new Hono();
  api.onError(handleError);
  api.use('*', (ctx, next) => {
    ctx.set('auth', { userId: 'owner', email: 'owner@test.invalid', subject: 'google-owner' });
    return next();
  });
  api.get('/account/export', handleExportAccount);
  api.delete('/account', handleDeleteAccount);
  return api;
}

describe('account rights HTTP boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('exports only the authenticated owner and disables caching', async () => {
    vi.mocked(exportOwnedAccount).mockResolvedValue({ formatVersion: 1 } as never);
    const response = await app().request('/account/export?userId=another-user');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(exportOwnedAccount).toHaveBeenCalledWith('owner');
  });
  it('requires an exact confirmation without caller-selected ownership', async () => {
    const response = await app().request('/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'SUPPRIMER', userId: 'another-user' }),
    });
    expect(response.status).toBe(400);
    expect(eraseOwnedAccount).not.toHaveBeenCalled();
  });
  it('erases only the authenticated account', async () => {
    vi.mocked(eraseOwnedAccount).mockResolvedValue(true);
    const response = await app().request('/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
    });
    expect(response.status).toBe(200);
    expect(eraseOwnedAccount).toHaveBeenCalledWith('owner', 'google-owner');
  });
});
