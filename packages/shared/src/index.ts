// Schémas Zod — contrat JSON Mistral
export {
  ExerciseSchema,
  PhaseSchema,
  WorkoutSchema,
  GenerateWorkoutInputSchema,
} from './schemas/workout.schema.js';

// Types TypeScript
export type {
  Exercise,
  Phase,
  Workout,
  GenerateWorkoutInput,
  WorkoutRecord,
  WorkoutListItem,
  WorkoutListResponse,
  WorkoutDetail,
  WorkoutStats,
  ApiError,
} from './types/workout.types.js';
