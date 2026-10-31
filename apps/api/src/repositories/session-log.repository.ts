import { logFailure } from '../lib/logging.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '../db/index.js';
import { sessionLogs } from '../db/schema.js';
import { sessionLogOperations } from '../db/session-operation.schema.js';
import type { SessionLogRow } from '../db/schema.js';
import { AppError } from '../types/app-error.js';

export type SessionLogSourceType = 'workout' | 'program_session';
export type SessionLogDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SessionLogFeedback = 'too_easy' | 'good' | 'too_hard';

export interface CreateSessionLogInput {
  operationId?: string;
  sourceType: SessionLogSourceType;
  workoutId?: string | null;
  programId?: string | null;
  programWeekNumber?: number | null;
  programSessionNumber?: number | null;
  title: string;
  sport: string;
  difficulty: SessionLogDifficulty;
  plannedDurationMinutes: number;
  completedAt: Date;
  durationSeconds: number;
  perceivedEffort: number;
  feedback: SessionLogFeedback;
  painNotes?: string | null;
  notes?: string | null;
}

export interface SessionLogStats {
  totalCompleted: number;
  totalDurationSeconds: number;
  averageEffort: number | null;
  feedbackCounts: Record<SessionLogFeedback, number>;
  lastCompletedAt: Date | string | null;
}

function sessionInputHash(input: CreateSessionLogInput): string {
  // Ignore server-owned display metadata and timestamp so a transport retry is stable.
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.sourceType,
        input.workoutId ?? null,
        input.programId ?? null,
        input.programWeekNumber ?? null,
        input.programSessionNumber ?? null,
        input.durationSeconds,
        input.perceivedEffort,
        input.feedback,
        input.notes?.trim() || null,
        input.painNotes?.trim() || null,
      ]),
    )
    .digest('hex');
}

type SessionLogExecutor = Pick<typeof db, 'insert' | 'select'>;

async function findOperation(
  executor: SessionLogExecutor,
  userId: string,
  input: CreateSessionLogInput,
): Promise<SessionLogRow | undefined> {
  if (!input.operationId) return undefined;
  const [operation] = await executor
    .select()
    .from(sessionLogOperations)
    .where(
      and(
        eq(sessionLogOperations.userId, userId),
        eq(sessionLogOperations.operationKey, input.operationId),
      ),
    )
    .limit(1);
  if (!operation) return undefined;
  if (operation.inputHash !== sessionInputHash(input)) {
    throw new AppError(
      409,
      'SESSION_OPERATION_CONFLICT',
      'Cette tentative correspond a un autre retour de seance.',
    );
  }
  const [row] = await executor
    .select()
    .from(sessionLogs)
    .where(and(eq(sessionLogs.userId, userId), eq(sessionLogs.id, operation.logId)))
    .limit(1);
  return row;
}

export function findSessionLogOperation(userId: string, input: CreateSessionLogInput) {
  return findOperation(db, userId, input);
}

async function insertSessionLog(
  executor: SessionLogExecutor,
  userId: string,
  input: CreateSessionLogInput,
): Promise<SessionLogRow> {
  let created: SessionLogRow | undefined;
  try {
    const result = await executor
      .insert(sessionLogs)
      .values({
        userId,
        sourceType: input.sourceType,
        workoutId: input.workoutId ?? null,
        programId: input.programId ?? null,
        programWeekNumber: input.programWeekNumber ?? null,
        programSessionNumber: input.programSessionNumber ?? null,
        title: input.title,
        sport: input.sport,
        difficulty: input.difficulty,
        plannedDurationMinutes: input.plannedDurationMinutes,
        completedAt: input.completedAt,
        durationSeconds: input.durationSeconds,
        perceivedEffort: input.perceivedEffort,
        feedback: input.feedback,
        painNotes: input.painNotes ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    created = result[0];
  } catch {
    logFailure('[SessionLogRepository] Erreur DB createSessionLog:', {
      code: 'DB_WRITE_FAILED',
      statusCode: 500,
    });
    throw AppError.internal('Erreur de base de donnees lors de la creation du journal de seance');
  }

  if (!created) {
    throw AppError.internal('Erreur lors de la creation du journal de seance');
  }

  return created;
}

export async function createSessionLog(
  userId: string,
  input: CreateSessionLogInput,
): Promise<SessionLogRow> {
  if (!input.operationId) return insertSessionLog(db, userId, input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`session:${userId}:${input.operationId}`}, 0))`,
    );
    const existing = await findOperation(tx, userId, input);
    if (existing) return existing;
    const row = await insertSessionLog(tx, userId, input);
    await tx.insert(sessionLogOperations).values({
      userId,
      operationKey: input.operationId!,
      inputHash: sessionInputHash(input),
      logId: row.id,
    });
    return row;
  });
}

export async function findRecentSessionLogsByUser(
  userId: string,
  limit: number,
): Promise<SessionLogRow[]> {
  return db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.userId, userId))
    .orderBy(desc(sessionLogs.completedAt), desc(sessionLogs.id))
    .limit(limit);
}

export async function getSessionLogStatsByUser(userId: string): Promise<SessionLogStats> {
  return db.transaction(
    async (snapshot) => {
      const [summary] = await snapshot
        .select({
          totalCompleted: sql<number>`count(*)::int`,
          totalDurationSeconds: sql<number>`coalesce(sum(${sessionLogs.durationSeconds}), 0)::int`,
          averageEffort: sql<number | null>`avg(${sessionLogs.perceivedEffort})::float`,
          lastCompletedAt: sql<Date | string | null>`max(${sessionLogs.completedAt})`,
        })
        .from(sessionLogs)
        .where(eq(sessionLogs.userId, userId));

      const feedbackRows = await snapshot
        .select({
          feedback: sessionLogs.feedback,
          count: sql<number>`count(*)::int`,
        })
        .from(sessionLogs)
        .where(eq(sessionLogs.userId, userId))
        .groupBy(sessionLogs.feedback);

      const feedbackCounts: Record<SessionLogFeedback, number> = {
        too_easy: 0,
        good: 0,
        too_hard: 0,
      };
      for (const row of feedbackRows) {
        feedbackCounts[row.feedback] = Number(row.count);
      }

      return {
        totalCompleted: Number(summary?.totalCompleted ?? 0),
        totalDurationSeconds: Number(summary?.totalDurationSeconds ?? 0),
        averageEffort: summary?.averageEffort == null ? null : Number(summary.averageEffort),
        feedbackCounts,
        lastCompletedAt: summary?.lastCompletedAt ?? null,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
