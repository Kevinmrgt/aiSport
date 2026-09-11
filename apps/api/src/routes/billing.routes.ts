import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import { AppError } from '../types/app-error.js';
import { stripeClient } from '../lib/stripe.js';
import { readBillingStatus } from '../repositories/billing.repository.js';
import {
  createCheckout,
  createPortal,
  handleStripeEvent,
  syncCheckout,
} from '../services/billing.service.js';

export const billingRouter = new Hono();
// Public server-to-server endpoint: the Stripe signature is its authentication.
billingRouter.post('/webhook', async (ctx) => {
  const secret = process.env['STRIPE_WEBHOOK_SECRET'];
  if (!secret) throw AppError.serviceUnavailable('Webhook de test non configuré.');
  const body = await ctx.req.text();
  if (body.length > 1_000_000) throw AppError.badRequest('Événement trop volumineux.');
  const signature = ctx.req.header('stripe-signature');
  if (!signature) throw AppError.badRequest('Signature Stripe requise.');
  const stripe = stripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    throw AppError.badRequest('Signature Stripe invalide.');
  }
  await handleStripeEvent(event);
  return ctx.json({ received: true });
});

const protectedBilling = new Hono();
protectedBilling.use('*', authMiddleware);
protectedBilling.use('*', async (ctx, next) => {
  if (ctx.get('auth').accessMode !== 'standard')
    throw AppError.forbidden('Connectez-vous avec Google pour gérer un abonnement.');
  await next();
});
protectedBilling.get('/status', async (ctx) => {
  ctx.header('Cache-Control', 'no-store');
  return ctx.json(await readBillingStatus(ctx.get('auth').userId));
});
protectedBilling.post('/checkout', rateLimitMiddleware, async (ctx) => {
  const { userId, email } = ctx.get('auth');
  return ctx.json(await createCheckout(userId, email));
});
protectedBilling.post('/portal', rateLimitMiddleware, async (ctx) =>
  ctx.json(await createPortal(ctx.get('auth').userId)),
);
protectedBilling.post('/sync', rateLimitMiddleware, async (ctx) => {
  const body = z
    .object({
      sessionId: z
        .string()
        .regex(/^cs_test_[a-zA-Z0-9]+$/)
        .max(255),
    })
    .safeParse(await ctx.req.json().catch(() => null));
  if (!body.success) throw AppError.badRequest('Session de paiement invalide.');
  await syncCheckout(ctx.get('auth').userId, body.data.sessionId);
  return ctx.json({ ok: true });
});
billingRouter.route('/', protectedBilling);
