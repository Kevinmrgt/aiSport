import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { accountRevocations } from '../db/privacy.schema.js';
import { AppError } from '../types/app-error.js';
import type { db as database } from '../db/index.js';

const MAX_SESSION_AGE_MS = 31 * 24 * 60 * 60 * 1000;
export const REVOCATION_RETENTION_MS = 35 * 24 * 60 * 60 * 1000;
export const SESSION_CLOCK_SKEW_MS = 30_000;

export function identityHash(subject: string): string {
  const secret = process.env['PRIVACY_REVOCATION_SECRET'] ?? process.env['SERVICE_SECRET'];
  if (!secret) throw AppError.internal('Configuration de révocation indisponible');
  return createHmac('sha256', secret).update(`google:${subject}`).digest('hex');
}

export function parseSessionIssuedAt(value: string | undefined, now = Date.now()): number {
  if (!value || !/^\d{13}$/.test(value))
    throw AppError.unauthorized('Reconnectez-vous avec Google');
  const issuedAt = Number(value);
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + SESSION_CLOCK_SKEW_MS ||
    issuedAt < now - MAX_SESSION_AGE_MS
  ) {
    throw AppError.unauthorized('Reconnectez-vous avec Google');
  }
  return issuedAt;
}

export async function assertGoogleSessionActive(
  subject: string,
  issuedAt: number,
  executor?: Pick<typeof database, 'select'>,
): Promise<void> {
  const connection = executor ?? (await import('../db/index.js')).db;
  const [revoked] = await connection
    .select({ revokedAt: accountRevocations.revokedAt })
    .from(accountRevocations)
    .where(eq(accountRevocations.subjectHash, identityHash(subject)))
    .limit(1);
  if (revoked && issuedAt <= revoked.revokedAt.getTime() + SESSION_CLOCK_SKEW_MS) {
    throw AppError.unauthorized(
      'Cette session a été révoquée. Après une suppression, patientez une minute puis reconnectez-vous avec Google.',
    );
  }
}
