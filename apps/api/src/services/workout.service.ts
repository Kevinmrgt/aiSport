import { runWithGenerationQuota, type GenerationAccessMode } from './generation-quota.service.js';
import { generateWorkout } from './workout-ai.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
import {
  findWorkoutsByUser,
  findWorkoutById,
  deleteWorkout,
  getWorkoutStatsByUser,
} from '../repositories/workout.repository.js';
import type {
  GenerateWorkoutInput,
  WorkoutRecord,
  WorkoutListResponse,
  WorkoutStats,
} from '@alcide/shared';
import { executeBudgetedGeneration } from './generation-budget.service.js';
import { generationBudgetRepository } from '../repositories/generation-budget.repository.js';

// Logique metier : ne connait pas HTTP ni Drizzle.
export async function generateAndSaveWorkout(
  userId: string,
  input: GenerateWorkoutInput,
  operationId?: string,
  signal?: AbortSignal,
  accessMode: GenerationAccessMode = 'standard',
): Promise<WorkoutRecord> {
  return executeBudgetedGeneration({
    userId,
    kind: 'workout',
    input,
    maxAttempts: 2,
    ...(operationId !== undefined ? { operationId } : {}),
    ...(signal ? { signal } : {}),
    generate: async (execution) => generateWorkout(input, await resolveAiConfig(userId), execution),
    replay: (resourceId) => findWorkoutById(resourceId, userId),
    withEntitlement: (work) => runWithGenerationQuota(userId, accessMode, work),
    complete: (id, workout, persist) =>
      persist
        ? persist((tx) => generationBudgetRepository.completeWorkout(id, userId, workout, tx))
        : generationBudgetRepository.completeWorkout(id, userId, workout),
  });
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

export async function getWorkoutDetail(workoutId: string, userId: string): Promise<WorkoutRecord> {
  return findWorkoutById(workoutId, userId);
}

export async function removeWorkout(workoutId: string, userId: string): Promise<void> {
  return deleteWorkout(workoutId, userId);
}
