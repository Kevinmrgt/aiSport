import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

export async function internalSecretMiddleware(ctx: Context, next: Next): Promise<void> {
  const secret = process.env['SERVICE_SECRET'];
  if (!secret || ctx.req.header('x-internal-secret') !== secret) {
    throw AppError.unauthorized('Accès interne requis');
  }
  await next();
}
