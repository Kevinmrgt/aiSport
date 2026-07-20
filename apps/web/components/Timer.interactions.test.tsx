import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Exercise } from '@alcide/shared';
import { Timer } from './Timer';

describe('Timer - interactions', () => {
  afterEach(cleanup);

  it('termine explicitement un exercice sans duree', () => {
    const exercises: Exercise[] = [
      {
        name: 'Pompes',
        description: 'Trois series',
        sets: 3,
        reps: '10',
        rest_seconds: 0,
      },
    ];
    render(<Timer exercises={exercises} />);

    expect(screen.getByText('Pompes')).toBeTruthy();
    expect(screen.getByText('manuel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByText('Seance terminee')).toBeTruthy();
  });

  it('demarre un chrono en plein ecran puis le quitte avec Echap', () => {
    const exercises: Exercise[] = [
      {
        name: 'Sprint',
        description: 'Vite',
        duration_seconds: 30,
        rest_seconds: 0,
      },
    ];
    render(<Timer exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: 'Demarrer' }));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
