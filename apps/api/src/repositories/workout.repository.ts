import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workouts } from '../db/schema.js';
import type { WorkoutRow } from '../db/schema.js';
import type { Workout } from '@alcide/shared';
import type { WorkoutRecord, WorkoutListResponse, WorkoutStats } from '@alcide/shared';
import { WorkoutSchema } from '@alcide/shared';
import { AppError } from '../types/app-error.js';

// Seul endroit qui touche la BDD (architecture.md — repository layer)
// OWASP A03: Drizzle ORM uniquement, pas de SQL brut

export async function createWorkout(userId: string, workout: Workout): Promise<WorkoutRecord> {
  let created: WorkoutRow | undefined;
  try {
    const result = await db
      .insert(workouts)
      .values({
        userId,
        title: workout.title,
        sport: workout.sport,
        difficulty: workout.difficulty,
        durationMinutes: workout.duration_minutes,
        data: workout,
      })
      .returning();
    created = result[0];
  } catch {
    // OWASP A09: logger l'erreur DB native avant de la convertir en AppError
    // (les erreurs Drizzle/PostgreSQL ne sont pas des AppError — elles deviendraient
    // des [UnexpectedError] 500 sans message utile sans ce wrapper)
    console.error('[WorkoutRepository] Erreur DB createWorkout:', {
      code: 'DB_WRITE_FAILED',
      timestamp: new Date().toISOString(),
    });
    throw AppError.internal("Erreur de base de données lors de la création de l'entraînement");
  }

  if (!created) {
    throw AppError.internal("Erreur lors de la création de l'entraînement");
  }

  return {
    id: created.id,
    userId: created.userId,
    title: created.title,
    sport: created.sport,
    difficulty: created.difficulty,
    durationMinutes: created.durationMinutes,
    data: created.data,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function findWorkoutsByUser(
  userId: string,
  opts: { page?: number; limit?: number; sport?: string; level?: string } = {},
): Promise<WorkoutListResponse> {
  return db.transaction(
    async (snapshot) => {
      const { page = 1, limit = 9, sport, level } = opts;

      // OWASP A01: filtrer par userId — l'utilisateur accède uniquement à SES workouts
      const conditions = [eq(workouts.userId, userId)];
      if (sport) conditions.push(eq(workouts.sport, sport));
      if (level)
        conditions.push(eq(workouts.difficulty, level as 'beginner' | 'intermediate' | 'advanced'));
      const where = and(...conditions);

      // Requête de comptage
      const countResult = await snapshot
        .select({ total: sql<number>`count(*)::int` })
        .from(workouts)
        .where(where);
      const total = countResult[0]?.total ?? 0;

      // Requête paginée
      const rows = await snapshot
        .select({
          id: workouts.id,
          title: workouts.title,
          sport: workouts.sport,
          difficulty: workouts.difficulty,
          durationMinutes: workouts.durationMinutes,
          createdAt: workouts.createdAt,
        })
        .from(workouts)
        .where(where)
        .orderBy(desc(workouts.createdAt), desc(workouts.id))
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        workouts: rows.map((row) => ({
          id: row.id,
          title: row.title,
          sport: row.sport,
          difficulty: row.difficulty,
          durationMinutes: row.durationMinutes,
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

export async function getWorkoutStatsByUser(userId: string): Promise<WorkoutStats> {
  return db.transaction(
    async (snapshot) => {
      // OWASP A01: filtrer par userId
      const totalResult = await snapshot
        .select({ total: sql<number>`count(*)::int` })
        .from(workouts)
        .where(eq(workouts.userId, userId));
      const total = totalResult[0]?.total ?? 0;

      const byLevelRows = await snapshot
        .select({ difficulty: workouts.difficulty, count: sql<number>`count(*)::int` })
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .groupBy(workouts.difficulty);

      const bySportRows = await snapshot
        .select({ sport: workouts.sport, count: sql<number>`count(*)::int` })
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .groupBy(workouts.sport);

      const [lastRow] = await snapshot
        .select({ createdAt: workouts.createdAt })
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .orderBy(desc(workouts.createdAt), desc(workouts.id))
        .limit(1);

      const byLevel = { beginner: 0, intermediate: 0, advanced: 0 };
      for (const row of byLevelRows) {
        byLevel[row.difficulty] = row.count;
      }

      const bySport: Record<string, number> = {};
      for (const row of bySportRows) {
        bySport[row.sport] = row.count;
      }

      return {
        total,
        byLevel,
        bySport,
        lastGenerated: lastRow ? lastRow.createdAt.toISOString() : null,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

export async function findWorkoutById(workoutId: string, userId: string): Promise<WorkoutRecord> {
  const [row] = await db
    .select()
    .from(workouts)
    // OWASP A01: double vérification — ID + userId pour garantir l'ownership
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!row) {
    throw AppError.notFound('Entraînement');
  }

  // OWASP A01: vérifier que le workout appartient bien à l'utilisateur connecté
  if (row.userId !== userId) {
    // OWASP A09: logger la tentative d'accès non autorisé
    console.warn("[WorkoutRepository] Tentative d'accès non autorisé", {
      operation: 'read',
    });
    throw AppError.forbidden('Vous ne pouvez pas accéder à cet entraînement');
  }

  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    sport: row.sport,
    difficulty: row.difficulty,
    durationMinutes: row.durationMinutes,
    data: validateStoredWorkout(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<void> {
  // Invalid historical JSON must remain deletable by its owner.
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });
  if (!deleted.length) throw AppError.notFound('Entraînement');
}

function validateStoredWorkout(data: unknown): Workout {
  const parsed = WorkoutSchema.safeParse(data);
  if (!parsed.success)
    throw new AppError(
      422,
      'STORED_DATA_INVALID',
      'Cet ancien entraînement ne peut pas être affiché. Contactez le responsable du service ou supprimez-le.',
    );
  return parsed.data;
}
