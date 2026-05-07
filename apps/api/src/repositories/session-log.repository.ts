import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessionLogs } from '../db/schema.js';
import type { SessionLogRow } from '../db/schema.js';
import { AppError } from '../types/app-error.js';

export type SessionLogSourceType = 'workout' | 'program_session';
export type SessionLogDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SessionLogFeedback = 'too_easy' | 'good' | 'too_hard';

export interface CreateSessionLogInput {
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

export async function createSessionLog(
  userId: string,
  input: CreateSessionLogInput,
): Promise<SessionLogRow> {
  let created: SessionLogRow | undefined;
  try {
    const result = await db
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
  } catch (error) {
    console.error('[SessionLogRepository] Erreur DB createSessionLog:', {
      userId,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
    throw AppError.internal("Erreur de base de donnees lors de la creation du journal de seance");
  }

  if (!created) {
    throw AppError.internal('Erreur lors de la creation du journal de seance');
  }

  return created;
}

export async function findRecentSessionLogsByUser(
  userId: string,
  limit: number,
): Promise<SessionLogRow[]> {
  return db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.userId, userId))
    .orderBy(desc(sessionLogs.completedAt))
    .limit(limit);
}

export async function getSessionLogStatsByUser(userId: string): Promise<SessionLogStats> {
  const [summary] = await db
    .select({
      totalCompleted: sql<number>`count(*)::int`,
      totalDurationSeconds: sql<number>`coalesce(sum(${sessionLogs.durationSeconds}), 0)::int`,
      averageEffort: sql<number | null>`avg(${sessionLogs.perceivedEffort})::float`,
      lastCompletedAt: sql<Date | string | null>`max(${sessionLogs.completedAt})`,
    })
    .from(sessionLogs)
    .where(eq(sessionLogs.userId, userId));

  const feedbackRows = await db
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
}
