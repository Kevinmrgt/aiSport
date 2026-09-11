import type { GenerationQuota } from '@alcide/shared';
import {
  getGenerationQuotaUsage,
  releaseGenerationSlot,
  reserveGenerationSlot,
} from '../repositories/generation-quota.repository.js';
import { AppError } from '../types/app-error.js';
import type { CreditPersistence } from '../repositories/billing.repository.js';

export type GenerationAccessMode = 'standard' | 'jury' | 'beta';
export const JURY_GENERATION_LIMIT = 30;

export async function getGenerationQuota(
  userId: string,
  accessMode: GenerationAccessMode,
  betaBalance: number | null = null,
): Promise<GenerationQuota> {
  if (accessMode !== 'jury') {
    if (accessMode === 'beta') {
      return { mode: 'beta', limited: true, limit: null, used: 0, remaining: betaBalance ?? 0 };
    }
    const { readBillingStatus } = await import('../repositories/billing.repository.js');
    const status = await readBillingStatus(userId);
    return { mode: 'standard', limited: true, limit: null, used: 0, remaining: status.remaining, plan: status.plan, periodEnd: status.periodEnd };
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
  operation: (persist?: CreditPersistence) => Promise<T>,
  creditCost = 1,
): Promise<T> {
  if (accessMode === 'standard') {
    const { withBillingCredits } = await import('./billing-credits.service.js');
    return withBillingCredits(userId, creditCost, operation);
  }

  if (accessMode === 'beta') {
    // Import tardif : les parcours standard/jury restent testables sans
    // initialiser la connexion PostgreSQL des profils bêta.
    const { releaseBetaSlot, reserveBetaSlot } = await import('./beta-tester.service.js');
    const reservation = await reserveBetaSlot(userId);
    if (!reservation) {
      throw new AppError(
        429,
        'GENERATION_QUOTA_EXCEEDED',
        'Le solde de générations bêta est épuisé.',
        { remaining: 0 },
      );
    }
    try {
      return await operation();
    } catch (error) {
      await releaseBetaSlot(userId);
      throw error;
    }
  }

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
