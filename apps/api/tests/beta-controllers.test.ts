import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { handleError } from '../src/middleware/error.middleware.js';

const service = vi.hoisted(() => ({
  adjustManagedBetaBalance: vi.fn(),
  createManagedBetaTester: vi.fn(),
  deleteManagedBetaTester: vi.fn(),
  listManagedBetaTesters: vi.fn(),
  resetManagedBetaPassword: vi.fn(),
  setManagedBetaStatus: vi.fn(),
  authorizeBeta: vi.fn(),
  updateOwnBetaPassword: vi.fn(),
}));
const dashboard = vi.hoisted(() => ({
  getAdminPlatformAnalytics: vi.fn(),
  getAdminPlatformStats: vi.fn(),
}));
const platformSettings = vi.hoisted(() => ({
  findPlatformSettings: vi.fn(),
  upsertPlatformSettings: vi.fn(),
}));
vi.mock('../src/services/beta-tester.service.js', () => service);
vi.mock('../src/repositories/admin-dashboard.repository.js', () => dashboard);
vi.mock('../src/repositories/settings.repository.js', () => platformSettings);

import {
  handleAdjustBetaBalance,
  handleCreateBetaTester,
  handleDeleteBetaTester,
  handleGetAdminOverview,
  handleListBetaTesters,
  handleResetBetaPassword,
  handleSavePlatformSettings,
  handleSetBetaStatus,
} from '../src/controllers/admin-beta.controller.js';
import {
  handleAuthorizeBeta,
  handleChangeOwnBetaPassword,
} from '../src/controllers/beta-auth.controller.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
function app(
  auth = { userId: USER_ID, email: 'admin@example.com', accessMode: 'standard' as const },
) {
  const instance = new Hono();
  instance.onError(handleError);
  instance.use('*', async (ctx, next) => {
    ctx.set('auth', auth);
    await next();
  });
  instance.get('/admin/overview', handleGetAdminOverview);
  instance.put('/admin/platform-settings', handleSavePlatformSettings);
  instance.get('/admin/beta-testers', handleListBetaTesters);
  instance.post('/admin/beta-testers', handleCreateBetaTester);
  instance.post('/admin/beta-testers/:userId/credits', handleAdjustBetaBalance);
  instance.patch('/admin/beta-testers/:userId/status', handleSetBetaStatus);
  instance.post('/admin/beta-testers/:userId/password-reset', handleResetBetaPassword);
  instance.delete('/admin/beta-testers/:userId', handleDeleteBetaTester);
  instance.post(
    '/beta/authorize',
    async (ctx, next) => {
      ctx.set('betaCredentials', await ctx.req.json());
      await next();
    },
    handleAuthorizeBeta,
  );
  instance.put('/beta/password', handleChangeOwnBetaPassword);
  return instance;
}

describe('beta controllers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('liste et crée les beta-testeurs sans retourner de hash', async () => {
    service.listManagedBetaTesters.mockResolvedValue([
      { userId: USER_ID, email: 'beta@example.com', generationBalance: 2 },
    ]);
    expect(await (await app().request('/admin/beta-testers')).json()).toEqual({
      betaTesters: [{ userId: USER_ID, email: 'beta@example.com', generationBalance: 2 }],
    });

    service.createManagedBetaTester.mockResolvedValue({
      beta: { userId: USER_ID, email: 'beta@example.com' },
      temporaryPassword: 'Temporary-password-123!',
    });
    const created = await app().request('/admin/beta-testers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Beta', email: 'BETA@example.com', generationBalance: 2 }),
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      userId: USER_ID,
      email: 'beta@example.com',
      temporaryPassword: 'Temporary-password-123!',
    });
    expect(service.createManagedBetaTester).toHaveBeenCalledWith(
      expect.objectContaining({ adminEmail: 'admin@example.com' }),
    );

    const invalid = await app().request('/admin/beta-testers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bad' }),
    });
    expect(invalid.status).toBe(400);
  });

  it('retourne les statistiques et enregistre les réglages de la plateforme', async () => {
    dashboard.getAdminPlatformStats.mockResolvedValue({ totalUsers: 4 });
    dashboard.getAdminPlatformAnalytics.mockResolvedValue({ daily: [], sportActivity: [] });
    platformSettings.findPlatformSettings.mockResolvedValue(null);

    const overview = await app().request('/admin/overview');
    expect(overview.status).toBe(200);
    expect(await overview.json()).toMatchObject({
      stats: { totalUsers: 4 },
      analytics: { daily: [], sportActivity: [] },
      settings: { defaultAiModel: 'gpt-5.4-mini', defaultBetaGenerationBalance: 10 },
    });

    platformSettings.upsertPlatformSettings.mockResolvedValue(undefined);
    const saved = await app().request('/admin/platform-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ defaultAiModel: 'gpt-5.4', defaultBetaGenerationBalance: 20 }),
    });
    expect(saved.status).toBe(200);
    expect(platformSettings.upsertPlatformSettings).toHaveBeenCalledWith({
      defaultAiModel: 'gpt-5.4',
      defaultBetaGenerationBalance: 20,
    });
  });

  it('valide les crédits, le statut et la réinitialisation admin', async () => {
    service.adjustManagedBetaBalance.mockResolvedValue(4);
    const adjusted = await app().request(`/admin/beta-testers/${USER_ID}/credits`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: -1 }),
    });
    expect(await adjusted.json()).toEqual({ generationBalance: 4 });
    expect(service.adjustManagedBetaBalance).toHaveBeenCalledWith(USER_ID, -1, 'admin@example.com');
    expect(
      (
        await app().request(`/admin/beta-testers/${USER_ID}/credits`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ amount: 0 }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app().request('/admin/beta-testers/not-a-uuid/credits', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ amount: 1 }),
        })
      ).status,
    ).toBe(400);

    service.setManagedBetaStatus.mockResolvedValue(undefined);
    expect(
      (
        await app().request(`/admin/beta-testers/${USER_ID}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ active: false }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await app().request(`/admin/beta-testers/${USER_ID}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ active: 'no' }),
        })
      ).status,
    ).toBe(400);

    service.resetManagedBetaPassword.mockResolvedValue('Temporary-password-123!');
    expect(
      await (
        await app().request(`/admin/beta-testers/${USER_ID}/password-reset`, { method: 'POST' })
      ).json(),
    ).toEqual({ temporaryPassword: 'Temporary-password-123!' });

    service.deleteManagedBetaTester.mockResolvedValue(undefined);
    expect(
      await (await app().request(`/admin/beta-testers/${USER_ID}`, { method: 'DELETE' })).json(),
    ).toEqual({ ok: true });
    expect(service.deleteManagedBetaTester).toHaveBeenCalledWith(USER_ID);
    expect(
      (await app().request('/admin/beta-testers/not-a-uuid', { method: 'DELETE' })).status,
    ).toBe(400);
  });

  it('retourne une réponse générique pour les identifiants beta et accepte un changement valide', async () => {
    service.authorizeBeta
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: USER_ID, email: 'beta@example.com' });
    expect(
      (
        await app().request('/beta/authorize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'beta@example.com', password: 'wrong' }),
        })
      ).status,
    ).toBe(401);
    expect(
      await (
        await app().request('/beta/authorize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'beta@example.com', password: 'right' }),
        })
      ).json(),
    ).toEqual({ id: USER_ID, email: 'beta@example.com' });
    expect(
      (
        await app().request('/beta/authorize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(401);

    const betaApp = app({
      userId: USER_ID,
      email: 'beta@example.com',
      accessMode: 'beta' as const,
    });
    expect(
      (
        await betaApp.request('/beta/password', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currentPassword: 'old', newPassword: 'New-password-123!' }),
        })
      ).status,
    ).toBe(200);
    expect(service.updateOwnBetaPassword).toHaveBeenCalledWith(USER_ID, 'old', 'New-password-123!');
    expect(
      (
        await betaApp.request('/beta/password', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currentPassword: 'old', newPassword: 'short' }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app().request('/beta/password', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currentPassword: 'old', newPassword: 'New-password-123!' }),
        })
      ).status,
    ).toBe(403);
  });
});
