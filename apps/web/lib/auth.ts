import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyBetaCredentials } from '@/lib/beta-auth';
import { isProductionAccessRestricted } from '@/lib/access-policy';
import Google from 'next-auth/providers/google';
import { googleJwt, googleSignIn } from '@/lib/auth-callbacks';

declare module 'next-auth' {
  interface User {
    authIssuedAt?: number;
    authMethod?: 'google' | 'beta';
    betaSessionVersion?: string;
    betaMustChangePassword?: boolean;
    googleEmailVerified?: boolean;
  }
}

export const authConfig = {
  providers: [
    ...(!isProductionAccessRestricted() ? [Credentials({
      id: 'beta',
      name: 'Accès bêta',
      credentials: {
        email: { label: 'Adresse e-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize: verifyBetaCredentials,
    })] : []),
    Google({
      clientId: process.env['AUTH_GOOGLE_ID'],
      clientSecret: process.env['AUTH_GOOGLE_SECRET'],
    }),
  ],
  // Requis sur Vercel — le host est derrière un proxy
  trustHost: true,
  // OWASP A07: pages d'auth personnalisées
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    signIn: googleSignIn,
    jwt: googleJwt,
    session({ session, token }) {
      if (token.userId && typeof token.userId === 'string') {
        session.user.id = token.userId;
      }
      if (typeof token.authIssuedAt === 'number') session.user.authIssuedAt = token.authIssuedAt;
      if (typeof token.email === 'string') session.user.email = token.email;
      if (token.authMethod === 'google' || token.authMethod === 'beta') session.user.authMethod = token.authMethod;
      if (typeof token.betaSessionVersion === 'string') session.user.betaSessionVersion = token.betaSessionVersion;
      session.user.betaMustChangePassword = token.betaMustChangePassword === true;
      session.user.googleEmailVerified = token.googleEmailVerified === true;
      return session;
    },
  },
  // OWASP A07: session sécurisée avec expiration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
} satisfies NextAuthConfig;

// OWASP A07: configuration Auth.js sécurisée
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
