import type { Context } from 'hono';
import { z } from 'zod';
import {
  AdminIncidentQuerySchema,
  BrowserIncidentInputSchema,
  UpdateIncidentStatusSchema,
} from '@alcide/shared';
import { AppError } from '../types/app-error.js';
import { listAdminIncidents, updateAdminIncident } from '../repositories/incident.repository.js';
import { recordBrowserIncident } from '../services/incident.service.js';

export async function handleListIncidents(ctx: Context): Promise<Response> {
  const query = AdminIncidentQuerySchema.safeParse(ctx.req.query());
  if (!query.success) throw AppError.badRequest('Filtres invalides');
  return ctx.json(await listAdminIncidents(query.data));
}
export async function handleUpdateIncident(ctx: Context): Promise<Response> {
  const id = z.string().uuid().safeParse(ctx.req.param('id'));
  const input = UpdateIncidentStatusSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!id.success || !input.success) throw AppError.badRequest('Incident ou statut invalide');
  return ctx.json(await updateAdminIncident(id.data, input.data.status, ctx.get('auth').email));
}
export async function handleBrowserIncident(ctx: Context): Promise<Response> {
  const input = BrowserIncidentInputSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!input.success) throw AppError.badRequest('Signalement invalide');
  await recordBrowserIncident(input.data.kind, input.data.path, ctx.get('requestId'));
  return ctx.body(null, 204);
}
