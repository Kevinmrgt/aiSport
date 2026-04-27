import { generateWorkout } from './mistral.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
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
  // Résoudre la config IA : clé perso de l'utilisateur ou clé serveur Mistral
  const aiConfig = await resolveAiConfig(userId);

  // Générer l'entraînement via le provider IA configuré
  const workout = await generateWorkout(input, aiConfig);

  // Persister en base via le repository
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
