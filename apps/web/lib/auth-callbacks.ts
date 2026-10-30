import type { NextAuthConfig } from 'next-auth';
import { hasProductionAccess, isProductionAccessRestricted } from './access-policy';

type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>;
type JwtCallbackParameters = Parameters<JwtCallback>[0];

export function googleJwt({ token, account, profile, user }: JwtCallbackParameters) {
  if (account?.provider === 'beta') {
    if (isProductionAccessRestricted() || !user?.id || !user.betaSessionVersion) return null;
    token.authMethod = 'beta';
    token.identityVersion = 2;
    token.userId = user.id;
    token.authIssuedAt = Date.now();
    token.betaSessionVersion = user.betaSessionVersion;
    token.betaMustChangePassword = user.betaMustChangePassword === true;
    token.googleEmailVerified = false;
    return token;
  }
  if (!account && token.authMethod === 'beta') {
    return !isProductionAccessRestricted() && token.identityVersion === 2 && typeof token.userId === 'string' && typeof token.betaSessionVersion === 'string' && typeof token.authIssuedAt === 'number' ? token : null;
  }
  if (account) {
    if (account.provider !== 'google' || !account.providerAccountId) return null;
    token.authMethod = 'google';
    delete token.betaSessionVersion;
    delete token.betaMustChangePassword;
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
  account?.provider === 'beta' ? !isProductionAccessRestricted() :
  account?.provider === 'google' &&
  Boolean(account.providerAccountId) &&
  hasProductionAccess({ email: profile?.email, googleEmailVerified: profile?.email_verified });
