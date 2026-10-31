import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import type * as Database from '../src/db/index.js';
import type * as Repository from '../src/repositories/generation-budget.repository.js';
import type { AiAttempt } from '../src/services/ai.service.js';
import { generationPolicy } from '../src/services/generation-policy.js';
import {
  generationDailyBudgets,
  generationOperations,
  generationUsageEvents,
} from '../src/db/generation-budget.schema.js';
import { users } from '../src/db/schema.js';

const url = process.env['TEST_DATABASE_URL'];
const userId = randomUUID(),
  hash = 'b'.repeat(64),
  model = 'gpt-5.4-mini';
let database: typeof Database, repository: Repository.GenerationBudgetRepository;
const policy = { ...generationPolicy(), userConcurrency: 10, globalConcurrency: 20 };
const bound = (inputTokensUpperBound: number, maxCompletionTokens: number): AiAttempt => ({
  receiptId: randomUUID(),
  model,
  inputTokensUpperBound,
  maxCompletionTokens,
});

describe.skipIf(!url)('confirmed usage and unknown generation provisions', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !/test|audit|^\/alcide$/.test(target.pathname)
    )
      throw new Error('Dedicated local test database required');
    process.env['DATABASE_URL'] = url;
    database = await import('../src/db/index.js');
    repository = new (
      await import('../src/repositories/generation-budget.repository.js')
    ).GenerationBudgetRepository(database.db);
  });
  beforeEach(async () => {
    await database.db.execute(
      sql`truncate pilot_attempts, pilot_admissions, pilot_invitations, pilot_control`,
    );
    await database.db.delete(users).where(eq(users.id, userId));
    await database.db
      .delete(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, 'global'));
    await database.db.insert(users).values({ id: userId, email: `${userId}@alcide.test` });
    await repository.setEnabled(true);
    const { PilotRepository } = await import('../src/repositories/pilot.repository.js');
    const pilot = new PilotRepository(database.db);
    await pilot.activate({
      reviewer: 'integration-test',
      reviewReference: 'synthetic-local-fixture',
      legacyProvisionsReviewed: true,
      providerBalanceReviewed: true,
      allGenerationPathsReviewed: true,
      legacyNanoUsd: 0,
    });
    await pilot.invite(userId);
  });
  afterAll(async () => {
    if (!database) return;
    await database.db.execute(
      sql`truncate pilot_attempts, pilot_admissions, pilot_invitations, pilot_control`,
    );
    await database.db.delete(users).where(eq(users.id, userId));
    await database.db
      .delete(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, 'global'));
    await database.pool.end();
  });
  async function operation(limits = policy) {
    return (await repository.begin(userId, randomUUID(), 'program', hash, limits)).operation;
  }
  async function stored(id: string) {
    return (
      await database.db.select().from(generationOperations).where(eq(generationOperations.id, id))
    )[0]!;
  }

  it('admits two weeks and heterogeneous retries within a persistent token cap, then rejects further excess without debit', async () => {
    const attempts = [13335, 13372, 13372, 13352].map((input) => bound(input, 5100));
    const expected = attempts.reduce(
      (sum, attempt) => sum + attempt.inputTokensUpperBound + attempt.maxCompletionTokens,
      0,
    );
    const limits = { ...policy, userDailyTokens: expected };
    const op = await operation(limits);
    await Promise.all(
      attempts.map((attempt) => repository.reserveAttempt(op.id, userId, attempt, 4, limits)),
    );
    expect(await stored(op.id)).toMatchObject({ attempts: 4, reservedTokens: expected });
    expect(expected).toBeLessThan(160_000);
    const next = await operation(limits);
    await expect(
      repository.reserveAttempt(next.id, userId, bound(13335, 5100), 2, limits),
    ).rejects.toMatchObject({ statusCode: 429 });
    const daily = await database.db.select().from(generationDailyBudgets);
    expect(daily.every((row) => row.attempts === 4 && row.reservedTokens === expected)).toBe(true);
  });

  it('settles heterogeneous parallel receipts once, retains unknown attempts and charges usage above the admitted bound', async () => {
    const op = await operation(),
      small = bound(300, 200),
      large = bound(2000, 1000),
      unknown = bound(500, 500);
    await Promise.all(
      [small, large, unknown].map((attempt) =>
        repository.reserveAttempt(op.id, userId, attempt, 4, policy),
      ),
    );
    const smallUsage = {
      receiptId: small.receiptId!,
      model,
      inputTokens: 300,
      outputTokens: 400,
      totalTokens: 700,
    };
    const largeUsage = {
      receiptId: large.receiptId!,
      model: 'gpt-5.4-mini-2026-03-17',
      inputTokens: 400,
      outputTokens: 200,
      totalTokens: 600,
    };
    await Promise.all([
      repository.recordUsage(op.id, userId, largeUsage, policy, large),
      repository.recordUsage(op.id, userId, smallUsage, policy, small),
      repository.recordUsage(op.id, userId, smallUsage, policy, small),
    ]);
    await repository.fail(op.id, userId);
    const restarted = new (
      await import('../src/repositories/generation-budget.repository.js')
    ).GenerationBudgetRepository(database.db);
    await restarted.recordUsage(op.id, userId, largeUsage, policy, large);
    expect(await stored(op.id)).toMatchObject({
      status: 'failed',
      attempts: 3,
      reservedTokens: 2300,
      inputTokens: 700,
      outputTokens: 600,
    });
    const daily = await database.db.select().from(generationDailyBudgets);
    expect(daily.every((row) => row.reservedTokens === 2300 && row.attempts === 3)).toBe(true);
    expect(
      await database.db
        .select()
        .from(generationUsageEvents)
        .where(eq(generationUsageEvents.operationId, op.id)),
    ).toHaveLength(2);
  });

  it('never refunds unproven usage and validates receipt bounds before persisting a measurement', async () => {
    const op = await operation(),
      attempt = bound(300, 200);
    await repository.reserveAttempt(op.id, userId, attempt, 2, policy);
    const usage = {
      receiptId: attempt.receiptId!,
      model,
      inputTokens: 100,
      outputTokens: 100,
      totalTokens: 200,
    };
    await expect(
      repository.recordUsage(op.id, userId, usage, policy, {
        ...attempt,
        maxCompletionTokens: policy.maxCompletionTokens + 1,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
    await repository.recordUsage(op.id, userId, usage, policy);
    await repository.recordUsage(op.id, userId, usage, policy);
    expect(await stored(op.id)).toMatchObject({
      attempts: 1,
      reservedTokens: 700,
      inputTokens: 100,
      outputTokens: 100,
    });
  });

  it('rolls back measurement and settlement when a scope is missing or its provision would underflow', async () => {
    const op = await operation(),
      attempt = bound(300, 200);
    await repository.reserveAttempt(op.id, userId, attempt, 2, policy);
    const usage = {
      receiptId: attempt.receiptId!,
      model,
      inputTokens: 100,
      outputTokens: 100,
      totalTokens: 200,
    };
    await database.db
      .delete(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, 'global'));
    await expect(
      repository.recordUsage(op.id, userId, usage, policy, attempt),
    ).rejects.toMatchObject({ statusCode: 503 });
    const day = op.createdAt.toISOString().slice(0, 10);
    await database.db
      .insert(generationDailyBudgets)
      .values({ scope: 'global', day, attempts: 1, reservedTokens: 100 });
    await expect(
      repository.recordUsage(op.id, userId, usage, policy, attempt),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(await stored(op.id)).toMatchObject({
      reservedTokens: 500,
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(
      await database.db
        .select()
        .from(generationUsageEvents)
        .where(eq(generationUsageEvents.operationId, op.id)),
    ).toHaveLength(0);
  });

  it('reconciles only expired complete legacy receipts with an atomic, idempotent audit under concurrent admissions', async () => {
    const fixtures = await seedLegacy();
    await Promise.all([operation(), operation()]);
    const settled = await database.db
      .select()
      .from(generationOperations)
      .where(
        inArray(
          generationOperations.id,
          fixtures.map((item) => item.id),
        ),
      );
    for (const fixture of fixtures)
      expect(settled.find((row) => row.id === fixture.id)).toMatchObject({
        reservedTokens: fixture.eligible ? fixture.measured : fixture.reserved,
        attempts: fixture.attempts,
      });
    const beforeReplay = await database.db.select().from(generationDailyBudgets);
    expect(beforeReplay.every((row) => row.reservedTokens === 5650 && row.attempts === 9)).toBe(
      true,
    );
    await operation();
    expect(await database.db.select().from(generationDailyBudgets)).toEqual(beforeReplay);
    const audit = await database.db.execute(
      sql`SELECT changes FROM admin_audit_events WHERE user_id=${userId}::uuid AND action='generation.budget.settled'`,
    );
    expect(audit.rows).toHaveLength(3);
    expect(
      audit.rows.reduce(
        (sum, row) => sum + Number((row['changes'] as { releasedTokens: number }).releasedTokens),
        0,
      ),
    ).toBe(3350);
  });

  it('leaves fully measured past UTC days unchanged during a new admission', async () => {
    const past = new Date(Date.now() - 86_400_000),
      day = past.toISOString().slice(0, 10),
      id = randomUUID();
    await database.db.insert(generationOperations).values({
      id,
      userId,
      operationKey: randomUUID(),
      kind: 'workout',
      inputHash: hash,
      status: 'failed',
      resourceId: randomUUID(),
      attempts: 1,
      reservedTokens: 500,
      inputTokens: 50,
      outputTokens: 50,
      createdAt: past,
      leaseExpiresAt: new Date(0),
    });
    await database.db.insert(generationUsageEvents).values({
      operationId: id,
      eventKey: createHash('sha256')
        .update('synthetic-past-' + id)
        .digest('hex'),
      model,
      inputTokens: 50,
      outputTokens: 50,
      totalTokens: 100,
    });
    await database.db.insert(generationDailyBudgets).values([
      { scope: 'global', day, attempts: 1, reservedTokens: 500, inputTokens: 50, outputTokens: 50 },
      {
        scope: `user:${userId}`,
        userId,
        day,
        attempts: 1,
        reservedTokens: 500,
        inputTokens: 50,
        outputTokens: 50,
      },
    ]);
    await operation();
    expect(await stored(id)).toMatchObject({
      reservedTokens: 500,
      attempts: 1,
      inputTokens: 50,
      outputTokens: 50,
    });
    expect(
      (await database.db.select().from(generationDailyBudgets)).every(
        (row) => row.reservedTokens === 500 && row.day === day,
      ),
    ).toBe(true);
  });

  it('rolls back all budget reconciliation if its audit cannot commit', async () => {
    const fixtures = await seedLegacy(),
      eligible = fixtures.find((item) => item.eligible)!;
    const key = `generation-budget-settled:v1:${eligible.id}`;
    await database.db.execute(
      sql`INSERT INTO admin_audit_events(actor_email,action,reason,changes,request_key) VALUES ('system','test.conflict','synthetic conflict','{}'::jsonb,${key})`,
    );
    await expect(operation()).rejects.toBeDefined();
    expect(
      (await database.db.select().from(generationDailyBudgets)).every(
        (row) => row.reservedTokens === 9000,
      ),
    ).toBe(true);
    const unchanged = await database.db
      .select()
      .from(generationOperations)
      .where(
        inArray(
          generationOperations.id,
          fixtures.map((item) => item.id),
        ),
      );
    expect(
      unchanged.every(
        (row) => row.reservedTokens === fixtures.find((item) => item.id === row.id)!.reserved,
      ),
    ).toBe(true);
    await database.db.execute(sql`DELETE FROM admin_audit_events WHERE request_key=${key}`);
  });
});

async function seedLegacy() {
  const fixtures = [
    {
      attempts: 1,
      measured: 100,
      reserved: 1000,
      eligible: true,
      count: 1,
      expired: true,
      providerIds: true,
      coherent: true,
    },
    {
      attempts: 2,
      measured: 100,
      reserved: 2000,
      eligible: false,
      count: 1,
      expired: true,
      providerIds: true,
      coherent: true,
    },
    {
      attempts: 2,
      measured: 350,
      reserved: 2000,
      eligible: true,
      count: 2,
      expired: true,
      providerIds: true,
      coherent: true,
    },
    {
      attempts: 1,
      measured: 200,
      reserved: 1000,
      eligible: true,
      count: 1,
      expired: true,
      providerIds: true,
      coherent: true,
    },
    {
      attempts: 1,
      measured: 100,
      reserved: 1000,
      eligible: false,
      count: 1,
      expired: false,
      providerIds: true,
      coherent: true,
    },
    {
      attempts: 1,
      measured: 100,
      reserved: 1000,
      eligible: false,
      count: 1,
      expired: true,
      providerIds: false,
      coherent: true,
    },
    {
      attempts: 1,
      measured: 100,
      reserved: 1000,
      eligible: false,
      count: 1,
      expired: true,
      providerIds: true,
      coherent: false,
    },
  ].map((item) => ({ ...item, id: randomUUID() }));
  let input = 0,
    output = 0;
  for (const item of fixtures) {
    const tokensIn = Math.floor(item.measured / 2),
      tokensOut = item.measured - tokensIn;
    input += tokensIn + (item.coherent ? 0 : 1);
    output += tokensOut;
    await database.db.insert(generationOperations).values({
      id: item.id,
      userId,
      operationKey: randomUUID(),
      kind: 'workout',
      inputHash: hash,
      status: item.eligible && item.count === 2 ? 'succeeded' : 'failed',
      resourceId: randomUUID(),
      attempts: item.attempts,
      reservedTokens: item.reserved,
      inputTokens: tokensIn + (item.coherent ? 0 : 1),
      outputTokens: tokensOut,
      leaseExpiresAt: new Date(item.expired ? 0 : Date.now() + 60_000),
    });
    let leftIn = tokensIn,
      leftOut = tokensOut;
    for (let i = 0; i < item.count; i++) {
      const eventIn = i === item.count - 1 ? leftIn : Math.floor(tokensIn / item.count),
        eventOut = i === item.count - 1 ? leftOut : Math.floor(tokensOut / item.count);
      leftIn -= eventIn;
      leftOut -= eventOut;
      await database.db.insert(generationUsageEvents).values({
        operationId: item.id,
        eventKey: item.providerIds
          ? createHash('sha256').update(`synthetic-${item.id}-${i}`).digest('hex')
          : randomUUID(),
        model,
        inputTokens: eventIn,
        outputTokens: eventOut,
        totalTokens: eventIn + eventOut,
      });
    }
  }
  const day = new Date().toISOString().slice(0, 10);
  await database.db.insert(generationDailyBudgets).values([
    {
      scope: 'global',
      day,
      attempts: 9,
      reservedTokens: 9000,
      inputTokens: input,
      outputTokens: output,
    },
    {
      scope: `user:${userId}`,
      userId,
      day,
      attempts: 9,
      reservedTokens: 9000,
      inputTokens: input,
      outputTokens: output,
    },
  ]);
  return fixtures;
}
