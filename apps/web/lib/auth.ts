import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// OWASP A07: configuration Auth.js sécurisée
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env['AUTH_GITHUB_ID'],
      clientSecret: process.env['AUTH_GITHUB_SECRET'],
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
    // Inclure l'ID utilisateur dans le token pour le passer au backend
    jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
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
});
