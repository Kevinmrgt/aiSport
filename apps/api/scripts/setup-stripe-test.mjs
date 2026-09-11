// Creates/reuses only test-mode resources. Never logs credentials.
import Stripe from 'stripe';
import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';

const env = {
  ...parse(readFileSync(new URL('../../../.env.stripe.test', import.meta.url))),
  ...process.env,
};
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Test key required');
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-08-26.dahlia',
  timeout: 15000,
  maxNetworkRetries: 1,
});
try {
  const lookup = 'alcide_premium_monthly_eur_test_v1';
  const prices = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  let price = prices.data[0];
  if (!price) {
    const product = await stripe.products.create(
      {
        name: 'Alcide Premium',
        description: '30 crédits par mois. 1 séance = 1 crédit, 1 semaine de programme = 1 crédit.',
        metadata: { alcide_offer: 'premium-v1' },
      },
      { idempotencyKey: 'alcide-premium-product-test-v1' },
    );
    price = await stripe.prices.create(
      {
        product: product.id,
        currency: 'eur',
        unit_amount: 999,
        tax_behavior: 'inclusive',
        recurring: { interval: 'month' },
        lookup_key: lookup,
      },
      { idempotencyKey: 'alcide-premium-price-test-v1' },
    );
  }
  const configurations = await stripe.billingPortal.configurations.list({ limit: 100 });
  let portal = configurations.data.find((item) => item.metadata?.alcide_offer === 'premium-v1');
  if (!portal)
    portal = await stripe.billingPortal.configurations.create(
      {
        business_profile: { headline: 'Alcide · Gérez votre abonnement' },
        features: {
          customer_update: { enabled: true, allowed_updates: ['address', 'name'] },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: 'at_period_end' },
        },
        metadata: { alcide_offer: 'premium-v1' },
      },
      { idempotencyKey: 'alcide-premium-portal-test-v1' },
    );
  console.log(
    JSON.stringify({
      priceId: price.id,
      productId: price.product,
      portalConfigurationId: portal.id,
      testMode: !price.livemode,
      amount: price.unit_amount,
      currency: price.currency,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      type: error.type ?? 'Error',
      code: error.code ?? null,
      message: error.message,
    }),
  );
  process.exitCode = 1;
}
