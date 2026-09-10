import type { Context } from 'hono';
import { z } from 'zod';
import { authorizeBeta, updateOwnBetaPassword } from '../services/beta-tester.service.js';
import { AppError } from '../types/app-error.js';

const CredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

export async function handleAuthorizeBeta(ctx: Context): Promise<Response> {
  const parsed = CredentialsSchema.safeParse(ctx.get('betaCredentials'));
  if (!parsed.success) throw AppError.unauthorized('Identifiants invalides');
  const beta = await authorizeBeta(parsed.data.email, parsed.data.password);
  if (!beta) throw AppError.unauthorized('Identifiants invalides');
  return ctx.json(beta);
}

export async function handleChangeOwnBetaPassword(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  if (auth.accessMode !== 'beta') throw AppError.forbidden('Accès bêta requis');
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Le nouveau mot de passe doit contenir au moins 12 caractères.');
  await updateOwnBetaPassword(auth.userId, parsed.data.currentPassword, parsed.data.newPassword);
  return ctx.json({ ok: true });
}
