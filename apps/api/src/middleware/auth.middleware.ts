import type { Context, Next } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { AppError } from '../types/app-error.js';
import { assertActiveBetaSession } from '../services/beta-tester.service.js';

// OWASP A01: middleware d'authentification sur toutes les routes protégées
// Pattern service-to-service : Next.js appelle l'API avec un secret partagé
// + l'identité utilisateur dans les headers. Le secret ne transite jamais
// côté client (HTTP-only cookie Auth.js → Server Action → header interne).

export interface AuthContext {
  userId: string;
  email: string;
  accessMode: 'standard' | 'jury' | 'beta';
  mustChangePassword: boolean;
  generationBalance: number | null;
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

  const oauthId = ctx.req.header('x-user-id');
  const email = ctx.req.header('x-user-email') ?? '';
  const name = ctx.req.header('x-user-name') ?? null;
  const methodHeader = ctx.req.header('x-auth-method');
  const accessMode = methodHeader === 'jury' || methodHeader === 'beta' ? methodHeader : 'standard';

  if (!oauthId || !email) {
    throw AppError.unauthorized('Identifiant utilisateur manquant');
  }

  // Auth.js JWT strategy ne crée pas les utilisateurs en base — on upsert ici
  // pour garantir que la FK workouts.user_id → users.id est satisfaite (OWASP A01)
  // Les casts sont nécessaires : Drizzle 0.38.x + exactOptionalPropertyTypes
  // exclut les colonnes nullable/defaultNow des types d'insert/update inférés
  const [user] = await db
    .insert(users)
    .values({ email, name } as { email: string; name: string | null })
    .onConflictDoUpdate({
      target: users.email,
      set: { updatedAt: sql`now()` } as Record<string, unknown>,
    })
    .returning({ id: users.id });

  if (!user) {
    throw AppError.internal("Impossible de résoudre l'utilisateur en base");
  }

  let mustChangePassword = false;
  let generationBalance: number | null = null;
  if (accessMode === 'beta') {
    const sessionVersion = ctx.req.header('x-beta-session-version');
    if (!sessionVersion) throw AppError.unauthorized('Session bêta invalide');
    const beta = await assertActiveBetaSession(user.id, sessionVersion);
    mustChangePassword = beta.mustChangePassword === 1;
    generationBalance = beta.generationBalance;
  }

  ctx.set('auth', { userId: user.id, email, accessMode, mustChangePassword, generationBalance });
  await next();
}
