import type { Context } from 'hono';
import { z } from 'zod';
import {
  adjustManagedBetaBalance,
  createManagedBetaTester,
  listManagedBetaTesters,
  resetManagedBetaPassword,
  setManagedBetaStatus,
} from '../services/beta-tester.service.js';
import { AppError } from '../types/app-error.js';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
  generationBalance: z.number().int().min(0).max(10_000),
});
const AdjustmentSchema = z.object({ amount: z.number().int().min(-10_000).max(10_000).refine((value) => value !== 0) });
const StatusSchema = z.object({ active: z.boolean() });
const UserIdSchema = z.string().uuid();

function userId(ctx: Context): string {
  const parsed = UserIdSchema.safeParse(ctx.req.param('userId'));
  if (!parsed.success) throw AppError.badRequest('Identifiant bêta invalide');
  return parsed.data;
}

export async function handleListBetaTesters(ctx: Context): Promise<Response> {
  const betaTesters = await listManagedBetaTesters();
  return ctx.json({ betaTesters });
}

export async function handleCreateBetaTester(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Données du bêta-testeur invalides', parsed.error.flatten());
  const created = await createManagedBetaTester({ ...parsed.data, adminEmail: ctx.get('auth').email });
  return ctx.json({ ...created.beta, temporaryPassword: created.temporaryPassword }, 201);
}

export async function handleAdjustBetaBalance(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = AdjustmentSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Variation de crédits invalide');
  const balance = await adjustManagedBetaBalance(userId(ctx), parsed.data.amount, ctx.get('auth').email);
  return ctx.json({ generationBalance: balance });
}

export async function handleSetBetaStatus(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Statut invalide');
  await setManagedBetaStatus(userId(ctx), parsed.data.active);
  return ctx.json({ ok: true });
}

export async function handleResetBetaPassword(ctx: Context): Promise<Response> {
  const temporaryPassword = await resetManagedBetaPassword(userId(ctx));
  return ctx.json({ temporaryPassword });
}
