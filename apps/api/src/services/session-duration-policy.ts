import { getPrescriptionLimits, getSessionDurationBounds } from '@alcide/shared';
import type { TrainingLevel } from '@alcide/shared';

// The persisted v2 validator requires these aggregate phase minima.
export const MINIMUM_WARMUP_SECONDS = 180;
export const MINIMUM_COOLDOWN_SECONDS = 120;

export function sessionDurationBudget(minutes: number, level: TrainingLevel) {
  const bounds = getSessionDurationBounds(minutes);
  const phaseMinimumSeconds = MINIMUM_WARMUP_SECONDS + MINIMUM_COOLDOWN_SECONDS;
  const movementMaximumSeconds = bounds.maxSeconds - phaseMinimumSeconds;
  const continuous = getPrescriptionLimits({ category: 'cardio', mode: 'continuous' }, level);
  return {
    ...bounds,
    phaseMinimumSeconds,
    movementMaximumSeconds,
    warmupMaximumSeconds: Math.floor(Math.min(900, minutes * 60 * 0.3) / 30) * 30,
    cooldownMaximumSeconds: Math.floor(Math.min(600, minutes * 60 * 0.2) / 30) * 30,
    continuousMinimumSeconds: continuous.minWork,
    continuousMaximumSeconds:
      Math.floor(Math.min(continuous.maxWork, movementMaximumSeconds) / 60) * 60,
    continuousMaximumCount: Math.min(16, Math.floor(movementMaximumSeconds / continuous.minWork)),
  };
}

/** A budget for the whole session, never one full requested duration per exercise. */
export function sessionDurationPrompt(minutes: number, level: TrainingLevel): string {
  const budget = sessionDurationBudget(minutes, level);
  return `Budget global de CHAQUE séance de ${minutes}min : ${budget.minSeconds}–${budget.maxSeconds}s TOUT compris.
Échauffement total ${MINIMUM_WARMUP_SECONDS}–${budget.warmupMaximumSeconds}s ; retour au calme total ${MINIMUM_COOLDOWN_SECONDS}–${budget.cooldownMaximumSeconds}s.
Tous les efforts, séries, repos et transitions réunis : au plus ${budget.movementMaximumSeconds}s à répartir entre 1–16 mouvements, pas ${minutes}min par mouvement.
Continuous : ${budget.continuousMinimumSeconds}–${budget.continuousMaximumSeconds}s par bloc, donc au plus ${budget.continuousMaximumCount} blocs (moins avec d'autres mouvements). Regroupe le même cardio continu plutôt que multiplier les blocs de 5min minimum.
Vérifie la somme. Si le minimum dépasse ${budget.maxSeconds}s, recompose les mouvements ou modes ; ne réduis pas artificiellement leurs minima.`;
}
