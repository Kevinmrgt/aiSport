import { beforeEach, describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ guard: vi.fn(), fetch: vi.fn() }));
vi.mock('./admin', () => ({ requireAdmin: mocks.guard }));
vi.mock('./server-api', () => ({ serverFetch: mocks.fetch }));
import { adminApi, adminFetch } from './admin-api';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({ email: 'admin@example.com' });
  mocks.fetch.mockResolvedValue({ items: [] });
});
describe('lectures administrateur côté serveur', () => {
  it('encode les filtres sans transporter les valeurs vides', async () => {
    await adminApi.members({ page: 2, q: 'Élodie & Lou', beta: 'active' });
    expect(mocks.fetch).toHaveBeenLastCalledWith(
      '/admin/members?page=2&q=%C3%89lodie+%26+Lou&beta=active',
      undefined,
    );
    await adminApi.audit({ page: 1, q: '' });
    expect(mocks.fetch).toHaveBeenLastCalledWith('/admin/audit?page=1', undefined);
  });
  it('protège chaque famille de données et ne charge que la ressource demandée', async () => {
    const calls: [() => Promise<unknown>, string][] = [
      [adminApi.summary, '/summary'],
      [adminApi.analytics, '/analytics'],
      [adminApi.settings, '/platform-settings'],
      [() => adminApi.member('a/b'), '/members/a%2Fb'],
      [() => adminApi.subscriptions({ page: 1 }), '/subscriptions?page=1'],
      [() => adminApi.credits({ page: 1 }), '/credits?page=1'],
      [() => adminApi.contents('workouts', { page: 1 }), '/workouts?page=1'],
      [() => adminApi.content('programs', 'a/b'), '/programs/a%2Fb'],
    ];
    for (const [call, path] of calls) {
      await call();
      expect(mocks.fetch).toHaveBeenLastCalledWith('/admin' + path, undefined);
    }
    expect(mocks.guard).toHaveBeenCalledTimes(calls.length);
  });
  it('ne contacte pas l’API quand le garde refuse la session', async () => {
    mocks.guard.mockRejectedValue(new Error('Interdit'));
    await expect(adminFetch('/members')).rejects.toThrow('Interdit');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
