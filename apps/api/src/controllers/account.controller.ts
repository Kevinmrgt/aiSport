import type { Context } from 'hono';
import { z } from 'zod';
import { eraseOwnedAccount, exportOwnedAccount } from '../services/account.service.js';
import { AppError } from '../types/app-error.js';

const DeleteAccountSchema = z.object({ confirmation: z.literal('SUPPRIMER') }).strict();

export async function handleExportAccount(ctx: Context): Promise<Response> {
  const result = await exportOwnedAccount(ctx.get('auth').userId);
  ctx.header('Cache-Control', 'no-store, private');
  ctx.header('Content-Disposition', 'attachment; filename="alcide-donnees.json"');
  return ctx.json(result);
}

export async function handleDeleteAccount(ctx: Context): Promise<Response> {
  const body: unknown = await ctx.req.json<unknown>().catch(() => undefined);
  if (!DeleteAccountSchema.safeParse(body).success)
    throw AppError.badRequest('Confirmez avec SUPPRIMER');
  const identity = ctx.get('auth');
  if (!identity.subject) throw AppError.unauthorized('Reconnectez-vous avec Google');
  await eraseOwnedAccount(identity.userId, identity.subject);
  ctx.header('Cache-Control', 'no-store, private');
  return ctx.json({ ok: true });
}
