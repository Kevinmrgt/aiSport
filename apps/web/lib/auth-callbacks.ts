import type { NextAuthConfig } from 'next-auth';
import { hasProductionAccess } from './access-policy';

type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>;
type JwtCallbackParameters = Parameters<JwtCallback>[0];

export function googleJwt({ token, account, profile }: JwtCallbackParameters) {
  if (account) {
    if (account.provider !== 'google' || !account.providerAccountId) return null;
    token.authMethod = 'google';
    token.identityVersion = 2;
    token.userId = account.providerAccountId;
    token.authIssuedAt = Date.now();
    // Only the validated Google profile can establish this signed claim.
    // Ignore client-triggered session updates and claims from older cookies.
    token.googleEmailVerified =
      profile?.email_verified === true && typeof profile.email === 'string';
    if (typeof profile?.email === 'string') token.email = profile.email;
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
  if (!hasProductionAccess({ email: token.email, googleEmailVerified: token.googleEmailVerified }))
    return null;
  return token;
}

type SignInCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['signIn']>;

export const googleSignIn: SignInCallback = ({ account, profile }) =>
  account?.provider === 'google' &&
  Boolean(account.providerAccountId) &&
  hasProductionAccess({ email: profile?.email, googleEmailVerified: profile?.email_verified });
