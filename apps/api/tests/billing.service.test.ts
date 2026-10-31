import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type * as StripeLibrary from '../src/lib/stripe.js';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { BILLING_OFFER } from '@alcide/shared';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  account: { user_id: 'user', stripe_customer_id: 'cus_test', checkout_session_id: 'cs_old' },
  findUser: vi.fn(),
  retrieveSubscription: vi.fn(),
  retrieveInvoice: vi.fn(),
  retrieveSession: vi.fn(),
  createSession: vi.fn(),
  listSubscriptions: vi.fn(),
  listSessions: vi.fn(),
  retrievePrice: vi.fn(),
  listLines: vi.fn(),
  createPortal: vi.fn(),
}));
vi.mock('../src/repositories/billing.repository.js', () => ({
  findBillingUser: mocks.findUser,
  withBillingAccount: (_id: string, callback: (tx: unknown, account: unknown) => unknown) =>
    callback({ execute: mocks.execute }, mocks.account),
}));
vi.mock('../src/lib/stripe.js', async (importOriginal) => ({
  ...(await importOriginal<typeof StripeLibrary>()),
  stripeClient: () => ({
    subscriptions: { retrieve: mocks.retrieveSubscription, list: mocks.listSubscriptions },
    invoices: { retrieve: mocks.retrieveInvoice, listLineItems: mocks.listLines },
    checkout: {
      sessions: {
        retrieve: mocks.retrieveSession,
        list: mocks.listSessions,
        create: mocks.createSession,
      },
    },
    prices: { retrieve: mocks.retrievePrice },
    billingPortal: { sessions: { create: mocks.createPortal } },
  }),
}));
import {
  createCheckout,
  createPortal,
  handleStripeEvent,
  syncCheckout,
} from '../src/services/billing.service.js';

const event = (id = 'evt_1') =>
  ({
    id,
    type: 'invoice.paid',
    livemode: false,
    data: {
      object: {
        id: 'in_paid',
        customer: 'cus_test',
        parent: { subscription_details: { subscription: 'sub_test' } },
      },
    },
  }) as unknown as Stripe.Event;
const subscription = (status = 'active') => ({
  id: 'sub_test',
  status,
  customer: 'cus_test',
  livemode: false,
  metadata: { alcide_user_id: 'user' },
  items: { data: [{ quantity: 1, price: { id: 'price_test' }, current_period_end: 1900000000 }] },
  latest_invoice: 'in_paid',
  cancel_at_period_end: false,
});
async function* iterable(values: unknown[]) {
  for (const value of values) yield await Promise.resolve(value);
}

describe('synchronisation Stripe', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', 'true');
    vi.stubEnv('STRIPE_PREMIUM_MONTHLY_PRICE_ID', 'price_test');
    mocks.execute.mockResolvedValue({ rows: [{ id: 'evt_1' }] });
    mocks.findUser.mockResolvedValue('user');
    mocks.retrieveSubscription.mockResolvedValue(subscription());
    mocks.retrieveInvoice.mockResolvedValue({
      id: 'in_paid',
      status: 'paid',
      currency: 'eur',
      livemode: false,
      customer: 'cus_test',
      billing_reason: 'subscription_cycle',
      parent: { subscription_details: { subscription: 'sub_test' } },
    });
    mocks.listLines.mockImplementation(() =>
      iterable([
        {
          pricing: { price_details: { price: 'price_test' } },
          period: { start: 1890000000, end: 1900000000 },
          parent: { subscription_item_details: { proration: false } },
        },
      ]),
    );
    mocks.retrievePrice.mockResolvedValue({
      id: 'price_test',
      livemode: false,
      active: true,
      unit_amount: BILLING_OFFER.monthlyPriceCents,
      currency: 'eur',
      tax_behavior: 'inclusive',
      recurring: { interval: 'month', interval_count: 1 },
    });
    mocks.listSubscriptions.mockImplementation(() => iterable([]));
    mocks.listSessions.mockResolvedValue({ data: [] });
    mocks.createSession.mockResolvedValue({ id: 'cs_new', url: 'https://checkout.stripe.com/new' });
  });
  it('synchronise un statut TEST sans attribuer de crédits, même pour une facture payée', async () => {
    await handleStripeEvent(event());
    expect(mocks.retrieveInvoice).not.toHaveBeenCalled();
    expect(mocks.listLines).not.toHaveBeenCalled();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const statements = mocks.execute.mock.calls.map(
      ([query]) => new PgDialect().sqlToQuery(query as SQL).sql,
    );
    expect(statements.some((query) => query.includes('INSERT INTO billing_credit_grants'))).toBe(
      false,
    );
  });
  it('reconnaît la résiliation par date du portail sans cancel_at_period_end', async () => {
    mocks.retrieveSubscription.mockResolvedValue({ ...subscription(), cancel_at: 1900000000 });
    await handleStripeEvent(event());
    const update = mocks.execute.mock.calls[1]?.[0] as SQL;
    expect(new PgDialect().sqlToQuery(update).params).toContain(true);
  });
  it('ignore un webhook déjà traité', async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [] });
    await handleStripeEvent(event());
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled();
  });
  it('relit l’abonnement courant, même si un ancien événement annonce un paiement', async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription('canceled'));
    await handleStripeEvent(event());
    expect(mocks.retrieveSubscription).toHaveBeenCalledWith('sub_test');
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
  it('refuse les événements réels et les retours Checkout d’un autre compte', async () => {
    await expect(handleStripeEvent({ ...event(), livemode: true })).rejects.toMatchObject({
      statusCode: 400,
    });
    mocks.retrieveSession.mockResolvedValue({
      customer: 'cus_other',
      client_reference_id: 'other',
      livemode: false,
    });
    await expect(syncCheckout('user', 'cs_test_other')).rejects.toMatchObject({ statusCode: 403 });
  });
  it('refuse un deuxième abonnement malgré un cache local en retard', async () => {
    mocks.listSubscriptions.mockImplementation(() => iterable([subscription()]));
    await expect(createCheckout('user', 'test@alcide.invalid')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it('réutilise une session ouverte et lie une nouvelle tentative à la précédente', async () => {
    mocks.listSessions.mockResolvedValueOnce({
      data: [
        {
          mode: 'subscription',
          client_reference_id: 'user',
          metadata: { alcide_offer: 'premium-v1' },
          url: 'https://checkout.stripe.com/open',
        },
      ],
    });
    expect(await createCheckout('user', 'test@alcide.invalid')).toEqual({
      url: 'https://checkout.stripe.com/open',
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
    await createCheckout('user', 'test@alcide.invalid');
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test',
        line_items: [{ price: 'price_test', quantity: 1 }],
      }),
      { idempotencyKey: 'alcide-checkout-user-cs_old' },
    );
  });
  it.each([
    ['development', ''],
    ['production', 'true'],
    ['test', 'true'],
    ['', 'true'],
  ])('ferme les services sans appeler Stripe (%s, flag=%s)', async (environment, flag) => {
    vi.stubEnv('NODE_ENV', environment);
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', flag);
    for (const operation of [
      () => createCheckout('user', 'test@alcide.invalid'),
      () => createPortal('user'),
      () => syncCheckout('user', 'cs_test_paid'),
    ])
      await expect(operation()).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.retrievePrice).not.toHaveBeenCalled();
    expect(mocks.retrieveSession).not.toHaveBeenCalled();
    expect(mocks.createPortal).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('acquitte un webhook retardé lorsque fermé, sans réseau ni grant', async () => {
    vi.stubEnv('STRIPE_TEST_SIMULATION_ENABLED', '');
    await handleStripeEvent(event());
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled();
    expect(mocks.retrieveInvoice).not.toHaveBeenCalled();
  });
  it('synchronise le retour TEST complet sans accorder de droits réels', async () => {
    mocks.retrieveSession.mockResolvedValue({
      livemode: false,
      client_reference_id: 'user',
      customer: 'cus_test',
      status: 'complete',
      subscription: 'sub_test',
    });
    await syncCheckout('user', 'cs_test_paid');
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.retrieveSubscription).toHaveBeenCalledWith('sub_test');
    expect(mocks.retrieveInvoice).not.toHaveBeenCalled();
  });
});
