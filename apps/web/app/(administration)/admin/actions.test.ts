import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  fetch: vi.fn(),
  settings: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/admin-api', () => ({
  adminFetch: mocks.fetch,
  adminApi: { settings: mocks.settings },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('next/navigation', () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_')) throw error;
  },
}));
import { performAdminAction } from './actions';
const userId = '11111111-1111-4111-8111-111111111111',
  requestId = '22222222-2222-4222-8222-222222222222';
const form = (fields: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    userId,
    requestId,
    reason: 'Motif de recette',
    amount: '5',
    ...fields,
  }))
    f.set(k, v);
  return f;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ email: 'admin@example.com' });
  mocks.fetch.mockResolvedValue({});
  mocks.settings.mockResolvedValue({
    settings: { defaultAiModel: 'gpt-5.4-mini', defaultBetaGenerationBalance: 10 },
  });
});
describe('actions administrateur', () => {
  it.each([
    [
      'beta.credits',
      '/beta-testers/' + userId + '/credits',
      'POST',
      { amount: '-2' },
      { amount: -2, reason: 'Motif de recette', requestId },
    ],
    [
      'beta.status',
      '/beta-testers/' + userId + '/status',
      'PATCH',
      { active: 'true' },
      { active: true, reason: 'Motif de recette' },
    ],
    [
      'beta.status',
      '/beta-testers/' + userId + '/status',
      'PATCH',
      { active: 'false' },
      { active: false, reason: 'Motif de recette' },
    ],
    [
      'member.suspension',
      '/members/' + userId + '/suspension',
      'PATCH',
      { suspended: 'true' },
      { suspended: true, reason: 'Motif de recette' },
    ],
    [
      'member.suspension',
      '/members/' + userId + '/suspension',
      'PATCH',
      { suspended: 'false' },
      { suspended: false, reason: 'Motif de recette' },
    ],
    [
      'credits.grant',
      '/members/' + userId + '/credits',
      'POST',
      { amount: '7' },
      { amount: 7, reason: 'Motif de recette', requestId },
    ],
    ['beta.delete', '/beta-testers/' + userId, 'DELETE', {}, { reason: 'Motif de recette' }],
  ] as const)(
    '%s valide et transmet la commande puis invalide les vues',
    async (op, path, method, fields, body) => {
      expect(await performAdminAction(op, form(fields))).toEqual({ success: true });
      expect(mocks.fetch).toHaveBeenCalledWith(path, { method, body: JSON.stringify(body) });
      expect(mocks.revalidate).toHaveBeenCalledWith('/admin', 'layout');
    },
  );
  it('renvoie le mot de passe temporaire de création et de réinitialisation', async () => {
    mocks.fetch.mockResolvedValue({ userId, temporaryPassword: 'test-only-password' });
    expect(
      await performAdminAction(
        'beta.create',
        form({ name: 'Élodie', email: 'elodie@example.com', generationBalance: '12' }),
      ),
    ).toEqual({ success: true, userId, temporaryPassword: 'test-only-password' });
    expect(mocks.fetch).toHaveBeenLastCalledWith('/beta-testers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Élodie', email: 'elodie@example.com', generationBalance: 12 }),
    });
    expect(await performAdminAction('beta.reset', form())).toMatchObject({
      temporaryPassword: 'test-only-password',
    });
    expect(mocks.fetch).toHaveBeenLastCalledWith('/beta-testers/' + userId + '/password-reset', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Motif de recette' }),
    });
  });
  it.each([
    [
      'settings.model',
      { defaultAiModel: 'gpt-5.4' },
      { defaultAiModel: 'gpt-5.4', defaultBetaGenerationBalance: 10 },
    ],
    [
      'settings.balance',
      { defaultBetaGenerationBalance: '18' },
      { defaultAiModel: 'gpt-5.4-mini', defaultBetaGenerationBalance: 18 },
    ],
  ] as const)('enregistre %s avec les valeurs existantes', async (op, fields, expected) => {
    expect(await performAdminAction(op, form(fields))).toEqual({ success: true });
    expect(mocks.fetch).toHaveBeenCalledWith('/platform-settings', {
      method: 'PUT',
      body: JSON.stringify(expected),
    });
  });
  it('refuse les commandes inconnues, identifiants et montants invalides avant mutation', async () => {
    expect(await performAdminAction('unknown', form())).toHaveProperty('error');
    expect(await performAdminAction('credits.grant', form({ userId: 'bad' }))).toHaveProperty(
      'error',
    );
    expect(await performAdminAction('credits.grant', form({ amount: '-1' }))).toHaveProperty(
      'error',
    );
    expect(await performAdminAction('beta.credits', form({ amount: '0' }))).toHaveProperty('error');
    const f = form();
    f.set('reason', new File(['test'], 'test.txt'));
    expect(await performAdminAction('credits.grant', f)).toHaveProperty('error');
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('vérifie les droits avant toute lecture et conserve les redirections de session', async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(performAdminAction('credits.grant', form())).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.fetch.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(performAdminAction('credits.grant', form())).rejects.toThrow('NEXT_REDIRECT');
  });
  it('expose une erreur utile et permet un réessai sans annoncer de succès', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Solde insuffisant'));
    expect(await performAdminAction('beta.credits', form())).toEqual({
      error: 'Solde insuffisant',
    });
    mocks.fetch.mockRejectedValueOnce(null);
    expect(await performAdminAction('credits.grant', form())).toEqual({
      error: 'Action impossible. Réessayez.',
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
