import type { Exercise, Phase, ProgramSession, TrainingProgram } from '@alcide/shared';

const MIN_EXERCISE_DURATION_SECONDS = 60;
const MIN_PHASE_DURATION_SECONDS = 30;

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDurationLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} s`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

function distributeWeightedSeconds(
  totalSeconds: number,
  count: number,
  weights: number[],
  minSeconds: number,
): number[] {
  if (count <= 0) return [];

  const safeTotal = Math.max(0, Math.round(totalSeconds));
  if (safeTotal === 0) return Array.from({ length: count }, () => 0);

  const effectiveMin = Math.min(minSeconds, Math.floor(safeTotal / count));
  const baseTotal = effectiveMin * count;
  const remainingSeconds = safeTotal - baseTotal;
  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const totalWeight = sum(safeWeights);
  const effectiveWeights = totalWeight > 0
    ? safeWeights
    : Array.from({ length: count }, () => 1);
  const effectiveTotalWeight = totalWeight > 0 ? totalWeight : count;

  const rawShares = effectiveWeights.map((weight) => (remainingSeconds * weight) / effectiveTotalWeight);
  const shares = rawShares.map((share) => Math.floor(share));
  let remainder = remainingSeconds - sum(shares);

  rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remainder <= 0) return;
      shares[index] = (shares[index] ?? 0) + 1;
      remainder -= 1;
    });

  return shares.map((share) => share + effectiveMin);
}

function getPhaseBudget(
  phases: Phase[] | undefined,
  targetSeconds: number,
  minSeconds: number,
  maxSeconds: number,
  maxRatio: number,
): number {
  if (!phases?.length) return 0;

  const requestedSeconds = sum(phases.map((phase) => phase.duration_seconds));
  const maxBudget = Math.max(
    phases.length * MIN_PHASE_DURATION_SECONDS,
    Math.min(maxSeconds, Math.floor(targetSeconds * maxRatio)),
  );
  const minBudget = Math.min(maxBudget, minSeconds);

  return clamp(requestedSeconds, minBudget, maxBudget);
}

function normalizePhases(phases: Phase[] | undefined, totalSeconds: number): Phase[] | undefined {
  if (!phases?.length) return phases;

  const durations = distributeWeightedSeconds(
    totalSeconds,
    phases.length,
    phases.map((phase) => phase.duration_seconds),
    MIN_PHASE_DURATION_SECONDS,
  );

  return phases.map((phase, index) => ({
    ...phase,
    duration_seconds: durations[index] ?? phase.duration_seconds,
  }));
}

export function getProgramSessionTimedSeconds(session: ProgramSession): number {
  const warmupSeconds = sum((session.warmup ?? []).map((phase) => phase.duration_seconds));
  const cooldownSeconds = sum((session.cooldown ?? []).map((phase) => phase.duration_seconds));
  const exerciseSeconds = sum(session.exercises.map((exercise) => exercise.duration_seconds ?? 0));
  const restSeconds = sum(session.exercises.map((exercise) => exercise.rest_seconds));

  return warmupSeconds + cooldownSeconds + exerciseSeconds + restSeconds;
}

export function normalizeProgramSessionDuration(
  session: ProgramSession,
  targetMinutes: number,
): ProgramSession {
  const targetSeconds = targetMinutes * 60;
  const warmupBudget = getPhaseBudget(session.warmup, targetSeconds, 180, 600, 0.2);
  const cooldownBudget = getPhaseBudget(session.cooldown, targetSeconds, 120, 360, 0.15);
  const normalizedWarmup = normalizePhases(session.warmup, warmupBudget);
  const normalizedCooldown = normalizePhases(session.cooldown, cooldownBudget);

  const restBudget = Math.min(
    sum(session.exercises.map((exercise) => exercise.rest_seconds)),
    Math.floor(targetSeconds * 0.15),
  );
  const restDurations = distributeWeightedSeconds(
    restBudget,
    session.exercises.length,
    session.exercises.map((exercise) => exercise.rest_seconds),
    0,
  );

  const fixedSeconds = warmupBudget + cooldownBudget + sum(restDurations);
  const exerciseBudget = Math.max(session.exercises.length, targetSeconds - fixedSeconds);
  const exerciseDurations = distributeWeightedSeconds(
    exerciseBudget,
    session.exercises.length,
    session.exercises.map((exercise) => exercise.duration_seconds ?? 0),
    MIN_EXERCISE_DURATION_SECONDS,
  );

  const exercises: Exercise[] = session.exercises.map((exercise, index) => {
    const durationSeconds = exerciseDurations[index] ?? exercise.duration_seconds ?? MIN_EXERCISE_DURATION_SECONDS;
    const exerciseWithoutSeries: Exercise = { ...exercise };
    delete exerciseWithoutSeries.sets;
    delete exerciseWithoutSeries.reps;

    return {
      ...exerciseWithoutSeries,
      description: `Effectuez ${exercise.name} pendant ${formatDurationLabel(durationSeconds)}, avec une intensité régulière.`,
      rest_seconds: restDurations[index] ?? exercise.rest_seconds,
      duration_seconds: durationSeconds,
      tips: 'Le chrono affiché est la référence pour cet exercice.',
    };
  });

  return {
    ...session,
    duration_minutes: targetMinutes,
    exercises,
    ...(normalizedWarmup ? { warmup: normalizedWarmup } : {}),
    ...(normalizedCooldown ? { cooldown: normalizedCooldown } : {}),
  };
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
