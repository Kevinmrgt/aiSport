import type { Context } from 'hono';
import { z } from 'zod';
import { AdminBetaCreateSchema, AdminBetaAdjustmentSchema, AdminBetaStatusSchema, AdminReasonInputSchema, AdminSettingsSchema } from '@alcide/shared';
import {
  adjustManagedBetaBalance,
  createManagedBetaTester,
  deleteManagedBetaTester,
  listManagedBetaTesters,
  resetManagedBetaPassword,
  setManagedBetaStatus,
} from '../services/beta-tester.service.js';
import { AppError } from '../types/app-error.js';
import {
  AI_MODELS,
  DEFAULT_OPENAI_MODEL,
  normalizeOpenAiModel,
  OpenAiModelSchema,
} from '../config/ai-models.js';
import {
  getAdminPlatformAnalytics,
  getAdminPlatformStats,
} from '../repositories/admin-dashboard.repository.js';
import {
  findPlatformSettings,
  upsertPlatformSettings,
} from '../repositories/settings.repository.js';

const CreateSchema = AdminBetaCreateSchema;
const AdjustmentSchema = AdminBetaAdjustmentSchema;
const StatusSchema = AdminBetaStatusSchema;
const PlatformSettingsSchema = AdminSettingsSchema.extend({
  defaultAiModel: OpenAiModelSchema,
});
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

export async function handleGetAdminOverview(ctx: Context): Promise<Response> {
  const [stats, analytics, settings] = await Promise.all([
    getAdminPlatformStats(),
    getAdminPlatformAnalytics(),
    findPlatformSettings().catch(() => null),
  ]);

  return ctx.json({
    stats,
    analytics,
    settings: {
      defaultAiModel: normalizeOpenAiModel(settings?.defaultAiModel ?? DEFAULT_OPENAI_MODEL),
      defaultBetaGenerationBalance: settings?.defaultBetaGenerationBalance ?? 10,
    },
    availableModels: AI_MODELS,
  });
}

export async function handleSavePlatformSettings(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = PlatformSettingsSchema.safeParse(body);
  if (!parsed.success)
    throw AppError.badRequest('Réglages de plateforme invalides', parsed.error.flatten());

  try {
    await upsertPlatformSettings(parsed.data, ctx.get('auth').email);
  } catch (error) {
    console.error('[Admin] Erreur sauvegarde réglages plateforme:', error);
    throw AppError.internal(
      'Impossible de sauvegarder les réglages. Réessayez dans quelques instants.',
    );
  }

  return ctx.json({ settings: parsed.data });
}

export async function handleCreateBetaTester(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    throw AppError.badRequest('Données du bêta-testeur invalides', parsed.error.flatten());
  const created = await createManagedBetaTester({
    ...parsed.data,
    adminEmail: ctx.get('auth').email,
  });
  return ctx.json({ ...created.beta, temporaryPassword: created.temporaryPassword }, 201);
}

export async function handleAdjustBetaBalance(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = AdjustmentSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Variation de crédits invalide');
  const balance = await adjustManagedBetaBalance(
    userId(ctx),
    parsed.data.amount,
    ctx.get('auth').email,
    parsed.data.reason,
    parsed.data.requestId,
  );
  return ctx.json({ generationBalance: balance });
}

export async function handleSetBetaStatus(ctx: Context): Promise<Response> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Statut invalide');
  await setManagedBetaStatus(userId(ctx), parsed.data.active, ctx.get('auth').email, parsed.data.reason);
  return ctx.json({ ok: true });
}

export async function handleResetBetaPassword(ctx: Context): Promise<Response> {
  const reason = await optionalReason(ctx);
  const temporaryPassword = await resetManagedBetaPassword(userId(ctx), ctx.get('auth').email, reason);
  return ctx.json({ temporaryPassword });
}

export async function handleDeleteBetaTester(ctx: Context): Promise<Response> {
  const reason = await optionalReason(ctx);
  await deleteManagedBetaTester(userId(ctx), ctx.get('auth').email, reason);
  return ctx.json({ ok: true });
}

async function optionalReason(ctx: Context): Promise<string | undefined> {
  const text = await ctx.req.text();
  let body: unknown = {};
  try { if (text) body = JSON.parse(text); } catch { throw AppError.badRequest('Motif invalide'); }
  const parsed = AdminReasonInputSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest('Motif invalide');
  return parsed.data.reason;
}

export async function handleGetPlatformSettings(ctx: Context): Promise<Response> {
  const settings = await findPlatformSettings();
  return ctx.json({ settings: { defaultAiModel: normalizeOpenAiModel(settings?.defaultAiModel ?? DEFAULT_OPENAI_MODEL), defaultBetaGenerationBalance: settings?.defaultBetaGenerationBalance ?? 10 }, availableModels: AI_MODELS });
}
