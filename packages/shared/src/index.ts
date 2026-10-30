// Schémas Zod — contrat JSON IA (séances simples)
export {
  ExerciseSchema,
  PhaseSchema,
  WorkoutSchema,
  GenerateWorkoutInputSchema,
} from './schemas/workout.schema.js';

// Schémas Zod — contrat JSON IA (programmes multi-semaines)
export {
  ProgramSessionSchema,
  ProgramWeekSchema,
  TrainingProgramSchema,
  GenerateProgramInputSchema,
} from './schemas/program.schema.js';

// Schémas Zod — journal d'exécution des séances
export {
  SessionSourceTypeSchema,
  SessionFeedbackSchema,
  SessionDifficultySchema,
  CreateSessionLogInputSchema,
} from './schemas/session-log.schema.js';

// Types TypeScript — séances simples
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

// Types TypeScript — programmes multi-semaines (inférés depuis le schema)
export type {
  ProgramSession,
  ProgramWeek,
  TrainingProgram,
  GenerateProgramInput,
} from './schemas/program.schema.js';

// Types TypeScript — programmes multi-semaines (entités DB + réponses API)
export type {
  TrainingProgramRecord,
  ProgramListItem,
  ProgramListResponse,
} from './types/program.types.js';

// Types TypeScript — journal d'exécution des séances
export type {
  SessionLogRecord,
  SessionLogListItem,
  SessionLogStats,
  CreateSessionLogInput,
  SessionFeedback,
  SessionSourceType,
} from './types/session-log.types.js';
