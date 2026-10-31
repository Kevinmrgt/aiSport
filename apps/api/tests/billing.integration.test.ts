import type { Workout } from '@alcide/shared';
import type { CreditPersistence } from '../src/repositories/billing.repository.js';
import type { AiExecutionOptions } from '../src/services/ai.service.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type * as StripeLibrary from '../src/lib/stripe.js';
import { sql } from 'drizzle-orm';
import type * as BillingRepository from '../src/repositories/billing.repository.js';
import type * as Database from '../src/db/index.js';
import type * as BillingService from '../src/services/billing.service.js';
const stripeMocks = vi.hoisted(() => ({ retrieveSubscription: vi.fn(), retrieveSession: vi.fn() }));
vi.mock('../src/lib/stripe.js', async (importOriginal) => ({
  ...(await importOriginal<typeof StripeLibrary>()),
  stripeClient: () => ({
    subscriptions: { retrieve: stripeMocks.retrieveSubscription },
    checkout: { sessions: { retrieve: stripeMocks.retrieveSession } },
  }),
}));
const databaseUrl = process.env['TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const userId = randomUUID();
let repo: typeof BillingRepository;
let database: typeof Database;
let billing: typeof BillingService;
const webhookIds = [0, 1, 2].map((n) => `evt_billing_isolation_${userId}_${n}`);
const testEvent = (id: string) =>
  ({
    id,
    type: 'invoice.paid',
    livemode: false,
    data: {
      object: {
        id: 'in_fixture',
        customer: `cus_${userId}`,
        parent: { subscription_details: { subscription: `sub_${userId}` } },
      },
    },
  }) as unknown as Stripe.Event;
suite('facturation PostgreSQL', () => {
  beforeAll(async () => {
    if (
      !databaseUrl ||
      !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname) ||
      new URL(databaseUrl).pathname !== '/alcide_pilot_qualification_test'
    )
      throw new Error('Base de qualification locale dédiée requise');
    process.env['DATABASE_URL'] = databaseUrl;
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', '');
    database = await import('../src/db/index.js');
    repo = await import('../src/repositories/billing.repository.js');
    billing = await import('../src/services/billing.service.js');
    await database.db.execute(
      sql`INSERT INTO users(id,email) VALUES (${userId}::uuid,${'billing-' + userId + '@alcide.invalid'})`,
    );
  });
  afterAll(async () => {
    if (database) {
      // This suite accepts only the disposable qualification DB above. Financial
      // rows are append-only in the product; reset is exclusively test fixture cleanup.
      await database.db.execute(
        sql`TRUNCATE pilot_attempts,pilot_admissions,pilot_invitations,pilot_control CASCADE`,
      );
      for (const id of webhookIds)
        await database.db.execute(sql`DELETE FROM billing_webhook_events WHERE id=${id}`);
      await database.db.execute(sql`DELETE FROM users WHERE id=${userId}::uuid`);
      await database.pool.end();
    }
    vi.unstubAllEnvs();
  });
  it('attribue trois crédits une seule fois malgré des premières connexions concurrentes', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 5 }, () => repo.readBillingStatus(userId)),
    );
    expect(statuses.every((s) => s.remaining === 3)).toBe(true);
    const grants = await database.db.execute(
      sql`SELECT COUNT(*)::integer AS count FROM billing_credit_grants WHERE user_id=${userId}::uuid`,
    );
    expect(grants.rows[0]?.['count']).toBe(1);
  });
  it('interdit le dépassement concurrent et ne restitue chaque réservation qu’une fois', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => repo.reserveCredits(userId, 1)),
    );
    expect(attempts.filter((x) => x.status === 'fulfilled')).toHaveLength(3);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(0);
    for (const attempt of attempts)
      if (attempt.status === 'fulfilled') {
        await repo.releaseCredits(userId, attempt.value);
        await repo.releaseCredits(userId, attempt.value);
      }
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('ne sauvegarde rien si la transaction échoue et peut restituer les crédits', async () => {
    const id = await repo.reserveCredits(userId, 2);
    await expect(
      repo.persistWithCredits(userId, id, async (tx) => {
        await tx.execute(sql`UPDATE users SET name='must rollback' WHERE id=${userId}::uuid`);
        throw new Error('save failed');
      }),
    ).rejects.toThrow('save failed');
    const result = await database.db.execute(sql`SELECT name FROM users WHERE id=${userId}::uuid`);
    expect(result.rows[0]?.['name']).toBe(null);
    await repo.releaseCredits(userId, id);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('confirme ensemble la sauvegarde et le débit, sans remboursement après succès', async () => {
    const id = await repo.reserveCredits(userId, 1);
    await repo.persistWithCredits(userId, id, async (tx) =>
      tx.execute(sql`UPDATE users SET name='saved' WHERE id=${userId}::uuid`),
    );
    await repo.releaseCredits(userId, id);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(2);
  });
  it('récupère une réservation abandonnée sans autoriser une sauvegarde tardive', async () => {
    const id = await repo.reserveCredits(userId, 1);
    await database.db.execute(
      sql`UPDATE billing_credit_reservations SET created_at=now()-interval '11 minutes' WHERE id=${id}::uuid`,
    );
    expect((await repo.readBillingStatus(userId)).remaining).toBe(2);
    await expect(
      repo.persistWithCredits(userId, id, () => Promise.resolve(true)),
    ).rejects.toMatchObject({
      statusCode: 503,
    });
  });
  it('neutralise les anciens grants TEST au solde et à la réservation sans effacer les crédits offerts', async () => {
    const sub = 'sub_fixture_' + userId;
    await database.db.execute(
      sql`INSERT INTO billing_subscriptions(id,user_id,status,period_end) VALUES (${sub},${userId}::uuid,'active',now()+interval '1 month')`,
    );
    await database.db
      .execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,subscription_id,amount,remaining,expires_at)
      VALUES (${userId}::uuid,${'premium:' + userId},${sub},30,30,now()+interval '1 month')`);
    await database.db
      .execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,amount,remaining)
      VALUES (${userId}::uuid,${'premium:legacy:' + userId},30,30),
        (${userId}::uuid,${'admin:fixture:' + userId},1,1)`);
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      plan: 'free',
      subscriptionStatus: 'active',
      premiumCredits: 0,
      freeCredits: 3,
      offeredCredits: 1,
      remaining: 3,
      canSubscribe: false,
      canManage: false,
    });
    await expect(repo.reserveCredits(userId, 4)).rejects.toMatchObject({ statusCode: 402 });
    const reservation = await repo.reserveCredits(userId, 3);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(0);
    const oldGrants = await database.db.execute(sql`SELECT remaining FROM billing_credit_grants
      WHERE user_id=${userId}::uuid AND source_key LIKE 'premium:%'`);
    expect(oldGrants.rows).toHaveLength(2);
    expect(oldGrants.rows.every((row) => row['remaining'] === 30)).toBe(true);
    await repo.releaseCredits(userId, reservation);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('rejette une ancienne réservation financée par TEST sans sauver de résultat', async () => {
    const result = await database.db.execute(sql`SELECT id FROM billing_credit_grants
      WHERE user_id=${userId}::uuid AND subscription_id IS NOT NULL LIMIT 1`);
    const grantId = result.rows[0]?.['id'];
    await database.db.execute(
      sql`UPDATE billing_credit_grants SET remaining=remaining-1 WHERE id=${grantId}::uuid`,
    );
    const created = await database.db
      .execute(sql`INSERT INTO billing_credit_reservations(user_id,allocations)
      VALUES (${userId}::uuid,${JSON.stringify([{ id: grantId, amount: 1 }])}::jsonb) RETURNING id`);
    const reservation = created.rows[0]?.['id'] as string;
    const save = vi.fn().mockResolvedValue('must not save');
    await expect(repo.persistWithCredits(userId, reservation, save)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(save).not.toHaveBeenCalled();
    await repo.releaseCredits(userId, reservation);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('déduplique un webhook TEST fermé sans appel fournisseur ni nouveau crédit', async () => {
    await database.db.execute(
      sql`UPDATE billing_accounts SET stripe_customer_id=${`cus_${userId}`} WHERE user_id=${userId}::uuid`,
    );
    const before = (await repo.readBillingStatus(userId)).remaining;
    await Promise.all(
      Array.from({ length: 4 }, () => billing.handleStripeEvent(testEvent(webhookIds[0]!))),
    );
    expect(stripeMocks.retrieveSubscription).not.toHaveBeenCalled();
    const receipts = await database.db.execute(
      sql`SELECT id FROM billing_webhook_events WHERE id=${webhookIds[0]}`,
    );
    expect(receipts.rows).toHaveLength(1);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(before);
  });
  it('retente atomiquement une simulation échouée et ne crée aucun crédit pour le paiement TEST', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', 'true');
    vi.stubEnv('STRIPE_PREMIUM_MONTHLY_PRICE_ID', 'price_fixture');
    stripeMocks.retrieveSubscription.mockRejectedValueOnce(new Error('synthetic Stripe failure'));
    await expect(billing.handleStripeEvent(testEvent(webhookIds[1]!))).rejects.toThrow(
      'synthetic Stripe failure',
    );
    const receipts = await database.db.execute(
      sql`SELECT id FROM billing_webhook_events WHERE id=${webhookIds[1]}`,
    );
    expect(receipts.rows).toHaveLength(0);
    stripeMocks.retrieveSubscription.mockResolvedValue({
      id: `sub_${userId}`,
      customer: `cus_${userId}`,
      status: 'active',
      livemode: false,
      metadata: { alcide_user_id: userId },
      cancel_at_period_end: false,
      items: {
        data: [{ quantity: 1, price: { id: 'price_fixture' }, current_period_end: 1900000000 }],
      },
    });
    const before = (await repo.readBillingStatus(userId)).remaining;
    const grantsBefore = await database.db
      .execute(sql`SELECT id,source_key,remaining FROM billing_credit_grants
      WHERE user_id=${userId}::uuid ORDER BY id`);
    await billing.handleStripeEvent(testEvent(webhookIds[1]!));
    await billing.handleStripeEvent(testEvent(webhookIds[1]!));
    expect(stripeMocks.retrieveSubscription).toHaveBeenCalledTimes(2); // failure and successful retry
    stripeMocks.retrieveSession.mockResolvedValue({
      livemode: false,
      client_reference_id: userId,
      customer: `cus_${userId}`,
      status: 'complete',
      subscription: `sub_${userId}`,
    });
    await billing.syncCheckout(userId, 'cs_test_fixture');
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      remaining: before,
      premiumCredits: 0,
      plan: 'free',
      subscriptionStatus: 'active',
    });
    const grantsAfter = await database.db
      .execute(sql`SELECT id,source_key,remaining FROM billing_credit_grants
      WHERE user_id=${userId}::uuid ORDER BY id`);
    expect(grantsAfter.rows).toEqual(grantsBefore.rows);
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', '');
  });
  it('associe atomiquement les crédits à la génération persistante et ne débite pas un rejeu', async () => {
    const { generationBudgetRepository: budget } =
      await import('../src/repositories/generation-budget.repository.js');
    const { executeBudgetedGeneration } =
      await import('../src/services/generation-budget.service.js');
    const { withBillingCredits } = await import('../src/services/billing-credits.service.js');
    const { findWorkoutById } = await import('../src/repositories/workout.repository.js');
    await budget.setEnabled(true);
    const { PilotRepository } = await import('../src/repositories/pilot.repository.js');
    const pilot = new PilotRepository(database.db);
    await pilot.activate({
      reviewer: 'synthetic-billing-qualifier',
      reviewReference: 'disposable-fixture-no-production-activation',
      legacyProvisionsReviewed: true,
      providerBalanceReviewed: true,
      allGenerationPathsReviewed: true,
      legacyNanoUsd: 0,
    });
    await pilot.invite(userId);
    const before = (await repo.readBillingStatus(userId)).remaining;
    let calls = 0;
    const options = {
      userId,
      operationId: randomUUID(),
      kind: 'workout' as const,
      input: { goals: 'synthetic credit integration' },
      maxAttempts: 2,
      withEntitlement: <T>(work: (persist?: CreditPersistence) => Promise<T>) =>
        withBillingCredits(userId, 1, work),
      generate: async (execution: AiExecutionOptions) => {
        const attempt = {
          receiptId: randomUUID(),
          model: 'gpt-5.4-mini',
          maxCompletionTokens: 2048,
          inputTokensUpperBound: 500,
        };
        await execution.onAttempt?.(attempt);
        calls += 1;
        await execution.onUsage?.(
          {
            receiptId: attempt.receiptId,
            requestId: randomUUID(),
            model: attempt.model,
            inputTokens: 10,
            outputTokens: 10,
            totalTokens: 20,
          },
          attempt,
        );
        return {
          title: 'Synthetic credits and budget',
          sport: 'course',
          difficulty: 'beginner' as const,
          duration_minutes: 15,
          exercises: [
            {
              name: 'Course',
              description: 'Allure facile',
              duration_seconds: 900,
              rest_seconds: 0,
            },
          ],
        };
      },
      replay: (id: string) => findWorkoutById(id, userId),
      complete: async (id: string, content: Workout, persist?: CreditPersistence) =>
        persist!((tx) => budget.completeWorkout(id, userId, content, tx)),
    };
    const first = await executeBudgetedGeneration(options);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(before - 1);
    const second = await executeBudgetedGeneration(options);
    expect(second.id).toBe(first.id);
    expect(calls).toBe(1);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(before - 1);
  });
});
