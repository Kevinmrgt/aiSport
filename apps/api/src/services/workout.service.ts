import { generateWorkout } from './workout-ai.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
import {
  createWorkout,
  findWorkoutsByUser,
  findWorkoutById,
  deleteWorkout,
  getWorkoutStatsByUser,
} from '../repositories/workout.repository.js';
import type { GenerateWorkoutInput, WorkoutRecord, WorkoutListResponse, WorkoutStats } from '@alcide/shared';

// Logique metier : ne connait pas HTTP ni Drizzle.
export async function generateAndSaveWorkout(
  userId: string,
  input: GenerateWorkoutInput,
): Promise<WorkoutRecord> {
  const aiConfig = await resolveAiConfig(userId);
  const workout = await generateWorkout(input, aiConfig);
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
  return findWorkoutById(workoutId, userId);
}

export async function removeWorkout(workoutId: string, userId: string): Promise<void> {
  return deleteWorkout(workoutId, userId);
}
