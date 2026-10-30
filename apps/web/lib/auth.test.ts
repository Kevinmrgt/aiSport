import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { googleJwt, googleSignIn } from './auth-callbacks';

vi.mock('server-only', () => ({}));

describe('sessions Google Auth.js', () => {
  beforeEach(() => vi.stubEnv('PRODUCTION_ACCESS_MODE', 'public'));
  afterEach(() => vi.unstubAllEnvs());

  describe('production reservee', () => {
    beforeEach(() => {
      vi.stubEnv('PRODUCTION_ACCESS_MODE', 'admin-only');
      vi.stubEnv('ADMIN_EMAILS', 'admin@example.test');
    });
    const login = (email: string, googleEmailVerified: unknown = true) => ({
      token: {},
      account: { provider: 'google', providerAccountId: 'google-admin' },
      profile: { email, email_verified: googleEmailVerified },
    });

    it('accepte la connexion Google admin et signe sa preuve de verification', async () => {
      expect(await googleSignIn(login('admin@example.test') as never)).toBe(true);
      expect(googleJwt(login('admin@example.test') as never)).toMatchObject({
        userId: 'google-admin',
        email: 'admin@example.test',
        googleEmailVerified: true,
      });
    });

    it.each([
      ['other@example.test', true],
      ['admin@example.test', false],
      ['admin@example.test', 'true'],
      ['admin@example.test', undefined],
    ])('refuse le profil %s avec verification %s', async (email, googleEmailVerified) => {
      const input = login(email, googleEmailVerified);
      // Explicit undefined must remain absent, not use the helper default.
      input.profile.email_verified = googleEmailVerified;
      expect(await googleSignIn(input as never)).toBe(false);
      expect(googleJwt(input as never)).toBeNull();
    });

    it('refuse les cookies anciens ou non admin et ignore une mise a jour cliente', () => {
      const token = {
        userId: 'google-admin',
        authMethod: 'google',
        identityVersion: 2,
        authIssuedAt: Date.now(),
        email: 'admin@example.test',
      };
      expect(
        googleJwt({ token, trigger: 'update', session: { googleEmailVerified: true } } as never),
      ).toBeNull();
      expect(googleJwt({ token: { ...token, googleEmailVerified: true } } as never)).not.toBeNull();
      expect(
        googleJwt({
          token: { ...token, googleEmailVerified: true, email: 'other@example.test' },
        } as never),
      ).toBeNull();
    });

    it('ne reutilise pas une ancienne preuve si le nouveau profil Google ne la confirme pas', () => {
      expect(
        googleJwt({
          ...login('admin@example.test', false),
          token: { email: 'admin@example.test', googleEmailVerified: true },
        } as never),
      ).toBeNull();
    });

    it('refuse un autre fournisseur et ne remplace pas le profil par une adresse utilisateur', async () => {
      expect(
        await googleSignIn({
          ...login('admin@example.test'),
          account: { provider: 'credentials', providerAccountId: 'google-admin' },
        } as never),
      ).toBe(false);
      const input = {
        ...login('admin@example.test'),
        profile: undefined,
        user: { email: 'admin@example.test', googleEmailVerified: true },
        token: { email: 'admin@example.test', googleEmailVerified: true },
      };
      expect(await googleSignIn(input as never)).toBe(false);
      expect(googleJwt(input as never)).toBeNull();
    });
  });
  it('refuse le provider bêta et ses cookies quand l’accès est réservé aux administrateurs', async () => {
    vi.stubEnv('PRODUCTION_ACCESS_MODE', 'admin-only');
    expect(await googleSignIn({ account: { provider: 'beta' } } as never)).toBe(false);
    expect(googleJwt({ token: {}, account: { provider: 'beta' }, user: { id: 'beta-user', betaSessionVersion: 'v1' } } as never)).toBeNull();
    expect(googleJwt({ token: { userId: 'beta-user', authMethod: 'beta', identityVersion: 2, betaSessionVersion: 'v1', authIssuedAt: Date.now() } } as never)).toBeNull();
  });

  it('conserve le parcours bêta hors mode réservé et le sépare des droits Google', async () => {
    expect(await googleSignIn({ account: { provider: 'beta' } } as never)).toBe(true);
    expect(googleJwt({ token: {}, account: { provider: 'beta' }, user: { id: 'beta-user', betaSessionVersion: 'v1', betaMustChangePassword: true } } as never)).toMatchObject({ userId: 'beta-user', authMethod: 'beta', googleEmailVerified: false, betaSessionVersion: 'v1', betaMustChangePassword: true });
  });

  it('conserve l’identité Google lors de la connexion', () => {
    expect(
      googleJwt({
        token: {},
        user: { id: 'google-user', email: 'sportif@example.test' },
        account: { provider: 'google', providerAccountId: 'google-subject' },
      } as never),
    ).toMatchObject({ userId: 'google-subject', authMethod: 'google', identityVersion: 2 });
  });

  it('impose une reconnexion aux anciennes sessions sans liaison sûre', () => {
    expect(googleJwt({ token: { userId: 'existing-user' } } as never)).toBeNull();
    expect(
      googleJwt({ token: { userId: 'existing-user', authMethod: 'google' } } as never),
    ).toBeNull();
  });

  it('préserve une session Google après la connexion', () => {
    expect(
      googleJwt({
        token: {
          userId: 'google-user',
          authMethod: 'google',
          identityVersion: 2,
          authIssuedAt: Date.now(),
        },
      } as never),
    ).toMatchObject({ userId: 'google-user' });
  });

  it('refuse une connexion sans sujet fournisseur stable', () => {
    expect(googleJwt({ token: {}, account: { provider: 'google' } } as never)).toBeNull();
  });

  it.each(['credentials', 'temporary-access'])('révoque un ancien cookie %s', (authMethod) => {
    expect(googleJwt({ token: { userId: 'old-user', authMethod } } as never)).toBeNull();
  });

  it('refuse une connexion provenant d’un autre fournisseur', () => {
    expect(
      googleJwt({
        token: {},
        user: { id: 'old-user' },
        account: { provider: 'credentials' },
      } as never),
    ).toBeNull();
  });
});
