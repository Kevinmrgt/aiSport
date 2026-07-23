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
        costEstimate={{
          modelLabel: 'GPT-5.4 mini',
          inputTokens: 1_200,
          outputTokens: 1_800,
          totalUsdLabel: '$0.009',
        }}
        generationQuota={unlimitedQuota}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Construire le training' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('form', { name: 'Construire le training' })).toBeTruthy();
  });

  it('expose le titre du formulaire de programme au niveau 2', () => {
    render(
      <ProgramForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        generationQuota={unlimitedQuota}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Construire la progression' }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('form', { name: 'Construire la progression' })).toBeTruthy();
  });
});
