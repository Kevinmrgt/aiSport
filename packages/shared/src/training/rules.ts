import type { Prescription } from '../schemas/prescription.schema.js';
import type { Exercise, Phase } from '../schemas/workout.schema.js';
import { buildSessionSchedule, getExerciseGroups, getSessionTiming } from './schedule.js';

/** Validate compatibility fields only at the persisted contract boundary, not during composition. */
export function getTimingContractIssues(session: {
  planning_version?: 2 | undefined;
  exercises: Exercise[];
}): string[] {
  if (session.planning_version !== 2)
    return session.exercises.some((ex) => ex.prescription)
      ? ['planning_version 2 requis avec des prescriptions']
      : [];
  const steps = buildSessionSchedule(session.exercises);
  return session.exercises.flatMap((exercise, index) => {
    const p = exercise.prescription;
    if (!p) return [];
    const duration = steps
      .filter((step) => step.exerciseIndex === index && step.type !== 'transition')
      .reduce((sum, step) => sum + step.plannedSeconds, 0);
    return (exercise.sets !== undefined && exercise.sets !== p.sets) ||
      (exercise.reps !== undefined && exercise.reps !== p.reps) ||
      (exercise.duration_seconds !== undefined && exercise.duration_seconds !== duration) ||
      exercise.rest_seconds !== p.transition_seconds
      ? [`${exercise.name} : champs de compatibilité incohérents avec la prescription`]
      : [];
  });
}

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export const REST_STEPS = [0, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300] as const;
export const TRANSITION_STEPS = [0, 15, 30, 45, 60] as const;
const levelIndex = { beginner: 0, intermediate: 1, advanced: 2 } as const;
export const getStrengthSetLimit = (level: TrainingLevel): number =>
  [24, 32, 40][levelIndex[level]]!;

// Product planning limits, not a claim that one prescription fits every athlete.
export function getPrescriptionLimits(p: Prescription, level: TrainingLevel) {
  const index = levelIndex[level];
  if (p.category === 'strength')
    return {
      minWork: 10,
      maxWork: [60, 90, 120][index]!,
      minSets: 1,
      maxSets: [4, 5, 6][index]!,
      minRest: 30,
    };
  if (p.category === 'isometric')
    return {
      minWork: 10,
      maxWork: [45, 60, 90][index]!,
      minSets: 1,
      maxSets: [4, 5, 6][index]!,
      minRest: 15,
    };
  if (p.category === 'mobility')
    return { minWork: 15, maxWork: 90, minSets: 1, maxSets: 4, minRest: 0 };
  if (p.mode === 'continuous')
    return {
      minWork: 300,
      maxWork: [3600, 7200, 10800][index]!,
      minSets: 1,
      maxSets: 1,
      minRest: 0,
    };
  return {
    minWork: 10,
    maxWork: p.category === 'cardio' ? 300 : 180,
    minSets: 1,
    maxSets: 12,
    minRest: 10,
  };
}

function normalized(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getPrescriptionIssues(exercise: Exercise, level: TrainingLevel): string[] {
  const p = exercise.prescription;
  if (!p) return [`${exercise.name} : prescription version 2 manquante`];
  const issues: string[] = [];
  const limits = getPrescriptionLimits(p, level);
  const name = normalized(exercise.name);
  const recognized = /\b(gainages?|planches?|plank|chaise|wall sit|isometrique|statique)\b/.test(
    name,
  )
    ? 'isometric'
    : /\b(pompes?|push.?ups?|squats?|tractions?|pull.?ups?|fentes?|lunges?|developpe|deadlift|souleve de terre|dips|burpees?|crunch|tirage|curl|hip thrust)\b|rowing.*(halteres?|barre)/.test(
          name,
        )
      ? 'strength'
      : undefined;
  if (recognized && p.category !== recognized)
    issues.push('catégorie incompatible avec le mouvement');
  if (p.mode === 'continuous' && p.category !== 'cardio')
    issues.push('effort continu réservé au cardio');
  if (
    p.mode === 'continuous' &&
    !/\b(course|footing|jogging|marche|velo|cyclisme|pedalage|natation|nage|rameur|rowing|elliptique|randonnee|ski|patinage|danse)\b/.test(
      name,
    )
  )
    issues.push(
      'effort continu : préciser une activité cardio reconnue, sinon utiliser des intervalles',
    );
  if (
    /\b(sprints?|mountain climbers?|jumping jacks?|sauts?)\b/.test(name) &&
    p.work_seconds > [60, 90, 120][levelIndex[level]]!
  )
    issues.push('intervalle trop long pour un mouvement intense ou explosif');
  if (p.category === 'mobility' && p.mode !== 'mobility')
    issues.push('mobilité : mode mobility requis');
  if (p.mode === 'mobility' && p.category !== 'mobility') issues.push('mode mobilité incompatible');
  if (p.mode === 'repetitions' && p.category !== 'strength')
    issues.push('répétitions : catégorie strength requise');
  if (p.category === 'isometric' && p.mode !== 'interval')
    issues.push('gainage : intervalles requis');
  if (
    p.work_seconds < limits.minWork ||
    p.work_seconds > limits.maxWork ||
    p.work_seconds % 5 !== 0
  )
    issues.push(
      `effort par série attendu entre ${limits.minWork} et ${limits.maxWork}s, par paliers de 5s`,
    );
  if (p.sets > limits.maxSets)
    issues.push(`maximum ${limits.maxSets} séries pour ce mouvement et ce niveau`);
  if (p.mode === 'continuous' && (p.work_seconds % 60 !== 0 || p.circuit_id !== undefined))
    issues.push('cardio continu : minutes entières, hors circuit');
  if (p.mode === 'repetitions') {
    if (!p.reps || p.reps < 4 || p.reps > (level === 'beginner' ? 15 : 25))
      issues.push('répétitions hors plage du niveau');
    else if (p.work_seconds < p.reps * 2 || p.work_seconds > p.reps * 5 + 5)
      issues.push('estimation incompatible avec les répétitions (2 à 5s par répétition)');
  } else if (p.reps !== undefined) issues.push('reps réservé au mode répétitions');
  if (!(REST_STEPS as readonly number[]).includes(p.rest_seconds))
    issues.push('repos hors des paliers autorisés');
  if ((p.sets > 1 || p.circuit_id !== undefined) && p.rest_seconds < limits.minRest)
    issues.push(`repos minimal ${limits.minRest}s entre les efforts`);
  if (!(TRANSITION_STEPS as readonly number[]).includes(p.transition_seconds))
    issues.push('transition hors des paliers autorisés');
  return issues.map((issue) => `${exercise.name} : ${issue}`);
}

export function getSessionPrescriptionIssues(
  session: { exercises: Exercise[]; warmup?: Phase[] | undefined; cooldown?: Phase[] | undefined },
  level: TrainingLevel,
  targetMinutes: number,
  checkTotal = true,
): string[] {
  const issues = session.exercises.flatMap((exercise) => getPrescriptionIssues(exercise, level));
  if (session.exercises.length > 16) issues.push('maximum 16 mouvements distincts par séance');
  const seenCircuits = new Set<number>();
  for (const group of getExerciseGroups(session.exercises)) {
    const first = session.exercises[group[0]!]!.prescription;
    if (first?.circuit_id === undefined) continue;
    if (seenCircuits.has(first.circuit_id) || group.length < 2)
      issues.push('un circuit doit regrouper au moins deux mouvements consécutifs');
    seenCircuits.add(first.circuit_id);
    group.forEach((index, position) => {
      const p = session.exercises[index]!.prescription!;
      if (p.sets !== first.sets)
        issues.push('tous les mouvements du circuit doivent avoir le même nombre de tours');
      if (position < group.length - 1 && p.transition_seconds !== 0)
        issues.push('transition uniquement à la fin du circuit');
    });
  }
  const strengthSets = session.exercises.reduce(
    (total, exercise) =>
      total + (exercise.prescription?.category === 'strength' ? exercise.prescription.sets : 0),
    0,
  );
  if (strengthSets > getStrengthSetLimit(level))
    issues.push('volume total de musculation excessif pour le niveau');
  const phaseTotal = (phases: Phase[] | undefined) =>
    (phases ?? []).reduce((n, phase) => n + phase.duration_seconds, 0);
  const warm = phaseTotal(session.warmup),
    cool = phaseTotal(session.cooldown);
  if (warm < 180 || warm > Math.min(900, targetMinutes * 60 * 0.3))
    issues.push('échauffement attendu entre 3min et 30% du créneau (maximum 15min)');
  if (cool < 120 || cool > Math.min(600, targetMinutes * 60 * 0.2))
    issues.push('retour au calme attendu entre 2min et 20% du créneau (maximum 10min)');
  if (
    [...(session.warmup ?? []), ...(session.cooldown ?? [])].some(
      (phase) => phase.duration_seconds % 30 !== 0,
    )
  )
    issues.push('phases par paliers de 30s');
  if (checkTotal && issues.length === 0) {
    const { plannedSeconds } = getSessionTiming(
      session.exercises,
      session.warmup,
      session.cooldown,
    );
    if (plannedSeconds > targetMinutes * 60 || plannedSeconds < targetMinutes * 60 - 60)
      issues.push(
        `planning attendu entre ${targetMinutes * 60 - 60} et ${targetMinutes * 60}s, reçu ${plannedSeconds}s`,
      );
  }
  return issues;
}
