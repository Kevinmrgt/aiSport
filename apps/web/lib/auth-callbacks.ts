import type { NextAuthConfig } from 'next-auth';

type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>;
type JwtCallbackParameters = Parameters<JwtCallback>[0];

export function googleJwt({ token, user, account }: JwtCallbackParameters) {
  if (account) {
    if (account.provider !== 'google') return null;
    token.authMethod = 'google';
  }

  // Rejeter les anciens cookies issus d'un fournisseur désormais retiré.
  // Les sessions Google antérieures à ce marqueur restent valides.
  if (token.authMethod !== undefined && token.authMethod !== 'google') return null;

  if (user?.id) token.userId = user.id;
  return token;
}
