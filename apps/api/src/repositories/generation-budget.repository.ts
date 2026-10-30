import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workouts, trainingPrograms } from '../db/schema.js';
import {
  generationControl,
  generationDailyBudgets as budgets,
  generationOperations as operations,
  generationUsageEvents as usageEvents,
  type GenerationOperation,
} from '../db/generation-budget.schema.js';
import type {
  TrainingProgram,
  TrainingProgramRecord,
  Workout,
  WorkoutRecord,
} from '@alcide/shared';
import type { AiAttempt, AiUsage } from '../services/ai.service.js';
import type { GenerationPolicy } from '../services/generation-policy.js';
import { AppError } from '../types/app-error.js';
import { writeAdminAudit } from './admin-audit.repository.js';

type Database = Pick<typeof db, 'transaction'>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type GenerationKind = 'workout' | 'program';
export type AdmittedOperation = { operation: GenerationOperation; replay: boolean };

async function limits(tx: Transaction): Promise<void> {
  // PostgreSQL cancels the query itself. A timed-out callback cannot later reserve or call AI.
  await tx.execute(sql`set local statement_timeout = '5000ms'`);
  await tx.execute(sql`set local lock_timeout = '2000ms'`);
}

async function admissionLock(tx: Transaction): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('alcide:generation:admission:v1'))`);
}

async function enabled(tx: Transaction): Promise<void> {
  await tx.insert(generationControl).values({ id: 'global' }).onConflictDoNothing();
  const [control] = await tx
    .select()
    .from(generationControl)
    .where(eq(generationControl.id, 'global'))
    .for('update');
  if (!control?.enabled)
    throw AppError.serviceUnavailable('La generation est temporairement suspendue');
}

function conflict(message: string): AppError {
  return new AppError(409, 'GENERATION_CONFLICT', message);
}

function utcDay(operation: GenerationOperation): string {
  return operation.createdAt.toISOString().slice(0, 10);
}

export class GenerationBudgetRepository {
  constructor(private readonly database: Database = db) {}

  async begin(
    userId: string,
    operationKey: string,
    kind: GenerationKind,
    inputHash: string,
    policy: GenerationPolicy,
  ): Promise<AdmittedOperation> {
    return this.database.transaction(async (tx) => {
      await limits(tx);
      await admissionLock(tx);
      const [existing] = await tx
        .select()
        .from(operations)
        .where(and(eq(operations.userId, userId), eq(operations.operationKey, operationKey)))
        .for('update');
      if (existing) {
        if (existing.kind !== kind || existing.inputHash !== inputHash)
          throw conflict('Cette cle de generation a deja ete utilisee avec une autre demande');
        if (existing.status === 'succeeded') return { operation: existing, replay: true };
        if (existing.status === 'failed')
          throw new AppError(
            409,
            'GENERATION_RETRY_REQUIRES_NEW_KEY',
            'Cette tentative est terminee sans resultat. Creez une nouvelle demande pour reessayer.',
          );
        // An expired lease is NEVER taken over: a provider request may still have been billed.
        throw conflict(
          'Cette generation est deja en cours ou son resultat est incertain. Consultez votre historique avant toute nouvelle demande.',
        );
      }
      if (!policy.enabled)
        throw AppError.serviceUnavailable('La generation est temporairement suspendue');
      await enabled(tx);
      await this.settleCompletedMeasurements(tx, userId);
      const [active] = await tx
        .select({
          total: sql<number>`count(*)::int`,
          user: sql<number>`count(*) filter (where ${operations.userId} = ${userId})::int`,
        })
        .from(operations)
        .where(and(eq(operations.status, 'running'), gt(operations.leaseExpiresAt, sql`now()`)));
      if (
        (active?.total ?? 0) >= policy.globalConcurrency ||
        (active?.user ?? 0) >= policy.userConcurrency
      ) {
        throw AppError.tooManyRequests('Une generation est deja active. Reessayez plus tard.');
      }
      const [created] = await tx
        .insert(operations)
        .values({
          userId,
          operationKey,
          kind,
          inputHash,
          resourceId: randomUUID(),
          leaseExpiresAt: sql`now() + ${policy.leaseSeconds} * interval '1 second'`,
        })
        .returning();
      if (!created) throw AppError.serviceUnavailable('Reservation de generation indisponible');
      return { operation: created, replay: false };
    });
  }

  async reserveAttempt(
    operationId: string,
    userId: string,
    attempt: AiAttempt,
    maxAttempts: number,
    policy: GenerationPolicy,
  ): Promise<void> {
    const inputUpperBound = (attempt as AiAttempt & { inputTokensUpperBound?: number })
      .inputTokensUpperBound;
    if (
      !policy.enabled ||
      !policy.allowedModels.includes(attempt.model) ||
      !Number.isSafeInteger(attempt.maxCompletionTokens) ||
      attempt.maxCompletionTokens > policy.maxCompletionTokens ||
      attempt.maxCompletionTokens < 1 ||
      inputUpperBound === undefined ||
      !Number.isSafeInteger(inputUpperBound) ||
      inputUpperBound < 0 ||
      inputUpperBound > policy.inputTokensPerAttempt
    ) {
      throw AppError.serviceUnavailable('Cette generation depasse la politique IA du service');
    }
    await this.database.transaction(async (tx) => {
      await limits(tx);
      await admissionLock(tx);
      await enabled(tx);
      const operation = await this.lockRunning(tx, operationId, userId);
      if (operation.attempts >= maxAttempts)
        throw AppError.tooManyRequests('Nombre maximal de tentatives atteint');
      const day = utcDay(operation);
      const userScope = `user:${userId}`;
      await tx
        .insert(budgets)
        .values([
          { scope: 'global', day },
          { scope: userScope, day, userId },
        ])
        .onConflictDoNothing();
      const rows = await tx
        .select()
        .from(budgets)
        .where(and(eq(budgets.day, day), sql`${budgets.scope} in ('global', ${userScope})`))
        .for('update');
      // The transport already bounded this exact HTTP request against the policy ceilings.
      const reserved = inputUpperBound + attempt.maxCompletionTokens;
      if (rows.length !== 2)
        throw AppError.serviceUnavailable('Comptabilisation de generation indisponible');
      for (const row of rows) {
        const attempts =
          row.scope === 'global' ? policy.globalDailyAttempts : policy.userDailyAttempts;
        const tokens = row.scope === 'global' ? policy.globalDailyTokens : policy.userDailyTokens;
        if (row.attempts + 1 > attempts || row.reservedTokens + reserved > tokens)
          throw AppError.tooManyRequests('Le budget quotidien de generation est atteint');
      }
      await tx
        .update(budgets)
        .set({
          attempts: sql`${budgets.attempts} + 1`,
          reservedTokens: sql`${budgets.reservedTokens} + ${reserved}`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(budgets.day, day), sql`${budgets.scope} in ('global', ${userScope})`));
      await tx
        .update(operations)
        .set({
          attempts: sql`${operations.attempts} + 1`,
          reservedTokens: sql`${operations.reservedTokens} + ${reserved}`,
          leaseExpiresAt: sql`now() + ${policy.leaseSeconds} * interval '1 second'`,
          updatedAt: sql`now()`,
        })
        .where(eq(operations.id, operationId));
    });
  }

  async recordUsage(
    operationId: string,
    userId: string,
    usage: AiUsage,
    policy: GenerationPolicy,
    attempt?: Readonly<AiAttempt>,
  ): Promise<void> {
    const values = [usage.inputTokens, usage.outputTokens, usage.totalTokens];
    if (
      usage.receiptId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        usage.receiptId,
      )
    ) {
      throw AppError.serviceUnavailable('Reçu de consommation IA invalide');
    }
    if (
      values.some((value) => !Number.isSafeInteger(value) || value < 0 || value > 10_000_000) ||
      usage.model.length > 120
    ) {
      throw AppError.serviceUnavailable('Mesure de consommation IA invalide');
    }
    // Only an admitted, immutable HTTP receipt can release its exact provision.
    // Legacy callers without proof add the full measurement; they cannot obtain a refund.
    let reserved = 0;
    if (attempt !== undefined) {
      if (
        !usage.receiptId ||
        attempt.receiptId !== usage.receiptId ||
        !Number.isSafeInteger(attempt.inputTokensUpperBound) ||
        attempt.inputTokensUpperBound < 0 ||
        attempt.inputTokensUpperBound > policy.inputTokensPerAttempt ||
        !Number.isSafeInteger(attempt.maxCompletionTokens) ||
        attempt.maxCompletionTokens < 1 ||
        attempt.maxCompletionTokens > policy.maxCompletionTokens
      )
        throw AppError.serviceUnavailable('Borne de consommation IA invalide');
      reserved = attempt.inputTokensUpperBound + attempt.maxCompletionTokens;
    }
    await this.database.transaction(async (tx) => {
      await limits(tx);
      await admissionLock(tx);
      const [operation] = await tx
        .select()
        .from(operations)
        .where(and(eq(operations.id, operationId), eq(operations.userId, userId)))
        .for('update');
      if (!operation || operation.attempts === 0)
        throw AppError.serviceUnavailable('Reservation IA introuvable');
      const total = Math.max(usage.totalTokens, usage.inputTokens + usage.outputTokens);
      // The local receipt remains identical if a callback is retried without a provider ID.
      const eventKey = usage.receiptId
        ? `receipt:${usage.receiptId}`
        : usage.requestId
          ? createHash('sha256').update(usage.requestId).digest('hex')
          : randomUUID();
      const inserted = await tx
        .insert(usageEvents)
        .values({
          operationId,
          eventKey,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: total,
        })
        .onConflictDoNothing()
        .returning({ id: usageEvents.id });
      if (inserted.length === 0) return;
      // Known usage replaces only its proven HTTP provision, including when it exceeds it.
      // A missing proof has reserved=0, so uncertain provisions are never released.
      const delta = total - reserved;
      const daily = await tx
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.day, utcDay(operation)),
            sql`${budgets.scope} in ('global', ${`user:${userId}`})`,
          ),
        )
        .for('update');
      if (
        daily.length !== 2 ||
        (delta < 0 &&
          (operation.reservedTokens < -delta || daily.some((row) => row.reservedTokens < -delta)))
      ) {
        throw AppError.serviceUnavailable('Reglement du budget IA indisponible');
      }
      await tx
        .update(budgets)
        .set({
          inputTokens: sql`${budgets.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${budgets.outputTokens} + ${usage.outputTokens}`,
          reservedTokens: sql`${budgets.reservedTokens} + ${delta}`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(budgets.day, utcDay(operation)),
            sql`${budgets.scope} in ('global', ${`user:${userId}`})`,
          ),
        );
      await tx
        .update(operations)
        .set({
          inputTokens: sql`${operations.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${operations.outputTokens} + ${usage.outputTokens}`,
          reservedTokens: sql`${operations.reservedTokens} + ${delta}`,
          updatedAt: sql`now()`,
        })
        .where(eq(operations.id, operationId));
    });
  }

  async fail(operationId: string, userId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await limits(tx);
      await tx
        .update(operations)
        .set({ status: 'failed', updatedAt: sql`now()` })
        .where(
          and(
            eq(operations.id, operationId),
            eq(operations.userId, userId),
            eq(operations.status, 'running'),
          ),
        );
    });
  }

  async setEnabled(value: boolean): Promise<void> {
    await this.database.transaction(async (tx) => {
      await limits(tx);
      await admissionLock(tx);
      await tx
        .insert(generationControl)
        .values({ id: 'global', enabled: value })
        .onConflictDoUpdate({
          target: generationControl.id,
          set: { enabled: value, updatedAt: sql`now()` },
        });
    });
  }

  async completeWorkout(
    operationId: string,
    userId: string,
    workout: Workout,
    executor?: Transaction,
  ): Promise<WorkoutRecord> {
    const save = async (tx: Transaction): Promise<WorkoutRecord> => {
      await limits(tx);
      const operation = await this.lockRunning(tx, operationId, userId);
      if (operation.kind !== 'workout' || operation.attempts === 0)
        throw conflict('Reservation de seance incoherente');
      const [created] = await tx
        .insert(workouts)
        .values({
          id: operation.resourceId,
          userId,
          title: workout.title,
          sport: workout.sport,
          difficulty: workout.difficulty,
          durationMinutes: workout.duration_minutes,
          data: workout,
        })
        .returning();
      if (!created) throw AppError.internal('Enregistrement de la seance impossible');
      await tx
        .update(operations)
        .set({ status: 'succeeded', updatedAt: sql`now()` })
        .where(eq(operations.id, operationId));
      return created;
    };
    return executor ? save(executor) : this.database.transaction(save);
  }

  async completeProgram(
    operationId: string,
    userId: string,
    program: TrainingProgram,
    executor?: Transaction,
  ): Promise<TrainingProgramRecord> {
    const save = async (tx: Transaction): Promise<TrainingProgramRecord> => {
      await limits(tx);
      const operation = await this.lockRunning(tx, operationId, userId);
      if (operation.kind !== 'program' || operation.attempts === 0)
        throw conflict('Reservation de programme incoherente');
      const [created] = await tx
        .insert(trainingPrograms)
        .values({
          id: operation.resourceId,
          userId,
          title: program.title,
          sport: program.sport,
          difficulty: program.difficulty,
          weeksCount: program.weeks_count,
          sessionsPerWeek: program.sessions_per_week,
          sessionDurationMinutes: program.session_duration_minutes,
          data: program,
        })
        .returning();
      if (!created) throw AppError.internal('Enregistrement du programme impossible');
      await tx
        .update(operations)
        .set({ status: 'succeeded', updatedAt: sql`now()` })
        .where(eq(operations.id, operationId));
      return created;
    };
    return executor ? save(executor) : this.database.transaction(save);
  }

  /** Called under the admission lock. Only complete legacy provider receipts are eligible. */
  private async settleCompletedMeasurements(tx: Transaction, userId: string): Promise<void> {
    const completed = await tx
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.userId, userId),
          sql`${operations.createdAt} >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')`,
          sql`${operations.createdAt} < ((date_trunc('day', now() at time zone 'UTC') + interval '1 day') at time zone 'UTC')`,
          inArray(operations.status, ['succeeded', 'failed']),
          lt(operations.leaseExpiresAt, sql`now()`),
          gt(operations.attempts, 0),
          sql`${operations.reservedTokens} > ${operations.inputTokens} + ${operations.outputTokens}`,
        ),
      )
      .orderBy(operations.id)
      .for('update');
    for (const operation of completed) {
      const [measured] = await tx
        .select({
          count: sql<number>`count(*)::integer`,
          // The old random UUID fallback does not prove one distinct provider receipt per HTTP.
          knownReceipts: sql<boolean>`coalesce(bool_and(${usageEvents.eventKey} ~ '^[a-f0-9]{64}$'), false)`,
          inputTokens: sql<number>`coalesce(sum(${usageEvents.inputTokens}), 0)::integer`,
          outputTokens: sql<number>`coalesce(sum(${usageEvents.outputTokens}), 0)::integer`,
          totalTokens: sql<number>`coalesce(sum(${usageEvents.totalTokens}), 0)::integer`,
        })
        .from(usageEvents)
        .where(eq(usageEvents.operationId, operation.id));
      if (
        !measured ||
        measured.knownReceipts !== true ||
        measured.count !== operation.attempts ||
        measured.inputTokens !== operation.inputTokens ||
        measured.outputTokens !== operation.outputTokens ||
        measured.totalTokens !== measured.inputTokens + measured.outputTokens
      )
        continue;
      const delta = operation.reservedTokens - measured.totalTokens;
      if (delta <= 0) continue;
      const day = utcDay(operation);
      const userScope = `user:${userId}`;
      const daily = await tx
        .select()
        .from(budgets)
        .where(and(eq(budgets.day, day), sql`${budgets.scope} in ('global', ${userScope})`))
        .for('update');
      if (
        daily.length !== 2 ||
        daily.some(
          (row) =>
            row.reservedTokens < operation.reservedTokens ||
            row.inputTokens < measured.inputTokens ||
            row.outputTokens < measured.outputTokens ||
            row.attempts < operation.attempts,
        )
      ) {
        throw AppError.serviceUnavailable('Rapprochement du budget IA indisponible');
      }
      await tx
        .update(budgets)
        .set({ reservedTokens: sql`${budgets.reservedTokens} - ${delta}`, updatedAt: sql`now()` })
        .where(and(eq(budgets.day, day), sql`${budgets.scope} in ('global', ${userScope})`));
      await tx
        .update(operations)
        .set({ reservedTokens: measured.totalTokens, updatedAt: sql`now()` })
        .where(eq(operations.id, operation.id));
      await writeAdminAudit(tx, {
        actorEmail: 'system',
        userId,
        action: 'generation.budget.settled',
        reason: 'Rapprochement des réserves avec des reçus fournisseur complets et mesurés',
        changes: {
          operationId: operation.id,
          day,
          attempts: operation.attempts,
          reservedBefore: operation.reservedTokens,
          measuredTokens: measured.totalTokens,
          releasedTokens: delta,
        },
        requestKey: `generation-budget-settled:v1:${operation.id}`,
      });
    }
  }

  private async lockRunning(
    tx: Transaction,
    operationId: string,
    userId: string,
  ): Promise<GenerationOperation> {
    const [operation] = await tx
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.id, operationId),
          eq(operations.userId, userId),
          eq(operations.status, 'running'),
          gt(operations.leaseExpiresAt, sql`now()`),
        ),
      )
      .for('update');
    if (!operation) throw conflict('La reservation de generation a expire ou est terminee');
    return operation;
  }
}

export const generationBudgetRepository = new GenerationBudgetRepository();
