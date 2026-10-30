import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { Context } from 'hono';
import Stripe from 'stripe';
import { handleError } from '../src/middleware/error.middleware.js';
vi.mock('../src/middleware/auth.middleware.js', () => ({
  authMiddleware: async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.req.header('test-user')) return ctx.json({ error: 'unauthorized' }, 401);
    const mode = ctx.req.header('test-mode');
    ctx.set('auth', {
      userId: ctx.req.header('test-user')!,
      email: 'test@alcide.invalid',
      accessMode: mode === 'jury' || mode === 'beta' ? mode : 'standard',
      mustChangePassword: false,
      generationBalance: null,
    });
    await next();
  },
}));
vi.mock('../src/middleware/rate-limit.middleware.js', () => ({
  rateLimitMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
}));
vi.mock('../src/repositories/billing.repository.js', () => ({ readBillingStatus: vi.fn() }));
vi.mock('../src/services/billing.service.js', () => ({
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
  syncCheckout: vi.fn(),
  handleStripeEvent: vi.fn(),
}));
import { billingRouter } from '../src/routes/billing.routes.js';
import {
  createCheckout,
  createPortal,
  handleStripeEvent,
} from '../src/services/billing.service.js';

const app = new Hono();
app.onError(handleError);
app.route('/billing', billingRouter);
describe('API de facturation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
  });
  it('refuse les utilisateurs anonymes, jury et bêta', async () => {
    expect((await app.request('/billing/checkout', { method: 'POST' })).status).toBe(401);
    for (const mode of ['jury', 'beta'])
      expect(
        (
          await app.request('/billing/checkout', {
            method: 'POST',
            headers: { 'test-user': 'user', 'test-mode': mode },
          })
        ).status,
      ).toBe(403);
    expect(createCheckout).not.toHaveBeenCalled();
  });
  it('utilise uniquement l’identité serveur pour Checkout et le portail', async () => {
    vi.mocked(createCheckout).mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    vi.mocked(createPortal).mockResolvedValue({ url: 'https://billing.stripe.com/test' });
    await app.request('/billing/checkout', {
      method: 'POST',
      headers: { 'test-user': 'owner' },
      body: JSON.stringify({ userId: 'attacker', priceId: 'evil' }),
    });
    await app.request('/billing/portal', {
      method: 'POST',
      headers: { 'test-user': 'owner' },
      body: JSON.stringify({ customerId: 'other' }),
    });
    expect(createCheckout).toHaveBeenCalledWith('owner', 'test@alcide.invalid');
    expect(createPortal).toHaveBeenCalledWith('owner');
  });
  it('vérifie la signature sur le corps brut sans connexion Google', async () => {
    const payload = JSON.stringify({
      id: 'evt_test',
      type: 'invoice.paid',
      livemode: false,
      data: { object: { id: 'in_test' } },
    });
    const stripe = new Stripe('sk_test_fixture');
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_fixture',
    });
    expect(
      (
        await app.request('/billing/webhook', {
          method: 'POST',
          body: payload,
          headers: { 'stripe-signature': signature },
        })
      ).status,
    ).toBe(200);
    expect(handleStripeEvent).toHaveBeenCalledWith(JSON.parse(payload));
    expect(
      (
        await app.request('/billing/webhook', {
          method: 'POST',
          body: payload + ' ',
          headers: { 'stripe-signature': signature },
        })
      ).status,
    ).toBe(400);
    expect(handleStripeEvent).toHaveBeenCalledTimes(1);
  });
  it('refuse une clé réelle même sur une notification signée', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture');
    const response = await app.request('/billing/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid' },
    });
    expect(response.status).toBe(503);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });
});
