import type { Context } from 'hono';
import { z } from 'zod';
import { findPlatformSettings, findSettingsByUser, upsertSettings } from '../repositories/settings.repository.js';
import { AppError } from '../types/app-error.js';
import type { AiProvider } from '../services/ai.service.js';
import { DEFAULT_OPENAI_MODEL, normalizeOpenAiModel, OpenAiModelSchema } from '../config/ai-models.js';

const DEFAULT_AI_PROVIDER: AiProvider = 'openai';

const SaveSettingsSchema = z.object({
  model: OpenAiModelSchema.optional(),
});

export async function handleGetSettings(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  try {
    const row = await findSettingsByUser(auth.userId);
    const platform = row?.aiModel ? null : await findPlatformSettings();
    return ctx.json({
      provider: DEFAULT_AI_PROVIDER,
      hasApiKey: false,
      model: normalizeOpenAiModel(row?.aiModel ?? platform?.defaultAiModel),
    });
  } catch {
    // Table pas encore migree : renvoyer les valeurs par defaut.
    return ctx.json({
      provider: DEFAULT_AI_PROVIDER,
      hasApiKey: false,
      model: DEFAULT_OPENAI_MODEL,
    });
  }
}

export async function handleSaveSettings(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  const body: unknown = await ctx.req.json<unknown>().catch(() => {
    throw AppError.badRequest('Corps de la requete JSON invalide');
  });

  const parsed = SaveSettingsSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.badRequest('Donnees invalides', parsed.error.flatten());
  }

  try {
    await upsertSettings(auth.userId, {
      aiModel: normalizeOpenAiModel(parsed.data.model),
    });
  } catch (err) {
    console.error('[Settings] Erreur upsertSettings:', err);
    throw AppError.internal(
      'Impossible de sauvegarder les parametres. Reessayez dans quelques instants.',
    );
  }

  return ctx.json({ ok: true });
}

// Resoudre la config IA effective : cle OpenAI serveur geree par Alcide.
export async function resolveAiConfig(userId: string): Promise<{
  provider: AiProvider;
  apiKey: string;
  model?: string;
}> {
  let model = DEFAULT_OPENAI_MODEL;

  try {
    const row = await findSettingsByUser(userId);
    if (row?.aiModel) {
      model = normalizeOpenAiModel(row.aiModel);
    } else {
      const platform = await findPlatformSettings();
      model = normalizeOpenAiModel(platform?.defaultAiModel);
    }
  } catch {
    console.warn('[resolveAiConfig] user_settings table inaccessible, fallback cle serveur');
  }

  const serverKey = process.env['OPENAI_API_KEY'];
  if (!serverKey) {
    throw AppError.internal(
      'Aucune cle IA serveur configuree. Ajoutez OPENAI_API_KEY dans les variables d environnement.',
    );
  }

  return { provider: DEFAULT_AI_PROVIDER, apiKey: serverKey, model };
}
