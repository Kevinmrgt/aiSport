import type { Context } from 'hono';
import { z } from 'zod';
import { AdminGrantSchema, AdminQuerySchema, AdminSuspensionSchema } from '@alcide/shared';
import { AppError } from '../types/app-error.js';
import * as repository from '../repositories/admin.repository.js';
import { getAdminPlatformAnalytics } from '../repositories/admin-dashboard.repository.js';

function query(ctx: Context) {
  const parsed = AdminQuerySchema.safeParse(ctx.req.query());
  if (!parsed.success) throw AppError.badRequest('Filtres invalides', parsed.error.flatten());
  return parsed.data;
}
function id(ctx: Context) {
  const parsed = z.string().uuid().safeParse(ctx.req.param('id'));
  if (!parsed.success) throw AppError.badRequest('Identifiant invalide');
  return parsed.data;
}
export async function handleAdminSummary(ctx: Context) {
  return ctx.json(await repository.getAdminSummary());
}
export async function handleAdminAnalytics(ctx: Context) {
  return ctx.json(await getAdminPlatformAnalytics());
}
export async function handleAdminMembers(ctx: Context) {
  return ctx.json(await repository.listAdminMembers(query(ctx)));
}
export async function handleAdminMember(ctx: Context) {
  return ctx.json(await repository.getAdminMember(id(ctx)));
}
export async function handleAdminSubscriptions(ctx: Context) {
  return ctx.json(await repository.listAdminSubscriptions(query(ctx)));
}
export async function handleAdminCredits(ctx: Context) {
  return ctx.json(await repository.listAdminCredits(query(ctx)));
}
export async function handleAdminAudit(ctx: Context) {
  return ctx.json(await repository.listAdminAudit(query(ctx)));
}
export function handleAdminContents(kind: 'workouts' | 'programs') {
  return async (ctx: Context) => ctx.json(await repository.listAdminContents(kind, query(ctx)));
}
export function handleAdminContent(kind: 'workouts' | 'programs') {
  return async (ctx: Context) => ctx.json(await repository.getAdminContent(kind, id(ctx)));
}
export async function handleAdminSuspension(ctx: Context) {
  const input = AdminSuspensionSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!input.success) throw AppError.badRequest('Statut ou motif invalide');
  await repository.suspendAdminMember(
    id(ctx),
    input.data.suspended,
    input.data.reason,
    ctx.get('auth').email,
  );
  return ctx.json({ ok: true });
}
export async function handleAdminGrant(ctx: Context) {
  const input = AdminGrantSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!input.success)
    throw AppError.badRequest('Dotation invalide : indiquez un montant et un motif.');
  await repository.grantAdminCredits(id(ctx), input.data, ctx.get('auth').email);
  return ctx.json({ ok: true });
}
