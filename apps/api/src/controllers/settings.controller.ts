import type { Context } from 'hono';
import { z } from 'zod';
import { findSettingsByUser, upsertSettings } from '../repositories/settings.repository.js';
import { AppError } from '../types/app-error.js';
import type { AiProvider } from '../services/ai.service.js';
import { generationPolicy } from '../services/generation-policy.js';

const DEFAULT_AI_PROVIDER: AiProvider = 'openai';
const OpenAiModelSchema = z
  .string()
  .max(100)
  .refine(
    (value) => generationPolicy().allowedModels.includes(value),
    'Ce modele ne fait pas partie de la politique du service',
  );

const SaveSettingsSchema = z.object({
  model: OpenAiModelSchema.optional(),
});

function normalizeOpenAiModel(model?: string | null): string {
  const parsed = OpenAiModelSchema.safeParse(model);
  return parsed.success ? parsed.data : generationPolicy().defaultModel;
}

export async function handleGetSettings(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  try {
    const row = await findSettingsByUser(auth.userId);
    return ctx.json({
      provider: DEFAULT_AI_PROVIDER,
      hasApiKey: false,
      model: normalizeOpenAiModel(row?.aiModel),
    });
  } catch {
    // Table pas encore migree : renvoyer les valeurs par defaut.
    return ctx.json({
      provider: DEFAULT_AI_PROVIDER,
      hasApiKey: false,
      model: generationPolicy().defaultModel,
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
  } catch {
    console.error('[Settings]', { code: 'SETTINGS_WRITE_FAILED' });
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
  let model = generationPolicy().defaultModel;

  try {
    const row = await findSettingsByUser(userId);
    model = normalizeOpenAiModel(row?.aiModel);
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
