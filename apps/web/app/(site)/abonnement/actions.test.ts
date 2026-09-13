import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  checkout: vi.fn(),
  portal: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth, signIn: mocks.signIn }));
vi.mock('@/lib/server-api', () => ({
  serverApi: { createCheckout: mocks.checkout, createBillingPortal: mocks.portal },
}));
import { connectBillingGoogle, openBilling } from './actions';
describe('actions abonnement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: 'test@alcide.invalid' } });
  });
  it('ouvre Google directement avec le bon retour', async () => {
    await connectBillingGoogle();
    expect(mocks.signIn).toHaveBeenCalledWith('google', { redirectTo: '/abonnement' });
  });
  it.each([null, { user: { authMethod: 'jury' } }, { user: { authMethod: 'beta' } }])(
    'refuse une session non commerciale',
    async (session) => {
      mocks.auth.mockResolvedValue(session);
      expect((await openBilling('checkout')).error).toContain('Google');
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );
  it('refuse une action inconnue même après connexion', async () => {
    expect((await openBilling('invalid' as 'checkout')).error).toBe('Action invalide.');
  });
  it('délègue Checkout et le portail uniquement au serveur', async () => {
    mocks.checkout.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    mocks.portal.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
    expect(await openBilling('checkout')).toEqual({ url: 'https://checkout.stripe.com/test' });
    expect(await openBilling('portal')).toEqual({ url: 'https://billing.stripe.com/test' });
  });
  it('ne révèle pas les détails des erreurs du serveur', async () => {
    mocks.checkout.mockRejectedValue(new Error('private service detail'));
    const result = await openBilling('checkout');
    expect(result.error).toContain('indisponible');
    expect(result.error).not.toContain('private');
  });
});
