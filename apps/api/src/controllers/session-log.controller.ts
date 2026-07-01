import type { Context } from 'hono';
import { z } from 'zod';
import { CreateSessionLogInputSchema } from '@alcide/shared';
import {
  createSessionLog,
  findRecentSessionLogsByUser,
  getSessionLogStatsByUser,
} from '../repositories/session-log.repository.js';
import type { SessionLogRow } from '../db/schema.js';
import { AppError } from '../types/app-error.js';

const RecentSessionLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function nullableIso(value: Date | string | null): string | null {
  return value ? toIso(value) : null;
}

function formatSessionLog(row: SessionLogRow) {
  return {
    id: row.id,
    userId: row.userId,
    sourceType: row.sourceType,
    workoutId: row.workoutId,
    programId: row.programId,
    programWeekNumber: row.programWeekNumber,
    programSessionNumber: row.programSessionNumber,
    title: row.title,
    sport: row.sport,
    difficulty: row.difficulty,
    plannedDurationMinutes: row.plannedDurationMinutes,
    completedAt: toIso(row.completedAt),
    durationSeconds: row.durationSeconds,
    perceivedEffort: row.perceivedEffort,
    feedback: row.feedback,
    painNotes: row.painNotes,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
  };
}

export async function handleCreateSessionLog(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  const body: unknown = await ctx.req.json<unknown>().catch(() => {
    throw AppError.badRequest('Corps de la requete JSON invalide');
  });

  const parsed = CreateSessionLogInputSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.badRequest('Donnees invalides', parsed.error.flatten());
  }

  const input = {
    sourceType: parsed.data.sourceType,
    title: parsed.data.title,
    sport: parsed.data.sport,
    difficulty: parsed.data.difficulty,
    plannedDurationMinutes: parsed.data.plannedDurationMinutes,
    completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : new Date(),
    durationSeconds: parsed.data.durationSeconds,
    perceivedEffort: parsed.data.perceivedEffort,
    feedback: parsed.data.feedback,
    ...(parsed.data.workoutId !== undefined && { workoutId: parsed.data.workoutId }),
    ...(parsed.data.programId !== undefined && { programId: parsed.data.programId }),
    ...(parsed.data.programWeekNumber !== undefined && {
      programWeekNumber: parsed.data.programWeekNumber,
    }),
    ...(parsed.data.programSessionNumber !== undefined && {
      programSessionNumber: parsed.data.programSessionNumber,
    }),
    ...(parsed.data.painNotes !== undefined && { painNotes: parsed.data.painNotes }),
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  const created = await createSessionLog(auth.userId, input);
  return ctx.json(formatSessionLog(created), 201);
}

export async function handleGetRecentSessionLogs(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  const parsed = RecentSessionLogsQuerySchema.safeParse(ctx.req.query());
  if (!parsed.success) {
    throw AppError.badRequest('Parametres de requete invalides', parsed.error.flatten());
  }

  const rows = await findRecentSessionLogsByUser(auth.userId, parsed.data.limit);
  return ctx.json({
    sessionLogs: rows.map(formatSessionLog),
  });
}

export async function handleGetSessionLogStats(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const stats = await getSessionLogStatsByUser(auth.userId);

  return ctx.json({
    totalCompleted: stats.totalCompleted,
    totalDurationSeconds: stats.totalDurationSeconds,
    averageEffort: stats.averageEffort,
    feedbackCounts: stats.feedbackCounts,
    lastCompletedAt: nullableIso(stats.lastCompletedAt),
  });
}
