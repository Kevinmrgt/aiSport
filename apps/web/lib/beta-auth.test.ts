import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { verifyBetaCredentials } from './beta-auth';

describe('verifyBetaCredentials', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('n appelle pas le service pour des identifiants invalides', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifyBetaCredentials({ email: 'incorrect', password: '' })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retourne seulement une identité beta valide et masque les refus', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'beta-id', email: 'beta@example.com', name: 'Beta', betaSessionVersion: 'v1', betaMustChangePassword: true }) })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'beta-id' }) })
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyBetaCredentials({ email: 'beta@example.com', password: 'secret' })).resolves.toMatchObject({ id: 'beta-id', betaSessionVersion: 'v1' });
    await expect(verifyBetaCredentials({ email: 'beta@example.com', password: 'secret' })).resolves.toBeNull();
    await expect(verifyBetaCredentials({ email: 'beta@example.com', password: 'secret' })).resolves.toBeNull();
    await expect(verifyBetaCredentials({ email: 'beta@example.com', password: 'secret' })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/beta/authorize'), expect.objectContaining({ method: 'POST' }));
  });
});
