import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type * as Database from '../src/db/index.js';
import type { GenerationBudgetRepository } from '../src/repositories/generation-budget.repository.js';
import type { PilotRepository } from '../src/repositories/pilot.repository.js';
import { generationOperations } from '../src/db/generation-budget.schema.js';
import {
  pilotAdmissions,
  pilotAttempts,
  pilotControl,
  pilotInvitations,
} from '../src/db/pilot.schema.js';
import { users } from '../src/db/schema.js';
import { generationPolicy } from '../src/services/generation-policy.js';
import { PILOT_CAP_NANO_USD, pilotCost, pilotPrice } from '../src/services/pilot-policy.js';

const url = process.env['TEST_DATABASE_URL'];
const ids = Array.from({ length: 12 }, () => randomUUID());
const policy = { ...generationPolicy(), userConcurrency: 50, globalConcurrency: 100 };
const attempt = () => ({
  receiptId: randomUUID(),
  model: 'gpt-5.4-mini',
  inputTokensUpperBound: 100,
  maxCompletionTokens: 100,
});
const review = {
  reviewer: 'synthetic-local-qualifier',
  reviewReference: 'synthetic-fixture-no-production-activation',
  legacyProvisionsReviewed: true as const,
  providerBalanceReviewed: true as const,
  allGenerationPathsReviewed: true as const,
  legacyNanoUsd: 0,
};
let database: typeof Database;
let budget: GenerationBudgetRepository;
let pilot: PilotRepository;

describe.skipIf(!url)('adversarial pilot protections on isolated PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/alcide_pilot_qualification_test'
    )
      throw new Error('Fresh dedicated pilot qualification database required');
    process.env['DATABASE_URL'] = url;
    database = await import('../src/db/index.js');
    budget = new (
      await import('../src/repositories/generation-budget.repository.js')
    ).GenerationBudgetRepository(database.db);
    pilot = new (await import('../src/repositories/pilot.repository.js')).PilotRepository(
      database.db,
    );
  });
  beforeEach(async () => {
    // The harness creates this empty disposable database; no other DB is accepted above.
    await database.db.execute(
      sql`TRUNCATE pilot_attempts, pilot_admissions, pilot_invitations, pilot_control, generation_usage_events, generation_daily_budgets, generation_operations CASCADE`,
    );
    await database.db
      .insert(users)
      .values(ids.map((id) => ({ id, email: `${id}@pilot-qualification.invalid` })))
      .onConflictDoNothing();
    await budget.setEnabled(true);
  });
  afterAll(async () => {
    if (!database) return;
    await database.db.execute(
      sql`TRUNCATE pilot_attempts, pilot_admissions, pilot_invitations, pilot_control, generation_usage_events, generation_daily_budgets, generation_operations CASCADE`,
    );
    for (const id of ids) await database.db.delete(users).where(eq(users.id, id));
    await database.pool.end();
  });
  const begin = (userId = ids[0]!) =>
    budget.begin(userId, randomUUID(), 'workout', 'a'.repeat(64), policy);
  async function open(count = 1, legacyNanoUsd = 0) {
    await pilot.activate({ ...review, legacyNanoUsd });
    for (const id of ids.slice(0, count)) await pilot.invite(id);
  }
  async function ledger() {
    return database.db.select().from(pilotAttempts);
  }
  async function settle(
    op: string,
    userId: string,
    bound: ReturnType<typeof attempt>,
    requestId = randomUUID(),
  ) {
    const usage = {
      receiptId: bound.receiptId,
      model: bound.model,
      requestId,
      inputTokens: 10,
      outputTokens: 10,
      totalTokens: 20,
    };
    await budget.recordUsage(op, userId, usage, policy, bound);
    return usage;
  }

  it('starts closed even with historical billing credits, then requires an explicit invitation', async () => {
    await database.db.execute(
      sql`INSERT INTO billing_accounts(user_id) VALUES (${ids[0]}::uuid) ON CONFLICT DO NOTHING`,
    );
    await database.db.execute(
      sql`INSERT INTO billing_credit_grants(user_id,source_key,amount,remaining,expires_at) VALUES (${ids[0]}::uuid,${randomUUID()},100,100,now()+interval '1 day')`,
    );
    await expect(begin()).rejects.toMatchObject({ statusCode: 503 });
    expect(await database.db.select().from(pilotControl)).toHaveLength(0);
    await pilot.activate(review);
    await expect(begin()).rejects.toMatchObject({ statusCode: 403 });
    expect(await database.db.select().from(pilotAdmissions)).toHaveLength(0);
  });

  it('allows exactly ten concurrent invitation slots and never reopens a deleted account slot', async () => {
    await pilot.activate(review);
    const invitations = await Promise.allSettled(ids.map((id) => pilot.invite(id)));
    expect(invitations.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    const invited = await database.db.select().from(pilotInvitations);
    const deletedId = invited[0]!.userId!;
    await database.db.delete(users).where(eq(users.id, deletedId));
    expect(await database.db.select().from(pilotInvitations)).toHaveLength(10);
    expect(
      (await database.db.select().from(pilotInvitations)).find((row) => row.id === invited[0]!.id)
        ?.userId,
    ).toBeNull();
    const spare = ids.find((id) => !invited.some((row) => row.userId === id))!;
    await expect(pilot.invite(spare)).rejects.toMatchObject({ statusCode: 429 });
  });

  it('counts failed admissions against three per invitation and thirty globally', async () => {
    await open(10);
    for (const id of ids.slice(0, 10)) {
      for (let index = 0; index < 3; index++) {
        const op = await begin(id);
        await budget.fail(op.operation.id, id);
      }
      await expect(begin(id)).rejects.toMatchObject({ statusCode: 429 });
    }
    expect(await database.db.select().from(pilotAdmissions)).toHaveLength(30);
  }, 30000);

  it('serializes concurrent monetary provisions at the exact twenty dollar boundary', async () => {
    const boundA = attempt(),
      boundB = attempt();
    const cost = pilotCost(100, 100, pilotPrice(boundA.model));
    await open(2, PILOT_CAP_NANO_USD - cost);
    const a = await begin(ids[0]),
      b = await begin(ids[1]);
    const result = await Promise.allSettled([
      budget.reserveAttempt(a.operation.id, ids[0]!, boundA, 2, policy),
      budget.reserveAttempt(b.operation.id, ids[1]!, boundB, 2, policy),
    ]);
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(result.find((entry) => entry.status === 'rejected')).toMatchObject({
      reason: { statusCode: 429 },
    });
    expect(await ledger()).toHaveLength(1);
    expect((await ledger())[0]?.reservedNanoUsd).toBe(cost);
  });

  it('retains an unknown provision after failure, restart and account deletion, blocking all new admissions', async () => {
    await open(2);
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await budget.fail(op.operation.id, ids[0]!);
    await database.db.delete(users).where(eq(users.id, ids[0]!));
    const restarted = new (
      await import('../src/repositories/generation-budget.repository.js')
    ).GenerationBudgetRepository(database.db);
    await expect(
      restarted.begin(ids[1]!, randomUUID(), 'workout', 'a'.repeat(64), policy),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(await ledger()).toMatchObject([
      {
        receiptId: bound.receiptId,
        state: 'unknown',
        actualNanoUsd: null,
        reservedNanoUsd: pilotCost(100, 100, pilotPrice(bound.model)),
      },
    ]);
    expect(await database.db.select().from(pilotAdmissions)).toHaveLength(1);
    expect(await database.db.select().from(generationOperations)).toHaveLength(0);
  });

  it('treats an expired pending lease as uncertainty instead of making its money available again', async () => {
    await open(2);
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await database.db
      .update(generationOperations)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(generationOperations.id, op.operation.id));
    await expect(begin(ids[1])).rejects.toMatchObject({ statusCode: 503 });
    expect((await ledger())[0]).toMatchObject({ state: 'pending', actualNanoUsd: null });
  });

  it('settles each receipt once and conservatively prices total tokens exceeding the typed breakdown', async () => {
    await open();
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    const usage = {
      receiptId: bound.receiptId,
      model: bound.model,
      requestId: randomUUID(),
      inputTokens: 10,
      outputTokens: 10,
      totalTokens: 300,
    };
    await budget.recordUsage(op.operation.id, ids[0]!, usage, policy, bound);
    await budget.recordUsage(op.operation.id, ids[0]!, usage, policy, bound);
    expect(await ledger()).toMatchObject([
      {
        state: 'settled',
        actualNanoUsd: pilotCost(10, 290, pilotPrice(bound.model)),
        outputTokens: 290,
      },
    ]);
    expect((await database.db.select().from(pilotControl))[0]?.enabled).toBe(false);
    await expect(begin()).rejects.toMatchObject({ statusCode: 503 });
    await expect(
      budget.recordUsage(
        op.operation.id,
        ids[0]!,
        { ...usage, outputTokens: 11, totalTokens: 301 },
        policy,
        bound,
      ),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it('settles a known provider snapshot for the admitted model alias at the same immutable price', async () => {
    await open();
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await budget.recordUsage(
      op.operation.id,
      ids[0]!,
      {
        receiptId: bound.receiptId,
        model: 'gpt-5.4-mini-2026-03-17',
        requestId: randomUUID(),
        inputTokens: 10,
        outputTokens: 10,
        totalTokens: 20,
      },
      policy,
      bound,
    );
    expect((await ledger())[0]).toMatchObject({
      model: bound.model,
      state: 'settled',
      actualNanoUsd: pilotCost(10, 10, pilotPrice(bound.model)),
    });
  });

  it('rejects model mismatch and repeated receipt identifiers without releasing any provision', async () => {
    await open(2);
    const a = await begin(),
      b = await begin(ids[1]),
      bound = attempt();
    await budget.reserveAttempt(a.operation.id, ids[0]!, bound, 2, policy);
    await expect(
      budget.reserveAttempt(b.operation.id, ids[1]!, bound, 2, policy),
    ).rejects.toBeDefined();
    await expect(
      budget.recordUsage(
        a.operation.id,
        ids[0]!,
        {
          receiptId: bound.receiptId,
          model: 'unknown-model',
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
        policy,
        bound,
      ),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(await ledger()).toHaveLength(1);
    expect((await ledger())[0]?.actualNanoUsd).toBeNull();
  });

  it('rejects reuse of one provider receipt for two distinct admitted HTTP calls', async () => {
    await open(2);
    const a = await begin(),
      b = await begin(ids[1]),
      boundA = attempt(),
      boundB = attempt();
    await budget.reserveAttempt(a.operation.id, ids[0]!, boundA, 2, policy);
    await budget.reserveAttempt(b.operation.id, ids[1]!, boundB, 2, policy);
    const providerId = randomUUID();
    await settle(a.operation.id, ids[0]!, boundA, providerId);
    await expect(settle(b.operation.id, ids[1]!, boundB, providerId)).rejects.toBeDefined();
    expect((await ledger()).filter((row) => row.state === 'settled')).toHaveLength(1);
    expect(
      (await ledger()).find((row) => row.receiptId === boundB.receiptId)?.actualNanoUsd,
    ).toBeNull();
  });

  it('does not let another account finalize or mark a pending financial receipt unknown', async () => {
    await open(2);
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await budget.fail(op.operation.id, ids[1]!);
    expect((await ledger())[0]?.state).toBe('pending');
    await expect(settle(op.operation.id, ids[1]!, bound)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect((await ledger())[0]?.actualNanoUsd).toBeNull();
    await settle(op.operation.id, ids[0]!, bound);
    expect((await ledger())[0]?.state).toBe('settled');
  });

  it('refreshes the kill switch after admission and before any HTTP retry', async () => {
    await open();
    const op = await begin();
    await budget.setEnabled(false);
    await expect(
      budget.reserveAttempt(op.operation.id, ids[0]!, attempt(), 2, policy),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(await ledger()).toHaveLength(0);
  });

  it('refreshes the thirty day deadline between admission and an HTTP attempt', async () => {
    const endsAt = new Date(Date.now() + 2000);
    await database.db.insert(pilotControl).values({
      id: 'global',
      enabled: true,
      activatedAt: new Date(endsAt.getTime() - 30 * 86400000),
      endsAt,
      capNanoUsd: PILOT_CAP_NANO_USD,
      legacyNanoUsd: 0,
      reviewer: review.reviewer,
      reviewReference: review.reviewReference,
    });
    await pilot.invite(ids[0]!);
    const op = await begin();
    const bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await new Promise((done) => setTimeout(done, Math.max(0, endsAt.getTime() - Date.now()) + 100));
    await expect(
      budget.reserveAttempt(op.operation.id, ids[0]!, attempt(), 2, policy),
    ).rejects.toMatchObject({ statusCode: 503 });
    await settle(op.operation.id, ids[0]!, bound);
    expect(await ledger()).toHaveLength(1);
    expect((await ledger())[0]?.state).toBe('settled');
  }, 10000);

  it('settles a late proven provider receipt after account erasure without recovering an admission or invitation', async () => {
    await open();
    const op = await begin(),
      bound = attempt();
    await budget.reserveAttempt(op.operation.id, ids[0]!, bound, 2, policy);
    await budget.fail(op.operation.id, ids[0]!);
    await database.db.delete(users).where(eq(users.id, ids[0]!));
    await settle(op.operation.id, ids[0]!, bound);
    expect((await ledger())[0]).toMatchObject({
      state: 'settled',
      actualNanoUsd: pilotCost(10, 10, pilotPrice(bound.model)),
    });
    expect(await database.db.select().from(pilotAdmissions)).toHaveLength(1);
    expect(await database.db.select().from(pilotInvitations)).toMatchObject([{ userId: null }]);
    await expect(database.db.execute(sql`DELETE FROM pilot_attempts`)).rejects.toBeDefined();
    await expect(database.db.execute(sql`DELETE FROM pilot_control`)).rejects.toBeDefined();
    await expect(
      database.db.execute(
        sql`UPDATE pilot_control SET legacy_nano_usd=0,ends_at=ends_at+interval '1 day'`,
      ),
    ).rejects.toBeDefined();
  });

  it('never resets the activation window or cost baseline, including concurrent activation calls', async () => {
    const activation = await Promise.allSettled([
      pilot.activate({ ...review, legacyNanoUsd: 12345 }),
      pilot.activate({ ...review, legacyNanoUsd: 12345 }),
    ]);
    expect(activation.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const before = await database.db.select().from(pilotControl);
    await expect(pilot.activate(review)).rejects.toMatchObject({ statusCode: 503 });
    expect(await database.db.select().from(pilotControl)).toEqual(before);
  });

  it('refuses activation when legacy global provisions remain after account erasure', async () => {
    await database.db.execute(
      sql`INSERT INTO generation_daily_budgets(scope,day,attempts,reserved_tokens,input_tokens,output_tokens) VALUES ('global','2026-01-01',1,100,0,0)`,
    );
    await expect(pilot.activate(review)).rejects.toMatchObject({ statusCode: 503 });
    expect(await database.db.select().from(pilotControl)).toHaveLength(0);
  });

  it('checks wall clock expiry after waiting for an admission lock', async () => {
    const { Client } = await import('pg');
    const holder = new Client({ connectionString: url });
    const endsAt = new Date(Date.now() + 1200);
    await database.db.insert(pilotControl).values({
      id: 'global',
      enabled: true,
      activatedAt: new Date(endsAt.getTime() - 30 * 86400000),
      endsAt,
      capNanoUsd: PILOT_CAP_NANO_USD,
      legacyNanoUsd: 0,
      reviewer: review.reviewer,
      reviewReference: review.reviewReference,
    });
    await pilot.invite(ids[0]!);
    const op = await begin();
    await holder.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(
        "select pg_advisory_xact_lock(hashtext('alcide:generation:admission:v1'))",
      );
      const reserved = budget.reserveAttempt(op.operation.id, ids[0]!, attempt(), 2, policy).then(
        () => ({ admitted: true, statusCode: undefined }),
        (error: unknown) => ({
          admitted: false,
          statusCode: (error as { statusCode?: number }).statusCode,
        }),
      );
      await new Promise((done) =>
        setTimeout(done, Math.max(0, endsAt.getTime() - Date.now()) + 100),
      );
      await holder.query('COMMIT');
      expect(await reserved).toEqual({ admitted: false, statusCode: 503 });
      expect(await ledger()).toHaveLength(0);
    } finally {
      await holder.query('ROLLBACK');
      await holder.end();
    }
  }, 10000);

  it('refuses an oversized program before admission or provider execution', async () => {
    await open();
    let called = false;
    const { executeBudgetedGeneration } =
      await import('../src/services/generation-budget.service.js');
    await expect(
      executeBudgetedGeneration({
        userId: ids[0]!,
        kind: 'program',
        input: { weeks_count: 3, sessions_per_week: 3 },
        maxAttempts: 6,
        generate: () => {
          called = true;
          return Promise.resolve({});
        },
        replay: () => Promise.resolve({}),
        complete: () => Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(called).toBe(false);
    expect(await database.db.select().from(pilotAdmissions)).toHaveLength(0);
  });
});
