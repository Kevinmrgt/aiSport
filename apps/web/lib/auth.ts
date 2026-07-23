import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { juryAwareJwt } from '@/lib/auth-callbacks';
import { verifyJuryCredentials } from '@/lib/jury-auth';

export const authConfig = {
  providers: [
    Google({
      clientId: process.env['AUTH_GOOGLE_ID'],
      clientSecret: process.env['AUTH_GOOGLE_SECRET'],
    }),
    Credentials({
      id: 'jury',
      name: 'Accès jury',
      credentials: {
        identifier: { label: 'Identifiant jury', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize(credentials) {
        return verifyJuryCredentials(credentials);
      },
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
    // OWASP A07 : révocation immédiate des sessions jury au changement de
    // secret, à l'expiration absolue ou à l'activation du kill switch.
    jwt: juryAwareJwt,
    session({ session, token }) {
      if (token.userId && typeof token.userId === 'string') {
        session.user.id = token.userId;
      }
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
