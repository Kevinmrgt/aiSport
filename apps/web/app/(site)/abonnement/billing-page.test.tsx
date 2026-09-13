import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BillingStatus } from '@alcide/shared';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), status: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth, signIn: vi.fn() }));
vi.mock('@/lib/server-api', () => ({
  serverApi: { getBillingStatus: mocks.status, syncCheckout: mocks.sync },
}));
vi.mock('@/components/BillingButton', () => ({
  BillingButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));
import SubscriptionPage from './page';
import PricingPage from '../tarifs/page';

const premium: BillingStatus = {
  plan: 'premium',
  subscriptionStatus: 'active',
  freeCredits: 3,
  premiumCredits: 30,
  remaining: 33,
  periodEnd: '2026-10-11T10:00:00.000Z',
  cancelAtPeriodEnd: false,
  canSubscribe: false,
  canManage: true,
  testMode: true,
};
async function show(query: { session_id?: string; checkout?: string } = {}) {
  render(await SubscriptionPage({ searchParams: Promise.resolve(query) }));
}
describe('page abonnement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: 'test@alcide.invalid' } });
    mocks.status.mockResolvedValue(premium);
    mocks.sync.mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);
  it('invite un visiteur à se connecter sans demander de données privées', async () => {
    mocks.auth.mockResolvedValue(null);
    await show();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeTruthy();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it.each(['jury', 'beta'])('préserve le parcours %s sans facturation', async (authMethod) => {
    mocks.auth.mockResolvedValue({ user: { authMethod } });
    await show();
    expect(screen.getByText(/conserve son quota actuel/)).toBeTruthy();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it('affiche les crédits payés, gratuits et la prochaine échéance', async () => {
    await show();
    expect(screen.getByText('33')).toBeTruthy();
    expect(screen.getByText(/prochain renouvellement le/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gérer mon abonnement' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Passer à Premium/ })).toBeNull();
  });
  it('affiche la résiliation sans annoncer de renouvellement', async () => {
    mocks.status.mockResolvedValue({ ...premium, cancelAtPeriodEnd: true });
    await show();
    expect(screen.getByText(/Résiliation programmée/)).toBeTruthy();
    expect(screen.queryByText(/prochain renouvellement/)).toBeNull();
  });
  it('affiche le solde gratuit épuisé et permet de souscrire', async () => {
    mocks.status.mockResolvedValue({
      ...premium,
      plan: 'free',
      subscriptionStatus: null,
      freeCredits: 0,
      premiumCredits: 0,
      remaining: 0,
      periodEnd: null,
      canSubscribe: true,
      canManage: false,
    });
    await show();
    expect(screen.getByText('Alcide Découverte')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Passer à Premium/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gérer mon abonnement' })).toBeNull();
  });
  it('explique un paiement interrompu et les erreurs de paiement', async () => {
    mocks.status.mockResolvedValue({ ...premium, subscriptionStatus: 'past_due', freeCredits: 1 });
    await show({ checkout: 'cancelled' });
    expect(screen.getByRole('alert').textContent).toContain('régulariser');
    expect(screen.getByRole('status').textContent).toContain('interrompu');
  });
  it('synchronise le retour Stripe puis annonce l’activation', async () => {
    await show({ session_id: 'cs_test_abc' });
    expect(mocks.sync).toHaveBeenCalledWith('cs_test_abc');
    expect(screen.getByRole('status').textContent).toContain('Premium est actif');
  });
  it('permet d’attendre si la synchronisation n’est pas encore disponible', async () => {
    mocks.sync.mockRejectedValue(new Error('timeout'));
    await show({ session_id: 'cs_test_abc' });
    expect(screen.getByRole('status').textContent).toContain('en cours');
  });
  it('ne transmet pas une session de retour invalide au serveur', async () => {
    await show({ session_id: 'invalid' });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('propose de réessayer si le statut est indisponible', async () => {
    mocks.status.mockRejectedValue(new Error('offline'));
    await show();
    expect(screen.getByRole('alert').textContent).toContain('indisponible');
    expect(screen.getByRole('link', { name: 'Réessayer' })).toBeTruthy();
  });
  it('présente les conditions et les crédits sur la page publique', () => {
    render(<PricingPage />);
    expect(screen.getByText(/Choisissez votre rythme/)).toBeTruthy();
    expect(screen.getByText(/sans report/)).toBeTruthy();
  });
});
