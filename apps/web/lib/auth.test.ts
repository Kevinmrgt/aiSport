import { describe, expect, it } from 'vitest';
import { googleJwt } from './auth-callbacks';

describe('sessions Google Auth.js', () => {
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
