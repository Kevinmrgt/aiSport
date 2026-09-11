import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { AppError } from '../types/app-error.js';
import { BILLING_OFFER, type BillingStatus } from '@alcide/shared';

export type BillingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type CreditPersistence = <T>(save: (tx: BillingTransaction) => Promise<T>) => Promise<T>;
export interface BillingAccount {
  user_id: string;
  stripe_customer_id: string | null;
  checkout_session_id: string | null;
}
interface Grant {
  id: string;
  remaining: number;
  subscription_id: string | null;
  expires_at: string | null;
}
interface Allocation {
  id: string;
  amount: number;
}

// One row lock serializes credit changes, checkout creation and Stripe reconciliation per user.
export async function withBillingAccount<T>(
  userId: string,
  work: (tx: BillingTransaction, account: BillingAccount) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO billing_accounts(user_id) VALUES (${userId}::uuid) ON CONFLICT DO NOTHING`,
    );
    const result = await tx.execute(
      sql`SELECT * FROM billing_accounts WHERE user_id=${userId}::uuid FOR UPDATE`,
    );
    const account = result.rows[0] as unknown as BillingAccount;
    await tx.execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,amount,remaining)
      VALUES (${userId}::uuid, ${'welcome:' + userId}, ${BILLING_OFFER.freeCredits}, ${BILLING_OFFER.freeCredits}) ON CONFLICT DO NOTHING`);
    return work(tx, account);
  });
}

export async function findBillingUser(customerId: string): Promise<string | null> {
  const result = await db.execute(
    sql`SELECT user_id FROM billing_accounts WHERE stripe_customer_id=${customerId}`,
  );
  return (result.rows[0]?.['user_id'] as string | undefined) ?? null;
}

async function availableGrants(tx: BillingTransaction, userId: string): Promise<Grant[]> {
  const result =
    await tx.execute(sql`SELECT g.id,g.remaining,g.subscription_id,g.expires_at FROM billing_credit_grants g
    LEFT JOIN billing_subscriptions s ON s.id=g.subscription_id
    WHERE g.user_id=${userId}::uuid AND g.starts_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now())
    AND (g.subscription_id IS NULL OR s.status IN ('active','past_due'))
    ORDER BY g.expires_at ASC NULLS LAST,g.id`);
  return result.rows as unknown as Grant[];
}

async function release(
  tx: BillingTransaction,
  userId: string,
  reservationId: string,
): Promise<void> {
  const result = await tx.execute(sql`UPDATE billing_credit_reservations SET state='released'
    WHERE id=${reservationId}::uuid AND user_id=${userId}::uuid AND state='pending' RETURNING allocations`);
  const allocations = result.rows[0]?.['allocations'] as Allocation[] | undefined;
  for (const allocation of allocations ?? []) {
    // Restore the original grant, never the next month's balance.
    await tx.execute(sql`UPDATE billing_credit_grants SET remaining=remaining+${allocation.amount}
      WHERE id=${allocation.id}::uuid AND user_id=${userId}::uuid`);
  }
}

async function recoverExpiredReservations(tx: BillingTransaction, userId: string): Promise<void> {
  const result = await tx.execute(sql`SELECT id FROM billing_credit_reservations
    WHERE user_id=${userId}::uuid AND state='pending' AND created_at<now()-interval '10 minutes'`);
  for (const row of result.rows) await release(tx, userId, row['id'] as string);
}

export async function readBillingStatus(userId: string): Promise<BillingStatus> {
  return withBillingAccount(userId, async (tx, account) => {
    await recoverExpiredReservations(tx, userId);
    const grants = await availableGrants(tx, userId);
    const result =
      await tx.execute(sql`SELECT * FROM billing_subscriptions WHERE user_id=${userId}::uuid
      ORDER BY CASE WHEN status IN ('active','past_due','incomplete','trialing','unpaid','paused') THEN 0 ELSE 1 END,updated_at DESC LIMIT 1`);
    const subscription = result.rows[0];
    const premiumGrants = grants.filter((g) => g.subscription_id !== null);
    const freeCredits = grants
      .filter((g) => g.subscription_id === null)
      .reduce((sum, g) => sum + g.remaining, 0);
    const premiumCredits = premiumGrants.reduce((sum, g) => sum + g.remaining, 0);
    const status = subscription?.['status'] as string | undefined;
    const premium = premiumGrants.length > 0;
    const periodEnd =
      premiumGrants[0]?.expires_at ?? (subscription?.['period_end'] as string | undefined);
    return {
      plan: premium ? 'premium' : 'free',
      subscriptionStatus: status ?? null,
      freeCredits,
      premiumCredits,
      remaining: freeCredits + premiumCredits,
      periodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      cancelAtPeriodEnd: subscription?.['cancel_at_period_end'] === true,
      canSubscribe: !status || ['canceled', 'incomplete_expired'].includes(status),
      canManage: account.stripe_customer_id !== null,
      testMode: true,
    };
  });
}

export async function reserveCredits(userId: string, cost: number): Promise<string> {
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > 12)
    throw AppError.badRequest('Coût en crédits invalide');
  return withBillingAccount(userId, async (tx) => {
    await recoverExpiredReservations(tx, userId);
    const grants = await availableGrants(tx, userId);
    if (grants.reduce((sum, g) => sum + g.remaining, 0) < cost) {
      throw new AppError(
        402,
        'INSUFFICIENT_CREDITS',
        `Cette génération nécessite ${cost} crédit${cost > 1 ? 's' : ''}. Consultez votre abonnement pour connaître votre solde.`,
      );
    }
    let outstanding = cost;
    const allocations: Allocation[] = [];
    for (const grant of grants) {
      const amount = Math.min(outstanding, grant.remaining);
      if (!amount) continue;
      await tx.execute(
        sql`UPDATE billing_credit_grants SET remaining=remaining-${amount} WHERE id=${grant.id}::uuid`,
      );
      allocations.push({ id: grant.id, amount });
      outstanding -= amount;
      if (!outstanding) break;
    }
    const result = await tx.execute(sql`INSERT INTO billing_credit_reservations(user_id,allocations)
      VALUES (${userId}::uuid,${JSON.stringify(allocations)}::jsonb) RETURNING id`);
    return result.rows[0]?.['id'] as string;
  });
}

export async function releaseCredits(userId: string, reservationId: string): Promise<void> {
  return withBillingAccount(userId, (tx) => release(tx, userId, reservationId));
}

export async function persistWithCredits<T>(
  userId: string,
  reservationId: string,
  save: (tx: BillingTransaction) => Promise<T>,
): Promise<T> {
  return withBillingAccount(userId, async (tx) => {
    const result = await tx.execute(sql`UPDATE billing_credit_reservations SET state='committed'
      WHERE id=${reservationId}::uuid AND user_id=${userId}::uuid AND state='pending'
      AND created_at>now()-interval '10 minutes' RETURNING id`);
    if (!result.rows.length)
      throw AppError.serviceUnavailable('La génération a expiré. Veuillez réessayer.');
    // Saving the result and committing the debit succeed or roll back together.
    return save(tx);
  });
}
