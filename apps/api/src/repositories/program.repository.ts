import { logFailure } from '../lib/logging.js';
import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { trainingPrograms } from '../db/schema.js';
import type { TrainingProgramRow } from '../db/schema.js';
import type { TrainingProgram } from '@alcide/shared';
import type { TrainingProgramRecord, ProgramListResponse } from '@alcide/shared';
import { TrainingProgramSchema } from '@alcide/shared';
import { AppError } from '../types/app-error.js';

// Seul endroit qui touche la BDD pour les programmes (architecture.md — repository layer)
// OWASP A03: Drizzle ORM uniquement, pas de SQL brut

function rowToRecord(row: TrainingProgramRow): TrainingProgramRecord {
  const parsed = TrainingProgramSchema.safeParse(row.data);
  if (!parsed.success)
    throw new AppError(
      422,
      'STORED_DATA_INVALID',
      'Cet ancien programme ne peut pas être affiché. Contactez le responsable du service ou supprimez-le.',
    );
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    sport: row.sport,
    difficulty: row.difficulty,
    weeksCount: row.weeksCount,
    sessionsPerWeek: row.sessionsPerWeek,
    sessionDurationMinutes: row.sessionDurationMinutes,
    data: parsed.data,
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
  } catch {
    // OWASP A09: logger l'erreur DB native avant de la convertir en AppError
    logFailure('[ProgramRepository] Erreur DB createProgram:', {
      code: 'DB_WRITE_FAILED',
      statusCode: 500,
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
  return db.transaction(
    async (snapshot) => {
      const { page = 1, limit = 9 } = opts;

      // OWASP A01: filtrer par userId — l'utilisateur accède uniquement à SES programmes
      const where = eq(trainingPrograms.userId, userId);

      const countResult = await snapshot
        .select({ total: sql<number>`count(*)::int` })
        .from(trainingPrograms)
        .where(where);
      const total = countResult[0]?.total ?? 0;

      const rows = await snapshot
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
        .orderBy(desc(trainingPrograms.createdAt), desc(trainingPrograms.id))
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
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
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
    console.warn("[ProgramRepository] Tentative d'accès non autorisé", {
      operation: 'read',
    });
    throw AppError.forbidden('Vous ne pouvez pas accéder à ce programme');
  }

  return rowToRecord(row);
}

export async function deleteProgram(programId: string, userId: string): Promise<void> {
  const deleted = await db
    .delete(trainingPrograms)
    .where(and(eq(trainingPrograms.id, programId), eq(trainingPrograms.userId, userId)))
    .returning({ id: trainingPrograms.id });
  if (!deleted.length) throw AppError.notFound('Programme');
}
