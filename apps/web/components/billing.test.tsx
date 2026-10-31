import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationQuotaNotice } from './GenerationQuotaNotice';
import { ProgramForm } from './ProgramForm';
import { BillingOffers } from './BillingOffers';
vi.mock('./useFormReady', () => ({ useFormReady: () => true }));

describe('offres et crédits', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => {
    // Vitest globals are disabled, so Testing Library cannot register auto-cleanup.
    // Await React's pending work before jsdom removes window for this test file.
    await act(() => Promise.resolve(cleanup()));
  });
  it('affiche les deux offres avec les composants existants', () => {
    const { container } = render(<BillingOffers />);
    expect(screen.getByText('5 €')).toBeTruthy();
    expect(container.querySelectorAll('.glass-panel').length).toBe(2);
    expect(screen.getByText('Découverte')).toBeTruthy();
  });
  it('explique le coût et donne accès à l’abonnement en cas de solde insuffisant', () => {
    render(
      <GenerationQuotaNotice
        quota={{
          mode: 'standard',
          plan: 'free',
          limited: true,
          remaining: 3,
          limit: null,
          used: 0,
        }}
        cost={4}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('4 crédits');
    expect(screen.getByRole('link', { name: 'Voir mon abonnement' }).getAttribute('href')).toBe(
      '/abonnement',
    );
    expect(screen.queryByText(/Acces jury/)).toBeNull();
  });
  it('propose deux semaines au pilote et exige deux crédits standard', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ProgramForm
        onSubmit={onSubmit}
        generationQuota={{
          mode: 'standard',
          plan: 'free',
          limited: true,
          remaining: 1,
          limit: null,
          used: 0,
        }}
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /Crédits insuffisants/ }).disabled,
    ).toBe(true);
    const weeks = document.querySelector<HTMLSelectElement>('select[name="weeks_count"]')!;
    expect(weeks.value).toBe('2');
    expect(Array.from(weeks.options, (option) => option.value)).toEqual(['2']);
    rerender(
      <ProgramForm
        onSubmit={onSubmit}
        generationQuota={{
          mode: 'standard',
          plan: 'free',
          limited: true,
          remaining: 2,
          limit: null,
          used: 0,
        }}
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /Générer le programme/ }).disabled,
    ).toBe(false);
  });
});
