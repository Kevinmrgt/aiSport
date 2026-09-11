import type Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { BILLING_OFFER } from '@alcide/shared';
import { billingReturnUrl, premiumPriceId, stripeClient, stripeId } from '../lib/stripe.js';
import { AppError } from '../types/app-error.js';
import {
  withBillingAccount,
  findBillingUser,
  type BillingTransaction,
} from '../repositories/billing.repository.js';

const CLOSED = new Set(['canceled', 'incomplete_expired']);

async function validatePrice(stripe: Stripe): Promise<string> {
  const price = await stripe.prices.retrieve(premiumPriceId());
  if (
    price.livemode ||
    !price.active ||
    price.unit_amount !== BILLING_OFFER.monthlyPriceCents ||
    price.currency !== 'eur' ||
    price.recurring?.interval !== 'month' ||
    price.recurring.interval_count !== 1 ||
    price.tax_behavior !== 'inclusive'
  ) {
    throw AppError.serviceUnavailable('Le tarif de test Premium doit être de 9,99 € TTC par mois.');
  }
  return price.id;
}

export async function createCheckout(userId: string, email: string): Promise<{ url: string }> {
  const stripe = stripeClient();
  const price = await validatePrice(stripe);
  return withBillingAccount(userId, async (tx, account) => {
    let customer = account.stripe_customer_id;
    if (!customer) {
      const created = await stripe.customers.create(
        { email, metadata: { alcide_user_id: userId } },
        { idempotencyKey: `alcide-customer-v1-${userId}` },
      );
      customer = created.id;
      await tx.execute(
        sql`UPDATE billing_accounts SET stripe_customer_id=${customer} WHERE user_id=${userId}::uuid`,
      );
    }
    // Query Stripe, not just the local webhook cache, to prevent duplicate subscriptions.
    for await (const subscription of stripe.subscriptions.list({
      customer,
      status: 'all',
      limit: 100,
    })) {
      if (!CLOSED.has(subscription.status))
        throw new AppError(
          409,
          'SUBSCRIPTION_EXISTS',
          'Un abonnement existe déjà. Utilisez « Gérer mon abonnement ».',
        );
    }
    const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 100 });
    const existing = open.data.find(
      (session) =>
        session.mode === 'subscription' &&
        session.client_reference_id === userId &&
        session.metadata?.['alcide_offer'] === 'premium-v1',
    );
    if (existing?.url) return { url: existing.url };
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer,
        client_reference_id: userId,
        locale: 'fr',
        line_items: [{ price, quantity: 1 }],
        payment_method_types: ['card'],
        metadata: { alcide_offer: 'premium-v1' },
        subscription_data: { metadata: { alcide_user_id: userId } },
        success_url: `${billingReturnUrl()}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${billingReturnUrl()}?checkout=cancelled`,
      },
      { idempotencyKey: `alcide-checkout-${userId}-${account.checkout_session_id ?? 'initial'}` },
    );
    if (!session.url) throw AppError.serviceUnavailable('Impossible d’ouvrir le paiement.');
    await tx.execute(
      sql`UPDATE billing_accounts SET checkout_session_id=${session.id} WHERE user_id=${userId}::uuid`,
    );
    return { url: session.url };
  });
}

export async function createPortal(userId: string): Promise<{ url: string }> {
  const stripe = stripeClient();
  return withBillingAccount(userId, async (_tx, account) => {
    if (!account.stripe_customer_id)
      throw AppError.badRequest('Aucun compte de facturation à gérer.');
    const configuration = process.env['STRIPE_PORTAL_CONFIGURATION_ID'];
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: billingReturnUrl(),
      ...(configuration ? { configuration } : {}),
      locale: 'fr',
    });
    return { url: session.url };
  });
}

async function reconcileSubscription(
  tx: BillingTransaction,
  stripe: Stripe,
  userId: string,
  customerId: string,
  subscriptionId: string,
  invoiceId?: string,
): Promise<void> {
  // Fetch inside the per-user lock: delayed and out-of-order events cannot restore stale access.
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (
    sub.livemode ||
    stripeId(sub.customer) !== customerId ||
    sub.metadata['alcide_user_id'] !== userId ||
    sub.items.data.length !== 1 ||
    !item ||
    item.price.id !== premiumPriceId() ||
    item.quantity !== 1
  ) {
    return;
  }
  // The portal can schedule cancel_at without setting cancel_at_period_end.
  const cancellationScheduled =
    sub.cancel_at_period_end || (sub.cancel_at != null && sub.cancel_at <= item.current_period_end);
  await tx.execute(sql`INSERT INTO billing_subscriptions(id,user_id,status,period_end,cancel_at_period_end)
    VALUES (${sub.id},${userId}::uuid,${sub.status},${new Date(item.current_period_end * 1000).toISOString()}::timestamptz,${cancellationScheduled})
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,period_end=excluded.period_end,
      cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()`);
  const invoiceIds = new Set(
    [invoiceId, stripeId(sub.latest_invoice)].filter((id): id is string => Boolean(id)),
  );
  for (const id of invoiceIds) {
    const invoice = await stripe.invoices.retrieve(id);
    if (
      invoice.livemode ||
      invoice.status !== 'paid' ||
      stripeId(invoice.customer) !== customerId ||
      stripeId(invoice.parent?.subscription_details?.subscription) !== sub.id ||
      !['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason ?? '')
    )
      continue;
    for await (const line of stripe.invoices.listLineItems(id, { limit: 100 })) {
      if (
        stripeId(line.pricing?.price_details?.price) !== premiumPriceId() ||
        line.parent?.subscription_item_details?.proration ||
        line.period.end <= line.period.start
      )
        continue;
      await tx.execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,subscription_id,amount,remaining,starts_at,expires_at)
        VALUES (${userId}::uuid,${`premium:${sub.id}:${line.period.start}`},${sub.id},${BILLING_OFFER.premiumCredits},${BILLING_OFFER.premiumCredits},
          ${new Date(line.period.start * 1000).toISOString()}::timestamptz,${new Date(line.period.end * 1000).toISOString()}::timestamptz)
        ON CONFLICT(source_key) DO NOTHING`);
    }
  }
}

export async function syncCheckout(userId: string, sessionId: string): Promise<void> {
  const stripe = stripeClient();
  return withBillingAccount(userId, async (tx, account) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.livemode ||
      session.client_reference_id !== userId ||
      stripeId(session.customer) !== account.stripe_customer_id
    ) {
      throw AppError.forbidden('Cette session de paiement ne vous appartient pas.');
    }
    const sub = stripeId(session.subscription);
    if (session.status === 'complete' && sub && account.stripe_customer_id) {
      await reconcileSubscription(tx, stripe, userId, account.stripe_customer_id, sub);
    }
  });
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.livemode)
    throw AppError.badRequest('Seuls les événements Stripe de test sont acceptés.');
  let customerId: string | null = null,
    subscriptionId: string | null = null,
    invoiceId: string | undefined;
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    customerId = stripeId(sub.customer);
    subscriptionId = sub.id;
  } else if (
    ['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(
      event.type,
    )
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    customerId = stripeId(invoice.customer);
    subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription);
    invoiceId = invoice.id;
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    customerId = stripeId(session.customer);
    subscriptionId = stripeId(session.subscription);
  } else return;
  if (!customerId || !subscriptionId) return;
  const userId = await findBillingUser(customerId);
  if (!userId) return;
  const stripe = stripeClient();
  const customer = customerId,
    subscription = subscriptionId;
  await withBillingAccount(userId, async (tx) => {
    const processed = await tx.execute(
      sql`INSERT INTO billing_webhook_events(id) VALUES (${event.id}) ON CONFLICT DO NOTHING RETURNING id`,
    );
    if (!processed.rows.length) return;
    await reconcileSubscription(tx, stripe, userId, customer, subscription, invoiceId);
  });
}
