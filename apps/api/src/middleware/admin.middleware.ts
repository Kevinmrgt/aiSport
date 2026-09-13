import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';
import { isAdministratorEmail } from '../config/admin.js';

export async function adminMiddleware(ctx: Context, next: Next): Promise<void> {
  const auth = ctx.get('auth');
  if (auth.accessMode !== 'standard' || !isAdministratorEmail(auth.email)) {
    throw AppError.forbidden('Accès administrateur requis');
  }
  await next();
}
