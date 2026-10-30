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
  const encodedName = ctx.req.header('x-user-name-encoded');
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

  const accessMode = process.env['PRODUCTION_ACCESS_MODE'] ?? 'public';
  if (accessMode !== 'public') {
    const allowedEmails = (process.env['ADMIN_EMAILS'] ?? '')
      .split(',')
      .map((allowed) => allowed.trim().toLowerCase())
      .filter(Boolean);
    if (
      accessMode !== 'admin-only' ||
      ctx.req.header('x-email-verified') !== 'true' ||
      !allowedEmails.includes(email.trim().toLowerCase())
    ) {
      // Check before identity resolution: closed access must never create another account.
      throw AppError.forbidden('Accès réservé à l’administration.');
    }
  }

  const issuedAt = parseSessionIssuedAt(ctx.req.header('x-auth-issued-at'));
  await assertGoogleSessionActive(oauthId, issuedAt);
  const userId = await resolveGoogleIdentity({
    subject: oauthId,
    email,
    name,
    issuedAt,
    verifiedEmail: ctx.req.header('x-email-verified') === 'true',
  });
  ctx.set('auth', { userId, email, subject: oauthId });
  await next();
}
