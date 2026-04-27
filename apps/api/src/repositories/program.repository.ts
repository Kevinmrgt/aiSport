import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { trainingPrograms } from '../db/schema.js';
import type { TrainingProgramRow } from '../db/schema.js';
import type { TrainingProgram } from '@sportcoach/shared';
import type { TrainingProgramRecord, ProgramListResponse } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';

// Seul endroit qui touche la BDD pour les programmes (architecture.md — repository layer)
// OWASP A03: Drizzle ORM uniquement, pas de SQL brut

function rowToRecord(row: TrainingProgramRow): TrainingProgramRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    sport: row.sport,
    difficulty: row.difficulty,
    weeksCount: row.weeksCount,
    sessionsPerWeek: row.sessionsPerWeek,
    sessionDurationMinutes: row.sessionDurationMinutes,
    data: row.data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createProgram(
  userId: string,
  program: TrainingProgram,
): Promise<TrainingProgramRecord> {
  let created: TrainingProgramRow | undefined;
  try {
    const result = await db
      .insert(trainingPrograms)
      .values({
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
    created = result[0];
  } catch (error) {
    // OWASP A09: logger l'erreur DB native avant de la convertir en AppError
    console.error('[ProgramRepository] Erreur DB createProgram:', {
      userId,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
    throw AppError.internal('Erreur de base de données lors de la création du programme');
  }

  if (!created) {
    throw AppError.internal('Erreur lors de la création du programme');
  }

  return rowToRecord(created);
}

export async function findProgramsByUser(
  userId: string,
  opts: { page?: number; limit?: number } = {},
): Promise<ProgramListResponse> {
  const { page = 1, limit = 9 } = opts;

  // OWASP A01: filtrer par userId — l'utilisateur accède uniquement à SES programmes
  const where = eq(trainingPrograms.userId, userId);

  const countResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(trainingPrograms)
    .where(where);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select({
      id: trainingPrograms.id,
      title: trainingPrograms.title,
      sport: trainingPrograms.sport,
      difficulty: trainingPrograms.difficulty,
      weeksCount: trainingPrograms.weeksCount,
      sessionsPerWeek: trainingPrograms.sessionsPerWeek,
      sessionDurationMinutes: trainingPrograms.sessionDurationMinutes,
      createdAt: trainingPrograms.createdAt,
    })
    .from(trainingPrograms)
    .where(where)
    .orderBy(desc(trainingPrograms.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    programs: rows.map((row) => ({
      id: row.id,
      title: row.title,
      sport: row.sport,
      difficulty: row.difficulty,
      weeksCount: row.weeksCount,
      sessionsPerWeek: row.sessionsPerWeek,
      sessionDurationMinutes: row.sessionDurationMinutes,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export async function findProgramById(
  programId: string,
  userId: string,
): Promise<TrainingProgramRecord> {
  const [row] = await db
    .select()
    .from(trainingPrograms)
    .where(eq(trainingPrograms.id, programId))
    .limit(1);

  if (!row) {
    throw AppError.notFound('Programme');
  }

  // OWASP A01: vérifier que le programme appartient bien à l'utilisateur connecté
  if (row.userId !== userId) {
    // OWASP A09: logger la tentative d'accès non autorisé
    console.warn('[ProgramRepository] Tentative d\'accès non autorisé', {
      requestedProgramId: programId,
      requestingUserId: userId,
      ownerUserId: row.userId,
    });
    throw AppError.forbidden('Vous ne pouvez pas accéder à ce programme');
  }

  return rowToRecord(row);
}

export async function deleteProgram(programId: string, userId: string): Promise<void> {
  // OWASP A01: vérifier l'ownership avant suppression
  await findProgramById(programId, userId);
  await db.delete(trainingPrograms).where(eq(trainingPrograms.id, programId));
}
