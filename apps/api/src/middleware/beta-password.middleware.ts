import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

export async function betaPasswordChangedMiddleware(ctx: Context, next: Next): Promise<void> {
  const auth = ctx.get('auth');
  if (auth.accessMode === 'beta' && auth.mustChangePassword) {
    throw AppError.forbidden('Vous devez changer votre mot de passe temporaire avant de continuer.');
  }
  await next();
}
