import type { Context } from 'hono';
import { z } from 'zod';
import {
  adjustManagedBetaBalance,
  createManagedBetaTester,
  deleteManagedBetaTester,
  listManagedBetaTesters,
  resetManagedBetaPassword,
  setManagedBetaStatus,
} from '../services/beta-tester.service.js';
import { AppError } from '../types/app-error.js';
import { AI_MODELS, DEFAULT_OPENAI_MODEL, normalizeOpenAiModel, OpenAiModelSchema } from '../config/ai-models.js';
import { getAdminPlatformStats } from '../repositories/admin-dashboard.repository.js';
import { findPlatformSettings, upsertPlatformSettings } from '../repositories/settings.repository.js';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
  generationBalance: z.number().int().min(0).max(10_000),
});
const AdjustmentSchema = z.object({ amount: z.number().int().min(-10_000).max(10_000).refine((value) => value !== 0) });
const StatusSchema = z.object({ active: z.boolean() });
const PlatformSettingsSchema = z.object({
  defaultAiModel: OpenAiModelSchema,
  defaultBetaGenerationBalance: z.number().int().min(1).max(10_000),
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
  const [stats, settings] = await Promise.all([
    getAdminPlatformStats(),
    findPlatformSettings().catch(() => null),
  ]);

  return ctx.json({
    stats,
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
  if (!parsed.success) throw AppError.badRequest('Réglages de plateforme invalides', parsed.error.flatten());

  try {
    await upsertPlatformSettings(parsed.data);
  } catch (error) {
    console.error('[Admin] Erreur sauvegarde réglages plateforme:', error);
    throw AppError.internal('Impossible de sauvegarder les réglages. Réessayez dans quelques instants.');
  }

  return ctx.json({ settings: parsed.data });
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

export async function handleDeleteBetaTester(ctx: Context): Promise<Response> {
  await deleteManagedBetaTester(userId(ctx));
  return ctx.json({ ok: true });
}
