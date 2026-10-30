import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationQuotaNotice } from './GenerationQuotaNotice';
import { ProgramForm } from './ProgramForm';
import { BillingOffers } from './BillingOffers';
vi.mock('./useFormReady', () => ({ useFormReady: () => true }));

describe('offres et crédits', () => {
  beforeEach(() => vi.clearAllMocks());
  it('affiche les deux offres avec les composants existants', () => {
    const { container } = render(<BillingOffers />);
    expect(screen.getByText('9,99 €')).toBeTruthy();
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
  it('bloque un programme lorsque les semaines dépassent le solde même non nul', () => {
    render(
      <ProgramForm
        onSubmit={vi.fn()}
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
      screen.getByRole<HTMLButtonElement>('button', { name: /Crédits insuffisants/ }).disabled,
    ).toBe(true);
    const weeks = document.querySelector('select[name="weeks_count"]')!;
    fireEvent.change(weeks, { target: { value: '2' } });
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /Générer le programme/ }).disabled,
    ).toBe(false);
  });
});
