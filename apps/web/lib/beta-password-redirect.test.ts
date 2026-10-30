import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
const redirectMock = vi.hoisted(() => vi.fn(() => { throw new Error('redirected'); }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import { auth } from '@/lib/auth';
import { serverApi } from './server-api';

describe('redirection du mot de passe beta temporaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'beta-user',
        email: 'beta@example.test',
        name: 'Beta',
        authMethod: 'beta',
        betaSessionVersion: 'session-v1',
        betaMustChangePassword: true,
      },
    } as never);
  });

  it('redirige avant tout appel privé mais autorise la mise à jour du mot de passe', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(serverApi.getStats()).rejects.toThrow('redirected');
    expect(redirectMock).toHaveBeenCalledWith('/change-password');
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(serverApi.changeBetaPassword({ currentPassword: 'temporary', newPassword: 'New-password-123!' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
