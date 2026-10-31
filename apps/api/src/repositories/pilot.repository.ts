import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { generationDailyBudgets, generationOperations } from '../db/generation-budget.schema.js';
import {
  pilotAdmissions,
  pilotAttempts,
  pilotControl,
  pilotInvitations,
} from '../db/pilot.schema.js';
import type { AiAttempt, AiUsage } from '../services/ai.service.js';
import {
  PILOT_CAP_NANO_USD,
  PILOT_DURATION_MS,
  pilotCost,
  pilotPrice,
} from '../services/pilot-policy.js';
import { AppError } from '../types/app-error.js';

type Database = Pick<typeof db, 'transaction'>;
export type PilotTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const unavailable = () =>
  AppError.serviceUnavailable(
    'Le pilote IA est ferme ou sa comptabilite requiert une verification',
  );

export async function pilotLock(tx: PilotTransaction): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('alcide:generation:admission:v1'))`);
}

async function active(tx: PilotTransaction, userId?: string) {
  const [control] = await tx
    .select({
      control: pilotControl,
      open: sql<boolean>`${pilotControl.activatedAt} <= clock_timestamp() and ${pilotControl.endsAt} > clock_timestamp()`,
    })
    .from(pilotControl)
    .where(eq(pilotControl.id, 'global'))
    .for('update');
  if (
    !control?.control.enabled ||
    !control.open ||
    control.control.capNanoUsd !== PILOT_CAP_NANO_USD ||
    control.control.endsAt.getTime() - control.control.activatedAt.getTime() !== PILOT_DURATION_MS
  )
    throw unavailable();
  if (userId !== undefined) {
    const [invitation] = await tx
      .select()
      .from(pilotInvitations)
      .where(eq(pilotInvitations.userId, userId));
    if (!invitation)
      throw new AppError(
        403,
        'PILOT_INVITATION_REQUIRED',
        'Ce compte ne dispose pas d’une invitation au pilote',
      );
    return { control: control.control, invitation };
  }
  return { control: control.control, invitation: undefined };
}

/** Marking uncertainty never releases the reserved amount. Expiry is only a block. */
async function noUnknown(tx: PilotTransaction): Promise<void> {
  const rows = await tx
    .select({ id: pilotAttempts.receiptId })
    .from(pilotAttempts)
    .leftJoin(generationOperations, eq(pilotAttempts.operationId, generationOperations.id))
    .where(
      sql`${pilotAttempts.state} = 'unknown' or (${pilotAttempts.state} = 'pending' and (${generationOperations.id} is null or ${generationOperations.status} <> 'running' or ${generationOperations.leaseExpiresAt} <= clock_timestamp()))`,
    )
    .limit(1);
  if (rows.length) throw unavailable();
}

export async function admitPilot(
  tx: PilotTransaction,
  userId: string,
  operationId: string,
): Promise<void> {
  const { invitation } = await active(tx, userId);
  await noUnknown(tx);
  const [count] = await tx
    .select({
      total: sql<number>`count(*)::integer`,
      user: sql<number>`count(*) filter (where ${pilotAdmissions.invitationId} = ${invitation!.id})::integer`,
    })
    .from(pilotAdmissions);
  if ((count?.total ?? 0) >= 30 || (count?.user ?? 0) >= 3)
    throw AppError.tooManyRequests('Le nombre de generations du pilote est atteint');
  await tx.insert(pilotAdmissions).values({ operationId, invitationId: invitation!.id });
}

export async function reservePilotAttempt(
  tx: PilotTransaction,
  operationId: string,
  userId: string,
  attempt: AiAttempt,
): Promise<void> {
  const { control, invitation } = await active(tx, userId);
  await noUnknown(tx);
  const [admission] = await tx
    .select()
    .from(pilotAdmissions)
    .where(
      and(
        eq(pilotAdmissions.operationId, operationId),
        eq(pilotAdmissions.invitationId, invitation!.id),
      ),
    );
  if (
    !admission ||
    !attempt.receiptId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attempt.receiptId,
    )
  )
    throw unavailable();
  const price = pilotPrice(attempt.model);
  const provision = pilotCost(attempt.inputTokensUpperBound, attempt.maxCompletionTokens, price);
  const [total] = await tx
    .select({
      nano: sql<number>`coalesce(sum(coalesce(${pilotAttempts.actualNanoUsd}, ${pilotAttempts.reservedNanoUsd})), 0)::bigint::text`,
    })
    .from(pilotAttempts);
  if (Number(total?.nano ?? 0) + control.legacyNanoUsd + provision > PILOT_CAP_NANO_USD)
    throw AppError.tooManyRequests('Le budget total de vingt dollars du pilote est atteint');
  await tx.insert(pilotAttempts).values({
    receiptId: attempt.receiptId,
    operationId,
    model: attempt.model,
    inputNanoUsdPerToken: price.input,
    outputNanoUsdPerToken: price.output,
    inputTokensUpperBound: attempt.inputTokensUpperBound,
    outputTokensUpperBound: attempt.maxCompletionTokens,
    reservedNanoUsd: provision,
  });
}

export async function settlePilotAttempt(
  tx: PilotTransaction,
  operationId: string,
  usage: AiUsage,
): Promise<boolean> {
  // Receipts may arrive after the window, account deletion, lease expiry or a kill switch.
  if (!usage.receiptId) throw unavailable();
  const [attempt] = await tx
    .select()
    .from(pilotAttempts)
    .where(
      and(eq(pilotAttempts.receiptId, usage.receiptId), eq(pilotAttempts.operationId, operationId)),
    )
    .for('update');
  if (!attempt) throw unavailable();
  const receivedPrice = pilotPrice(usage.model);
  const requestedPrice = pilotPrice(attempt.model);
  if (
    receivedPrice.input !== requestedPrice.input ||
    receivedPrice.output !== requestedPrice.output
  )
    throw unavailable();
  const hash = usage.requestId ? createHash('sha256').update(usage.requestId).digest('hex') : null;
  const chargedOutput = Math.max(usage.outputTokens, usage.totalTokens - usage.inputTokens);
  const actual = pilotCost(usage.inputTokens, chargedOutput, {
    input: attempt.inputNanoUsdPerToken,
    output: attempt.outputNanoUsdPerToken,
  });
  if (attempt.state === 'settled') {
    if (
      attempt.usageModel !== usage.model ||
      attempt.inputTokens !== usage.inputTokens ||
      attempt.outputTokens !== chargedOutput ||
      attempt.actualNanoUsd !== actual ||
      attempt.providerRequestHash !== hash
    )
      throw unavailable();
    return false;
  }
  await tx
    .update(pilotAttempts)
    .set({
      usageModel: usage.model,
      actualNanoUsd: actual,
      inputTokens: usage.inputTokens,
      outputTokens: chargedOutput,
      providerRequestHash: hash,
      state: 'settled',
      settledAt: sql`now()`,
    })
    .where(eq(pilotAttempts.receiptId, usage.receiptId));
  if (
    usage.inputTokens > attempt.inputTokensUpperBound ||
    chargedOutput > attempt.outputTokensUpperBound ||
    actual > attempt.reservedNanoUsd
  )
    await tx.update(pilotControl).set({ enabled: false }).where(eq(pilotControl.id, 'global'));
  return true;
}

export async function markPilotUnknown(tx: PilotTransaction, operationId: string): Promise<void> {
  await tx
    .update(pilotAttempts)
    .set({ state: 'unknown' })
    .where(and(eq(pilotAttempts.operationId, operationId), isNull(pilotAttempts.actualNanoUsd)));
}

export interface PilotActivationReview {
  reviewer: string;
  reviewReference: string;
  legacyProvisionsReviewed: true;
  providerBalanceReviewed: true;
  allGenerationPathsReviewed: true;
  /** Already incurred/reviewed legacy costs, counted inside the same $20 cap. */
  legacyNanoUsd: number;
}

/** No route, environment variable, migration or startup code calls this operator interface. */
export class PilotRepository {
  constructor(private readonly database: Database = db) {}
  async activate(review: PilotActivationReview): Promise<void> {
    if (
      !review.reviewer?.trim() ||
      !review.reviewReference?.trim() ||
      review.legacyProvisionsReviewed !== true ||
      review.providerBalanceReviewed !== true ||
      review.allGenerationPathsReviewed !== true ||
      !Number.isSafeInteger(review.legacyNanoUsd) ||
      review.legacyNanoUsd < 0 ||
      review.legacyNanoUsd > PILOT_CAP_NANO_USD
    )
      throw unavailable();
    await this.database.transaction(async (tx) => {
      await pilotLock(tx);
      const [existing] = await tx.select().from(pilotControl).where(eq(pilotControl.id, 'global'));
      if (existing) throw unavailable(); // The window and baseline can never be reset.
      const unresolved = await tx
        .select({ id: generationOperations.id })
        .from(generationOperations)
        .where(
          sql`${generationOperations.attempts} > 0 and (${generationOperations.status} = 'running' or ${generationOperations.reservedTokens} <> ${generationOperations.inputTokens} + ${generationOperations.outputTokens})`,
        )
        .limit(1);
      if (unresolved.length) throw unavailable();
      const uncertainGlobal = await tx
        .select({ day: generationDailyBudgets.day })
        .from(generationDailyBudgets)
        .where(
          and(
            eq(generationDailyBudgets.scope, 'global'),
            sql`${generationDailyBudgets.reservedTokens} <> ${generationDailyBudgets.inputTokens} + ${generationDailyBudgets.outputTokens}`,
          ),
        )
        .limit(1);
      if (uncertainGlobal.length) throw unavailable();
      const orphanedLedger = await tx
        .select({ id: pilotInvitations.id })
        .from(pilotInvitations)
        .limit(1);
      if (orphanedLedger.length) throw unavailable();
      const clock = await tx.execute(
        sql`select floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text as at_ms`,
      );
      const milliseconds = clock.rows[0]?.['at_ms'];
      if (typeof milliseconds !== 'string' || !/^[1-9]\d{0,14}$/.test(milliseconds))
        throw unavailable();
      const timestamp = Number(milliseconds);
      if (!Number.isSafeInteger(timestamp) || timestamp > 8_640_000_000_000_000 - PILOT_DURATION_MS)
        throw unavailable();
      const now = new Date(timestamp);
      await tx.insert(pilotControl).values({
        id: 'global',
        enabled: true,
        activatedAt: now,
        endsAt: new Date(now.getTime() + PILOT_DURATION_MS),
        capNanoUsd: PILOT_CAP_NANO_USD,
        legacyNanoUsd: review.legacyNanoUsd,
        reviewer: review.reviewer.trim(),
        reviewReference: review.reviewReference.trim(),
      });
    });
  }
  async invite(userId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await pilotLock(tx);
      await active(tx);
      const [existing] = await tx
        .select()
        .from(pilotInvitations)
        .where(eq(pilotInvitations.userId, userId));
      if (existing) return;
      const [count] = await tx
        .select({ total: sql<number>`count(*)::integer` })
        .from(pilotInvitations);
      if ((count?.total ?? 0) >= 10)
        throw AppError.tooManyRequests('Les dix places du pilote sont attribuees');
      await tx.insert(pilotInvitations).values({ userId });
    });
  }
}
