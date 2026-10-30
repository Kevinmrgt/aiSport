import { and, eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import type { Context, Next } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { resolveGoogleIdentity } from '../repositories/identity.repository.js';
import { AppError } from '../types/app-error.js';
import {
  assertGoogleSessionActive,
  parseSessionIssuedAt,
} from '../services/account-session.service.js';

// OWASP A01: middleware d'authentification sur toutes les routes protégées
// Pattern service-to-service : Next.js appelle l'API avec un secret partagé
// + l'identité utilisateur dans les headers. Le secret ne transite jamais
// côté client (HTTP-only cookie Auth.js → Server Action → header interne).

export interface AuthContext {
  userId: string;
  email: string;
  subject?: string;
  accessMode: 'standard' | 'jury' | 'beta';
  mustChangePassword: boolean;
  generationBalance: number | null;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    accountSuspended: boolean;
  }
}

export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  const internalSecret = ctx.req.header('x-internal-secret');
  const serviceSecret = process.env['SERVICE_SECRET'];

  // OWASP A01: valider le secret partagé service-to-service
  if (
    !serviceSecret ||
    !internalSecret ||
    Buffer.byteLength(internalSecret) !== Buffer.byteLength(serviceSecret) ||
    !timingSafeEqual(Buffer.from(internalSecret), Buffer.from(serviceSecret))
  ) {
    // OWASP A09: logger les tentatives d'accès non autorisées
    console.warn('[Auth] Secret interne invalide ou manquant', {
      timestamp: new Date().toISOString(),
      path: ctx.req.path,
    });
    throw AppError.unauthorized('Session requise');
  }

  const oauthId = ctx.req.header('x-user-id');
  const email = ctx.req.header('x-user-email') ?? '';
  const encodedName = ctx.req.header('x-user-name-encoded') ?? ctx.req.header('x-user-name-utf8');
  let name = ctx.req.header('x-user-name') ?? null;
  if (encodedName !== undefined) {
    if (encodedName.length > 4096) throw AppError.badRequest('Nom utilisateur invalide');
    try {
      name = decodeURIComponent(encodedName) || null;
    } catch {
      throw AppError.badRequest('Nom utilisateur invalide');
    }
  }
  if (
    name &&
    (name.length > 256 ||
      [...name].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ))
  ) {
    throw AppError.badRequest('Nom utilisateur invalide');
  }

  if (!oauthId || oauthId.length > 255 || /\s/.test(oauthId) || !email || email.length > 320) {
    throw AppError.unauthorized('Identifiant utilisateur manquant');
  }

  const method = ctx.req.header('x-auth-method');
  const mode = method === 'jury' || method === 'beta' ? method : 'standard';
  const accessMode = process.env['PRODUCTION_ACCESS_MODE'] ?? 'public';
  if (accessMode !== 'public') {
    const allowedEmails = (process.env['ADMIN_EMAILS'] ?? '')
      .split(',')
      .map((allowed) => allowed.trim().toLowerCase())
      .filter(Boolean);
    if (
      accessMode !== 'admin-only' ||
      mode !== 'standard' ||
      ctx.req.header('x-email-verified') !== 'true' ||
      !allowedEmails.includes(email.trim().toLowerCase())
    ) {
      // Check before identity resolution: closed access must never create another account.
      throw AppError.forbidden('Accès réservé à l’administration.');
    }
  }

  let userId: string;
  let mustChangePassword = false;
  let generationBalance: number | null = null;
  if (mode === 'beta') {
    const { db } = await import('../db/index.js');
    const { assertActiveBetaSession } = await import('../services/beta-tester.service.js');
    if (!/^[0-9a-f-]{36}$/i.test(oauthId)) throw AppError.unauthorized('Session bêta invalide');
    const [betaUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, oauthId), eq(users.email, email)))
      .limit(1);
    const sessionVersion = ctx.req.header('x-beta-session-version');
    if (!betaUser || !sessionVersion) throw AppError.unauthorized('Session bêta invalide');
    const beta = await assertActiveBetaSession(betaUser.id, sessionVersion);
    userId = betaUser.id;
    mustChangePassword = beta.mustChangePassword === 1;
    generationBalance = beta.generationBalance;
  } else {
    const issuedAt = parseSessionIssuedAt(ctx.req.header('x-auth-issued-at'));
    await assertGoogleSessionActive(oauthId, issuedAt);
    userId = await resolveGoogleIdentity({
      subject: oauthId,
      email,
      name,
      issuedAt,
      verifiedEmail: ctx.req.header('x-email-verified') === 'true',
    });
  }
  const { db } = await import('../db/index.js');
  const [user] = await db
    .select({ suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const suspended = user?.suspendedAt != null;
  ctx.set('accountSuspended', suspended);
  ctx.set('auth', {
    userId,
    email,
    ...(mode === 'standard' ? { subject: oauthId } : {}),
    accessMode: mode,
    mustChangePassword,
    generationBalance,
  });
  const allowedWhileSuspended =
    (ctx.req.method === 'GET' &&
      ['/account/status', '/billing/status', '/account/export'].includes(ctx.req.path)) ||
    (ctx.req.method === 'POST' && ctx.req.path === '/billing/portal') ||
    (ctx.req.method === 'DELETE' && ctx.req.path === '/account');
  if (suspended && !allowedWhileSuspended)
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'Votre compte est suspendu. La gestion de votre abonnement reste accessible.',
    );
  await next();
}
