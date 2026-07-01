import { describe, expect, it } from 'vitest';
import type { Exercise, Phase } from '@alcide/shared';
import { buildTimerSteps } from './Timer';

describe('buildTimerSteps', () => {
  it('keeps untimed exercises manual while preserving rest timers', () => {
    const warmup: Phase[] = [
      {
        name: 'Mobilité',
        duration_seconds: 120,
        description: 'Préparation articulaire',
      },
    ];
    const exercises: Exercise[] = [
      {
        name: 'Shadow boxing',
        description: 'Enchaînements libres',
        duration_seconds: 180,
        rest_seconds: 45,
      },
      {
        name: 'Pompes',
        description: '3 séries au ressenti',
        sets: 3,
        reps: 'max',
        rest_seconds: 60,
      },
    ];
    const cooldown: Phase[] = [
      {
        name: 'Respiration',
        duration_seconds: 90,
        description: 'Retour au calme',
      },
    ];

    expect(buildTimerSteps(exercises, warmup, cooldown)).toMatchObject([
      { type: 'warmup', durationSeconds: 120 },
      { type: 'exercise', title: 'Shadow boxing', durationSeconds: 180 },
      { type: 'rest', durationSeconds: 45 },
      { type: 'exercise', title: 'Pompes', durationSeconds: null },
      { type: 'rest', durationSeconds: 60 },
      { type: 'cooldown', durationSeconds: 90 },
    ]);
  });
});
