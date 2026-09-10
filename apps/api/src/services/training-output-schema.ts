import { getPrescriptionLimits, REST_STEPS, TRANSITION_STEPS } from '@alcide/shared';
import type {
  GenerateProgramInput,
  GenerateWorkoutInput,
  Prescription,
  TrainingLevel,
} from '@alcide/shared';

type JsonSchema = Record<string, unknown>;
const object = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const integer = (minimum: number, maximum: number, multipleOf = 1): JsonSchema => ({
  type: 'integer',
  minimum,
  maximum,
  multipleOf,
});
const text = (maxLength = 300): JsonSchema => ({ type: 'string', minLength: 1, maxLength });
const literal = (value: string | number): JsonSchema => ({
  type: typeof value === 'number' ? 'integer' : 'string',
  enum: [value],
});
const array = (items: JsonSchema, minItems: number, maxItems: number): JsonSchema => ({
  type: 'array',
  items,
  minItems,
  maxItems,
});

/** Generation boundary only. Shared validation remains authoritative for stored workouts. */
function sessionProperties(level: TrainingLevel, minutes: number) {
  const variants: [Prescription['category'], Prescription['mode']][] = [
    ['strength', 'repetitions'],
    ['strength', 'interval'],
    ['isometric', 'interval'],
    ['technique', 'interval'],
    ['cardio', 'interval'],
    ['cardio', 'continuous'],
    ['mobility', 'mobility'],
  ];
  const prescription = {
    anyOf: variants.map(([category, mode]) => {
      const limits = getPrescriptionLimits({ category, mode }, level);
      return object({
        version: literal(2),
        category: literal(category),
        mode: literal(mode),
        sets: integer(1, limits.maxSets),
        reps:
          mode === 'repetitions' ? integer(4, level === 'beginner' ? 15 : 25) : { type: 'null' },
        work_seconds: integer(limits.minWork, limits.maxWork, mode === 'continuous' ? 60 : 5),
        rest_seconds: {
          type: 'integer',
          enum:
            mode === 'continuous' ? [0] : REST_STEPS.filter((seconds) => seconds >= limits.minRest),
        },
        transition_seconds: { type: 'integer', enum: TRANSITION_STEPS },
        circuit_id:
          mode === 'continuous' ? { type: 'null' } : { anyOf: [integer(1, 12), { type: 'null' }] },
      });
    }),
  };
  const phase = object({
    name: text(100),
    duration_seconds: integer(30, 900, 30),
    description: text(300),
  });
  return {
    duration_minutes: literal(minutes),
    exercises: array(
      object({
        name: text(100),
        description: text(300),
        tips: { anyOf: [text(250), { type: 'null' }] },
        prescription,
      }),
      1,
      16,
    ),
    warmup: array(phase, 1, 6),
    cooldown: array(phase, 1, 6),
  };
}

export function workoutOutputSchema(input: GenerateWorkoutInput) {
  return {
    name: 'workout_draft_v2',
    schema: object({
      title: text(150),
      sport: literal(input.sport),
      difficulty: literal(input.level),
      ...sessionProperties(input.level, input.duration_minutes),
    }),
  };
}

export function weekOutputSchema(input: GenerateProgramInput, weekNumber: number) {
  return {
    name: 'program_week_draft_v2',
    schema: object({
      week_number: literal(weekNumber),
      theme: text(150),
      objective: text(300),
      sessions: array(
        object({
          session_number: integer(1, input.sessions_per_week),
          title: text(150),
          focus: text(150),
          ...sessionProperties(input.level, input.session_duration_minutes),
        }),
        input.sessions_per_week,
        input.sessions_per_week,
      ),
    }),
  };
}
