import type { NextAuthConfig } from 'next-auth';
import { isJurySessionActive } from '@/lib/jury-auth';

type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>;
type JwtCallbackParameters = Parameters<JwtCallback>[0];

export function juryAwareJwt({ token, user, account }: JwtCallbackParameters) {
  if (account?.provider === 'jury' && user?.id) {
    const juryUser = user as typeof user & {
      juryAccessExpiresAt?: string;
      juryAccessFingerprint?: string;
    };
    token.authMethod = 'jury';
    token.userId = user.id;
    token.juryAccessExpiresAt = juryUser.juryAccessExpiresAt;
    token.juryAccessFingerprint = juryUser.juryAccessFingerprint;
  }

  if (
    token.authMethod === 'jury' &&
    !isJurySessionActive(token.juryAccessExpiresAt, token.juryAccessFingerprint)
  ) {
    return null;
  }

  if (user?.id) {
    token.userId = user.id;
  }
  return token;
}
