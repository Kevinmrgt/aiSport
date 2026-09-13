import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({
  path: '/admin',
  refresh: vi.fn(),
  action: vi.fn<
    (
      operation: string,
      form: FormData,
    ) => Promise<{
      success?: boolean;
      temporaryPassword?: string;
      userId?: string;
      error?: string;
    }>
  >(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.path,
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/app/(administration)/admin/actions', () => ({ performAdminAction: mocks.action }));
import { AdminShell } from './AdminShell';
import { AdminActionForm, ReasonField } from './AdminActionForm';
import { Pagination, readAdminQuery } from './AdminPrimitives';
describe('espace administration', () => {
  beforeEach(() => {
    mocks.path = '/admin';
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('expose des liens distincts et identifie la page active', () => {
    mocks.path = '/admin/membres/123';
    render(
      <AdminShell email="admin@example.com" signOutAction={async () => {}}>
        <h1>Fiche membre</h1>
      </AdminShell>,
    );
    expect(
      screen.getAllByRole('link', { name: 'Tous les membres' })[0]?.getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.getAllByRole('link', { name: 'Statistiques' })[0]?.getAttribute('href')).toBe(
      '/admin/statistiques',
    );
    expect(screen.getByRole('main')).toBeTruthy();
  });
  it('conserve les filtres dans les liens de pagination', () => {
    render(
      <Pagination
        path="/admin/membres"
        query={{ page: 2, q: 'Élodie', beta: 'active' }}
        result={{ total: 60, page: 2, pageSize: 25 }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Suivant' }).getAttribute('href')).toBe(
      '/admin/membres?page=3&q=%C3%89lodie&beta=active',
    );
  });
  it('traite les filtres vides et les dates incohérentes', async () => {
    expect((await readAdminQuery(Promise.resolve({ q: '', beta: '' }))).success).toBe(true);
    expect(
      (await readAdminQuery(Promise.resolve({ from: '2026-09-11', to: '2026-01-01' }))).success,
    ).toBe(false);
  });
  it('réutilise la référence après une réponse perdue et confirme le succès', async () => {
    mocks.action
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ success: true });
    render(
      <AdminActionForm
        operation="credits.grant"
        hidden={{ userId: 'member' }}
        label="Offrir"
        successMessage="Crédits ajoutés"
      >
        <input name="amount" defaultValue="5" />
        <ReasonField />
      </AdminActionForm>,
    );
    fireEvent.change(screen.getByLabelText('Motif'), { target: { value: 'Geste de test' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Offrir' }).closest('form')!);
    await screen.findByRole('alert');
    const first = mocks.action.mock.calls[0]![1].get('requestId');
    fireEvent.submit(screen.getByRole('button', { name: 'Offrir' }).closest('form')!);
    await screen.findByText('Crédits ajoutés');
    expect(mocks.action.mock.calls[1]![1].get('requestId')).toBe(first);
  });
  it('ne soumet pas une action destructive annulée', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <AdminActionForm
        operation="beta.delete"
        label="Retirer"
        confirm="Confirmer ?"
        successMessage="Retiré"
      />,
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Retirer' }).closest('form')!);
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it('affiche le mot de passe temporaire uniquement après création', async () => {
    mocks.action.mockResolvedValue({
      success: true,
      temporaryPassword: 'temporary-test-only',
      userId: 'member',
    });
    render(<AdminActionForm operation="beta.create" label="Créer" successMessage="Accès créé" />);
    expect(screen.queryByText('temporary-test-only')).toBeNull();
    fireEvent.submit(screen.getByRole('button', { name: 'Créer' }).closest('form')!);
    await waitFor(() => expect(screen.getByText('temporary-test-only')).toBeTruthy());
  });
});
