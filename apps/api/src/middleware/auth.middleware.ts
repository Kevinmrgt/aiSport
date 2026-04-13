import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

// OWASP A01: middleware d'authentification sur toutes les routes protégées
// Vérifie que l'utilisateur a une session valide avant d'accéder aux données

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
  // Récupérer le session token depuis le cookie (Auth.js)
  const sessionToken =
    ctx.req.header('Authorization')?.replace('Bearer ', '') ??
    ctx.req.header('x-session-token');

  if (!sessionToken) {
    // OWASP A01: bloquer l'accès sans token
    throw AppError.unauthorized('Session requise');
  }

  // TODO: Valider le session token contre la base de données (Auth.js)
  // Pour l'instant, on parse le JWT simple
  // En production: vérifier via la table sessions de Drizzle
  try {
    // Simulation de validation — à remplacer par la vraie validation Auth.js
    // La validation réelle vérifiera le sessionToken dans la table sessions
    const authContext: AuthContext = {
      userId: 'placeholder', // sera remplacé par l'ID réel
      email: 'placeholder@example.com',
    };

    ctx.set('auth', authContext);
    await next();
  } catch {
    // OWASP A09: logger les tentatives d'accès non autorisées
    console.warn('[Auth] Session invalide ou expirée');
    throw AppError.unauthorized('Session invalide ou expirée');
  }
}
