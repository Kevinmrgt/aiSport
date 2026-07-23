import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJuryPasswordHash, loadJuryAccessConfig } from './jury-auth';
import { juryAwareJwt } from './auth-callbacks';

const PASSWORD = 'jury-auth-callback-password';

function enableJuryAccess() {
  vi.stubEnv('JURY_ACCESS_ENABLED', 'true');
  vi.stubEnv('JURY_ACCESS_IDENTIFIER', 'jury-callback');
  vi.stubEnv(
    'JURY_ACCESS_PASSWORD_HASH',
    createJuryPasswordHash(PASSWORD, Buffer.from('callback-test-123')),
  );
  vi.stubEnv('JURY_ACCESS_USER_ID', 'jury-callback-user');
  vi.stubEnv('JURY_ACCESS_EMAIL', 'jury-callback@alcide.invalid');
  vi.stubEnv('JURY_ACCESS_NAME', 'Jury callback');
  vi.stubEnv('JURY_ACCESS_EXPIRES_AT', '2099-12-31T23:59:59.000Z');
  vi.stubEnv('JURY_ACCESS_SESSION_VERSION', 'callback-session-v1');
}

describe('callbacks Auth.js de l’accès jury', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('marque la session jury et conserve son identité tant que la configuration est active', () => {
    enableJuryAccess();
    const config = loadJuryAccessConfig();
    const token = juryAwareJwt({
      token: {},
      user: {
        id: 'jury-callback-user',
        email: 'jury-callback@alcide.invalid',
        name: 'Jury callback',
        juryAccessExpiresAt: config?.expiresAtIso,
        juryAccessFingerprint: config?.fingerprint,
      },
      account: { provider: 'jury' },
    } as never);

    expect(token).toMatchObject({
      authMethod: 'jury',
      userId: 'jury-callback-user',
      juryAccessExpiresAt: config?.expiresAtIso,
      juryAccessFingerprint: config?.fingerprint,
    });
  });

  it('retourne null dès que le kill switch révoque une session jury existante', () => {
    enableJuryAccess();
    const config = loadJuryAccessConfig();
    vi.stubEnv('JURY_ACCESS_ENABLED', 'false');

    const token = juryAwareJwt({
      token: {
        authMethod: 'jury',
        userId: 'jury-callback-user',
        juryAccessExpiresAt: config?.expiresAtIso,
        juryAccessFingerprint: config?.fingerprint,
      },
    } as never);

    expect(token).toBeNull();
  });

  it('laisse le parcours Google inchangé', () => {
    const token = juryAwareJwt({
      token: {},
      user: { id: 'google-user', email: 'google@example.test' },
      account: { provider: 'google' },
    } as never);

    expect(token).toMatchObject({ userId: 'google-user' });
    expect(token).not.toHaveProperty('authMethod', 'jury');
  });
});
