import { AppError } from '../types/app-error.js';

// TEST payments are a development simulation, never an entitlement to real AI.
// Neither a configured Stripe key nor a frontend flag can enable this boundary.
export function billingSimulationEnabled(): boolean {
  return (
    process.env['NODE_ENV'] === 'development' &&
    process.env['STRIPE_TEST_SIMULATION_ENABLED'] === 'true'
  );
}

export function assertBillingSimulationEnabled(): void {
  if (!billingSimulationEnabled()) {
    throw AppError.serviceUnavailable('Les abonnements de test sont fermés.');
  }
}
