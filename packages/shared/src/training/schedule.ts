import type { Exercise, Phase } from '../schemas/workout.schema.js';

export interface SessionStep {
  id: string;
  type: 'warmup' | 'exercise' | 'rest' | 'transition' | 'cooldown';
  title: string;
  description?: string | undefined;
  durationSeconds: number | null;
  plannedSeconds: number;
  exerciseIndex?: number | undefined;
  setNumber?: number | undefined;
  sets?: number | undefined;
  reps?: number | undefined;
  circuitId?: number | undefined;
  tips?: string | undefined;
}

export function getExerciseGroups(exercises: Exercise[]): number[][] {
  const groups: number[][] = [];
  exercises.forEach((exercise, index) => {
    const circuit = exercise.prescription?.circuit_id;
    const previous = exercises[index - 1]?.prescription?.circuit_id;
    if (circuit !== undefined && circuit === previous) groups[groups.length - 1]!.push(index);
    else groups.push([index]);
  });
  return groups;
}

/** One execution plan shared by validation, planning, the timeline and the timer. */
export function buildSessionSchedule(
  exercises: Exercise[],
  warmup: Phase[] = [],
  cooldown: Phase[] = [],
): SessionStep[] {
  const steps: SessionStep[] = [];
  function phases(items: Phase[], type: 'warmup' | 'cooldown') {
    items.forEach((phase, index) =>
      steps.push({
        id: `${type}-${index}`,
        type,
        title: phase.name,
        description: phase.description,
        durationSeconds: phase.duration_seconds,
        plannedSeconds: phase.duration_seconds,
      }),
    );
  }
  function timed(
    id: string,
    type: 'rest' | 'transition',
    seconds: number,
    index: number,
    description: string,
  ) {
    if (seconds > 0)
      steps.push({
        id,
        type,
        title: type === 'rest' ? 'Récupération' : 'Installation',
        durationSeconds: seconds,
        plannedSeconds: seconds,
        exerciseIndex: index,
        description,
      });
  }
  phases(warmup, 'warmup');
  for (const group of getExerciseGroups(exercises)) {
    const first = exercises[group[0]!]!;
    if (!first.prescription) {
      const index = group[0]!;
      // Never infer series from legacy fields: their old duration may already aggregate them.
      steps.push({
        id: `exercise-${index}`,
        type: 'exercise',
        title: first.name,
        description: first.description,
        durationSeconds: first.duration_seconds ?? null,
        plannedSeconds: first.duration_seconds ?? 0,
        exerciseIndex: index,
        tips: first.tips,
      });
      timed(
        `rest-${index}`,
        'rest',
        first.rest_seconds,
        index,
        index < exercises.length - 1
          ? `Avant ${exercises[index + 1]!.name}`
          : 'Dernier temps de repos',
      );
      continue;
    }
    const rounds = first.prescription.sets;
    for (let round = 1; round <= rounds; round++) {
      for (const [position, index] of group.entries()) {
        const exercise = exercises[index]!;
        const p = exercise.prescription!;
        steps.push({
          id: `exercise-${index}-set-${round}`,
          type: 'exercise',
          title: exercise.name,
          description: exercise.description,
          durationSeconds: p.mode === 'repetitions' ? null : p.work_seconds,
          plannedSeconds: p.work_seconds,
          exerciseIndex: index,
          setNumber: round,
          sets: rounds,
          reps: p.reps,
          circuitId: p.circuit_id,
          tips: exercise.tips,
        });
        if (round < rounds || position < group.length - 1) {
          timed(
            `rest-${index}-set-${round}`,
            'rest',
            p.rest_seconds,
            index,
            position < group.length - 1
              ? `Avant ${exercises[group[position + 1]!]!.name}`
              : `Avant la série ${round + 1}`,
          );
        }
      }
    }
    const lastIndex = group[group.length - 1]!;
    const last = exercises[lastIndex]!;
    timed(
      `transition-${lastIndex}`,
      'transition',
      last.prescription!.transition_seconds,
      lastIndex,
      lastIndex < exercises.length - 1
        ? `Préparez ${exercises[lastIndex + 1]!.name}`
        : 'Préparez le retour au calme',
    );
  }
  phases(cooldown, 'cooldown');
  return steps;
}

export function getSessionTiming(exercises: Exercise[], warmup?: Phase[], cooldown?: Phase[]) {
  const steps = buildSessionSchedule(exercises, warmup, cooldown);
  return {
    plannedSeconds: steps.reduce((total, step) => total + step.plannedSeconds, 0),
    timedSeconds: steps.reduce((total, step) => total + (step.durationSeconds ?? 0), 0),
    estimated: steps.some((step) => step.durationSeconds === null),
  };
}
