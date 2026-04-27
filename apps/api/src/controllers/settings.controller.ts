import type { Context } from 'hono';
import { z } from 'zod';
import { findSettingsByUser, upsertSettings } from '../repositories/settings.repository.js';
import { encryptApiKey, decryptApiKey } from '../services/ai.service.js';
import { AppError } from '../types/app-error.js';

const SaveSettingsSchema = z.object({
  provider: z.enum(['mistral', 'openai', 'anthropic']),
  apiKey: z.string().min(1).optional(),
  model: z.string().optional(),
});

export async function handleGetSettings(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  try {
    const row = await findSettingsByUser(auth.userId);
    return ctx.json({
      provider: row?.provider ?? 'mistral',
      hasApiKey: !!row?.aiApiKeyEncrypted,
      model: row?.aiModel ?? null,
    });
  } catch {
    // Table pas encore migrée — renvoyer les valeurs par défaut
    return ctx.json({ provider: 'mistral', hasApiKey: false, model: null });
  }
}

export async function handleSaveSettings(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  const body: unknown = await ctx.req.json<unknown>().catch(() => {
    throw AppError.badRequest('Corps de la requête JSON invalide');
  });

  const parsed = SaveSettingsSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.badRequest('Données invalides', parsed.error.flatten());
  }

  let existing: Awaited<ReturnType<typeof findSettingsByUser>> = null;
  try {
    existing = await findSettingsByUser(auth.userId);
  } catch {
    // Table pas encore migrée — on continue avec existing = null
  }

  // Chiffrer la nouvelle clé ou conserver l'ancienne
  let aiApiKeyEncrypted: string | null | undefined = undefined;
  if (parsed.data.apiKey) {
    aiApiKeyEncrypted = encryptApiKey(parsed.data.apiKey);
  } else if (existing?.aiApiKeyEncrypted) {
    aiApiKeyEncrypted = existing.aiApiKeyEncrypted;
  } else {
    aiApiKeyEncrypted = null;
  }

  try {
    await upsertSettings(auth.userId, {
      provider: parsed.data.provider,
      aiApiKeyEncrypted,
      aiModel: parsed.data.model ?? null,
    });
  } catch (err) {
    console.error('[Settings] Erreur upsertSettings:', err);
    throw AppError.internal('Impossible de sauvegarder les paramètres. Réessayez dans quelques instants.');
  }

  return ctx.json({ ok: true });
}

export async function handleDeleteApiKey(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const existing = await findSettingsByUser(auth.userId);

  if (existing) {
    await upsertSettings(auth.userId, {
      provider: existing.provider,
      aiApiKeyEncrypted: null,
      aiModel: existing.aiModel,
    });
  }

  return ctx.json({ ok: true });
}

// Résoudre la config IA effective d'un utilisateur (clé perso ou clé serveur)
export async function resolveAiConfig(userId: string): Promise<{
  provider: 'mistral' | 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}> {
  try {
    const row = await findSettingsByUser(userId);

    if (row?.aiApiKeyEncrypted) {
      const apiKey = decryptApiKey(row.aiApiKeyEncrypted);
      const result: { provider: 'mistral' | 'openai' | 'anthropic'; apiKey: string; model?: string } = {
        provider: row.provider,
        apiKey,
      };
      if (row.aiModel) result.model = row.aiModel;
      return result;
    }
  } catch {
    // Table pas encore migrée — fallback sur la clé serveur
    console.warn('[resolveAiConfig] user_settings table inaccessible, fallback clé serveur');
  }

  // Fallback : clé Mistral serveur
  const serverKey = process.env['MISTRAL_API_KEY'];
  if (!serverKey) {
    throw AppError.internal('Aucune clé IA configurée. Renseignez votre clé API dans les paramètres.');
  }
  return { provider: 'mistral', apiKey: serverKey };
}
