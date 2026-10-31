import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  incidents: vi.fn(),
  action: vi.fn<(operation: string, form: FormData) => Promise<{ success: boolean }>>(),
}));
vi.mock('@/lib/admin-api', () => ({ adminApi: { incidents: mocks.incidents } }));
vi.mock('@/app/(administration)/admin/actions', () => ({ performAdminAction: mocks.action }));
import IncidentsPage from './page';
const incident = {
  id: '11111111-1111-4111-8111-111111111111',
  fingerprint: 'fixed',
  source: 'web',
  severity: 'error',
  code: 'WEB_REACT_BOUNDARY',
  route: '/workouts/:id',
  method: 'CLIENT',
  statusCode: null,
  lastRequestId: null,
  occurrenceCount: 3,
  firstSeenAt: '2026-10-31T10:00:00Z',
  lastSeenAt: '2026-10-31T11:00:00Z',
  status: 'new',
};
const params = (query: Record<string, string | string[] | undefined> = {}) => ({
  searchParams: Promise.resolve(query),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.incidents.mockResolvedValue({ items: [incident], page: 1, pageSize: 20, total: 21 });
  mocks.action.mockResolvedValue({ success: true });
});
afterEach(cleanup);
describe('journal des incidents', () => {
  it('présente les groupes, dates, filtres nommés, limites de collecte et pagination', async () => {
    render(
      await IncidentsPage(
        params({ source: 'web', severity: 'error', status: 'new', from: '2026-10-01' }),
      ),
    );
    expect(mocks.incidents).toHaveBeenCalledWith({
      page: 1,
      source: 'web',
      severity: 'error',
      status: 'new',
      from: '2026-10-01',
    });
    expect(screen.getByRole('heading', { name: 'Erreurs et incidents' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Incidents regroupés' })).toBeTruthy();
    expect(screen.getByText('L’affichage d’une page a été interrompu.')).toBeTruthy();
    expect(screen.getByText(/historique antérieur/)).toBeTruthy();
    expect(screen.getByLabelText('Origine')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Origine' })).toBeTruthy();
    expect(screen.getByLabelText('Gravité')).toBeTruthy();
    expect(screen.getByLabelText('Du')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Suivant' }).getAttribute('href')).toContain(
      'source=web',
    );
  });
  it('envoie une modification de statut et annonce sa réussite', async () => {
    render(await IncidentsPage(params()));
    fireEvent.change(screen.getByLabelText('Statut de l’incident WEB_REACT_BOUNDARY'), {
      target: { value: 'in_progress' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le statut' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Statut de l’incident enregistré.'),
    );
    const [operation, form] = mocks.action.mock.calls[0]!;
    expect(operation).toBe('incident.status');
    expect(form.get('incidentId')).toBe(incident.id);
    expect(form.get('status')).toBe('in_progress');
  });
  it.each([
    { source: 'private' },
    { page: '0' },
    { from: '2026-02-30' },
    { from: '2026-10-31', to: '2026-10-01' },
    { severity: ['error', 'critical'] },
    { unknown: 'value' },
  ])('refuse les filtres invalides %j avant lecture', async (query) => {
    render(await IncidentsPage(params(query)));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(mocks.incidents).not.toHaveBeenCalled();
  });
  it('distingue le journal vide d’une recherche vide et relaie une panne', async () => {
    mocks.incidents.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    render(await IncidentsPage(params()));
    expect(screen.getByText('Aucun incident enregistré')).toBeTruthy();
    cleanup();
    render(await IncidentsPage(params({ q: 'CODE' })));
    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    mocks.incidents.mockRejectedValue(new Error('unavailable'));
    await expect(IncidentsPage(params())).rejects.toThrow('unavailable');
  });
});
