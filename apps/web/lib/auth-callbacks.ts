import type { NextAuthConfig } from 'next-auth';

type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>;
type JwtCallbackParameters = Parameters<JwtCallback>[0];

export function googleJwt({ token, account }: JwtCallbackParameters) {
  if (account) {
    if (account.provider !== 'google' || !account.providerAccountId) return null;
    token.authMethod = 'google';
    token.identityVersion = 2;
    token.userId = account.providerAccountId;
    token.authIssuedAt = Date.now();
  }
  // Require a fresh Google login for cookies issued before stable provider binding.
  if (
    token.authMethod !== 'google' ||
    token.identityVersion !== 2 ||
    typeof token.userId !== 'string' ||
    !token.userId ||
    typeof token.authIssuedAt !== 'number' ||
    !Number.isSafeInteger(token.authIssuedAt)
  )
    return null;
  return token;
}
