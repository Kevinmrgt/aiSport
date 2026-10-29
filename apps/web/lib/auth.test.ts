import { describe, expect, it } from 'vitest';
import { googleJwt } from './auth-callbacks';

describe('sessions Google Auth.js', () => {
  it('conserve l’identité Google lors de la connexion', () => {
    expect(
      googleJwt({
        token: {},
        user: { id: 'google-user', email: 'sportif@example.test' },
        account: { provider: 'google' },
      } as never),
    ).toMatchObject({ userId: 'google-user', authMethod: 'google' });
  });

  it('préserve les sessions Google existantes sans marqueur de fournisseur', () => {
    expect(googleJwt({ token: { userId: 'existing-user' } } as never)).toEqual({
      userId: 'existing-user',
    });
  });

  it('préserve une session Google après la connexion', () => {
    expect(
      googleJwt({ token: { userId: 'google-user', authMethod: 'google' } } as never),
    ).toMatchObject({ userId: 'google-user' });
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
