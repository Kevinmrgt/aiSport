import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workouts } from '../db/schema.js';
import type { Workout } from '@sportcoach/shared';
import type { WorkoutRecord, WorkoutListResponse, WorkoutStats } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';

// Seul endroit qui touche la BDD (architecture.md — repository layer)
// OWASP A03: Drizzle ORM uniquement, pas de SQL brut

export async function createWorkout(
  userId: string,
  workout: Workout,
): Promise<WorkoutRecord> {
  const [created] = await db
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
  const { page = 1, limit = 9, sport, level } = opts;

  // OWASP A01: filtrer par userId — l'utilisateur accède uniquement à SES workouts
  const conditions = [eq(workouts.userId, userId)];
  if (sport) conditions.push(eq(workouts.sport, sport));
  if (level) conditions.push(eq(workouts.difficulty, level as 'beginner' | 'intermediate' | 'advanced'));
  const where = and(...conditions);

  // Requête de comptage
  const countResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(workouts)
    .where(where);
  const total = countResult[0]?.total ?? 0;

  // Requête paginée
  const rows = await db
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
    .orderBy(desc(workouts.createdAt))
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
}

export async function getWorkoutStatsByUser(userId: string): Promise<WorkoutStats> {
  // OWASP A01: filtrer par userId
  const totalResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(workouts)
    .where(eq(workouts.userId, userId));
  const total = totalResult[0]?.total ?? 0;

  const byLevelRows = await db
    .select({ difficulty: workouts.difficulty, count: sql<number>`count(*)::int` })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.difficulty);

  const bySportRows = await db
    .select({ sport: workouts.sport, count: sql<number>`count(*)::int` })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.sport);

  const [lastRow] = await db
    .select({ createdAt: workouts.createdAt })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt))
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
}

export async function findWorkoutById(
  workoutId: string,
  userId: string,
): Promise<WorkoutRecord> {
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
    console.warn('[WorkoutRepository] Tentative d\'accès non autorisé', {
      requestedWorkoutId: workoutId,
      requestingUserId: userId,
      ownerUserId: row.userId,
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
    data: row.data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<void> {
  // OWASP A01: vérifier l'ownership avant suppression
  await findWorkoutById(workoutId, userId);

  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
