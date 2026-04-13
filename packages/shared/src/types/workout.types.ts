import type { Exercise, Phase, Workout, GenerateWorkoutInput } from '../schemas/workout.schema.js';

// Workout tel que stocké en base de données
export interface WorkoutRecord {
  id: string;
  userId: string;
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  data: Workout; // JSON complet stocké en JSONB
  createdAt: Date;
  updatedAt: Date;
}

// Réponse API pour la liste des workouts
export interface WorkoutListItem {
  id: string;
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  createdAt: string; // ISO string pour la sérialisation JSON
}

// Réponse API pour un workout complet
export interface WorkoutDetail extends WorkoutListItem {
  exercises: Exercise[];
  warmup?: Phase[];
  cooldown?: Phase[];
}

// Réponse d'erreur API standardisée
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Re-export des types de schémas pour simplicité d'import
export type { Exercise, Phase, Workout, GenerateWorkoutInput };
