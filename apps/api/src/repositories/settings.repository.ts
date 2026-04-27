import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userSettings } from '../db/schema.js';
import type { AiProvider } from '../services/ai.service.js';

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
    provider: row.aiProvider as AiProvider,
    aiApiKeyEncrypted: row.aiApiKeyEncrypted,
    aiModel: row.aiModel,
  };
}

export async function upsertSettings(
  userId: string,
  data: {
    provider: AiProvider;
    aiApiKeyEncrypted?: string | null;
    aiModel?: string | null;
  },
): Promise<void> {
  await db
    .insert(userSettings)
    .values({
      userId,
      aiProvider: data.provider,
      aiApiKeyEncrypted: data.aiApiKeyEncrypted ?? null,
      aiModel: data.aiModel ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        aiProvider: data.provider,
        ...(data.aiApiKeyEncrypted !== undefined && { aiApiKeyEncrypted: data.aiApiKeyEncrypted }),
        ...(data.aiModel !== undefined && { aiModel: data.aiModel }),
        updatedAt: new Date(),
      },
    });
}
