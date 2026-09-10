import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

function adminEmails(): Set<string> {
  return new Set(
    (process.env['ADMIN_EMAILS'] ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function adminMiddleware(ctx: Context, next: Next): Promise<void> {
  const auth = ctx.get('auth');
  if (auth.accessMode !== 'standard' || !adminEmails().has(auth.email.toLowerCase())) {
    throw AppError.forbidden('Accès administrateur requis');
  }
  await next();
}
