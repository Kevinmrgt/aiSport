import Stripe from 'stripe';
import { AppError } from '../types/app-error.js';

export function stripeClient(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key?.startsWith('sk_test_'))
    throw AppError.serviceUnavailable('Le paiement de test est momentanément indisponible.');
  return new Stripe(key, {
    apiVersion: '2026-08-26.dahlia',
    maxNetworkRetries: 1,
    timeout: 10_000,
  });
}

export function premiumPriceId(): string {
  const price = process.env['STRIPE_PREMIUM_MONTHLY_PRICE_ID'];
  if (!price?.startsWith('price_'))
    throw AppError.serviceUnavailable('Le tarif Premium est en cours de configuration.');
  return price;
}

export function billingReturnUrl(): string {
  const url = new URL(process.env['FRONTEND_URL'] ?? 'http://localhost:3000');
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  ) {
    throw AppError.serviceUnavailable('Adresse de retour du paiement invalide.');
  }
  return `${url.origin}/abonnement`;
}

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === 'string' ? value : (value?.id ?? null);
}
