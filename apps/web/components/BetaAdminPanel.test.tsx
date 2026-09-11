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

const overview = {
  stats: {
    totalUsers: 3,
    betaTesterCount: 1,
    activeBetaTesterCount: 1,
    pendingPasswordChangeCount: 0,
    availableGenerations: 4,
    workoutCount: 12,
    programCount: 2,
    completedSessionCount: 8,
    newUsersLast30Days: 1,
  },
  settings: {
    defaultAiModel: 'gpt-5.4-mini',
    defaultBetaGenerationBalance: 10,
  },
  availableModels: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
    { id: 'gpt-5.4', label: 'GPT-5.4' },
  ],
};

function renderPanel(
  deleteBetaTester = vi.fn().mockResolvedValue({ data: { ok: true } }),
  savePlatformSettings = vi.fn().mockResolvedValue({ data: { settings: overview.settings } }),
) {
  render(<BetaAdminPanel
    initialBetaTesters={[tester]}
    overview={overview}
    createBetaTester={vi.fn()}
    adjustCredits={vi.fn()}
    setStatus={vi.fn()}
    resetPassword={vi.fn()}
    deleteBetaTester={deleteBetaTester}
    savePlatformSettings={savePlatformSettings}
  />);
  return { deleteBetaTester, savePlatformSettings };
}

describe('BetaAdminPanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('demande confirmation avant de supprimer l’accès bêta', () => {
    const { deleteBetaTester } = renderPanel();
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmMock);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('beta@example.com'));
    expect(deleteBetaTester).not.toHaveBeenCalled();
    expect(screen.getByText('beta@example.com')).toBeTruthy();
  });

  it('retire le testeur après confirmation et affiche une erreur si la suppression échoue', async () => {
    const { deleteBetaTester } = renderPanel(vi.fn()
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

  it('enregistre le modèle IA et le crédit bêta par défaut', async () => {
    const { savePlatformSettings } = renderPanel();

    fireEvent.change(screen.getByLabelText('Modèle IA par défaut'), { target: { value: 'gpt-5.4' } });
    fireEvent.change(screen.getByLabelText('Générations à l’ouverture d’un compte bêta'), { target: { value: '25' } });
    const form = screen.getByLabelText('Modèle IA par défaut').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(savePlatformSettings).toHaveBeenCalledWith({
      defaultAiModel: 'gpt-5.4',
      defaultBetaGenerationBalance: 25,
    }));
    expect(screen.getByText('Les réglages de la plateforme ont été enregistrés.')).toBeTruthy();
  });
});
