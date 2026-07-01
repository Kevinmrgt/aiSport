import type { Context } from 'hono';
import { z } from 'zod';
import { findSettingsByUser, upsertSettings } from '../repositories/settings.repository.js';
import { AppError } from '../types/app-error.js';
import type { AiProvider } from '../services/ai.service.js';

const DEFAULT_AI_PROVIDER: AiProvider = 'openai';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

const SaveSettingsSchema = z.object({
  model: z.string().optional(),
});

function normalizeOpenAiModel(model?: string | null): string {
  return model?.startsWith('gpt-') ? model : DEFAULT_OPENAI_MODEL;
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
    throw AppError.internal('Impossible de sauvegarder les parametres. Reessayez dans quelques instants.');
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
