import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

// OWASP A01: middleware d'authentification sur toutes les routes protégées
// Pattern service-to-service : Next.js appelle l'API avec un secret partagé
// + l'identité utilisateur dans les headers. Le secret ne transite jamais
// côté client (HTTP-only cookie Auth.js → Server Action → header interne).

export interface AuthContext {
  userId: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  const internalSecret = ctx.req.header('x-internal-secret');
  const serviceSecret = process.env['SERVICE_SECRET'];

  // OWASP A01: valider le secret partagé service-to-service
  if (!serviceSecret || internalSecret !== serviceSecret) {
    // OWASP A09: logger les tentatives d'accès non autorisées
    console.warn('[Auth] Secret interne invalide ou manquant', {
      timestamp: new Date().toISOString(),
      path: ctx.req.path,
    });
    throw AppError.unauthorized('Session requise');
  }

  const userId = ctx.req.header('x-user-id');
  const email = ctx.req.header('x-user-email') ?? '';

  if (!userId) {
    throw AppError.unauthorized('Identifiant utilisateur manquant');
  }

  ctx.set('auth', { userId, email });
  await next();
}
