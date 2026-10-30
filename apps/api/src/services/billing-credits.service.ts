import {
  persistWithCredits,
  releaseCredits,
  reserveCredits,
  type CreditPersistence,
} from '../repositories/billing.repository.js';

export async function withBillingCredits<T>(
  userId: string,
  cost: number,
  operation: (persist?: CreditPersistence) => Promise<T>,
): Promise<T> {
  const reservation = await reserveCredits(userId, cost);
  try {
    return await operation((save) => persistWithCredits(userId, reservation, save));
  } catch (error) {
    try {
      await releaseCredits(userId, reservation);
    } catch {
      console.error('[Billing] Credit release deferred to reservation recovery', { reservation });
    }
    throw error;
  }
}
