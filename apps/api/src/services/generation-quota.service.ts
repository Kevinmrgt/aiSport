import type { GenerationQuota } from '@alcide/shared';
import {
  getGenerationQuotaUsage,
  releaseGenerationSlot,
  reserveGenerationSlot,
} from '../repositories/generation-quota.repository.js';
import { AppError } from '../types/app-error.js';

export type GenerationAccessMode = 'standard' | 'jury';
export const JURY_GENERATION_LIMIT = 30;

export async function getGenerationQuota(
  userId: string,
  accessMode: GenerationAccessMode,
): Promise<GenerationQuota> {
  if (accessMode !== 'jury') {
    return { limited: false, limit: null, used: 0, remaining: null };
  }

  const used = await getGenerationQuotaUsage(userId, JURY_GENERATION_LIMIT);
  return {
    limited: true,
    limit: JURY_GENERATION_LIMIT,
    used,
    remaining: Math.max(0, JURY_GENERATION_LIMIT - used),
  };
}

export async function runWithGenerationQuota<T>(
  userId: string,
  accessMode: GenerationAccessMode,
  operation: () => Promise<T>,
): Promise<T> {
  if (accessMode !== 'jury') return operation();

  const reservation = await reserveGenerationSlot(userId, JURY_GENERATION_LIMIT);
  if (!reservation) {
    throw new AppError(
      429,
      'GENERATION_QUOTA_EXCEEDED',
      'Le quota jury de 30 generations est atteint.',
      { limit: JURY_GENERATION_LIMIT, remaining: 0 },
    );
  }

  try {
    return await operation();
  } catch (error) {
    try {
      await releaseGenerationSlot(userId);
    } catch (releaseError) {
      console.error('[GenerationQuota] Impossible de liberer la reservation apres echec', {
        userId,
        releaseError: releaseError instanceof Error ? releaseError.message : releaseError,
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}
