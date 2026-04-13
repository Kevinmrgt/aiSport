import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workouts } from '../db/schema.js';
import type { Workout } from '@sportcoach/shared';
import type { WorkoutRecord, WorkoutListItem } from '@sportcoach/shared';
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

export async function findWorkoutsByUser(userId: string): Promise<WorkoutListItem[]> {
  // OWASP A01: filtrer par userId — l'utilisateur accède uniquement à SES workouts
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
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sport: row.sport,
    difficulty: row.difficulty,
    durationMinutes: row.durationMinutes,
    createdAt: row.createdAt.toISOString(),
  }));
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
