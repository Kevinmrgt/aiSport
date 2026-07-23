import { describe, expect, it } from 'vitest';
import {
  createJuryPasswordHash,
  isJuryAccessAvailable,
  isJurySessionActive,
  loadJuryAccessConfig,
  verifyJuryCredentials,
} from './jury-auth';

const PASSWORD = 'jury-test-password-very-long';
const IDENTIFIER = 'jury-alcide-test';
const NOW = new Date('2026-07-23T10:00:00.000Z');

function juryEnvironment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    JURY_ACCESS_ENABLED: 'true',
    JURY_ACCESS_IDENTIFIER: IDENTIFIER,
    JURY_ACCESS_PASSWORD_HASH: createJuryPasswordHash(PASSWORD, Buffer.from('0123456789abcdef')),
    JURY_ACCESS_USER_ID: 'jury-rncp39583',
    JURY_ACCESS_EMAIL: 'jury-rncp39583@alcide.invalid',
    JURY_ACCESS_NAME: 'Jury RNCP39583',
    JURY_ACCESS_EXPIRES_AT: '2026-12-31T22:59:59.000Z',
    JURY_ACCESS_SESSION_VERSION: 'test-session-v1',
    ...overrides,
  };
}

describe('jury-auth', () => {
  it('valide les identifiants et retourne une identité dédiée stable', async () => {
    const environment = juryEnvironment();
    const user = await verifyJuryCredentials(
      { identifier: IDENTIFIER, password: PASSWORD },
      environment,
      NOW,
    );

    expect(user).toMatchObject({
      id: 'jury-rncp39583',
      email: 'jury-rncp39583@alcide.invalid',
      name: 'Jury RNCP39583',
      juryAccessExpiresAt: '2026-12-31T22:59:59.000Z',
    });
    expect(user?.juryAccessFingerprint).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it.each([
    { identifier: 'mauvais-identifiant', password: PASSWORD },
    { identifier: IDENTIFIER, password: 'mauvais-mot-de-passe' },
    { identifier: '', password: PASSWORD },
    { identifier: IDENTIFIER, password: '' },
  ])('refuse une combinaison invalide sans préciser la cause', async (credentials) => {
    await expect(verifyJuryCredentials(credentials, juryEnvironment(), NOW)).resolves.toBeNull();
  });

  it('reste indisponible si le kill switch est coupé ou la configuration incomplète', () => {
    expect(isJuryAccessAvailable(juryEnvironment({ JURY_ACCESS_ENABLED: 'false' }), NOW)).toBe(
      false,
    );
    expect(
      loadJuryAccessConfig(juryEnvironment({ JURY_ACCESS_PASSWORD_HASH: undefined })),
    ).toBeNull();
    expect(
      loadJuryAccessConfig(juryEnvironment({ JURY_ACCESS_PASSWORD_HASH: 'scrypt$invalide' })),
    ).toBeNull();
  });

  it('refuse la date d’expiration exacte, passée ou mal formée', () => {
    const expiresNow = juryEnvironment({ JURY_ACCESS_EXPIRES_AT: NOW.toISOString() });
    const expired = juryEnvironment({ JURY_ACCESS_EXPIRES_AT: '2026-07-22T10:00:00.000Z' });
    const malformed = juryEnvironment({ JURY_ACCESS_EXPIRES_AT: '31/12/2026' });

    expect(isJuryAccessAvailable(expiresNow, NOW)).toBe(false);
    expect(isJuryAccessAvailable(expired, NOW)).toBe(false);
    expect(loadJuryAccessConfig(malformed)).toBeNull();
  });

  it('révoque une session après rotation du secret, expiration ou désactivation', () => {
    const environment = juryEnvironment();
    const config = loadJuryAccessConfig(environment);
    expect(config).not.toBeNull();

    expect(isJurySessionActive(config?.expiresAtIso, config?.fingerprint, environment, NOW)).toBe(
      true,
    );
    expect(
      isJurySessionActive(
        config?.expiresAtIso,
        config?.fingerprint,
        juryEnvironment({ JURY_ACCESS_ENABLED: 'false' }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isJurySessionActive(
        config?.expiresAtIso,
        config?.fingerprint,
        juryEnvironment({
          JURY_ACCESS_PASSWORD_HASH: createJuryPasswordHash(
            'rotated-jury-password-long-enough',
            Buffer.from('fedcba9876543210'),
          ),
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isJurySessionActive(
        config?.expiresAtIso,
        config?.fingerprint,
        environment,
        new Date('2027-01-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('refuse les paramètres scrypt hors bornes avant comparaison', async () => {
    const environment = juryEnvironment({
      JURY_ACCESS_PASSWORD_HASH:
        'scrypt$999999999$8$1$MDEyMzQ1Njc4OWFiY2RlZg$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(loadJuryAccessConfig(environment)).toBeNull();
    await expect(
      verifyJuryCredentials({ identifier: IDENTIFIER, password: PASSWORD }, environment, NOW),
    ).resolves.toBeNull();
  });

  it('refuse un e-mail réel ou un identifiant de session non réservé', () => {
    expect(
      loadJuryAccessConfig(juryEnvironment({ JURY_ACCESS_EMAIL: 'candidate@gmail.com' })),
    ).toBeNull();
    expect(
      loadJuryAccessConfig(juryEnvironment({ JURY_ACCESS_USER_ID: 'google-user' })),
    ).toBeNull();
  });

  it('invalide les anciennes sessions quand la version d’activation change', () => {
    const environment = juryEnvironment();
    const config = loadJuryAccessConfig(environment);
    expect(config).not.toBeNull();
    expect(
      isJurySessionActive(
        config?.expiresAtIso,
        config?.fingerprint,
        juryEnvironment({ JURY_ACCESS_SESSION_VERSION: 'test-session-v2' }),
        NOW,
      ),
    ).toBe(false);
  });
});
