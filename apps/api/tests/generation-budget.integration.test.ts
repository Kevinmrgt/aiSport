import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, workouts } from '../src/db/schema.js';
import {
  generationDailyBudgets,
  generationOperations,
  generationUsageEvents,
} from '../src/db/generation-budget.schema.js';
import { generationPolicy, type GenerationPolicy } from '../src/services/generation-policy.js';
import type { TrainingProgram, Workout } from '@alcide/shared';
import type { AiAttempt } from '../src/services/ai.service.js';
import type { GenerationBudgetRepository } from '../src/repositories/generation-budget.repository.js';

const testUrl = process.env['TEST_DATABASE_URL'];
const suite = testUrl ? describe : describe.skip;
const userIds = [randomUUID(), randomUUID()];
const hash = 'a'.repeat(64);
const attempt = { model: 'gpt-5.4-mini', maxCompletionTokens: 2048, inputTokensUpperBound: 500 };
const fixture: Workout = {
  title: 'Budget test',
  sport: 'course',
  difficulty: 'beginner',
  duration_minutes: 15,
  exercises: [{ name: 'Course', description: 'Courir', duration_seconds: 900, rest_seconds: 0 }],
};
let poolA: Pool;
let poolB: Pool;
let repositoryA: GenerationBudgetRepository;
let repositoryB: GenerationBudgetRepository;
let database: ReturnType<typeof drizzle>;
let closeDefaultPool: () => Promise<void>;
let policy: GenerationPolicy;

function processAttempt(
  operationId: string,
  userId: string,
  limits: GenerationPolicy,
  httpAttempt: AiAttempt = attempt,
): Promise<{ ok: boolean; statusCode?: number }> {
  const moduleUrl = pathToFileURL(resolve('src/repositories/generation-budget.repository.ts')).href;
  const dbUrl = pathToFileURL(resolve('src/db/index.ts')).href;
  const code = `const {generationBudgetRepository:r}=await import(${JSON.stringify(moduleUrl)});const {pool}=await import(${JSON.stringify(dbUrl)});try{await r.reserveAttempt(${JSON.stringify(operationId)},${JSON.stringify(userId)},${JSON.stringify(httpAttempt)},8,${JSON.stringify(limits)});console.log(JSON.stringify({ok:true}));}catch(error){console.log(JSON.stringify({ok:false,statusCode:error.statusCode??500}));}finally{await pool.end();}`;
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl! },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (codeValue) => {
      if (codeValue !== 0) {
        reject(new Error('Budget child process failed'));
        return;
      }
      try {
        resolveResult(JSON.parse(output.trim()) as { ok: boolean; statusCode?: number });
      } catch {
        reject(new Error('Budget child process returned no result'));
      }
    });
  });
}

suite('PostgreSQL persistent generation budgets', () => {
  beforeAll(async () => {
    if (!testUrl || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(testUrl).hostname))
      throw new Error('Budget integration tests require a dedicated local database');
    process.env['DATABASE_URL'] = testUrl;
    poolA = new Pool({ connectionString: testUrl, max: 4 });
    poolB = new Pool({ connectionString: testUrl, max: 4 });
    database = drizzle(poolA);
    const module = await import('../src/repositories/generation-budget.repository.js');
    repositoryA = new module.GenerationBudgetRepository(drizzle(poolA) as never);
    repositoryB = new module.GenerationBudgetRepository(drizzle(poolB) as never);
    const defaults = await import('../src/db/index.js');
    closeDefaultPool = () => defaults.pool.end();
  });
  beforeEach(async () => {
    await database.delete(users).where(inArray(users.id, userIds));
    // This suite runs against a dedicated ephemeral database, serially with other SQL suites.
    await database.delete(generationDailyBudgets).where(eq(generationDailyBudgets.scope, 'global'));
    await repositoryA.setEnabled(true);
    await database
      .insert(users)
      .values(userIds.map((id) => ({ id, email: `budget-${id}@alcide.test` })));
    policy = {
      ...generationPolicy(),
      userConcurrency: 10,
      globalConcurrency: 20,
      userDailyAttempts: 20,
      globalDailyAttempts: 40,
      userDailyTokens: 1_000_000,
      globalDailyTokens: 2_000_000,
    };
  });
  afterAll(async () => {
    if (database) {
      await repositoryA.setEnabled(true);
      await database.delete(users).where(inArray(users.id, userIds));
      await database
        .delete(generationDailyBudgets)
        .where(eq(generationDailyBudgets.scope, 'global'));
    }
    await Promise.all([poolA?.end(), poolB?.end(), closeDefaultPool?.()]);
  });

  it('admits one owner for simultaneous requests with the same operation key', async () => {
    const key = randomUUID();
    const outcomes = await Promise.allSettled([
      repositoryA.begin(userIds[0]!, key, 'workout', hash, policy),
      repositoryB.begin(userIds[0]!, key, 'workout', hash, policy),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rows = await database
      .select()
      .from(generationOperations)
      .where(
        and(
          eq(generationOperations.userId, userIds[0]!),
          eq(generationOperations.operationKey, key),
        ),
      );
    expect(rows).toHaveLength(1);
    await expect(
      repositoryA.begin(userIds[0]!, key, 'workout', 'b'.repeat(64), policy),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('enforces quota between two Node processes and after process restart', async () => {
    const limits = { ...policy, userDailyAttempts: 1 };
    const { operation } = await repositoryA.begin(
      userIds[0]!,
      randomUUID(),
      'workout',
      hash,
      limits,
    );
    const results = await Promise.all([
      processAttempt(operation.id, userIds[0]!, limits),
      processAttempt(operation.id, userIds[0]!, limits),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)?.statusCode).toBe(429);
    expect(await processAttempt(operation.id, userIds[0]!, limits)).toEqual({
      ok: false,
      statusCode: 429,
    });
    const [counter] = await database
      .select()
      .from(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, `user:${userIds[0]!}`));
    expect(counter?.attempts).toBe(1);
  }, 30_000);

  it('shares the global budget between distinct users and blocks oversized prompt reservations', async () => {
    const limits = { ...policy, globalDailyAttempts: 1 };
    const a = await repositoryA.begin(userIds[0]!, randomUUID(), 'workout', hash, limits);
    const b = await repositoryB.begin(userIds[1]!, randomUUID(), 'workout', hash, limits);
    await expect(
      repositoryA.reserveAttempt(
        a.operation.id,
        userIds[0]!,
        { ...attempt, inputTokensUpperBound: limits.inputTokensPerAttempt + 1 },
        2,
        limits,
      ),
    ).rejects.toMatchObject({ statusCode: 503 });
    const results = await Promise.allSettled([
      repositoryA.reserveAttempt(a.operation.id, userIds[0]!, attempt, 2, limits),
      repositoryB.reserveAttempt(b.operation.id, userIds[1]!, attempt, 2, limits),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const [global] = await database
      .select()
      .from(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, 'global'));
    expect(global?.attempts).toBe(1);
  });

  it('commits the resource and result atomically, then replays without consuming budget', async () => {
    const key = randomUUID();
    const { operation } = await repositoryA.begin(userIds[0]!, key, 'workout', hash, policy);
    await repositoryA.reserveAttempt(operation.id, userIds[0]!, attempt, 2, policy);
    const result = await repositoryA.completeWorkout(operation.id, userIds[0]!, fixture);
    const replay = await repositoryB.begin(userIds[0]!, key, 'workout', hash, {
      ...policy,
      enabled: false,
    });
    expect(replay.replay).toBe(true);
    expect(replay.operation.resourceId).toBe(result.id);
    expect(replay.operation.attempts).toBe(1);
    const rows = await database.select().from(workouts).where(eq(workouts.id, result.id));
    expect(rows).toHaveLength(1);
  });

  it('does not take over expired leases or refund uncertain provider attempts', async () => {
    const key = randomUUID();
    const { operation } = await repositoryA.begin(userIds[0]!, key, 'workout', hash, policy);
    await repositoryA.reserveAttempt(operation.id, userIds[0]!, attempt, 2, policy);
    await database
      .update(generationOperations)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(generationOperations.id, operation.id));
    await expect(
      repositoryB.begin(userIds[0]!, key, 'workout', hash, policy),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      repositoryB.reserveAttempt(operation.id, userIds[0]!, attempt, 2, policy),
    ).rejects.toMatchObject({ statusCode: 409 });
    const [counter] = await database
      .select()
      .from(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, `user:${userIds[0]!}`));
    expect(counter?.attempts).toBe(1);
    expect(counter?.reservedTokens).toBe(
      attempt.inputTokensUpperBound + attempt.maxCompletionTokens,
    );
  });

  it('limits concurrent operations and applies the database kill switch across instances', async () => {
    const limits = { ...policy, userConcurrency: 1, globalConcurrency: 1 };
    const first = await repositoryA.begin(userIds[0]!, randomUUID(), 'workout', hash, limits);
    await expect(
      repositoryB.begin(userIds[1]!, randomUUID(), 'workout', hash, limits),
    ).rejects.toMatchObject({ statusCode: 429 });
    await repositoryB.setEnabled(false);
    await expect(
      repositoryA.reserveAttempt(first.operation.id, userIds[0]!, attempt, 2, limits),
    ).rejects.toMatchObject({ statusCode: 503 });
    await repositoryA.setEnabled(true);
    await repositoryA.fail(first.operation.id, userIds[0]!);
    await expect(
      repositoryB.begin(userIds[1]!, randomUUID(), 'workout', hash, limits),
    ).resolves.toHaveProperty('replay', false);
  });

  it('records unproven usage once without releasing its provision and cascades accounting on account erasure', async () => {
    const { operation } = await repositoryA.begin(
      userIds[0]!,
      randomUUID(),
      'workout',
      hash,
      policy,
    );
    await repositoryA.reserveAttempt(operation.id, userIds[0]!, attempt, 2, policy);
    const usage = {
      model: attempt.model,
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
      requestId: 'provider-test-request-id',
    };
    await Promise.all([
      repositoryA.recordUsage(operation.id, userIds[0]!, usage, policy),
      repositoryB.recordUsage(operation.id, userIds[0]!, usage, policy),
    ]);
    const [counter] = await database
      .select()
      .from(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, `user:${userIds[0]!}`));
    expect(counter?.inputTokens).toBe(100);
    expect(counter?.outputTokens).toBe(200);
    expect(counter?.reservedTokens).toBe(
      attempt.inputTokensUpperBound + attempt.maxCompletionTokens + usage.totalTokens,
    );
    await database.delete(users).where(eq(users.id, userIds[0]!));
    expect(
      await database
        .select()
        .from(generationOperations)
        .where(eq(generationOperations.id, operation.id)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(generationUsageEvents)
        .where(eq(generationUsageEvents.operationId, operation.id)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(generationDailyBudgets)
        .where(eq(generationDailyBudgets.userId, userIds[0]!)),
    ).toHaveLength(0);
  });

  it('rolls back the resource with its operation status when a write fails', async () => {
    const key = randomUUID();
    const { operation } = await repositoryA.begin(userIds[0]!, key, 'workout', hash, policy);
    await expect(
      repositoryA.completeWorkout(operation.id, userIds[0]!, fixture),
    ).rejects.toMatchObject({ statusCode: 409 });
    await repositoryA.reserveAttempt(operation.id, userIds[0]!, attempt, 2, policy);
    await expect(
      repositoryA.completeWorkout(operation.id, userIds[0]!, { ...fixture, duration_minutes: -1 }),
    ).rejects.toBeDefined();
    expect(
      await database.select().from(workouts).where(eq(workouts.id, operation.resourceId)),
    ).toHaveLength(0);
    const [stored] = await database
      .select()
      .from(generationOperations)
      .where(eq(generationOperations.id, operation.id));
    expect(stored?.status).toBe('running');
    await repositoryA.fail(operation.id, userIds[0]!);
    await expect(
      repositoryB.begin(userIds[0]!, key, 'workout', hash, policy),
    ).rejects.toMatchObject({ statusCode: 409, code: 'GENERATION_RETRY_REQUIRES_NEW_KEY' });
  });

  it('stores a complete program atomically and retains unexpected measured excess', async () => {
    const provenAttempt = { ...attempt, receiptId: randomUUID() };
    const { operation } = await repositoryA.begin(
      userIds[0]!,
      randomUUID(),
      'program',
      hash,
      policy,
    );
    await repositoryA.reserveAttempt(operation.id, userIds[0]!, provenAttempt, 8, policy);
    await repositoryA.recordUsage(
      operation.id,
      userIds[0]!,
      {
        receiptId: provenAttempt.receiptId,
        model: attempt.model,
        inputTokens: 35_000,
        outputTokens: 2000,
        totalTokens: 37_000,
      },
      policy,
      provenAttempt,
    );
    const program: TrainingProgram = {
      title: 'Program budget',
      sport: 'course',
      difficulty: 'beginner',
      weeks_count: 2,
      sessions_per_week: 2,
      session_duration_minutes: 20,
      progression_summary: 'Progression',
      weeks: [1, 2].map((week_number) => ({
        week_number,
        theme: 'Course',
        objective: 'Pratique',
        sessions: [1, 2].map((session_number) => ({
          session_number,
          title: 'Course',
          focus: 'Endurance',
          duration_minutes: 20,
          exercises: fixture.exercises.map((exercise) => ({ ...exercise, duration_seconds: 1200 })),
        })),
      })),
    };
    const created = await repositoryA.completeProgram(operation.id, userIds[0]!, program);
    expect(created.id).toBe(operation.resourceId);
    const [stored] = await database
      .select()
      .from(generationOperations)
      .where(eq(generationOperations.id, operation.id));
    expect(stored?.status).toBe('succeeded');
    expect(stored?.reservedTokens).toBe(37_000);
    expect(stored?.inputTokens).toBe(35_000);
  });
  it('preserves heterogeneous token limits between processes and after restart', async () => {
    const limits = { ...policy, userDailyTokens: 5000 };
    const { operation } = await repositoryA.begin(
      userIds[0]!,
      randomUUID(),
      'program',
      hash,
      limits,
    );
    const a = { ...attempt, inputTokensUpperBound: 500, maxCompletionTokens: 2000 };
    const b = { ...attempt, inputTokensUpperBound: 1000, maxCompletionTokens: 2501 };
    const results = await Promise.all([
      processAttempt(operation.id, userIds[0]!, limits, a),
      processAttempt(operation.id, userIds[0]!, limits, b),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const accepted = results[0].ok ? a : b;
    expect(
      await processAttempt(operation.id, userIds[0]!, limits, {
        ...attempt,
        inputTokensUpperBound: 3000,
      }),
    ).toEqual({ ok: false, statusCode: 429 });
    const [counter] = await database
      .select()
      .from(generationDailyBudgets)
      .where(eq(generationDailyBudgets.scope, `user:${userIds[0]!}`));
    expect(counter).toMatchObject({
      attempts: 1,
      reservedTokens: accepted.inputTokensUpperBound + accepted.maxCompletionTokens,
    });
  }, 30_000);
});
