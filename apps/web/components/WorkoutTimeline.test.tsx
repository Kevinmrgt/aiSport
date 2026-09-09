import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Exercise, Phase } from '@alcide/shared';
import { WorkoutTimeline } from './WorkoutTimeline';

describe('WorkoutTimeline', () => {
  afterEach(cleanup);

  it('ne rend rien quand la seance est vide', () => {
    const { container } = render(<WorkoutTimeline exercises={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('calcule le chrono et distingue les exercices libres', () => {
    const warmup: Phase[] = [
      { name: 'Mobilite', description: 'Articulations', duration_seconds: 60 },
    ];
    const exercises: Exercise[] = [
      {
        name: 'Course',
        description: 'Allure soutenue',
        duration_seconds: 125,
        rest_seconds: 35,
      },
      {
        name: 'Pompes',
        description: 'Au ressenti',
        sets: 3,
        reps: '10',
        rest_seconds: 0,
      },
    ];
    const cooldown: Phase[] = [
      { name: 'Respiration', description: 'Retour au calme', duration_seconds: 20 },
    ];

    render(<WorkoutTimeline exercises={exercises} warmup={warmup} cooldown={cooldown} />);

    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Timeline de 4min');
    expect(screen.getByTitle('Course - 2m5s')).toBeTruthy();
    expect(screen.getAllByText('2m5s').some((node) => node.closest('summary'))).toBe(true);
    expect(screen.getByText('3x10')).toBeTruthy();
    expect(screen.getByText('Libre')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Detail des exercices' }).children).toHaveLength(4);
  });
});
