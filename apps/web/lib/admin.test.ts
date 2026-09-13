import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((path: string): never => {
    throw new Error('redirect:' + path);
  }),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
import { isAdminEmail, isAdminSession, requireAdmin } from './admin';

describe('accès administration Web', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.com,jury@example.com');
    vi.stubEnv('JURY_ACCESS_EMAIL', 'jury@example.com');
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());
  it('refuse une adresse absente ou non configurée', () => {
    expect(isAdminEmail(null, { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail(undefined, { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail('visitor@example.com', { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail('admin@example.com', {})).toBe(false);
  });
  it('compare les adresses sans tenir compte des espaces ou de la casse', () => {
    expect(
      isAdminEmail(' ADMIN@EXAMPLE.COM ', {
        ADMIN_EMAILS: ' , admin@example.com ,other@example.com ',
      }),
    ).toBe(true);
  });
  it('réserve les droits à une authentification standard hors jury', () => {
    expect(isAdminSession({ email: 'admin@example.com' })).toBe(true);
    expect(isAdminSession({ email: 'admin@example.com', authMethod: 'standard' })).toBe(true);
    for (const authMethod of ['jury', 'beta'])
      expect(isAdminSession({ email: 'admin@example.com', authMethod })).toBe(false);
    expect(isAdminSession({ email: 'jury@example.com', authMethod: 'standard' })).toBe(false);
    expect(isAdminSession({ email: 'member@example.com' })).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });
  it('redirige les accès directs sans session vers la connexion', async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow('redirect:/login');
  });
  it('redirige un membre ordinaire vers son application', async () => {
    authMock.mockResolvedValue({ user: { email: 'member@example.com' } });
    await expect(requireAdmin()).rejects.toThrow('redirect:/dashboard');
  });
  it('retourne uniquement une identité administrateur autorisée', async () => {
    const user = { id: 'admin-id', email: 'admin@example.com' };
    authMock.mockResolvedValue({ user });
    await expect(requireAdmin()).resolves.toEqual(user);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
