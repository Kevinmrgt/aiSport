import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BetaAdminPanel } from './BetaAdminPanel';

const tester = {
  userId: '11111111-1111-4111-8111-111111111111',
  name: 'Bêta Test',
  email: 'beta@example.com',
  active: true,
  generationBalance: 4,
  mustChangePassword: false,
  createdAt: '2026-09-10T00:00:00.000Z',
};

function renderPanel(deleteBetaTester = vi.fn().mockResolvedValue({ data: { ok: true } })) {
  render(<BetaAdminPanel
    initialBetaTesters={[tester]}
    createBetaTester={vi.fn()}
    adjustCredits={vi.fn()}
    setStatus={vi.fn()}
    resetPassword={vi.fn()}
    deleteBetaTester={deleteBetaTester}
  />);
  return deleteBetaTester;
}

describe('BetaAdminPanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('demande confirmation avant de supprimer l’accès bêta', () => {
    const deleteBetaTester = renderPanel();
    vi.stubGlobal('confirm', vi.fn(() => false));

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('beta@example.com'));
    expect(deleteBetaTester).not.toHaveBeenCalled();
    expect(screen.getByText('beta@example.com')).toBeTruthy();
  });

  it('retire le testeur après confirmation et affiche une erreur si la suppression échoue', async () => {
    const deleteBetaTester = renderPanel(vi.fn()
      .mockResolvedValueOnce({ error: 'Suppression impossible.' })
      .mockResolvedValueOnce({ data: { ok: true } }));
    vi.stubGlobal('confirm', vi.fn(() => true));

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(screen.getByText('Suppression impossible.')).toBeTruthy());
    expect(screen.getByText('beta@example.com')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(deleteBetaTester).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('beta@example.com')).toBeNull();
    expect(screen.getByText('L’accès bêta de beta@example.com a été supprimé.')).toBeTruthy();
  });
});
