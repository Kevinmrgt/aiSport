import { generateWorkout as generateWithMistral } from './mistral.service.js';
import {
  createWorkout,
  findWorkoutsByUser,
  findWorkoutById,
  deleteWorkout,
  getWorkoutStatsByUser,
} from '../repositories/workout.repository.js';
import type { GenerateWorkoutInput, WorkoutRecord, WorkoutListResponse, WorkoutStats } from '@sportcoach/shared';


// Logique métier — ne connaît pas HTTP ni Drizzle (architecture.md)

export async function generateAndSaveWorkout(
  userId: string,
  input: GenerateWorkoutInput,
): Promise<WorkoutRecord> {
  // 1. Générer l'entraînement via Mistral AI
  const workout = await generateWithMistral(input);

  // 2. Persister en base via le repository
  return createWorkout(userId, workout);
}

export async function getUserWorkouts(
  userId: string,
  opts: { page?: number; limit?: number; sport?: string; level?: string } = {},
): Promise<WorkoutListResponse> {
  return findWorkoutsByUser(userId, opts);
}

export async function getUserStats(userId: string): Promise<WorkoutStats> {
  return getWorkoutStatsByUser(userId);
}

export async function getWorkoutDetail(
  workoutId: string,
  userId: string,
): Promise<WorkoutRecord> {
  // Le repository vérifie l'ownership (OWASP A01)
  return findWorkoutById(workoutId, userId);
}

export async function removeWorkout(workoutId: string, userId: string): Promise<void> {
  // Le repository vérifie l'ownership avant suppression (OWASP A01)
  return deleteWorkout(workoutId, userId);
}
