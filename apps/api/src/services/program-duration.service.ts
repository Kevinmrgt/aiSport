import type { ProgramSession, TrainingProgram } from '@alcide/shared';

/** A timing error must be regenerated, never repaired by changing the exercise. */
export class ProgramDurationError extends Error {
  constructor() {
    super('La durée détaillée du programme ne correspond pas à la durée demandée');
    this.name = 'ProgramDurationError';
  }
}

export function getProgramSessionTimedSeconds(session: ProgramSession): number {
  const phases = [...(session.warmup ?? []), ...(session.cooldown ?? [])];
  return (
    phases.reduce((total, phase) => total + phase.duration_seconds, 0) +
    session.exercises.reduce(
      (total, exercise) => total + (exercise.duration_seconds ?? 0) + exercise.rest_seconds,
      0,
    )
  );
}

/**
 * Compatibility name retained for callers. This function now validates only.
 * No automatic correction: even a small change can contradict repetitions,
 * technique or a physical restriction in prose.
 */
export function normalizeProgramSessionDuration(
  session: ProgramSession,
  targetMinutes: number,
): ProgramSession {
  if (
    !Number.isSafeInteger(targetMinutes) ||
    targetMinutes <= 0 ||
    session.duration_minutes !== targetMinutes ||
    session.exercises.some(
      (exercise) =>
        !Number.isSafeInteger(exercise.duration_seconds) || (exercise.duration_seconds ?? 0) <= 0,
    ) ||
    getProgramSessionTimedSeconds(session) !== targetMinutes * 60
  ) {
    throw new ProgramDurationError();
  }
  return structuredClone(session);
}

export function normalizeTrainingProgramDurations(program: TrainingProgram): TrainingProgram {
  return {
    ...program,
    weeks: program.weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) =>
        normalizeProgramSessionDuration(session, program.session_duration_minutes),
      ),
    })),
  };
}
