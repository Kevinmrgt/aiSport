import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProgramForm } from './ProgramForm';
import { WorkoutForm } from './WorkoutForm';

const unlimitedQuota = { limited: false, limit: null, used: 0, remaining: null } as const;

describe('RNCP accessibilite - hierarchie des formulaires de generation', () => {
  afterEach(cleanup);

  it('expose le titre du formulaire de seance au niveau 2', () => {
    render(
      <WorkoutForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        generationQuota={unlimitedQuota}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Personnaliser la séance' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('form', { name: 'Personnaliser la séance' })).toBeTruthy();
  });

  it('expose le titre du formulaire de programme au niveau 2', () => {
    render(
      <ProgramForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        generationQuota={unlimitedQuota}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Personnaliser le programme' }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('form', { name: 'Personnaliser le programme' })).toBeTruthy();
  });
});
