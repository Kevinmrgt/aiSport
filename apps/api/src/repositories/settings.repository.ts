import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { platformSettings, userSettings } from '../db/schema.js';
import type { AiProvider } from '../services/ai.service.js';

const OPENAI_PROVIDER: AiProvider = 'openai';

export interface SettingsRow {
  provider: AiProvider;
  aiApiKeyEncrypted: string | null;
  aiModel: string | null;
}

export async function findSettingsByUser(userId: string): Promise<SettingsRow | null> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    provider: OPENAI_PROVIDER,
    aiApiKeyEncrypted: null,
    aiModel: row.aiModel,
  };
}

export async function upsertSettings(
  userId: string,
  data: {
    aiModel?: string | null;
  },
): Promise<void> {
  await db
    .insert(userSettings)
    .values({
      userId,
      aiProvider: OPENAI_PROVIDER,
      aiApiKeyEncrypted: null,
      aiModel: data.aiModel ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        aiProvider: OPENAI_PROVIDER,
        aiApiKeyEncrypted: null,
        ...(data.aiModel !== undefined && { aiModel: data.aiModel }),
        updatedAt: new Date(),
      },
    });
}

export async function findPlatformSettings(): Promise<{
  defaultAiModel: string;
  defaultBetaGenerationBalance: number;
} | null> {
  const [row] = await db
    .select({
      defaultAiModel: platformSettings.defaultAiModel,
      defaultBetaGenerationBalance: platformSettings.defaultBetaGenerationBalance,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, 'default'))
    .limit(1);
  return row ?? null;
}

export async function upsertPlatformSettings(input: {
  defaultAiModel: string;
  defaultBetaGenerationBalance: number;
}): Promise<void> {
  await db
    .insert(platformSettings)
    .values({
      id: 'default',
      defaultAiModel: input.defaultAiModel,
      defaultBetaGenerationBalance: input.defaultBetaGenerationBalance,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: {
        defaultAiModel: input.defaultAiModel,
        defaultBetaGenerationBalance: input.defaultBetaGenerationBalance,
        updatedAt: new Date(),
      },
    });
}
