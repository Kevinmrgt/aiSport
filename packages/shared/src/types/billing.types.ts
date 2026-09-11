export const BILLING_OFFER = {
  freeCredits: 3,
  premiumCredits: 30,
  monthlyPriceCents: 999,
  currency: 'eur',
} as const;

export interface BillingStatus {
  plan: 'free' | 'premium';
  subscriptionStatus: string | null;
  freeCredits: number;
  premiumCredits: number;
  remaining: number;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canSubscribe: boolean;
  canManage: boolean;
  testMode: true;
}
